import React from 'react';
import { 
  FileText, 
  Folder, 
  Download, 
  Share2, 
  MoreVertical, 
  Search, 
  Upload,
  Grid,
  List,
  Clock,
  HardDrive,
  Star
} from 'lucide-react';
import { Card, Button, Input, Badge } from './UI';

const documents = [
  { name: 'Business Plan Draft v2', type: 'docx', size: '2.4 MB', modified: '2 hours ago', owner: 'You', star: true },
  { name: 'Pitch Deck Q1 2026', type: 'pptx', size: '8.1 MB', modified: 'Yesterday', owner: 'Sarah Chen', star: true },
  { name: 'Financial Projections 2026-28', type: 'xlsx', size: '1.2 MB', modified: 'Jan 28, 2026', owner: 'You', star: false },
  { name: 'Market Research Summary', type: 'pdf', size: '4.5 MB', modified: 'Jan 25, 2026', owner: 'Riley Jones', star: false },
  { name: 'Investor Contact List', type: 'csv', size: '156 KB', modified: 'Jan 20, 2026', owner: 'Sarah Chen', star: false },
  { name: 'Legal Agreements - Inc.', type: 'pdf', size: '3.8 MB', modified: 'Jan 15, 2026', owner: 'Admin', star: true },
];

export const DocumentsView = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Documents</h2>
          <p className="text-slate-500">Secure storage for your venture assets.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">New Folder</Button>
          <Button><Upload className="w-4 h-4" /> Upload File</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Mini */}
        <div className="space-y-6">
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 font-medium text-sm">
              <Folder className="w-4 h-4" /> All Files
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm">
              <HardDrive className="w-4 h-4" /> Shared with me
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm">
              <Star className="w-4 h-4" /> Starred
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm">
              <Clock className="w-4 h-4" /> Recent
            </button>
          </div>

          <Card className="p-4 bg-slate-50 border-none">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Storage</span>
              <span className="text-xs font-bold text-indigo-600">65% used</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full mb-3 overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: '65%' }}></div>
            </div>
            <p className="text-[10px] text-slate-500">1.3 GB of 2.0 GB used. Upgrade for more.</p>
          </Card>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input placeholder="Search documents..." icon={Search} />
            </div>
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button className="p-2 bg-slate-100 text-slate-900 border-r border-slate-200"><List className="w-4 h-4" /></button>
              <button className="p-2 bg-white text-slate-400 hover:text-slate-600"><Grid className="w-4 h-4" /></button>
            </div>
          </div>

          <Card>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Modified</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Size</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Owner</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {documents.map((doc, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          doc.type === 'pdf' ? 'bg-red-50 text-red-600' :
                          doc.type === 'docx' ? 'bg-blue-50 text-blue-600' :
                          doc.type === 'pptx' ? 'bg-orange-50 text-orange-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-900">{doc.name}</span>
                        {doc.star && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">{doc.modified}</td>
                    <td className="px-4 py-4 text-sm text-slate-500">{doc.size}</td>
                    <td className="px-4 py-4">
                      <Badge variant="default">{doc.owner}</Badge>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"><Download className="w-4 h-4" /></button>
                        <button className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"><Share2 className="w-4 h-4" /></button>
                        <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"><MoreVertical className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  );
};
