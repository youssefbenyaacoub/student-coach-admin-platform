import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, User, Home, ClipboardList, Target, MessageCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'

export default function StudentPanelLayout() {
  const { logout, currentUser } = useAuth()
  const { getUserById } = useData()
  const me = currentUser?.id ? getUserById(currentUser.id) : null
  const navigate = useNavigate()

  const onLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const navItems = [
    { label: 'Home', to: '/student', icon: Home, end: true },
    { label: 'My Tasks', to: '/student/deliverables', icon: Target },
    { label: 'My Progress', to: '/student/programs', icon: ClipboardList },
    { label: 'Messages', to: '/student/messages', icon: MessageCircle },
    { label: 'Profile', to: '/student/profile', icon: User },
  ]

  return (
    <div className="min-h-screen bg-student-bg font-sans text-student-text">
        <div className="flex h-screen overflow-hidden">
        {/* Sidebar - Friendly & Rounded */}
        <aside className="w-64 bg-white m-4 rounded-3xl shadow-sm flex flex-col border border-blue-100 hidden md:flex">
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
          <div className="max-w-5xl mx-auto space-y-8">
             <Outlet />
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
    </div>
  )
}
