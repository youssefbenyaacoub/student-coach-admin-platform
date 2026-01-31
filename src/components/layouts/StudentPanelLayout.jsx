import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LogOut, User, Home, ClipboardList, Target, MessageCircle,
  Calendar, Users, Settings, Menu, X, Bell,
  BarChart3, FolderOpen, FolderKanban, Briefcase, LayoutDashboard, Search, CheckCircle, HelpCircle, MoreHorizontal
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import ConfirmDialog from '../common/ConfirmDialog'
import NotificationsBell from '../common/NotificationsBell'
import { getAvatarUrl } from '../../utils/avatarUtils'

export default function StudentPanelLayout() {
  const { logout, currentUser } = useAuth()
  const { getUserById } = useData()
  const me = currentUser?.id ? getUserById(currentUser.id) : null
  const navigate = useNavigate()
  const location = useLocation()

  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  // All Navigation Items
  const allNavItems = [
    { label: 'Dashboard', to: '/student', icon: LayoutDashboard, end: true },
    { label: 'Projects', to: '/student/projects', icon: Briefcase },
    { label: 'Programs', to: '/student/programs', icon: ClipboardList },
    { label: 'Tasks', to: '/student/tasks', icon: CheckCircle },
    { label: 'Mentorship', to: '/student/sessions', icon: Users },
    { label: 'Progress', to: '/student/progress', icon: BarChart3 },
    { label: 'Files', to: '/student/resources', icon: FolderOpen },
    { label: 'Messages', to: '/student/messages', icon: MessageCircle },
    { label: 'Calendar', to: '/student/calendar', icon: Calendar },
    { label: 'Forum', to: '/student/forum', icon: Users }, // Reusing Users icon or MessageCircle
  ]

  // Desktop: Show first 5, then a "More" dropdown or similar if space allows.
  // Actually, for a 1600px max width, we can fit more.
  // "Dashboard", "Projects", "Programs", "Tasks", "Mentorship", "Progress", "Files", "Chat", "Calendar", "Forum"
  // Let's try to fit most important ones and maybe shorten labels or use icons.

  const desktopVisibleItems = [
    { label: 'Dashboard', to: '/student', icon: LayoutDashboard, end: true },
    { label: 'Projects', to: '/student/projects', icon: Briefcase },
    { label: 'Programs', to: '/student/programs', icon: ClipboardList },
    { label: 'Tasks', to: '/student/tasks', icon: CheckCircle },
    { label: 'Messages', to: '/student/messages', icon: MessageCircle },
    { label: 'Calendar', to: '/student/calendar', icon: Calendar },
    { label: 'Resources', to: '/student/resources', icon: FolderOpen },
  ]

  const mobileNavItems = [
    { label: 'Home', to: '/student', icon: LayoutDashboard, end: true },
    { label: 'Projects', to: '/student/projects', icon: Briefcase },
    { label: 'Tasks', to: '/student/tasks', icon: Target },
    { label: 'Messages', to: '/student/messages', icon: MessageCircle },
    { label: 'Profile', to: '/student/profile', icon: User },
  ]

  return (
    <div className="min-h-screen bg-student-bg font-sans text-student-text selection:bg-student-primary/10 selection:text-student-primary pb-24 lg:pb-0">

      {/* 1. Top Header (Desktop & Tablet) */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-white border-b border-slate-200 z-50 px-4 lg:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6 xl:gap-8">
          {/* Logo area */}
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate('/student')}>
            <div className="w-9 h-9 bg-student-primary rounded-sm flex items-center justify-center shadow-lg shadow-student-primary/30">
              <div className="w-4 h-4 bg-white rounded-xs rotate-45 transform transition-transform group-hover:rotate-90" />
            </div>
            <span className="font-heading font-bold text-xl tracking-tighter text-slate-900 hidden sm:block uppercase">Venture</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar">
            {desktopVisibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `px-3 py-2 text-sm font-semibold rounded-sm transition-all duration-200 whitespace-nowrap flex items-center gap-2
                     ${isActive
                    ? 'text-student-primary bg-slate-50'
                    : 'text-student-subtext hover:text-student-primary hover:bg-slate-50'
                  }`
                }
              >
                <item.icon className="w-4 h-4 hidden xl:block" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          {/* Search (Icon Only on smaller screens) */}
          <div className="hidden xl:block relative group w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-student-primary transition-colors" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-slate-50 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-student-primary/20 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="h-8 w-[1px] bg-slate-200 hidden xl:block"></div>

          <NotificationsBell />

          {/* Profile Dropdown Trigger */}
          <div className="flex items-center gap-3 cursor-pointer group pl-2" onClick={() => navigate('/student/profile')}>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 leading-tight group-hover:text-student-primary transition-colors">{me?.name || 'Student'}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Entrepreneur</p>
            </div>
            <div className="h-10 w-10 rounded-full overflow-hidden shadow-sm ring-2 ring-transparent group-hover:ring-student-primary/20 transition-all">
              <img
                src={getAvatarUrl(me?.name || currentUser?.email)}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="lg:hidden p-2 text-slate-500" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="pt-24 pb-20 px-4 md:px-8 lg:px-12 max-w-[1600px] mx-auto min-h-[calc(100vh-80px)]">
        {/* Mobile Menu Dropdown (if open) */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-20 left-0 right-0 bg-white border-b border-slate-200 shadow-xl z-40 p-4 space-y-2 animate-in slide-in-from-top-2">
            {[...allNavItems, { label: 'Logout', to: '#', icon: LogOut, action: onLogout }].map((item) => (
              item.action ? (
                <button
                  key={item.label}
                  onClick={() => { item.action(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 w-full p-3 rounded-lg text-red-500 hover:bg-slate-50 font-semibold"
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 w-full p-3 rounded-lg font-semibold ${isActive ? 'bg-student-primary/10 text-student-primary' : 'text-slate-600'}`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              )
            ))}
          </div>
        )}

        <div className="animate-in fade-in duration-500">
          <Outlet />
        </div>
      </main>

      {/* 3. Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-50 flex items-center justify-around px-2 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] py-1">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.to || (item.to !== '/student' && location.pathname.startsWith(item.to))
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={`flex flex-col items-center justify-center gap-1 p-1 rounded-xl w-16 transition-all duration-300 ${isActive ? 'text-student-primary' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'fill-current' : 'stroke-[1.5]'}`} />
              <span className="text-[9px] font-bold uppercase tracking-wider scale-90">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Logout Confirmation */}
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
