import { useCallback, useMemo, useState } from 'react'
import { storage } from '../utils/storage'
import { AuthContext } from './AuthContextBase'

const STORAGE_KEY = 'sea_auth_v1'

export function AuthProvider({ children }) {
  const saved = storage.get(STORAGE_KEY, null)
  const [currentUser, setCurrentUser] = useState(saved?.currentUser ?? null)

  const login = useCallback(async ({ user, role }) => {
    const next = {
      currentUser: {
        id: user.id,
        role: role ?? user.role,
      },
    }
    storage.set(STORAGE_KEY, next)
    setCurrentUser(next.currentUser)
  }, [])

  const logout = useCallback(() => {
    storage.remove(STORAGE_KEY)
    setCurrentUser(null)
  }, [])

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser?.id),
      role: currentUser?.role ?? null,
      login,
      logout,
    }),
    [currentUser, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
