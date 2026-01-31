import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LogOut, User, Home, ClipboardList, Target, MessageCircle,
  Calendar, Users, Settings, Menu, X, Bell,
  BarChart3, FolderOpen, FolderKanban, Briefcase, LayoutDashboard, Search, CheckCircle, HelpCircle
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

  // Navigation Items Mapping
  const desktopNavItems = [
    { label: 'Dashboard', to: '/student', icon: LayoutDashboard, end: true },
    { label: 'Projects', to: '/student/projects', icon: Briefcase },
    { label: 'Programs', to: '/student/programs', icon: ClipboardList },
    { label: 'Tasks', to: '/student/tasks', icon: CheckCircle },
    { label: 'Mentorship', to: '/student/sessions', icon: Users },
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
        <div className="flex items-center gap-8">
          {/* Logo area */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/student')}>
            <div className="w-9 h-9 bg-student-primary rounded-sm flex items-center justify-center shadow-lg shadow-student-primary/30">
              <div className="w-4 h-4 bg-white rounded-xs rotate-45 transform transition-transform group-hover:rotate-90" />
            </div>
            <span className="font-heading font-bold text-xl tracking-tighter text-slate-900 hidden sm:block uppercase">Venture</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {desktopNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `px-4 py-2 text-sm font-semibold rounded-sm transition-all duration-200
                     ${isActive
                    ? 'text-student-primary bg-slate-50'
                    : 'text-student-subtext hover:text-student-primary hover:bg-slate-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Search Bar (Mock) - Visible on large screens */}
        <div className="flex-1 max-w-md mx-8 hidden xl:block">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-student-primary transition-colors" />
            <input
              type="text"
              placeholder="Search projects, tasks, or insights..."
              className="w-full bg-slate-50 border-none rounded-full py-2.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-student-primary/20 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          <NotificationsBell />

          <button className="p-2.5 text-slate-500 hover:bg-slate-50 rounded-full hidden sm:block transition-colors">
            <HelpCircle className="w-5 h-5" />
          </button>

          <div className="w-[1px] h-8 bg-slate-200 mx-1 hidden sm:block"></div>

          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/student/profile')}>
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
      <main className="pt-24 pb-12 px-4 md:px-8 lg:px-12 max-w-[1600px] mx-auto min-h-[calc(100vh-80px)]">
        {/* Mobile Menu Dropdown (if open) */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-20 left-0 right-0 bg-white border-b border-slate-200 shadow-xl z-40 p-4 space-y-2 animate-in slide-in-from-top-2">
            {[...desktopNavItems, { label: 'Files', to: '/student/resources', icon: FolderOpen }, { label: 'Logout', to: '#', icon: LogOut, action: onLogout }].map((item) => (
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 z-50 flex items-center justify-around px-2 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.to || (item.to !== '/student' && location.pathname.startsWith(item.to))
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-300 ${isActive ? 'text-student-primary -translate-y-1' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? 'fill-current' : 'stroke-[1.5]'}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
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
