import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, LayoutDashboard, Users, CheckSquare, MessageSquare, Menu, Globe, Settings, Bell } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useState } from 'react'

export default function CoachPanelLayout() {
  const { logout, currentUser } = useAuth()
  const { getUserById } = useData()
  const me = currentUser?.id ? getUserById(currentUser.id) : null
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const onLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const navItems = [
    { label: 'Dashboard', to: '/coach', icon: LayoutDashboard, end: true },
    { label: 'Students', to: '/coach/students', icon: Users },
    { label: 'Programs', to: '/coach/programs', icon: Globe },
    { label: 'Sessions', to: '/coach/sessions', icon: CheckSquare },
    { label: 'Deliverables', to: '/coach/deliverables', icon: CheckSquare }, 
    { label: 'Messages', to: '/coach/messages', icon: MessageSquare },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar - Professional & Compact */}
      <aside 
        className={`bg-indigo-950 text-indigo-100 flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col
          ${sidebarOpen ? 'w-64' : 'w-20'}
        `}
      >
        <div className="h-16 flex items-center px-4 bg-indigo-950/50 border-b border-indigo-900 justify-between">
           {sidebarOpen && <span className="font-bold text-lg tracking-wide text-white">COACH<span className="text-indigo-400">Panel</span></span>}
           <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-indigo-800 rounded-lg transition-colors">
              <Menu className="h-5 w-5" />
           </button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                ${isActive 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
                }`
              }
            >
              <item.icon className={`h-5 w-5 flex-shrink-0 ${!sidebarOpen && "mx-auto"}`} />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-indigo-900">
          <div className={`flex items-center gap-3 ${!sidebarOpen && "justify-center"}`}>
             <div className="h-9 w-9 rounded bg-indigo-700 flex items-center justify-center font-bold text-white text-sm">
                {me?.name?.charAt(0) || 'C'}
             </div>
             {sidebarOpen && (
                 <div className="overflow-hidden">
                     <p className="text-sm font-medium text-white truncate">{me?.name}</p>
                     <p className="text-xs text-indigo-400 truncate">Senior Coach</p>
                 </div>
             )}
          </div>
          <button 
            onClick={onLogout}
            className={`mt-4 w-full flex items-center gap-3 px-3 py-2 text-sm text-indigo-300 hover:text-white transition-colors
                 ${!sidebarOpen && "justify-center"}
            `}
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
           <h1 className="font-semibold text-slate-800">
              {/* Dynamic Title based on path could go here */}
              Workspace
           </h1>
           <div className="flex items-center gap-4">
              <button className="p-2 text-slate-400 hover:text-slate-600 relative">
                 <Bell className="h-5 w-5" />
                 <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-600">
                 <Settings className="h-5 w-5" />
              </button>
           </div>
        </header>

        <main className="flex-1 overflow-auto p-2 bg-slate-100">
           {/* Coach panels are information dense, so less padding on edges */}
           <Outlet />
        </main>
      </div>
    </div>
  )
}
