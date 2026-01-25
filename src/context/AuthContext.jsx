import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContextBase'

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const normalizeRole = useCallback((value) => {
    if (value === 'admin' || value === 'coach' || value === 'student') return value
    return 'student'
  }, [])

  const normalizeName = useCallback((value, email) => {
    const trimmed = typeof value === 'string' ? value.trim() : ''
    if (trimmed) return trimmed
    if (typeof email === 'string' && email.includes('@')) return email.split('@')[0]
    return 'User'
  }, [])

  const fetchUserDetails = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error
      if (!data) return false

      setCurrentUser({
        id: data.id,
        role: data.role,
        name: data.name,
        email: data.email,
      })
      // Return true to indicate successful profile load
      return true
    } catch (error) {
      console.error('Error fetching user details:', error)
      // If we can't find the public profile, the user is authenticated but has no role/data.
      // We keep currentUser null so the app doesn't crash, but this causes the "stuck on login" issue.
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const createMissingProfile = useCallback(
    async (user) => {
      const email = user?.email ?? ''
      const metadata = user?.user_metadata ?? {}
      const role = normalizeRole(metadata.role)
      const name = normalizeName(metadata.name, email)

      const { error } = await supabase.from('users').insert({
        id: user.id,
        email,
        name,
        role,
      })

      if (error) throw error
    },
    [normalizeName, normalizeRole],
  )

  const ensureUserProfile = useCallback(
    async (user) => {
      try {
        const loaded = await fetchUserDetails(user.id)
        if (loaded) return true

        // Profile missing: create it from auth user metadata (works after email confirmation too)
        await createMissingProfile(user)
        return await fetchUserDetails(user.id)
      } catch (error) {
        console.error('Error ensuring user profile:', error)
        setLoading(false)
        return false
      }
    },
    [createMissingProfile, fetchUserDetails],
  )

  // Initialize auth state from Supabase session
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        ensureUserProfile(session.user)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        ensureUserProfile(session.user)
      } else {
        setCurrentUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [ensureUserProfile])

  const login = useCallback(async ({ email, password }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      
      // Attempt to load/create profile immediately to avoid zombie sessions
      if (data.session?.user) {
        const profileReady = await ensureUserProfile(data.session.user)
        if (!profileReady) {
          return { success: false, error: 'Login successful, but user profile could not be created. Check RLS policies.' }
        }
      }

      // User details will be fetched by onAuthStateChange listener
      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: error.message }
    }
  }, [ensureUserProfile])

  const signup = useCallback(async ({ email, password, name, role }) => {
    try {
      // 1. Sign up the user in Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      })

      if (authError) throw authError
      if (!data.user) throw new Error('No user data returned')

      // If email confirmation is enabled, session will be null until user confirms.
      // In that case, we delay profile creation until the user signs in later.
      if (!data.session) {
        return { success: true, needsEmailConfirmation: true }
      }

      // 2. Insert user profile into public users table
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        email,
        name,
        role: normalizeRole(role),
      })

      if (profileError) {
        await supabase.auth.signOut()
        throw new Error(`Profile creation failed: ${profileError.message}`)
      }

      return { success: true, needsEmailConfirmation: false }
    } catch (error) {
      console.error('Signup error:', error)
      return { success: false, error: error.message }
    }
  }, [normalizeRole])

  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setCurrentUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }, [])

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser?.id),
      role: currentUser?.role ?? null,
      loading,
      login,
      signup,
      logout,
    }),
    [currentUser, loading, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
