import { useState, useMemo } from 'react'
import {
  User, Mail, Edit2, Save, X, RefreshCw,
  Target, Rocket, Shield, Clock, Briefcase,
  ChevronRight, ExternalLink, Trash2, Plus,
  CheckCircle2, AlertCircle, Lock, Smartphone,
  Globe, Zap, Leaf
} from 'lucide-react'
import Card from './Card'
import Modal from './Modal'
import ConfirmDialog from './ConfirmDialog'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { getAvatarUrl } from '../../utils/avatarUtils'

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
    skills: ['React', 'UI/UX', 'Marketing', 'Prototyping'],
    interests: ['AI', 'FinTech', 'Sustainability', 'EdTech']
  })

  // DiceBear Avatar URL
  const avatarUrl = getAvatarUrl(seed)

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
            {/* Digital Skills */}
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
                      <Smartphone size={12} className="opacity-50" />
                      {skill}
                      {isEditing && (
                        <button onClick={() => removeTag('skill', skill)} className="hover:text-red-500"><X size={12} /></button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </Card>

            {/* Core Interests */}
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
                      <Briefcase size={12} className="opacity-50" />
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
        </div>

        <div className="space-y-8">
          {/* Account Settings */}
          <Card className="border-none shadow-sm bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400">ACCOUNT</span>
                <span className="px-2.5 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black rounded-full uppercase italic">
                  {role}
                </span>
              </div>

              <div className="space-y-4 mb-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Email Address</label>
                  <div className="flex items-center gap-2 mt-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 text-sm font-medium">
                    <Mail size={14} />
                    {profile.email}
                    <span className="ml-auto text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500">Read-only</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between py-3 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Lock size={14} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Security & Password</span>
                </div>
                <X size={16} className={`text-slate-400 transition-transform ${showAdvanced ? 'rotate-0' : 'rotate-45'}`} />
              </button>

              {showAdvanced && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase">Change Password</p>
                    <input type="password" placeholder="Current Password" className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors" />
                    <input type="password" placeholder="New Password" className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors" />
                    <button className="w-full py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all">
                      Update Password
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
