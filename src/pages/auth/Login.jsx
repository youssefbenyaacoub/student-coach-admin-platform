import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { roles } from '../../data/mockData'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast'

const roleOptions = [
  { value: roles.student, label: 'Student' },
  { value: roles.coach, label: 'Coach' },
  { value: roles.admin, label: 'Admin' },
]

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { listUsers, hydrated } = useData()
  const { push } = useToast()

  const [role, setRole] = useState(roles.admin)
  const [userId, setUserId] = useState('')
  const [busy, setBusy] = useState(false)

  const users = useMemo(() => {
    if (!hydrated) return []
    return listUsers({ role })
  }, [hydrated, listUsers, role])

  const onSubmit = async (e) => {
    e.preventDefault()
    const user = users.find((u) => u.id === userId)
    if (!user) {
      push({ type: 'warning', title: 'Pick a user', message: 'Select a demo user to continue.' })
      return
    }

    setBusy(true)
    try {
      await login({ user, role })
      push({ type: 'success', title: 'Welcome', message: `Signed in as ${user.name}` })

      const target = role === roles.admin ? '/admin' : role === roles.coach ? '/coach' : '/student'
      navigate(target, { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-container app-bg flex min-h-screen items-center justify-center px-4">
      <div className="surface-soft w-full max-w-md p-6">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <span className="text-sm font-bold">SEA</span>
          </div>
          <div className="mt-3 text-lg font-semibold text-foreground">SEA Platform</div>
          <div className="mt-1 text-sm text-muted-foreground">Sign in to the prototype</div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="label" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              className="input"
              value={role}
              onChange={(e) => {
                setRole(e.target.value)
                setUserId('')
              }}
            >
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="user">
              Demo user
            </label>
            <select
              id="user"
              className="input"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={!hydrated}
            >
              <option value="">Select…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <div className="mt-2 text-xs text-muted-foreground">
              No password in prototype; uses mock users.
            </div>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 text-xs text-muted-foreground">
          Tip: Admin role unlocks management features.
        </div>
      </div>
    </div>
  )
}
