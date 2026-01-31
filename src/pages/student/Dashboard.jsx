import { useMemo } from 'react'
import {
    Calendar,
    MessageCircle,
    CheckCircle2,
    ArrowRight,
    TrendingUp,
    Zap,
    Users,
    FileText,
    Clock,
    AlertCircle,
    Plus,
    MoreHorizontal,
    Settings
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { formatDateTime } from '../../utils/time'
import { getAvatarUrl } from '../../utils/avatarUtils'

// Simplified Stage Map for the progress bar
const STAGE_ORDER = ['Idea', 'Prototype', 'MVP']

// --- UI Components (Internal for Dashboard) ---

const Card = ({ children, className = "", padding = true, interactive = false }) => (
    <div className={`
        bg-white border border-slate-200 rounded-2xl transition-all duration-200 ease-out
        ${padding ? 'p-8' : ''}
        ${interactive ? 'hover:shadow-md hover:border-slate-300 cursor-pointer' : 'shadow-sm'}
        ${className}
    `}>
        {children}
    </div>
)

// Updated Button with slightly larger padding for better touch targets
const Button = ({ children, variant = 'primary', className = "", ...props }) => {
    const variants = {
        primary: "bg-student-primary text-white hover:bg-blue-600 active:bg-blue-700 shadow-sm",
        secondary: "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50",
        tertiary: "text-student-primary hover:underline px-0 py-0",
        ghost: "bg-slate-50 text-slate-600 hover:bg-slate-100"
    }
    return (
        <button className={`
            rounded-xl font-semibold transition-all flex items-center justify-center gap-2 px-5 py-2.5 text-sm
            ${variants[variant]}
            ${className}
        `} {...props}>
            {children}
        </button>
    )
}

const ProgressBar = ({ value, className = "" }) => (
    <div className={`w-full h-2 bg-slate-100 rounded-full overflow-hidden ${className}`}>
        <div
            className="h-full bg-student-primary transition-all duration-1000 ease-out rounded-full"
            style={{ width: `${value}%` }}
        />
    </div>
)

const Badge = ({ children, color = 'blue' }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        purple: 'bg-indigo-50 text-indigo-600',
        red: 'bg-rose-50 text-rose-600'
    }
    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[color] || colors.blue}`}>
            {children}
        </span>
    )
}

export default function StudentDashboard() {
    const { currentUser } = useAuth()
    const { data } = useData()
    const navigate = useNavigate()

    // 1. Get Student & Project Context
    const context = useMemo(() => {
        if (!currentUser?.id || !data) return null
        const student = (data.users ?? []).find((u) => u.id === currentUser.id) ?? null
        const project = (data.projects ?? []).find(p => p.studentId === currentUser.id)

        // Find Coach
        const program = (data.programs ?? []).find(p => (p.participantStudentIds ?? []).includes(currentUser.id))
        const participant = program?.participants?.find(pp => pp.studentId === currentUser.id)
        const coach = participant?.coachId ? (data.users ?? []).find(u => u.id === participant.coachId) : null

        const phaseName = project?.stage || 'Idea'
        const stageIndex = STAGE_ORDER.indexOf(phaseName)
        const progressPercent = stageIndex === -1 ? 0 : ((stageIndex + 0.5) / STAGE_ORDER.length) * 100

        return {
            student,
            project: project || { name: 'New Venture', stage: 'Idea', description: 'Start your entrepreneurial journey today.' },
            phaseName,
            progressPercent,
            coach,
            stageIndex
        }
    }, [currentUser, data])

    // 2. Tasks & Activities
    const tasks = useMemo(() => {
        if (!currentUser?.id || !data) return []
        const t = []
        const now = new Date()

        // Sessions
        const sessions = (data.coachingSessions ?? [])
            .filter((s) => (s.attendeeStudentIds ?? []).includes(currentUser.id) && new Date(s.startsAt) >= now)
            .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
            .slice(0, 3)

        sessions.forEach(s => t.push({ id: s.id, title: `Session: ${s.title}`, date: s.startsAt, type: 'session' }))

        // Deliverables
        const deliverables = (data.deliverables ?? [])
            .filter(d => (d.assignedStudentIds ?? []).includes(currentUser.id))
            .filter(d => {
                const sub = (d.submissions ?? []).find(s => s.studentId === currentUser.id)
                return !sub || sub.status !== 'graded' || sub.grade < 80
            })
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 3)

        deliverables.forEach(d => t.push({ id: d.id, title: `Submit: ${d.title}`, date: d.dueDate, type: 'deliverable' }))

        return t.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5) // Top 5 mixed
    }, [currentUser, data])

    if (!context) return <div className="p-12 text-center text-slate-400">Loading workspace...</div>

    const { student, project, phaseName } = context
    const firstName = (student?.name || currentUser?.name || 'Student').split(' ')[0]

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* LEFT COLUMN (8 cols) */}
            <div className="lg:col-span-8 space-y-10">

                {/* 1. Welcome Section - Increased bottom margin */}
                <section>
                    <h2 className="text-4xl lg:text-5xl font-heading font-black text-slate-900 tracking-tighter mb-4">
                        Welcome back, {firstName} 👋
                    </h2>
                    <p className="text-xl text-slate-500 font-medium max-w-2xl">"Every expert was once a beginner. Keep pushing forward."</p>
                </section>

                {/* 2. Today's Priorities */}
                <Card className="bg-slate-50/50 border-none">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Today's Priorities
                        </h3>
                        <Button variant="tertiary" onClick={() => navigate('/student/tasks')}>View full schedule →</Button>
                    </div>
                    <div className="space-y-4">
                        {tasks.length > 0 ? tasks.slice(0, 3).map((task, i) => (
                            <div key={i} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-student-primary/30 transition-all cursor-pointer group" onClick={() => navigate(task.type === 'session' ? '/student/sessions' : '/student/tasks')}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${task.type === 'session' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                    {task.type === 'session' ? <Calendar className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-800 truncate group-hover:text-student-primary transition-colors">{task.title}</h4>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">{formatDateTime(task.date)}</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-student-primary -translate-x-2 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all" />
                            </div>
                        )) : (
                            <div className="text-sm text-slate-500 italic p-4 bg-white rounded-xl border border-slate-100">No urgent priorities for today. Great job!</div>
                        )}
                    </div>
                </Card>

                {/* 3. My Ventures (Project Card) */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Zap className="w-4 h-4" /> My Venture
                        </h3>
                        {/* Action buttons could go here */}
                    </div>

                    <Card interactive className="flex flex-col md:flex-row gap-8 group bg-white border-slate-200 hover:border-student-primary" onClick={() => navigate('/student/projects')}>
                        <div className="w-full md:w-56 h-56 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 group-hover:from-blue-50 group-hover:to-white transition-colors">
                            <Zap className="w-20 h-20 text-slate-300 group-hover:text-student-primary transition-colors" />
                        </div>

                        <div className="flex-1 flex flex-col py-2">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Badge color="green">Active</Badge>
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{phaseName} Phase</span>
                                    </div>
                                    <h3 className="text-3xl font-heading font-bold text-slate-900 tracking-tight leading-tight">{project.name}</h3>
                                </div>
                                <button className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"><MoreHorizontal className="w-6 h-6" /></button>
                            </div>

                            <p className="text-slate-500 text-base leading-relaxed line-clamp-2 mb-8 max-w-lg">
                                {project.description || "No description provided yet. Click to define your venture's mission."}
                            </p>

                            <div className="mt-auto space-y-5">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phase Progress</span>
                                        <span className="text-[11px] font-bold text-slate-900">{Math.round(context.progressPercent)}%</span>
                                    </div>
                                    <ProgressBar value={context.progressPercent} />
                                </div>
                                <div className="flex gap-4 pt-2">
                                    <Button className="flex-1 shadow-md shadow-blue-500/20" onClick={(e) => { e.stopPropagation(); navigate('/student/projects'); }}>View Strategy</Button>
                                    <Button variant="secondary" className="flex-1" onClick={(e) => { e.stopPropagation(); navigate('/student/tasks'); }}>Milestones</Button>
                                    <Button variant="ghost" className="px-3" onClick={(e) => { e.stopPropagation(); }}><Settings className="w-5 h-5 text-slate-400" /></Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* 4. Mentor Section */}
                <section className="space-y-6 pb-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Mentor Insights</h3>
                    <Card className="flex flex-col md:flex-row gap-8 items-center md:items-start bg-gradient-to-r from-white to-slate-50/50">
                        <div className="h-16 w-16 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-soft ring-2 ring-slate-100">
                            <img src={getAvatarUrl(context.coach?.name || 'Coach')} alt="Coach" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 space-y-3 w-full text-center md:text-left">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900">{context.coach?.name || 'Pending Assignment'}</h4>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Primary Mentor</p>
                                </div>
                                <Button variant="secondary" onClick={() => navigate('/student/messages')} className="w-full md:w-auto">
                                    <MessageCircle className="w-4 h-4" /> Message Coach
                                </Button>
                            </div>
                            <div className="relative bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-left">
                                <div className="absolute -top-2 left-8 w-4 h-4 bg-white border-t border-l border-slate-100 rotate-45"></div>
                                <p className="text-sm text-slate-600 italic leading-relaxed">
                                    "Focus on identifying your core customer segment before building more features. Let's review your canvas next week."
                                </p>
                            </div>
                        </div>
                    </Card>
                </section>
            </div>

            {/* RIGHT COLUMN (4 cols) */}
            <div className="lg:col-span-4 space-y-10">

                {/* 1. Quick Access */}
                <section className="space-y-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quick Access</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'New Task', icon: CheckCircle2, path: '/student/tasks' },
                            { label: 'Find Mentor', icon: Users, path: '/student/sessions' },
                            { label: 'Documents', icon: FileText, path: '/student/resources' },
                            { label: 'Schedule', icon: Calendar, path: '/student/calendar' },
                        ].map((action, i) => (
                            <button
                                key={i}
                                onClick={() => navigate(action.path)}
                                className="flex flex-col items-center justify-center gap-4 p-6 bg-white border border-slate-200 rounded-2xl hover:border-student-primary hover:shadow-soft hover:-translate-y-1 transition-all group duration-300"
                            >
                                <div className="p-3 bg-slate-50 text-slate-500 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-inner">
                                    <action.icon className="w-6 h-6" />
                                </div>
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-900 transition-colors">{action.label}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* 2. Upcoming Events */}
                <section className="space-y-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Upcoming Sessions</h3>
                    <Card padding={false} className="divide-y divide-slate-50 overflow-hidden">
                        {tasks.filter(t => t.type === 'session').length > 0 ? (
                            tasks.filter(t => t.type === 'session').slice(0, 3).map((ev, i) => (
                                <div key={i} className="p-5 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                                    <div className="flex flex-col items-center justify-center h-12 w-12 bg-slate-100 text-slate-500 rounded-xl group-hover:bg-white group-hover:text-student-primary shadow-sm group-hover:shadow-md transition-all font-bold leading-none border border-slate-200 group-hover:border-transparent">
                                        <span className="text-[10px] uppercase">{new Date(ev.date).toLocaleString('default', { month: 'short' })}</span>
                                        <span className="text-lg">{new Date(ev.date).getDate()}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 leading-tight group-hover:text-student-primary transition-colors">{ev.title}</p>
                                        <p className="text-xs text-slate-400 mt-1.5 font-medium flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {formatDateTime(ev.date)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-xs text-slate-400 font-medium uppercase tracking-wider bg-slate-50/50">No upcoming sessions</div>
                        )}
                        <button className="w-full py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-student-primary hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                            View Full Calendar <ArrowRight className="w-3 h-3" />
                        </button>
                    </Card>
                </section>

                {/* 3. Strategic Metrics */}
                <section className="space-y-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Strategic Metrics</h3>
                    <Card className="space-y-6">
                        <div className="grid grid-cols-2 divide-x divide-slate-100">
                            {[
                                { label: 'Tasks Pending', value: tasks.length, color: 'text-amber-500' },
                                { label: 'Phase Progress', value: `${Math.round(context.progressPercent)}%`, color: 'text-student-primary' },
                            ].map((m, i) => (
                                <div key={i} className={`flex flex-col items-center justify-center text-center ${i === 0 ? 'pr-4' : 'pl-4'}`}>
                                    <span className={`text-2xl font-black ${m.color} mb-1`}>{m.value}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-6 border-t border-slate-50">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-2">
                                    <Target className="w-3 h-3" /> Quarterly Goal
                                </span>
                                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">75%</span>
                            </div>
                            <ProgressBar value={75} className="h-2" />
                            <p className="text-[10px] text-slate-400 mt-3 text-center">You are ahead of 68% of users</p>
                        </div>
                    </Card>
                </section>

                {/* 4. Pro Card Mockup */}
                <Card className="bg-[#111827] border-none p-10 text-center text-white space-y-6 relative overflow-hidden group shadow-xl">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-student-primary/30 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-student-primary/40 transition-all duration-700" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full -ml-16 -mb-16 blur-2xl group-hover:bg-purple-500/30 transition-all duration-700" />

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-4 border border-white/10 shadow-lg">
                            <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                        </div>
                        <h4 className="text-2xl font-bold tracking-tight">Venture Pro</h4>
                        <p className="text-sm text-slate-400 mt-2 font-medium leading-relaxed">
                            Unlock deep analytics and unlimited mentor sessions.
                        </p>
                    </div>
                    <button className="relative z-10 w-full py-3.5 bg-white text-[#111827] text-xs font-bold uppercase tracking-widest rounded-xl hover:shadow-lg hover:bg-slate-50 transition-all transform hover:-translate-y-0.5">
                        Upgrade Now
                    </button>
                </Card>
            </div>
        </div>
    )
}
