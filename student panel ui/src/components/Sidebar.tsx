import React from 'react';
import { LayoutDashboard, Briefcase, PlusCircle, Users, CheckCircle, MessageSquare, Settings, ChevronLeft, ChevronRight, LogOut, ShieldCheck, Database } from 'lucide-react';
import { motion } from 'motion/react';
import { gradients } from './UI';

const sidebarItems = [
  { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
  { id: 'projects', label: 'Venture Lab', icon: Database },
  { id: 'submit', label: 'Incubate Idea', icon: PlusCircle },
  { id: 'mentors', label: 'Council', icon: Users },
  { id: 'tasks', label: 'Milestones', icon: CheckCircle },
  { id: 'messages', label: 'Encrypted Chat', icon: MessageSquare },
  { id: 'settings', label: 'Config', icon: Settings },
];

export const Sidebar = ({ activeTab, setActiveTab, collapsed, setCollapsed }: any) => {
  return (
    <motion.aside 
      initial={false}
      animate={{ width: collapsed ? 100 : 280 }}
      className="fixed left-0 top-[80px] h-[calc(100vh-80px)] bg-white/95 backdrop-blur-xl border-r border-slate-100 z-30 flex flex-col transition-all duration-300 ease-in-out hidden lg:flex"
    >
      <div className="flex-1 py-10 px-6 space-y-2 overflow-y-auto custom-scrollbar">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group relative ${
                isActive 
                ? `${gradients.primary} text-white shadow-lg shadow-indigo-100` 
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-indigo-500'}`} />
              {!collapsed && <span className="text-[11px] font-black uppercase tracking-[0.2em]">{item.label}</span>}
              {isActive && (
                <motion.div 
                  layoutId="sidebar-active-pill"
                  className="absolute right-0 w-1.5 h-6 bg-white/50 rounded-l-full"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="p-6 border-t border-slate-50">
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5 mx-auto" /> : (
            <>
              <ChevronLeft className="w-5 h-5 shrink-0" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">Minimize</span>
            </>
          )}
        </button>
        <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
           {!collapsed ? (
             <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${gradients.success} flex items-center justify-center text-white`}>
                   <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-900 uppercase">Pro Plan</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Active Access</p>
                </div>
             </div>
           ) : (
             <ShieldCheck className="w-5 h-5 mx-auto text-indigo-500" />
           )}
        </div>
      </div>
    </motion.aside>
  );
};
