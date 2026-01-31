import React from 'react';
import { 
  Zap, 
  ArrowRight, 
  MoreHorizontal, 
  Plus, 
  Calendar, 
  MessageCircle,
  FileText,
  Clock,
  TrendingUp,
  AlertCircle,
  Users,
  CheckCircle
} from 'lucide-react';
import { Card, Button, Badge, Progress, Avatar, cn } from './UI';

const ventures = [
  {
    id: 1,
    name: 'HealthAI',
    category: 'Medical AI Diagnostics',
    status: 'Active',
    statusColor: 'success',
    progress: 65,
    next: 'User testing in 3 days',
    team: 4
  },
  {
    id: 2,
    name: 'FlowSpace',
    category: 'Team Productivity',
    status: 'Planning',
    statusColor: 'info',
    progress: 30,
    next: 'Finalize brand guidelines',
    team: 2
  }
];

export const Dashboard = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-250">
      
      {/* Left & Middle: Main Content (8 cols) */}
      <div className="lg:col-span-8 space-y-8">
        
        {/* Welcome Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-[40px] font-semibold text-[#0F172A] leading-tight tracking-tighter">Welcome back, Youssef 👋</h2>
            <p className="text-sm italic text-[#475569] mt-2">"Progress is the product of persistence."</p>
          </div>

          <Card className="bg-[#F8FAFC] border-none">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.1em]">Today's Priorities</h3>
              <Button variant="tertiary" size="sm">View full schedule →</Button>
            </div>
            <div className="space-y-4">
              {[
                "Finalize customer discovery script",
                "Review MVP feature spec with team",
                "Schedule mentor check-in"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border border-[#E2E8F0] bg-white flex items-center justify-center shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-transparent group-hover:bg-[#E2E8F0]" />
                  </div>
                  <span className="text-sm text-[#475569]">{item}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Ventures Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.1em]">My Ventures</h3>
            <Button size="sm" className="h-9">
              <Plus className="w-4 h-4" /> New
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ventures.map((v) => (
              <Card key={v.id} interactive className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${v.statusColor === 'success' ? 'bg-[#10B981]' : 'bg-[#3B82F6]'}`} />
                      <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">{v.status}</span>
                    </div>
                    <h4 className="text-lg font-bold text-[#0F172A]">{v.name}</h4>
                  </div>
                  <button className="p-1 text-[#94A3B8] hover:text-[#475569]">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
                
                <p className="text-sm text-[#475569] mb-6 line-clamp-2">{v.category}</p>
                
                <div className="mt-auto space-y-6">
                  <div className="flex items-center gap-4">
                    <Progress value={v.progress} className="flex-1" />
                    <span className="text-[11px] font-bold text-[#0F172A]">{v.progress}%</span>
                  </div>
                  
                  <div className="flex items-center gap-2 py-3 px-3 bg-[#F8FAFC] rounded-sm border border-slate-100">
                    <AlertCircle className="w-4 h-4 text-[#F59E0B]" />
                    <span className="text-[11px] font-semibold text-[#475569]">Next: {v.next}</span>
                  </div>

                  <Button variant="secondary" className="w-full">View Details</Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Tasks & Milestones Executive View */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.1em]">Tasks & Milestones</h3>
            <div className="flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-sm">
              <button className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-white shadow-subtle text-[#0F172A] rounded-xs">List</button>
              <button className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] hover:text-[#475569]">Timeline</button>
              <button className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] hover:text-[#475569]">Board</button>
            </div>
          </div>

          <Card padding={false} className="overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {['To Do', 'In Progress', 'Done'].map((col, i) => (
                <div key={i} className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">{col}</h4>
                    <span className="text-[10px] font-bold text-[#94A3B8]">3</span>
                  </div>
                  <div className="space-y-4">
                    {[1, 2].map((task) => (
                      <div key={task} className="p-4 bg-[#F8FAFC] border border-slate-100 rounded-sm hover:border-[#2D5BFF]/30 transition-colors group cursor-pointer">
                        <p className="text-sm font-semibold text-[#0F172A] mb-2">Finalize MVP spec {task}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#94A3B8] flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3" /> Tomorrow
                          </span>
                          <Avatar name="User" size="sm" />
                        </div>
                      </div>
                    ))}
                    {col === 'To Do' && (
                      <button className="w-full py-3 flex items-center justify-center gap-2 text-[11px] font-bold text-[#2D5BFF] hover:bg-[#F8FAFC] border border-dashed border-[#E2E8F0] rounded-sm transition-colors uppercase tracking-wider">
                        <Plus className="w-4 h-4" /> Add Task
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Mentor Insights */}
        <section className="space-y-6 pb-8">
          <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.1em]">Mentor Insights</h3>
          <div className="space-y-4">
            {[
              { name: 'Sarah Chen', role: 'Product Strategy', insight: 'Focus on solving one problem exceptionally well before scaling feature set.', time: '2 days ago', venture: 'HealthAI' },
              { name: 'Michael Torres', role: 'Fundraising', insight: 'Your metrics need to tell a story of consistent growth, even at small scale.', time: '1 week ago', venture: 'General' },
            ].map((m, i) => (
              <Card key={i} className="flex gap-6">
                <Avatar name={m.name} size="lg" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-[#0F172A]">{m.name}</h4>
                      <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">{m.role}</p>
                    </div>
                    <Badge status="purple">Re: {m.venture}</Badge>
                  </div>
                  <p className="text-[15px] text-[#475569] leading-relaxed italic">"{m.insight}"</p>
                  <div className="flex items-center gap-4 pt-2">
                    <span className="text-[11px] text-[#94A3B8] font-semibold">{m.time}</span>
                    <div className="flex gap-4">
                      <button className="text-[11px] font-bold text-[#2D5BFF] hover:underline uppercase tracking-wider">Reply</button>
                      <button className="text-[11px] font-bold text-[#2D5BFF] hover:underline uppercase tracking-wider">Schedule Check-in</button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>

      {/* Right Column: Quick Actions (4 cols) */}
      <div className="lg:col-span-4 space-y-8">
        <section className="space-y-6">
          <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.1em]">Quick Access</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Submit Idea', icon: Zap },
              { label: 'Find Mentor', icon: Users },
              { label: 'Add Task', icon: CheckCircle },
              { label: 'Schedule', icon: Calendar },
            ].map((action, i) => (
              <button key={i} className="flex flex-col items-center justify-center gap-3 p-5 bg-white border border-[#E2E8F0] rounded-lg hover:border-[#2D5BFF] hover:shadow-subtle transition-all group">
                <div className="p-3 bg-[#F8FAFC] text-[#475569] rounded-sm group-hover:bg-[#DBEAFE] group-hover:text-[#2D5BFF] transition-colors">
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-[#475569] uppercase tracking-[0.1em] group-hover:text-[#0F172A]">{action.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.1em]">Upcoming</h3>
          <Card padding={false} className="divide-y divide-slate-100">
            {[
              { title: 'Mentor Sync: Sarah', time: 'Tomorrow 2:00 PM', icon: MessageCircle },
              { title: 'Team Sync', time: 'Daily 10:00 AM', icon: Users },
              { title: 'Investor Update Due', time: 'Friday 5:00 PM', icon: FileText },
            ].map((ev, i) => (
              <div key={i} className="p-4 flex gap-4 hover:bg-[#F8FAFC] transition-colors cursor-pointer group">
                <div className="p-2 bg-[#F1F5F9] text-[#94A3B8] rounded-sm group-hover:bg-white group-hover:text-[#2D5BFF] transition-all h-fit">
                  <ev.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0F172A] leading-tight">{ev.title}</p>
                  <p className="text-xs text-[#94A3B8] mt-1 font-medium">{ev.time}</p>
                </div>
              </div>
            ))}
          </Card>
        </section>

        <section className="space-y-6">
          <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.1em]">Strategic Metrics</h3>
          <Card className="space-y-4">
            {[
              { label: 'Tasks due soon', value: 12, color: 'text-[#EF4444]' },
              { label: 'Updates needed', value: 3, color: 'text-[#F59E0B]' },
              { label: 'Meetings today', value: 1, color: 'text-[#10B981]' },
            ].map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#475569]">{m.label}</span>
                <span className={cn("text-lg font-bold", m.color)}>{m.value}</span>
              </div>
            ))}
            <div className="pt-2">
              <Progress value={75} className="h-1.5" />
              <p className="text-[10px] text-[#94A3B8] mt-2 font-bold uppercase tracking-wider">Weekly Goal Progress: 75%</p>
            </div>
          </Card>
        </section>

        <Card className="bg-[#2D5BFF] border-none p-8 text-center text-white space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-all duration-500" />
          <div className="relative z-10">
            <h4 className="text-xl font-bold tracking-tight">Venture Pro</h4>
            <p className="text-sm text-white/80 mt-2 mb-6">Unlock deep analytics and unlimited mentor sessions.</p>
            <button className="w-full py-3 bg-white text-[#2D5BFF] text-[11px] font-bold uppercase tracking-[0.1em] rounded-sm hover:shadow-large transition-all">Upgrade Now</button>
          </div>
        </Card>
      </div>
    </div>
  );
};
