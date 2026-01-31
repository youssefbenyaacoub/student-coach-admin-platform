import React, { useState } from 'react';
import { Bell, Search, ChevronDown, User, Settings as SettingsIcon, Shield, LogOut, Layout } from 'lucide-react';
import { Avatar, Input, gradients, GradientText } from './UI';
import { motion, AnimatePresence } from 'motion/react';

export const Navbar = ({ setActiveTab }: any) => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 h-[80px] bg-white/90 backdrop-blur-xl border-b border-slate-100 z-50 flex items-center justify-between px-8">
      <div className="flex items-center gap-16">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('dashboard')}>
          <div className={`w-10 h-10 ${gradients.premium} rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform`}>
             <div className="w-5 h-5 bg-white rounded-md rotate-45" />
          </div>
          <span className="font-black text-2xl tracking-tighter text-slate-900 font-poppins">LAUNCH<span className="text-indigo-600">.</span></span>
        </div>

        <div className="hidden md:flex items-center gap-2">
          {['Dashboard', 'Projects', 'Mentorship', 'Resources', 'Forum'].map((item) => (
            <button 
              key={item}
              onClick={() => setActiveTab(item.toLowerCase() === 'dashboard' ? 'dashboard' : item.toLowerCase())}
              className="relative px-5 py-2 text-[11px] font-black text-slate-400 hover:text-slate-900 transition-all uppercase tracking-[0.2em] group"
            >
              {item}
              <div className={`absolute bottom-0 left-5 right-5 h-1 ${gradients.primary} scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-full`} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden lg:block w-80">
          <Input placeholder="Global search..." icon={Search} />
        </div>
        
        <button className="relative p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all group">
          <Bell className="w-5 h-5 group-hover:text-indigo-600" />
          <span className={`absolute top-3 right-3 w-2.5 h-2.5 ${gradients.alert} rounded-full border-2 border-white shadow-sm`} />
        </button>

        <div className="w-[1px] h-10 bg-slate-100 mx-2 hidden sm:block" />

        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-4 p-1.5 pl-2 hover:bg-slate-50 rounded-2xl transition-all group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-[12px] font-black text-slate-900 leading-none tracking-tight">Youssef 👋</p>
              <p className="text-[9px] font-black text-indigo-500 mt-1 uppercase tracking-widest">Seed Founder</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Avatar seed="Youssef" size="md" gradient />
              <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform duration-500 ${showDropdown ? 'rotate-180' : ''}`} />
            </div>
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div 
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-2xl border border-slate-100 rounded-2xl shadow-2xl p-3 z-50 overflow-hidden"
              >
                <div className="p-3 mb-2 border-b border-slate-50">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signed in as</p>
                   <p className="text-xs font-black text-slate-900 truncate">youssef@ventures.io</p>
                </div>
                {[
                  { label: 'My Identity', icon: User, tab: 'settings' },
                  { label: 'System Preferences', icon: SettingsIcon, tab: 'settings' },
                  { label: 'Security Protocols', icon: Shield, tab: 'settings' },
                ].map((item, i) => (
                  <button 
                    key={i}
                    onClick={() => { setActiveTab(item.tab); setShowDropdown(false); }}
                    className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all text-xs font-black uppercase tracking-widest"
                  >
                    <item.icon className="w-4 h-4" /> {item.label}
                  </button>
                ))}
                <div className="h-[1px] bg-slate-50 my-2" />
                <button className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all text-xs font-black uppercase tracking-widest">
                  <LogOut className="w-4 h-4" /> Terminate Session
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
};
