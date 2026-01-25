import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { roles } from '../../data/mockData'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'

export default function Login() {
  const navigate = useNavigate()
  const { login, signup, isAuthenticated, role: userRole } = useAuth()
  const { push } = useToast()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState(roles.student)
  const [busy, setBusy] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const target = userRole === roles.admin ? '/admin' : userRole === roles.coach ? '/coach' : '/student'
      navigate(target, { replace: true })
    }
  }, [isAuthenticated, userRole, navigate])

  const onSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (isSignUp) {
        const result = await signup({ email, password, name, role })
        if (result.success) {
          if (result.needsEmailConfirmation) {
            push({
              type: 'success',
              title: 'Confirm your email',
              message: 'We sent you a confirmation email. After confirming, come back and sign in.',
            })
            setIsSignUp(false)
          } else {
            push({ type: 'success', title: 'Account Created', message: 'Signed in successfully!' })
            // Auth state change will handle redirect
          }
        } else {
          push({ type: 'danger', title: 'Signup Failed', message: result.error })
        }
      } else {
        const result = await login({ email, password })
        if (result.success) {
          push({ type: 'success', title: 'Welcome', message: 'Signed in successfully' })
        } else {
          push({ type: 'danger', title: 'Login Failed', message: result.error || 'Invalid credentials' })
        }
      }
    } catch (err) {
      console.error(err)
      push({ type: 'danger', title: 'Error', message: 'Something went wrong' })
    } finally {
      setBusy(false)
    }
  }

  // Show loading while redirecting
  if (isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="app-container app-bg flex min-h-screen items-center justify-center px-4">
      <div className="surface-soft w-full max-w-md p-6">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <span className="text-sm font-bold">SEA</span>
          </div>
          <div className="mt-3 text-lg font-semibold text-foreground">SEA Platform</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {isSignUp ? 'Create a new account' : 'Sign in to your account'}
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {isSignUp && (
            <>
              <div>
                <label className="label" htmlFor="name">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="label" htmlFor="role">
                  Role
                </label>
                <select
                  id="role"
                  className="input"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value={roles.student}>Student</option>
                  <option value={roles.coach}>Coach</option>
                  {/* Admin signup hidden for security in production, but available here for prototype */}
                  <option value={roles.admin}>Admin</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={busy}
          >
            {busy ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                {isSignUp ? 'Creating Account...' : 'Signing in...'}
              </>
            ) : (
              isSignUp ? 'create Account' : 'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setEmail('')
                setPassword('')
                setName('')
              }}
              className="font-semibold text-primary hover:text-primary-600 focus:outline-none focus:underline"
            >
              {isSignUp ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
