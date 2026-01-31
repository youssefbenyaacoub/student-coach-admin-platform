import React from 'react';
import { Card, Badge, Button, ProgressLine, Avatar, GradientText, gradients } from './UI';
import { 
  Rocket, FileText, Globe, Video, MoreHorizontal, Calendar, ArrowUpRight, 
  MessageCircle, CheckCircle, TrendingUp, Users, Target, Zap 
} from 'lucide-react';
import { motion } from 'motion/react';

const projects = [
  {
    name: 'EcoTrack',
    desc: 'Sustainable supply chain tracking using blockchain.',
    stage: 'MVP',
    progress: 65,
    gradient: gradients.secondary,
    accent: 'bg-[#4A00E0]'
  },
  {
    name: 'FinFlow',
    desc: 'AI-driven cash flow forecasting for retailers.',
    stage: 'Validation',
    progress: 35,
    gradient: gradients.warning,
    accent: 'bg-[#FF7E5F]'
  },
  {
    name: 'HealthBridge',
    desc: 'Interoperable medical records for emerging markets.',
    stage: 'Launch',
    progress: 88,
    gradient: gradients.success,
    accent: 'bg-[#11998E]'
  }
];

const tasks = [
  { title: 'Investor Deck V2', status: 'In Progress', date: 'Feb 2', priority: 'High' },
  { title: 'Customer Interviews (5/10)', status: 'To Do', date: 'Feb 5', priority: 'Medium' },
  { title: 'Landing Page Alpha', status: 'Done', date: 'Jan 28', priority: 'Low' }
];

export const DashboardView = () => {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20 font-inter">
      
      {/* Premium Welcome Section */}
      <section className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(102,126,234,0.08)_0%,transparent_70%)] -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight font-poppins">
              Welcome back, <GradientText>Youssef</GradientText> 👋
            </h1>
            <p className="text-lg text-slate-500 mt-2 font-medium">"Innovation distinguishes between a leader and a follower."</p>
          </div>
          <div className="flex items-center gap-4">
             <Button variant="outline">Analytics Report</Button>
             <Button variant="primary">Submit Progress</Button>
          </div>
        </div>

        {/* Today's Focus Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
           {[
             { label: 'Network Reach', value: '2.4k', icon: Users, color: gradients.primary },
             { label: 'Project Velocity', value: '+18%', icon: Zap, color: gradients.success },
             { label: 'Next Milestone', value: '4 Days', icon: Target, color: gradients.warning },
           ].map((focus, i) => (
             <Card key={i} className="group overflow-hidden border-b-4 border-transparent hover:border-indigo-400">
               <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${focus.color} text-white shadow-lg`}>
                    <focus.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{focus.label}</p>
                    <h3 className="text-2xl font-black text-slate-900">{focus.value}</h3>
                  </div>
               </div>
               <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <focus.icon className="w-12 h-12" />
               </div>
             </Card>
           ))}
        </div>
      </section>

      {/* Startup Projects Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.3em] font-poppins">Portfolio Ventures</h2>
          <button className="text-[11px] font-black text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest">Global Overview</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, i) => (
            <Card key={i} gradientBorder premium className="flex flex-col h-full">
              {/* Header Strip */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${project.gradient}`} />
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${project.accent} animate-pulse shadow-[0_0_10px_rgba(0,0,0,0.1)]`} />
                  <Badge variant="gradient">{project.stage}</Badge>
                </div>
                <button className="text-slate-300 hover:text-slate-500"><MoreHorizontal className="w-5 h-5" /></button>
              </div>

              <h3 className="text-xl font-black text-slate-900 tracking-tight font-poppins group-hover:text-indigo-600 transition-colors">{project.name}</h3>
              <p className="text-sm text-slate-500 mt-2 mb-8 leading-relaxed font-medium">Elevator Pitch: {project.desc}</p>
              
              <div className="mt-auto space-y-6">
                <ProgressLine value={project.progress} gradientClass={project.gradient} />
                
                <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(j => (
                      <Avatar key={j} seed={`member-${i}-${j}`} size="sm" gradient />
                    ))}
                  </div>
                  <div className="relative w-10 h-10">
                    <svg className="w-full h-full rotate-[-90deg]">
                      <circle cx="20" cy="20" r="16" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                      <circle 
                        cx="20" cy="20" r="16" 
                        fill="transparent" 
                        stroke="url(#grad)" 
                        strokeWidth="4" 
                        strokeDasharray="100" 
                        strokeDashoffset={100 - project.progress}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#667EEA" />
                          <stop offset="100%" stopColor="#764BA2" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-slate-900">{project.progress}%</span>
                  </div>
                  <Button variant="ghost" className="px-0 text-indigo-600 text-[10px] font-black uppercase tracking-widest gap-1">
                    Execute <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {/* New Idea CTA Card */}
          <Card className="bg-slate-50 border-2 border-dashed border-slate-200 hover:border-indigo-400 group cursor-pointer h-full flex flex-col items-center justify-center text-center p-10">
             <div className={`w-16 h-16 rounded-2xl ${gradients.premium} flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform`}>
                <Zap className="w-8 h-8" />
             </div>
             <h3 className="text-lg font-black text-slate-900 mt-6 font-poppins uppercase tracking-wider">Incubate New Idea</h3>
             <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest">Pitch directly to mentors</p>
          </Card>
        </div>
      </section>

      {/* Tasks & Feedback Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Kanban Preview */}
        <div className="lg:col-span-7 space-y-6">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.3em] font-poppins px-1">Executive Milestones</h2>
          <Card className="space-y-2 noPadding">
             {tasks.map((task, i) => (
               <div key={i} className={`flex items-center gap-6 p-5 hover:bg-slate-50 transition-all group border-l-4 ${
                 task.priority === 'High' ? 'border-l-[#FF416C]' : task.priority === 'Medium' ? 'border-l-[#FF7E5F]' : 'border-l-[#11998E]'
               }`}>
                 <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 ${
                   task.status === 'Done' ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'
                 }`}>
                   {task.status === 'Done' && <CheckCircle className="w-4 h-4 text-white" />}
                 </div>
                 <div className="flex-1">
                   <h4 className="text-sm font-black text-slate-900 tracking-tight">{task.title}</h4>
                   <div className="flex items-center gap-4 mt-1.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{task.priority} Priority</span>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                        <Calendar className="w-3.5 h-3.5" /> Due {task.date}
                      </span>
                   </div>
                 </div>
                 <Button variant="ghost" className="p-2 h-auto text-slate-300 group-hover:text-indigo-600">
                    <ArrowUpRight className="w-5 h-5" />
                 </Button>
               </div>
             ))}
             <div className="p-4 border-t border-slate-50">
                <Button variant="outline" className="w-full">Open Strategy Board</Button>
             </div>
          </Card>
        </div>

        {/* Mentor Insights */}
        <div className="lg:col-span-5 space-y-6">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.3em] font-poppins px-1">Mentor Insights</h2>
          <div className="space-y-4">
             {[
               { name: 'Sarah Chen', role: 'Venture Partner', text: 'Unit economics look great. Ready for the seed round deck.' },
               { name: 'Marcus Aurelius', role: 'Strategy Lead', text: 'Market timing is your biggest play. Focus on "Why Now".' }
             ].map((m, i) => (
               <Card key={i} className="group">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar seed={m.name} size="md" gradient />
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">{m.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{m.role}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 italic leading-relaxed font-medium">"{m.text}"</p>
                  <div className="mt-4 flex gap-2">
                    <Badge variant="default">Expertise</Badge>
                    <Badge variant="default">Action Item</Badge>
                  </div>
               </Card>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};
