import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Moon, Sun, X } from 'lucide-react'
import { useMemo, useState } from 'react'
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useTheme } from '../../hooks/useTheme'
import ChatWidget from './ChatWidget'
import ConfirmDialog from './ConfirmDialog'

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
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)

  const currentLabel = useMemo(
    () => nav.find((n) => location.pathname === n.to || location.pathname.startsWith(n.to + '/'))?.label,
    [nav, location.pathname],
  )
  
  // Dynamic background based on role
  const sidebarBg = useMemo(() => {
    switch(me?.role) {
        case 'student': return 'bg-student-primary'
        case 'coach': return 'bg-coach-primary'
        case 'admin': return 'bg-slate-800'
        default: return 'bg-primary'
    }
  }, [me?.role])

  const onLogout = () => setConfirmLogoutOpen(true)

  const confirmLogout = async () => {
    try {
      setLogoutBusy(true)
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setLogoutBusy(false)
      setConfirmLogoutOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-300">
      <div className="flex min-h-screen isolate">
        {/* Mobile drawer */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in`}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <aside className={`absolute left-0 top-0 h-full w-[85vw] max-w-xs overflow-y-auto p-6 shadow-2xl animate-in slide-in-from-left ${sidebarBg}`}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="text-lg font-heading font-bold text-white tracking-tight">SEA Platform</div>
                  <div className="text-xs text-white/80 font-medium">Student Entrepreneurship</div>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-1">
                <NavItems nav={nav} onItemClick={() => setMobileOpen(false)} />
              </div>

              <div className="mt-auto pt-8">
                <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
                  <div className="text-sm font-bold text-white font-heading">{me?.name ?? 'User'}</div>
                  <div className="text-xs text-white/70 truncate">{me?.email ?? ''}</div>
                  <button
                    type="button"
                    className="mt-4 flex w-full items-center gap-2 rounded-lg py-2 text-sm font-semibold text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                    onClick={onLogout}
                  >
                    <LogOut className="h-4 w-4" /> 
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        {/* Desktop sidebar */}
        <aside className={`hidden w-72 flex-col transition-colors duration-300 md:flex shadow-xl z-20 ${sidebarBg}`}>
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 text-white shadow-inner ring-1 ring-white/20">
                <span className="text-sm font-bold font-heading">SEA</span>
              </div>
              <div>
                <div className="text-base font-bold text-white font-heading tracking-tight">SEA Platform</div>
                <div className="text-xs text-white/80 font-medium">Student Entrepreneurship</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            <NavItems nav={nav} />
          </nav>

          <div className="p-4">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-md border border-white/5 shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                 <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white ring-2 ring-white/10">
                    {me?.name?.charAt(0)}
                 </div>
                 <div className="overflow-hidden">
                    <div className="text-sm font-bold text-white font-heading truncate">{me?.name ?? 'User'}</div>
                    <div className="text-[10px] text-white/70 truncate uppercase tracking-widest font-semibold">{me?.role}</div>
                 </div>
              </div>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 py-2 text-xs font-bold text-white hover:bg-white/20 transition-all active:scale-95"
                onClick={onLogout}
              >
                <LogOut className="h-3.5 w-3.5" /> 
                Logout
              </button>
            </div>
          </div>
        </aside>

        <div className="flex flex-1 flex-col relative overflow-hidden">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:bg-slate-900/80 dark:border-slate-800">
            <div className="mx-auto flex w-full items-center justify-between gap-4 px-6 py-3">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden transition-colors"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-lg font-bold font-heading text-slate-900 dark:text-white">
                    {currentLabel ?? 'Dashboard'}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition-colors"
                  onClick={toggle}
                  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                
                <span className="hidden sm:inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 uppercase tracking-wider dark:bg-slate-800 dark:text-slate-300">
                   {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden p-6 md:p-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="mx-auto max-w-7xl"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
          
          <ChatWidget />
        </div>
      </div>

      <ConfirmDialog
        open={confirmLogoutOpen}
        title="Sign out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        danger
        busy={logoutBusy}
        onClose={() => setConfirmLogoutOpen(false)}
        onConfirm={confirmLogout}
      />
    </div>
  )
}
