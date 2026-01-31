import React from 'react';
import { 
  Bell, 
  Search, 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  CheckCircle, 
  MessageSquare, 
  Settings, 
  Menu,
  Plus,
  HelpCircle,
  LogOut,
  User
} from 'lucide-react';
import { Avatar, Input } from './UI';

export const Header = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-white border-b border-slate-200 z-50 px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-9 h-9 bg-[#2D5BFF] rounded-sm flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-xs rotate-45" />
          </div>
          <span className="font-bold text-xl tracking-tighter text-[#0F172A] hidden sm:block uppercase">Venture</span>
        </div>

        <nav className="hidden lg:flex items-center gap-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'projects', label: 'Projects', icon: Briefcase },
            { id: 'mentors', label: 'Mentorship', icon: Users },
            { id: 'tasks', label: 'Tasks', icon: CheckCircle },
          ].map((item) => (
            <button
              key={item.id}
              className="px-4 py-2 text-sm font-semibold text-[#475569] hover:text-[#2D5BFF] hover:bg-[#F8FAFC] rounded-sm transition-all"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 max-w-md mx-8 hidden lg:block">
        <Input placeholder="Search projects, tasks, or insights..." icon={Search} />
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button className="p-2.5 text-[#475569] hover:bg-[#F8FAFC] rounded-sm relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#EF4444] border-2 border-white rounded-full"></span>
        </button>
        <button className="p-2.5 text-[#475569] hover:bg-[#F8FAFC] rounded-sm hidden sm:block">
          <HelpCircle className="w-5 h-5" />
        </button>
        <div className="w-[1px] h-8 bg-[#E2E8F0] mx-1 hidden sm:block"></div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-[#0F172A] leading-tight">Youssef Ahmed</p>
            <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">HealthAI Founder</p>
          </div>
          <Avatar 
            name="Youssef Ahmed" 
            src="https://images.unsplash.com/photo-1729824186570-4d4aede00043?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBzdHVkZW50JTIwYXZhdGFyJTIwcHJvZmlsZXxlbnwxfHx8fDE3Njk4ODg4OTd8MA&ixlib=rb-4.1.0&q=80&w=1080" 
          />
        </div>
        <button className="lg:hidden p-2 text-[#475569]" onClick={onMenuClick}>
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
};

export const MobileNav = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'projects', label: 'Venture', icon: Briefcase },
    { id: 'plus', label: '', icon: Plus, center: true },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-50 flex items-center justify-around px-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        if (item.center) {
          return (
            <button 
              key={item.id}
              className="w-12 h-12 -mt-8 bg-[#2D5BFF] text-white rounded-sm shadow-large flex items-center justify-center"
            >
              <Icon className="w-6 h-6" />
            </button>
          );
        }
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-[#2D5BFF]' : 'text-[#94A3B8]'}`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
