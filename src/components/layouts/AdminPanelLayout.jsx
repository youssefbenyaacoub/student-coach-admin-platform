import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, BarChart3, Users, Settings, Activity, Layers, AlertCircle, Shield, Menu, Search, FolderKanban } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useState } from 'react'
import { useData } from '../../hooks/useData'
import ConfirmDialog from '../common/ConfirmDialog'
import NotificationsBell from '../common/NotificationsBell'

export default function AdminPanelLayout() {
  const { logout, currentUser } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { getUserById } = useData()
  const me = currentUser?.id ? getUserById(currentUser.id) : null

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
    { label: 'Overview', to: '/admin', icon: Activity, end: true },
      { label: 'Projects', to: '/admin/projects', icon: FolderKanban },
    { label: 'Programs', to: '/admin/programs', icon: Layers },
    { label: 'Applications', to: '/admin/applications', icon: Layers },
    { label: 'Users', to: '/admin/users', icon: Users },
    { label: 'Reports', to: '/admin/reports', icon: BarChart3 },
    { label: 'Settings', to: '/admin/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col md:flex-row">
      {/* Sidebar - Modern Dark Theme */}
      <aside 
        className={`bg-slate-900 text-white flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col shadow-xl z-20 
          ${sidebarOpen ? 'w-64' : 'w-20'}
          hidden md:flex sticky top-0 h-screen
        `}
      >
        <div className="h-16 flex items-center px-4 bg-slate-950/50 border-b border-white/5 justify-between">
           {sidebarOpen && (
              <div className="flex items-center gap-2">
                 <div className="bg-admin-accent/20 p-1.5 rounded-lg">
                    <Shield className="h-5 w-5 text-admin-accent" />
                 </div>
                 <span className="font-heading font-bold text-lg tracking-wide text-white">ADMIN</span>
              </div>
           )}
           <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white ${!sidebarOpen && "mx-auto"}`}>
              <Menu className="h-5 w-5" />
           </button>
        </div>

        <div className="px-4 py-6">
            {sidebarOpen && <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">Main Menu</p>}
            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                    ${isActive 
                      ? 'bg-admin-primary text-white shadow-lg shadow-blue-900/20' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                    }`
                  }
                >
                  <item.icon className={`h-5 w-5 flex-shrink-0 transition-colors ${!sidebarOpen && "mx-auto"}`} />
                  {sidebarOpen && <span>{item.label}</span>}
                  
                  {/* Tooltip for collapsed state could go here */}
                </NavLink>
              ))}
            </nav>
        </div>
        
        <div className="mt-auto p-4 border-t border-white/5 bg-black/20">
             {sidebarOpen ? (
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-admin-primary flex items-center justify-center font-bold text-white shadow-md ring-2 ring-white/10">
                        {me?.name?.charAt(0) || 'A'}
                    </div>
                    <div className="overflow-hidden">
                        <div className="font-bold text-sm text-white truncate">{me?.name || 'Administrator'}</div>
                        <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Online
                        </div>
                    </div>
                </div>
             ) : (
                <div className="flex justify-center mb-4">
                    <div className="h-8 w-8 rounded-full bg-admin-primary flex items-center justify-center font-bold text-xs text-white">
                        {me?.name?.charAt(0) || 'A'}
                    </div>
                </div>
             )}
             
             <button 
               onClick={onLogout}
               className={`flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors w-full p-2 rounded-lg hover:bg-white/5 ${!sidebarOpen && "justify-center"}`}
             >
                <LogOut className="h-5 w-5" />
                {sidebarOpen && <span className="text-sm font-medium">Sign Out</span>}
             </button>
        </div>
      </aside>
      
      {/* Mobile Header & Nav */}
      <div className="md:hidden flex flex-col">
          <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-4 shadow-md sticky top-0 z-30">
               <div className="flex items-center gap-2">
                 <div className="bg-admin-accent/20 p-1.5 rounded-lg">
                    <Shield className="h-5 w-5 text-admin-accent" />
                 </div>
                 <span className="font-heading font-bold text-lg tracking-wide">ADMIN</span>
               </div>
               <div className="flex items-center gap-2">
                 <NotificationsBell buttonClassName="text-slate-300 hover:text-white hover:bg-white/10" />
                 <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-400 hover:text-white">
                    <Menu className="h-6 w-6" />
                 </button>
               </div>
          </header>
          
          {/* Mobile Menu Dropdown */}
          {sidebarOpen && (
              <div className="bg-slate-800 text-white border-b border-white/10 p-4 space-y-2 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                        <div className="h-10 w-10 rounded-full bg-admin-primary flex items-center justify-center font-bold text-white shadow-md ring-2 ring-white/10">
                            {me?.name?.charAt(0) || 'A'}
                        </div>
                        <div>
                            <div className="font-bold text-sm text-white">{me?.name || 'Administrator'}</div>
                            <div className="text-xs text-emerald-400 font-medium">Online</div>
                        </div>
                  </div>
                  {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors
                            ${isActive ? 'bg-admin-primary text-white' : 'text-slate-400 hover:bg-white/5'}`
                        }
                    >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                    </NavLink>
                  ))}
                  <button 
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-white/5 mt-2"
                  >
                     <LogOut className="h-5 w-5" />
                     Sign Out
                  </button>
              </div>
          )}
      </div>

      {/* M
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
         {/* Modern Header */}
         <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10 sticky top-0">
            <div className="flex items-center gap-4 text-slate-400">
               <Search className="h-4 w-4" />
               <input 
                  type="text" 
                  placeholder="Type to search..." 
                  className="bg-transparent text-sm focus:outline-none text-slate-700 w-64 placeholder:text-slate-400"
               />
            </div>
            
            <div className="flex items-center gap-4">
               <NotificationsBell />
               <div className="h-8 w-px bg-slate-200 mx-2"></div>
               <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">SEA Platform</div>
                  <div className="text-[10px] text-slate-500">v2.4.0 (Stable)</div>
               </div>
            </div>
         </header>

         <main className="flex-1 overflow-auto bg-slate-50 p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
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
