import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, User, Home, ClipboardList, Target, MessageCircle, FolderKanban, BarChart3, Users, Calendar } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import ConfirmDialog from '../common/ConfirmDialog'
import NotificationsBell from '../common/NotificationsBell'

export default function StudentPanelLayout() {
  const { logout, currentUser } = useAuth()
  const { getUserById } = useData()
  const me = currentUser?.id ? getUserById(currentUser.id) : null
  const navigate = useNavigate()

  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)

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

  const navItems = [
    { label: 'Home', to: '/student', icon: Home, end: true },
    { label: 'Projects', to: '/student/projects', icon: FolderKanban },
    { label: 'My Tasks', to: '/student/tasks', icon: Target },
    { label: 'My Progress', to: '/student/programs', icon: ClipboardList },
    { label: 'Analytics', to: '/student/analytics', icon: BarChart3 },
    { label: 'Messages', to: '/student/messages', icon: MessageCircle },
    { label: 'Calendar', to: '/student/calendar', icon: Calendar },
    { label: 'Forum', to: '/student/forum', icon: Users },
    { label: 'Profile', to: '/student/profile', icon: User },
  ]

  return (
    <div className="min-h-screen bg-student-bg font-sans text-student-text">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar - Friendly & Rounded */}
        <aside className="w-64 bg-white m-4 rounded-3xl shadow-sm flex-col border border-blue-100 hidden md:flex">
          <div className="p-8 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-student-primary shadow-sm">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-slate-800">Hello, {me?.name?.split(' ')[0] || 'Student'}!</h2>
              <p className="text-xs text-slate-500 font-medium">Let's keep growing</p>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group
                  ${isActive
                    ? 'bg-student-primary text-white shadow-md translate-x-1'
                    : 'text-slate-500 hover:bg-blue-50 hover:text-student-primary'
                  }`
                }
              >
                <item.icon className="h-6 w-6 stroke-[1.5]" />
                <span className="font-heading font-semibold text-base">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-6">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 transition-colors py-4 rounded-xl hover:bg-slate-50"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="sticky top-0 z-40 flex justify-end bg-student-bg/80 backdrop-blur py-2">
              <NotificationsBell />
            </div>
            <div className="space-y-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Nav (Bottom Bar) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around p-3 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 p-2 rounded-xl transition-colors
                ${isActive ? 'text-student-primary bg-blue-50' : 'text-slate-400'}`
            }
          >
            <item.icon className="h-6 w-6" />
            <span className="text-[10px] font-medium font-heading">{item.label}</span>
          </NavLink>
        ))}
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
