import React from 'react';
import { Search, Bell, Menu, HelpCircle } from 'lucide-react';
import { Avatar, Input } from './UI';

export const Header = ({ title }: { title: string }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900 capitalize">{title}</h1>
      </div>

      <div className="flex-1 max-w-md mx-8 hidden md:block">
        <Input placeholder="Search projects, tasks, or documents..." icon={Search} />
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
        </button>
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg hidden sm:block">
          <HelpCircle className="w-5 h-5" />
        </button>
        <div className="w-px h-8 bg-slate-200 mx-2 hidden sm:block"></div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-900 leading-none">Alex Johnson</p>
            <p className="text-xs text-slate-500 mt-1">Cohort 2026 • Fintech</p>
          </div>
          <Avatar name="Alex Johnson" src="https://images.unsplash.com/photo-1729824186570-4d4aede00043?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBzdHVkZW50JTIwYXZhdGFyJTIwcHJvZmlsZXxlbnwxfHx8fDE3Njk4ODg4OTd8MA&ixlib=rb-4.1.0&q=80&w=1080" />
        </div>
      </div>
    </header>
  );
};
