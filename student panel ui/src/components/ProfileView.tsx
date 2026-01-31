import React from 'react';
import { Card, Avatar, Input, Button, Badge, gradients, GradientText } from './UI';
import { Mail, GraduationCap, Briefcase, Lock, Save, Camera, Shield, Award, Cpu, Globe, Rocket } from 'lucide-react';

const skills = [
  { name: 'Product Growth', level: 90 },
  { name: 'Blockchain Arch', level: 75 },
  { name: 'Strategic Design', level: 85 },
  { name: 'Market Analysis', level: 80 }
];

export const ProfileView = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-24 font-inter">
      
      {/* Premium Header with Cover Gradient */}
      <section className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
        <div className={`absolute inset-0 ${gradients.premium} opacity-80`} />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1571176242081-bf093bb3a10d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGVhbiUyMG1vZGVybiUyMGFyY2hpdGVjdHVyZSUyMG9mZmljZXxlbnwxfHx8fDE3Njk4ODkxODN8MA&ixlib=rb-4.1.0&q=80&w=1080')] bg-cover bg-center mix-blend-overlay" />
        
        <div className="absolute -bottom-1 left-12 transform translate-y-1/2 flex items-end gap-8">
          <div className="relative group">
            <div className={`absolute -inset-1.5 ${gradients.primary} rounded-3xl blur-md opacity-50 group-hover:opacity-100 transition-opacity`} />
            <Avatar seed="Youssef" size="xl" className="w-32 h-32 md:w-40 md:h-40 relative z-10 border-4 border-white shadow-2xl" />
            <button className="absolute bottom-4 right-4 z-20 p-2.5 bg-white rounded-xl shadow-lg hover:scale-110 transition-transform">
               <Camera className="w-5 h-5 text-indigo-600" />
            </button>
          </div>
          <div className="pb-4 hidden md:block">
             <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black text-white tracking-tighter font-poppins drop-shadow-lg">Youssef</h1>
                <Badge variant="gradient">Verified Founder</Badge>
             </div>
             <p className="text-white/80 font-bold uppercase tracking-[0.3em] text-[10px] mt-2 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Security Protocol Active
             </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-24">
        
        {/* Left: Tactical Info */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="text-center p-10">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] mb-8 font-poppins">Identity Verified</h3>
            <div className="space-y-6">
              {[
                { label: 'Primary Node', value: 'youssef@ventures.io', icon: Mail },
                { label: 'Academy', value: 'Stanford GSB', icon: GraduationCap },
                { label: 'Specialization', value: 'FinTech Strategy', icon: Briefcase },
                { label: 'Global Rank', value: 'Top 5% Founders', icon: Award },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-1 group">
                   <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors mb-2">
                      <item.icon className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                   </div>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                   <p className="text-xs font-black text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-8">
             <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] mb-8 font-poppins">Core Competencies</h3>
             <div className="space-y-8">
               {skills.map((skill, i) => (
                 <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{skill.name}</span>
                       <span className="text-[10px] font-black text-indigo-600">{skill.level}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                       <div 
                        className={`h-full ${gradients.primary} rounded-full`} 
                        style={{ width: `${skill.level}%` }}
                       />
                    </div>
                 </div>
               ))}
             </div>
             <Button variant="outline" className="w-full mt-8">Request Audit</Button>
          </Card>
        </div>

        {/* Right: Operational Settings */}
        <div className="lg:col-span-8 space-y-10">
          <Card className="space-y-12 p-10">
            <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
               <div className={`p-3 rounded-2xl ${gradients.primary} text-white shadow-lg`}>
                  <Globe className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="text-lg font-black text-slate-900 font-poppins tracking-tight uppercase">Public Profile config</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visibility settings for venture council</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <Input label="Tactical Designation" defaultValue="Youssef" placeholder="Full Name" />
               <Input label="Encrypted Email" defaultValue="youssef@ventures.io" placeholder="Email" />
               <Input label="Academic Node" defaultValue="Stanford GSB" icon={GraduationCap} />
               <Input label="Venture Stage" defaultValue="Series A Ready" icon={Rocket} />
            </div>

            <div className="space-y-6 pt-6">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-1">Interests & Verticals</label>
               <div className="flex flex-wrap gap-3">
                 {['Web3', 'RegTech', 'AI/ML', 'Clean Energy', 'DeFi'].map(t => (
                   <div key={t} className="px-5 py-2.5 rounded-xl border-2 border-slate-50 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer group">
                      <span className="text-[11px] font-black text-slate-500 group-hover:text-indigo-600 transition-colors uppercase tracking-widest">{t}</span>
                   </div>
                 ))}
                 <button className="px-5 py-2.5 rounded-xl border-2 border-dashed border-slate-100 text-slate-300 hover:border-indigo-400 hover:text-indigo-400 text-[10px] font-black uppercase tracking-widest transition-all">
                   + Add Core Vertical
                 </button>
               </div>
            </div>

            <div className="pt-8 flex justify-end">
               <Button variant="primary" className="px-10 h-14">
                 <Save className="w-4 h-4" /> Save Operational Data
               </Button>
            </div>
          </Card>

          {/* Security Protocols */}
          <Card className="p-10 border-l-8 border-l-[#FF416C]">
             <div className="flex items-center gap-4 mb-10">
                <div className={`p-3 rounded-2xl ${gradients.alert} text-white shadow-lg`}>
                   <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900 font-poppins tracking-tight uppercase">Security Protocols</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input label="New Cipher Key" type="password" placeholder="••••••••" icon={Shield} />
                <Input label="Validate Key" type="password" placeholder="••••••••" icon={Shield} />
             </div>

             <div className="pt-10 flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-xs">
                  Change your password frequently to ensure maximum security of venture assets.
                </p>
                <Button variant="outline" className="px-10 h-14 hover:border-rose-400 hover:text-rose-500">
                  Update Cipher
                </Button>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
