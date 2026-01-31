import React, { useState } from 'react';
import { Header, MobileNav } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { Profile } from './components/Profile';
import { Button } from './components/UI';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  ArrowUpRight, 
  Clock,
  TrendingUp,
  Briefcase,
  CheckCircle
} from 'lucide-react';

// Simplified Venture View
const VenturesView = () => (
  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-350">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h2 className="text-4xl font-black text-[#0F172A] tracking-tighter uppercase">My Venture Portfolio</h2>
        <p className="text-lg text-[#475569] mt-1">Detailed strategic overview of all current projects.</p>
      </div>
      <Button className="h-14 px-8"><Plus className="w-5 h-5" /> New Venture</Button>
    </div>

    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
        <input className="w-full h-14 bg-white border border-[#E2E8F0] rounded-sm pl-12 pr-4 text-sm focus:border-[#2D5BFF] outline-none" placeholder="Search ventures..." />
      </div>
      <Button variant="secondary" className="h-14 px-6"><Filter className="w-4 h-4" /> Filter</Button>
      <select className="h-14 px-6 bg-white border border-[#E2E8F0] rounded-sm text-sm font-bold uppercase tracking-widest text-[#475569] outline-none focus:border-[#2D5BFF]">
        <option>All Status</option>
        <option>Active</option>
        <option>Planning</option>
        <option>Paused</option>
      </select>
    </div>

    <div className="grid grid-cols-1 gap-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white border border-slate-200 rounded-lg p-8 flex flex-col md:flex-row gap-8 hover:shadow-medium transition-all group">
          <div className="w-full md:w-48 h-48 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
             <Briefcase className="w-12 h-12 text-slate-300" />
          </div>
          <div className="flex-1 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                  <span className="text-[11px] font-bold text-[#475569] uppercase tracking-widest">High Impact • Series A Bound</span>
                </div>
                <h3 className="text-2xl font-black text-[#0F172A] tracking-tighter">Project Horizon {i}</h3>
              </div>
              <button className="p-2 text-slate-300 hover:text-slate-900"><MoreHorizontal className="w-6 h-6" /></button>
            </div>
            <p className="text-base text-[#475569] leading-relaxed max-w-2xl">
              Next-generation cloud infrastructure optimized for distributed machine learning workloads, focusing on reducing latency for real-time inference at the edge.
            </p>
            <div className="flex flex-wrap gap-8 pt-4">
               <div>
                 <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] mb-1">Current Progress</p>
                 <div className="flex items-center gap-3">
                    <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="w-3/4 h-full bg-[#2D5BFF]" />
                    </div>
                    <span className="text-sm font-bold">75%</span>
                 </div>
               </div>
               <div>
                 <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] mb-1">Venture ROI</p>
                 <p className="text-sm font-black text-[#10B981] flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> +2.4x</p>
               </div>
               <div>
                 <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] mb-1">Active Blocker</p>
                 <p className="text-sm font-bold text-[#EF4444]">Legal Audit</p>
               </div>
            </div>
          </div>
          <div className="flex md:flex-col justify-end gap-3 pt-6 md:pt-0">
            <Button className="w-full">Strategic Dashboard</Button>
            <Button variant="secondary" className="w-full">Edit Specs</Button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'projects': return <VenturesView />;
      case 'profile': return <Profile />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] font-inter text-[#0F172A] selection:bg-[#2D5BFF]/10 selection:text-[#2D5BFF] pb-24 lg:pb-0">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        
        .font-inter { font-family: 'Inter', sans-serif; }
        
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #F8FAFC; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
      `}</style>

      <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <main className="pt-28 pb-12 px-4 md:px-8 lg:px-12 max-w-[1600px] mx-auto">
        {renderContent()}
      </main>

      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Toast Mockup (Global UI component mentioned in spec) */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 lg:bottom-8 lg:left-auto lg:right-8 z-[60] animate-in slide-in-from-bottom-2 fade-in">
        <div className="bg-[#0F172A] text-white px-6 py-4 rounded-sm shadow-xl flex items-center gap-4 min-w-[320px]">
          <div className="p-1.5 bg-[#10B981] rounded-full">
            <CheckCircle className="w-4 h-4" />
          </div>
          <p className="text-sm font-semibold">Strategic update saved successfully</p>
        </div>
      </div>
    </div>
  );
}
