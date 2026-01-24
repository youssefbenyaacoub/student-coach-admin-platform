import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Moon, Sun, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useTheme } from '../../hooks/useTheme'
import ChatWidget from './ChatWidget'

function NavItems({ nav, onItemClick }) {
  return (
    <div className="space-y-1">
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            [
              'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
              isActive
                ? 'bg-white/15 text-white'
                : 'text-white/85 hover:bg-white/10 hover:text-white',
            ].join(' ')
          }
          end={item.end}
          onClick={() => onItemClick?.()}
        >
          {item.icon ? <item.icon className="h-4 w-4" /> : null}
          {item.label}
        </NavLink>
      ))}
    </div>
  )
}

export default function AppLayout({ nav }) {
  const { logout, currentUser } = useAuth()
  const { getUserById } = useData()
  const { isDark, toggle } = useTheme()
  const me = currentUser?.id ? getUserById(currentUser.id) : null

  const navigate = useNavigate()
  const location = useLocation()

  const [mobileOpen, setMobileOpen] = useState(false)

  const currentLabel = useMemo(
    () => nav.find((n) => location.pathname === n.to || location.pathname.startsWith(n.to + '/'))?.label,
    [nav, location.pathname],
  )

  const onLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-container app-bg">
      <div className="flex min-h-screen">
        {/* Mobile drawer */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-slate-900/40"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <aside className="absolute left-0 top-0 h-full w-[86vw] max-w-xs overflow-y-auto bg-primary p-4 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">SEA Platform</div>
                  <div className="mt-1 text-xs text-white/75">Student Entrepreneurship</div>
                </div>
                <button
                  type="button"
                  className="btn-ghost text-white hover:bg-white/10"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4">
                <NavItems nav={nav} onItemClick={() => setMobileOpen(false)} />
              </div>

              <div className="mt-6 rounded-2xl bg-white/10 p-3">
                <div className="text-sm font-semibold text-white">{me?.name ?? 'User'}</div>
                <div className="mt-1 text-xs text-white/75">{me?.email ?? ''}</div>
                <button
                  type="button"
                  className="btn-ghost mt-3 w-full justify-start text-white hover:bg-white/10"
                  onClick={onLogout}
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            </aside>
          </div>
        ) : null}

        {/* Desktop sidebar */}
        <aside className="hidden w-72 flex-col bg-primary md:flex">
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15 text-white">
                <span className="text-sm font-bold">SEA</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">SEA Platform</div>
                <div className="mt-1 text-xs text-white/75">Student Entrepreneurship</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 pb-3">
            <NavItems nav={nav} />
          </nav>

          <div className="p-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <div className="text-sm font-semibold text-white">{me?.name ?? 'User'}</div>
              <div className="mt-1 text-xs text-white/75">{me?.email ?? ''}</div>
              <button
                type="button"
                className="btn-ghost mt-3 w-full justify-start text-white hover:bg-white/10"
                onClick={onLogout}
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-ghost md:hidden"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {currentLabel ?? 'Dashboard'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    SEA • {me?.role ? me.role.toUpperCase() : ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={toggle}
                  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                  title={isDark ? 'Light mode' : 'Dark mode'}
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {me?.role ? me.role.toUpperCase() : 'USER'}
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
          
          <ChatWidget />
        </div>
      </div>
    </div>
  )
}
