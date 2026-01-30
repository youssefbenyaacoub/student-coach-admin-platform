import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, LayoutDashboard, Users, CheckSquare, MessageSquare, Menu, Globe, Settings, FolderKanban, Target } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useState } from 'react'
import ConfirmDialog from '../common/ConfirmDialog'
import NotificationsBell from '../common/NotificationsBell'

export default function CoachPanelLayout() {
  const { logout, currentUser } = useAuth()
  const { getUserById } = useData()
  const me = currentUser?.id ? getUserById(currentUser.id) : null
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

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
    { label: 'Dashboard', to: '/coach', icon: LayoutDashboard, end: true },
    { label: 'Projects', to: '/coach/projects', icon: FolderKanban },
    { label: 'Tasks', to: '/coach/tasks', icon: Target },
    { label: 'Students', to: '/coach/students', icon: Users },
    { label: 'Programs', to: '/coach/programs', icon: Globe },
    { label: 'Sessions', to: '/coach/sessions', icon: CheckSquare },
    { label: 'Deliverables', to: '/coach/deliverables', icon: CheckSquare },
    { label: 'Messages', to: '/coach/messages', icon: MessageSquare },
    { label: 'Forum', to: '/coach/forum', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-coach-bg flex flex-col md:flex-row font-sans text-coach-text">
      {/* Sidebar - Professional & Compact (Desktop) */}
      <aside
        className={`bg-coach-secondary text-white flex-shrink-0 transition-all duration-300 ease-in-out hidden md:flex flex-col shadow-xl z-20 sticky top-0 h-screen
          ${sidebarOpen ? 'w-64' : 'w-20'}
        `}
      >
        <div className="h-16 flex items-center px-4 bg-coach-secondary/50 border-b border-white/10 justify-between">
          {sidebarOpen && <span className="font-heading font-bold text-lg tracking-wide text-white">COACH<span className="text-coach-primary font-normal ml-1 bg-white px-1 rounded text-xs py-0.5">PRO</span></span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-coach-primary text-white shadow-lg'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <item.icon className={`h-5 w-5 flex-shrink-0 ${!sidebarOpen && "mx-auto"}`} />
              {sidebarOpen && <span className="font-heading">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className={`flex items-center gap-3 ${!sidebarOpen && "justify-center"}`}>
            <div className="h-10 w-10 rounded bg-coach-primary flex items-center justify-center font-bold text-white text-sm shadow-md ring-2 ring-white/10">
              {me?.name?.charAt(0) || 'C'}
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate font-heading">{me?.name}</p>
                <p className="text-xs text-slate-400 truncate">Senior Coach</p>
              </div>
            )}
          </div>
          <button
            onClick={onLogout}
            className={`mt-4 w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded transition-colors
                 ${!sidebarOpen && "justify-center"}
            `}
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Header & Nav */}
      <div className="md:hidden flex flex-col shadow-md z-30 relative">
        <header className="h-16 bg-coach-secondary text-white flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-lg tracking-wide">COACH<span className="font-normal ml-1 bg-white px-1 rounded text-xs py-0.5 text-black">PRO</span></span>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-300 hover:text-white">
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {sidebarOpen && (
          <div className="bg-coach-secondary border-t border-white/10 p-4 space-y-2 absolute top-16 left-0 right-0 shadow-xl animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10 px-2">
              <div className="h-9 w-9 rounded bg-coach-primary flex items-center justify-center font-bold text-white text-sm shadow-md ring-1 ring-white/10">
                {me?.name?.charAt(0) || 'C'}
              </div>
              <div>
                <div className="font-bold text-sm text-white">{me?.name}</div>
                <div className="text-xs text-slate-400">Senior Coach</div>
              </div>
            </div>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                            ${isActive ? 'bg-coach-primary text-white' : 'text-slate-300 hover:bg-white/10'}`
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 mt-2"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 sticky top-0">
          <h1 className="font-heading font-semibold text-lg text-slate-800">
            Workspace
          </h1>
          <div className="flex items-center gap-4">
            <NotificationsBell />
            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50">
          {/* Coach panels are information dense, so less padding on edges */}
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
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
