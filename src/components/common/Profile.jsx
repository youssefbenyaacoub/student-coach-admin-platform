import { useState, useMemo } from 'react'
import {
  User, Mail, Edit2, Save, X, RefreshCw,
  Target, Rocket, Shield, Clock, Briefcase,
  ChevronRight, ExternalLink, Trash2, Plus,
  CheckCircle2, AlertCircle
} from 'lucide-react'
import Card from './Card'
import Modal from './Modal'
import ConfirmDialog from './ConfirmDialog'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'

export default function Profile() {
  const { currentUser, role } = useAuth()
  const { showToast } = useToast()

  // -- State Logic --
  const [isEditing, setIsEditing] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [seed, setSeed] = useState(currentUser?.email || 'incubator-seed')

  // Tag-based inputs state
  const [newSkill, setNewSkill] = useState('')
  const [newInterest, setNewInterest] = useState('')

  const [profile, setProfile] = useState({
    name: currentUser?.name || 'Arij Ben Yaacoub',
    email: currentUser?.email || 'arij.by@incubator.com',
    bio: 'Aspiring entrepreneur focused on sustainable tech solutions. Currently working on a green energy marketplace prototype.',
    skills: ['React', 'Node.js', 'UI Design', 'Market Research'],
    interests: ['Renewable Energy', 'Fintech', 'Agrotech', 'B2B SaaS']
  })

  // Mock Active Project
  const activeProject = {
    name: 'EcoFlow Marketplace',
    stage: 'PROTOTYPE', // IDEA, PROTOTYPE, MVP
    progress: 65,
    coach: 'Sarah Johnson',
    image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=60'
  }

  // Mock Programs
  const enrolledPrograms = [
    { id: 1, name: 'Incubation Batch Q1 2026', status: 'Active', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { id: 2, name: 'Pre-Seed Bootcamp', status: 'Completed', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' }
  ]

  // Mock Activity
  const recentActivity = [
    { id: 1, action: 'Submitted MVP wireframes', time: '2 hours ago', icon: Rocket, color: 'text-blue-500 bg-blue-50' },
    { id: 2, action: 'Updated task: Competitor Analysis', time: 'Yesterday', icon: Target, color: 'text-amber-500 bg-amber-50' },
    { id: 3, action: 'Received feedback from Sarah Johnson', time: '2 days ago', icon: Shield, color: 'text-purple-500 bg-purple-50' },
    { id: 4, action: 'Registered for Product-Market Fit Workshop', time: '3 days ago', icon: Clock, color: 'text-slate-500 bg-slate-50' }
  ]

  // DiceBear Avatar URL
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`

  // Progress Completion logic
  const completion = useMemo(() => {
    let score = 0
    if (profile.name) score += 20
    if (profile.bio) score += 20
    if (profile.skills.length > 0) score += 20
    if (profile.interests.length > 0) score += 20
    if (seed !== 'incubator-seed') score += 20
    return score
  }, [profile, seed])

  // -- Handlers --
  const regenerateAvatar = () => {
    setSeed(Math.random().toString(36).substring(7))
    showToast('Avatar regenerated!', 'info')
  }

  const handleSave = () => {
    setIsEditing(false)
    showToast('Profile updated successfully!', 'success')
  }

  const addTag = (type, value) => {
    if (!value.trim()) return
    const key = type === 'skill' ? 'skills' : 'interests'
    if (profile[key].includes(value)) return
    setProfile(prev => ({ ...prev, [key]: [...prev[key], value] }))
    if (type === 'skill') setNewSkill('')
    else setNewInterest('')
  }

  const removeTag = (type, tag) => {
    const key = type === 'skill' ? 'skills' : 'interests'
    setProfile(prev => ({ ...prev, [key]: prev[key].filter(t => t !== tag) }))
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
      {/* 1. Profile Header */}
      <div className="relative mb-8 pt-12">
        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-3xl opacity-10 shadow-inner"></div>

        <div className="relative flex flex-col md:flex-row items-end gap-6 px-8">
          <div className="relative group">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl border-4 border-white dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden ring-4 ring-indigo-500/10">
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
            </div>
            <button
              onClick={regenerateAvatar}
              className="absolute -bottom-2 -right-2 p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 text-indigo-600 hover:text-indigo-700 transition-all active:rotate-180"
              title="Regenerate Avatar"
            >
              <RefreshCw size={18} />
            </button>
          </div>

          <div className="flex-1 pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1 font-heading">{profile.name}</h1>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Mail size={16} />
                  <span className="text-sm font-medium">{profile.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl shadow-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-all font-bold text-sm">
                    <Edit2 size={16} />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">
                      Cancel
                    </button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all font-bold text-sm">
                      <Save size={16} />
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Completion Indicator */}
            <div className="mt-6 max-w-xs">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Profile Completion</span>
                <span className="text-xs font-bold text-indigo-600">{completion}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                  style={{ width: `${completion}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* 2. About Me */}
          <Card className="overflow-hidden border-none shadow-sm bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <User size={20} />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">About Me</h2>
              </div>
              {isEditing ? (
                <textarea
                  className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none text-slate-700 dark:text-slate-300"
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about your background and entrepreneurial goals..."
                />
              ) : (
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed italic border-l-4 border-indigo-500/20 pl-6 py-2">
                  "{profile.bio}"
                </p>
              )}
            </div>
          </Card>

          {/* 3. Skills & Interests */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Skills */}
            <Card className="border-none shadow-sm bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Digital Skills</h3>
                  {isEditing && (
                    <div className="flex gap-1">
                      <input
                        className="px-2 py-1 text-xs border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                        placeholder="Add skill..."
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTag('skill', newSkill)}
                      />
                      <button onClick={() => addTag('skill', newSkill)} className="p-1 text-indigo-600"><Plus size={16} /></button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map(skill => (
                    <span key={skill} className="group flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full border border-indigo-100 dark:border-indigo-900/50">
                      {skill}
                      {isEditing && (
                        <button onClick={() => removeTag('skill', skill)} className="hover:text-red-500"><X size={12} /></button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </Card>

            {/* Interests */}
            <Card className="border-none shadow-sm bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Core Interests</h3>
                  {isEditing && (
                    <div className="flex gap-1">
                      <input
                        className="px-2 py-1 text-xs border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                        placeholder="Add interest..."
                        value={newInterest}
                        onChange={(e) => setNewInterest(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTag('interest', newInterest)}
                      />
                      <button onClick={() => addTag('interest', newInterest)} className="p-1 text-purple-600"><Plus size={16} /></button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map(interest => (
                    <span key={interest} className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full border border-purple-100 dark:border-purple-900/50">
                      {interest}
                      {isEditing && (
                        <button onClick={() => removeTag('interest', interest)} className="hover:text-red-500"><X size={12} /></button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* 4. Active Project Snapshot */}
          <Card className="border-none shadow-sm bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800 overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-48 bg-slate-100 dark:bg-slate-800 overflow-hidden h-48 md:h-auto">
                <img src={activeProject.image} alt="Project" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
              </div>
              <div className="flex-1 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-black text-indigo-600 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 rounded-md uppercase tracking-widest mb-2 inline-block">Current Focus</span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{activeProject.name}</h3>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="px-3 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-[10px] font-black tracking-tighter shadow-sm">
                      {activeProject.stage}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Coach</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{activeProject.coach}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status</p>
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <p className="text-sm font-bold text-emerald-600">On Track</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>Overall Progress</span>
                    <span>{activeProject.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-800 dark:bg-white rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${activeProject.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          {/* 5. My Programs */}
          <Card title="Active Programs" className="border-none shadow-sm bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800">
            <div className="space-y-3 pt-6 p-6">
              {enrolledPrograms.map(program => (
                <div key={program.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all hover:shadow-md ${program.color} cursor-pointer group`}>
                  <div>
                    <p className="font-bold text-sm tracking-tight">{program.name}</p>
                    <p className="text-[10px] opacity-60 font-medium">Click to view dashboard</p>
                  </div>
                  <ChevronRight size={16} className="opacity-40 group-hover:translate-x-1 transition-transform" />
                </div>
              ))}
            </div>
          </Card>

          {/* 6. Recent Activity */}
          <Card className="border-none shadow-sm bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800">
            <div className="p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Recent Activity</h3>
              <div className="space-y-6 relative">
                <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-100 dark:bg-slate-800"></div>
                {recentActivity.map((activity, idx) => (
                  <div key={activity.id} className="relative pl-10">
                    <div className={`absolute left-0 top-1 p-2 rounded-lg z-10 ${activity.color}`}>
                      <activity.icon size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">{activity.action}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* 7. Account Info */}
          <Card className="border-none shadow-sm bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400">ACCOUNT TYPE</span>
                <span className="px-2.5 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black rounded-full uppercase italic">
                  {role}
                </span>
              </div>

              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between py-3 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Settings & Security</span>
                <X size={16} className={`text-slate-400 transition-transform ${showAdvanced ? 'rotate-0' : 'rotate-45'}`} />
              </button>

              {showAdvanced && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between group">
                    <span className="text-[10px] font-bold text-slate-400">USER ID REFERENCE</span>
                    <span className="text-[10px] font-mono text-slate-600 group-hover:text-indigo-600 transition-colors cursor-help">
                      {currentUser?.id?.slice(0, 12)}...
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">TWO-FACTOR AUTH</span>
                    <span className="text-[10px] font-black text-emerald-500">ENABLED</span>
                  </div>
                  <button className="w-full py-2 bg-red-50 text-red-600 dark:bg-red-900/20 text-[10px] font-black rounded-lg hover:bg-red-100 transition-all uppercase tracking-widest">
                    Request Account Deletion
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
