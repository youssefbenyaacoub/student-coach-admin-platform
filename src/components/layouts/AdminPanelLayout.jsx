import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, BarChart3, Users, Settings, Activity, Layers, AlertCircle, Shield } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function AdminPanelLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const onLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const navItems = [
    { label: 'Overview', to: '/admin', icon: Activity, end: true },
    { label: 'Programs', to: '/admin/programs', icon: Layers },
    { label: 'Applications', to: '/admin/applications', icon: Layers },
    { label: 'Users', to: '/admin/users', icon: Users },
    { label: 'Reports', to: '/admin/reports', icon: BarChart3 },
    { label: 'Settings', to: '/admin/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col">
       {/* Top Navigation Bar - Flat & Serious */}
       <header className="bg-slate-900 text-white h-14 flex items-center px-6 justify-between shadow-md z-20">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            <span className="font-bold tracking-wider text-sm uppercase">Admin<span className="text-slate-400">Panel</span></span>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                System Operational
             </div>
             <button onClick={onLogout} className="text-xs font-semibold text-slate-300 hover:text-white uppercase tracking-wide">
               Logout
             </button>
          </div>
       </header>

       <div className="flex flex-1 overflow-hidden">
          {/* Side Navigation */}
          <aside className="w-56 bg-slate-800 flex flex-col py-4">
             <div className="px-4 mb-6">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Navigation</p>
             </div>
             <nav className="flex-1">
               {navItems.map((item) => (
                 <NavLink
                   key={item.to}
                   to={item.to}
                   end={item.end}
                   className={({ isActive }) =>
                     `flex items-center gap-3 px-4 py-3 text-sm font-medium border-l-4 transition-colors
                     ${isActive 
                       ? 'bg-slate-700/50 border-red-500 text-white' 
                       : 'border-transparent text-slate-400 hover:bg-slate-700/30 hover:text-slate-200'
                     }`
                   }
                 >
                   <item.icon className="h-4 w-4" />
                   {item.label}
                 </NavLink>
               ))}
             </nav>
             
             <div className="mt-auto px-4 pt-4 border-t border-slate-700">
                <div className="bg-slate-900 rounded p-3 text-xs text-slate-400 border border-slate-700">
                   <div className="flex items-center gap-2 mb-1 text-slate-300 font-bold">
                      <AlertCircle className="h-3 w-3" />
                      Alerts
                   </div>
                   No critical issues detected.
                </div>
             </div>
          </aside>

          {/* Main Workspace */}
          <main className="flex-1 overflow-auto bg-slate-200/50 p-6">
             <div className="max-w-7xl mx-auto">
                <Outlet />
             </div>
          </main>
       </div>
    </div>
  )
}
