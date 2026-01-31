import React from 'react';
import { 
  Camera, 
  MapPin, 
  Mail, 
  Linkedin, 
  Globe, 
  Edit3, 
  Shield, 
  Bell, 
  Eye, 
  Moon,
  ExternalLink,
  Award
} from 'lucide-react';
import { Card, Button, Avatar, Input, Badge } from './UI';

export const Profile = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-350">
      
      {/* Cover & Avatar Section */}
      <section className="relative h-64 sm:h-80 bg-linear-to-r from-[#2D5BFF] to-[#7C3AED] rounded-lg overflow-hidden group">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1762951566340-addbd49f88ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGdlb21ldHJpYyUyMHBhdHRlcm4lMjBzb2Z0JTIwYmx1ZSUyMHB1cnBsZXxlbnwxfHx8fDE3Njk4OTEwMjV8MA')] bg-cover" />
        <Button variant="secondary" className="absolute bottom-6 right-6 bg-white/90 border-none shadow-medium hover:bg-white">
          <Camera className="w-4 h-4" /> Edit Cover
        </Button>
        
        <div className="absolute -bottom-1 left-8 sm:left-12 transform translate-y-1/2 flex items-end gap-6">
          <div className="relative group">
            <Avatar 
              size="xl" 
              name="Youssef Ahmed" 
              src="https://images.unsplash.com/photo-1729824186570-4d4aede00043?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBzdHVkZW50JTIwYXZhdGFyJTIwcHJvZmlsZXxlbnwxfHx8fDE3Njk4ODg4OTd8MA" 
              className="w-32 h-32 sm:w-40 sm:h-40 border-[6px] border-white shadow-xl"
            />
            <button className="absolute bottom-2 right-2 p-2.5 bg-[#2D5BFF] text-white rounded-full border-4 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="pb-4 hidden sm:block">
            <h1 className="text-[32px] font-black text-[#0F172A] tracking-tighter">Youssef Ahmed</h1>
            <p className="text-[#475569] font-bold text-[13px] uppercase tracking-wider">Founder @ HealthAI • AI in Healthcare</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-20 sm:pt-24">
        
        {/* Left Column: Details (4 cols) */}
        <div className="lg:col-span-4 space-y-8">
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.1em]">Personal Details</h3>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Edit3 className="w-4 h-4" /></Button>
            </div>
            <Card className="space-y-6">
              {[
                { label: 'Email', value: 'youssef@healthai.io', icon: Mail },
                { label: 'Location', value: 'London, UK', icon: MapPin },
                { label: 'Education', value: 'Stanford GSB', icon: Award },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="p-2 bg-[#F8FAFC] text-[#94A3B8] rounded-sm">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest leading-none mb-1">{item.label}</p>
                    <p className="text-sm font-semibold text-[#475569]">{item.value}</p>
                  </div>
                </div>
              ))}
              <div className="pt-2 flex gap-3">
                <Button variant="secondary" className="w-full h-10"><Linkedin className="w-4 h-4" /></Button>
                <Button variant="secondary" className="w-full h-10"><Globe className="w-4 h-4" /></Button>
              </div>
            </Card>
          </section>

          <section className="space-y-6">
            <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.1em]">Network Stats</h3>
            <Card className="grid grid-cols-2 gap-8">
              {[
                { label: 'Mentors', value: '3' },
                { label: 'Connections', value: '12' },
                { label: 'Projects', value: '5' },
                { label: 'Pitch Views', value: '1.2k' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="text-2xl font-black text-[#2D5BFF]">{stat.value}</p>
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mt-1">{stat.label}</p>
                </div>
              ))}
            </Card>
          </section>

          <section className="space-y-6">
            <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.1em]">Preferences</h3>
            <Card className="space-y-1" padding={false}>
              {[
                { label: 'Notifications', icon: Bell, action: 'Configure' },
                { label: 'Privacy & Security', icon: Shield, action: 'Manage' },
                { label: 'Theme (System)', icon: Moon, action: 'Change' },
              ].map((p, i) => (
                <button key={i} className="w-full flex items-center justify-between p-4 hover:bg-[#F8FAFC] transition-colors group first:rounded-t-lg last:rounded-b-lg border-b last:border-0 border-slate-100">
                  <div className="flex items-center gap-4">
                    <p.icon className="w-5 h-5 text-[#94A3B8] group-hover:text-[#2D5BFF]" />
                    <span className="text-sm font-bold text-[#475569]">{p.label}</span>
                  </div>
                  <span className="text-[10px] font-black text-[#2D5BFF] uppercase tracking-widest group-hover:underline">{p.action}</span>
                </button>
              ))}
            </Card>
          </section>
        </div>

        {/* Right Column: Professional (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          <section className="space-y-6">
            <h3 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.1em]">Professional Identity</h3>
            <Card className="space-y-8">
              <div className="space-y-4">
                <h4 className="text-sm font-black text-[#0F172A] uppercase tracking-widest">Current Venture Focus</h4>
                <div className="p-6 bg-[#F8FAFC] rounded-lg border border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h5 className="text-xl font-black text-[#0F172A]">HealthAI</h5>
                      <p className="text-sm font-semibold text-[#2D5BFF]">Founder & Lead Strategist</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-9 px-4">
                      Venture Profile <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                  <p className="text-[15px] text-[#475569] leading-relaxed">
                    Leading the development of an interoperable medical records platform that utilizes distributed intelligence to provide real-time diagnostic assistance for emerging market healthcare providers.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-sm font-black text-[#0F172A] uppercase tracking-widest">Skills & Expertise</h4>
                <div className="flex flex-wrap gap-3">
                  {[
                    "AI Strategy", "Healthcare Systems", "Product Management", "Series A Readiness", "Distributed Teams", "Venture Building"
                  ].map((s, i) => (
                    <div key={i} className="px-4 py-2 bg-white border border-[#E2E8F0] rounded-sm text-[11px] font-bold text-[#475569] uppercase tracking-wider hover:border-[#2D5BFF] hover:text-[#2D5BFF] transition-all cursor-default">
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-black text-[#0F172A] uppercase tracking-widest">Previous Experience</h4>
                <div className="space-y-8">
                  {[
                    { company: 'MediCore Solutions', role: 'Head of Product', duration: '2021 - 2024' },
                    { company: 'Stripe (Contract)', role: 'Embedded Systems Consultant', duration: '2020 - 2021' },
                  ].map((exp, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-10 h-10 bg-[#F1F5F9] rounded-sm flex items-center justify-center shrink-0">
                        <Briefcase className="w-5 h-5 text-[#94A3B8]" />
                      </div>
                      <div>
                        <h5 className="text-base font-bold text-[#0F172A]">{exp.company}</h5>
                        <p className="text-sm font-semibold text-[#475569]">{exp.role}</p>
                        <p className="text-xs text-[#94A3B8] font-bold uppercase tracking-widest mt-1">{exp.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </section>

          <Card className="bg-[#F8FAFC] border-none p-10 flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-white rounded-lg shadow-subtle mb-4">
              <Zap className="w-8 h-8 text-[#2D5BFF]" />
            </div>
            <h3 className="text-2xl font-black text-[#0F172A] tracking-tighter uppercase">Looking for more?</h3>
            <p className="text-[15px] text-[#475569] max-w-sm">
              Your profile is currently at 85% completion. Adding your fundraising history increases mentor visibility by 40%.
            </p>
            <Button className="h-14 px-10 mt-4">Add Fundraising History</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
