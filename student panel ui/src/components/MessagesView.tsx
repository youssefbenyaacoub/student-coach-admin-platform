import React from 'react';
import { 
  Send, 
  Plus, 
  Search, 
  Phone, 
  Video, 
  Info,
  MoreVertical,
  Paperclip,
  Smile,
  Image as ImageIcon
} from 'lucide-react';
import { Avatar, Input, Button, Card } from './UI';

const contacts = [
  { id: 1, name: 'Sarah Chen', role: 'Mentor', lastMsg: 'The financial model looks solid, Alex. Let\'s discuss the burn rate.', time: '10:30 AM', online: true, unread: 2 },
  { id: 2, name: 'Jordan Lee', role: 'Team Member', lastMsg: 'I\'ve uploaded the new wireframes to the Figma folder.', time: 'Yesterday', online: false, unread: 0 },
  { id: 3, name: 'Incubator Support', role: 'Admin', lastMsg: 'Your room booking for the pitch room has been confirmed.', time: '2 days ago', online: true, unread: 0 },
  { id: 4, name: 'Morgan Stanley', role: 'Student', lastMsg: 'Are you going to the networking mixer on Friday?', time: 'Monday', online: false, unread: 0 },
  { id: 5, name: 'Dr. Elizabeth Smith', role: 'Professor', lastMsg: 'Please review the case study I sent over.', time: 'Jan 28', online: true, unread: 0 },
];

const messages = [
  { id: 1, sender: 'Sarah Chen', text: 'Hi Alex! I just finished reviewing the GreenTech MVP pitch deck.', time: '10:15 AM', type: 'received' },
  { id: 2, sender: 'Sarah Chen', text: 'The market analysis is very thorough. I love the way you\'ve positioned the competitive advantage.', time: '10:16 AM', type: 'received' },
  { id: 3, sender: 'Alex Johnson', text: 'Thanks Sarah! I really appreciate the feedback. Do you think the financial projections are realistic enough for the seed round?', time: '10:20 AM', type: 'sent' },
  { id: 4, sender: 'Sarah Chen', text: 'The financial model looks solid, Alex. Let\'s discuss the burn rate and your hiring plan in our next session.', time: '10:30 AM', type: 'received' },
  { id: 5, sender: 'Sarah Chen', text: 'Are you free for a quick 15-min sync at 2 PM today?', time: '10:31 AM', type: 'received' },
];

export const MessagesView = () => {
  return (
    <div className="h-[calc(100vh-160px)] flex flex-col md:flex-row bg-white rounded-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-700">
      {/* Sidebar */}
      <div className="w-full md:w-80 border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Messages</h3>
          <Button variant="ghost" className="p-2 h-auto rounded-full">
            <Plus className="w-5 h-5 text-indigo-600" />
          </Button>
        </div>
        <div className="p-4">
          <Input placeholder="Search chats..." icon={Search} />
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {contacts.map((contact) => (
            <button 
              key={contact.id}
              className={`w-full p-4 flex gap-3 text-left hover:bg-slate-50 transition-colors relative ${contact.id === 1 ? 'bg-indigo-50/50' : ''}`}
            >
              <div className="relative">
                <Avatar name={contact.name} />
                {contact.online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h4 className="text-sm font-semibold text-slate-900 truncate">{contact.name}</h4>
                  <span className="text-[10px] text-slate-400 font-medium">{contact.time}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">{contact.lastMsg}</p>
                <p className="text-[10px] text-indigo-600 font-medium mt-1">{contact.role}</p>
              </div>
              {contact.unread > 0 && (
                <span className="absolute right-4 bottom-8 w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {contact.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
        {/* Chat Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name="Sarah Chen" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-none">Sarah Chen</h3>
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                Active now
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" className="p-2"><Phone className="w-4 h-4" /></Button>
            <Button variant="ghost" className="p-2"><Video className="w-4 h-4" /></Button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <Button variant="ghost" className="p-2"><Info className="w-4 h-4" /></Button>
            <Button variant="ghost" className="p-2"><MoreVertical className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          <div className="flex justify-center my-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">Today, Jan 31</span>
          </div>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.type === 'sent' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] md:max-w-[70%] group relative ${msg.type === 'sent' ? 'order-1' : ''}`}>
                <div className={`p-4 rounded-2xl text-sm shadow-sm ${
                  msg.type === 'sent' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
                <p className={`text-[10px] text-slate-400 mt-1.5 ${msg.type === 'sent' ? 'text-right' : 'text-left'}`}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-end gap-2 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all">
            <div className="flex gap-1 pb-1 px-1">
              <Button variant="ghost" className="p-1.5 rounded-lg h-auto text-slate-400 hover:text-indigo-600"><Paperclip className="w-5 h-5" /></Button>
              <Button variant="ghost" className="p-1.5 rounded-lg h-auto text-slate-400 hover:text-indigo-600"><ImageIcon className="w-5 h-5" /></Button>
            </div>
            <textarea 
              rows={1}
              placeholder="Write a message..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 py-2 resize-none placeholder:text-slate-400"
            />
            <div className="flex gap-1 pb-1 px-1">
              <Button variant="ghost" className="p-1.5 rounded-lg h-auto text-slate-400 hover:text-indigo-600"><Smile className="w-5 h-5" /></Button>
              <Button className="p-2 h-auto rounded-lg">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
