import React from 'react';
import { 
  Plus, 
  MoreVertical, 
  Users, 
  Calendar, 
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';
import { Card, Badge, Button, Avatar, Input } from './UI';

const projects = [
  {
    id: 1,
    name: 'GreenTech MVP',
    description: 'A sustainable supply chain tracking platform for small-scale manufacturers.',
    status: 'In Progress',
    members: ['Alex', 'Jordan', 'Sam'],
    progress: 75,
    dueDate: 'Feb 15, 2026',
    category: 'Sustainabilty'
  },
  {
    id: 2,
    name: 'ScaleUp AI',
    description: 'AI-driven customer support automation for early-stage B2B SaaS startups.',
    status: 'Review',
    members: ['Alex', 'Casey'],
    progress: 90,
    dueDate: 'Feb 20, 2026',
    category: 'Software'
  },
  {
    id: 3,
    name: 'EcoWare Logistics',
    description: 'Zero-waste packaging solutions for e-commerce delivery networks.',
    status: 'Planning',
    members: ['Alex', 'Riley', 'Morgan', 'Taylor'],
    progress: 20,
    dueDate: 'Mar 10, 2026',
    category: 'Logistics'
  },
  {
    id: 4,
    name: 'FinFlow Connect',
    description: 'Bridging the gap between traditional banking and DeFi for emerging markets.',
    status: 'Paused',
    members: ['Alex', 'Quinn'],
    progress: 45,
    dueDate: 'Apr 05, 2026',
    category: 'Fintech'
  }
];

export const ProjectsView = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Projects</h2>
          <p className="text-slate-500">Manage and track your incubation ventures.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input placeholder="Search projects..." icon={Search} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="px-3">
            <Filter className="w-4 h-4" /> Filter
          </Button>
          <select className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20">
            <option>All Status</option>
            <option>In Progress</option>
            <option>Planning</option>
            <option>Review</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="p-6 flex flex-col hover:border-indigo-200 transition-colors group">
            <div className="flex items-start justify-between mb-4">
              <Badge variant={project.status === 'In Progress' ? 'info' : project.status === 'Review' ? 'success' : project.status === 'Paused' ? 'warning' : 'default'}>
                {project.status}
              </Badge>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{project.name}</h3>
            <p className="text-sm text-slate-500 mt-2 line-clamp-2 flex-1">
              {project.description}
            </p>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-slate-400">
                <span>Progress</span>
                <span>{project.progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    project.status === 'Paused' ? 'bg-slate-400' : 'bg-indigo-600'
                  }`} 
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {project.members.map((member, i) => (
                    <div key={i} title={member}>
                      <Avatar name={member} size="sm" />
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                    +2
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {project.dueDate}
                </div>
              </div>
            </div>
          </Card>
        ))}
        
        {/* Add Project Placeholder */}
        <button className="h-full min-h-[250px] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-6 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all group">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 group-hover:bg-indigo-50 transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-medium">Add New Project</span>
          <p className="text-xs mt-1">Scale your next big idea</p>
        </button>
      </div>
    </div>
  );
};
