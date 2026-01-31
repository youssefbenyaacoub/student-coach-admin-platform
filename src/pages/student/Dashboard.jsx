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
    MoreHorizontal
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
        bg-white border border-slate-200 rounded-lg transition-all duration-200 ease-out
        ${padding ? 'p-6' : ''}
        ${interactive ? 'hover:shadow-md hover:border-slate-300 cursor-pointer' : 'shadow-sm'}
        ${className}
    `}>
        {children}
    </div>
)

const Button = ({ children, variant = 'primary', className = "", ...props }) => {
    const variants = {
        primary: "bg-student-primary text-white hover:bg-blue-600 active:bg-blue-700",
        secondary: "bg-transparent border border-slate-200 text-slate-600 hover:bg-slate-50",
        tertiary: "text-student-primary hover:underline px-0 py-0",
        ghost: "bg-slate-50 text-slate-600 hover:bg-slate-100"
    }
    return (
        <button className={`
            rounded-sm font-semibold transition-all flex items-center justify-center gap-2 px-4 py-2 text-sm
            ${variants[variant]}
            ${className}
        `} {...props}>
            {children}
        </button>
    )
}

const ProgressBar = ({ value, className = "" }) => (
    <div className={`w-full h-1.5 bg-slate-100 rounded-full overflow-hidden ${className}`}>
        <div
            className="h-full bg-student-primary transition-all duration-1000 ease-out"
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
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[color] || colors.blue}`}>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* LEFT COLUMN (8 cols) */}
            <div className="lg:col-span-8 space-y-8">

                {/* 1. Welcome Section */}
                <section>
                    <h2 className="text-4xl font-heading font-black text-slate-900 tracking-tighter mb-2">
                        Welcome back, {firstName} 👋
                    </h2>
                    <p className="text-lg text-slate-500 italic">"Every expert was once a beginner. Keep pushing."</p>
                </section>

                {/* 2. Today's Priorities */}
                <Card className="bg-slate-50 border-none">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Today's Priorities</h3>
                        <Button variant="tertiary" onClick={() => navigate('/student/tasks')}>View full schedule →</Button>
                    </div>
                    <div className="space-y-4">
                        {tasks.length > 0 ? tasks.slice(0, 3).map((task, i) => (
                            <div key={i} className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate(task.type === 'session' ? '/student/sessions' : '/student/tasks')}>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${task.type === 'session' ? 'border-blue-200 bg-blue-50' : 'border-emerald-200 bg-emerald-50'}`}>
                                    <div className={`w-2.5 h-2.5 rounded-full ${task.type === 'session' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                                </div>
                                <span className="text-sm font-semibold text-slate-700 group-hover:text-student-primary transition-colors">{task.title}</span>
                                <span className="text-xs text-slate-400 ml-auto">{formatDateTime(task.date)}</span>
                            </div>
                        )) : (
                            <div className="text-sm text-slate-500 italic">No urgent priorities for today. Great job!</div>
                        )}
                    </div>
                </Card>

                {/* 3. My Ventures (Project Card) */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">My Venture</h3>
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => navigate('/student/projects')}>
                            <Plus className="w-4 h-4" /> Edit Specs
                        </Button>
                    </div>

                    <Card interactive className="flex flex-col md:flex-row gap-8 group" onClick={() => navigate('/student/projects')}>
                        <div className="w-full md:w-48 h-48 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 border border-slate-200">
                            <Zap className="w-16 h-16 text-slate-300 group-hover:text-student-primary transition-colors" />
                        </div>

                        <div className="flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge color="green">Active</Badge>
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{phaseName} Phase</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{project.name}</h3>
                                </div>
                                <button className="p-1 text-slate-300 hover:text-slate-600"><MoreHorizontal className="w-6 h-6" /></button>
                            </div>

                            <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-6">
                                {project.description || "No description provided yet. Click to define your venture's mission."}
                            </p>

                            <div className="mt-auto space-y-4">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phase Progress</span>
                                        <span className="text-[11px] font-bold text-slate-900">{Math.round(context.progressPercent)}%</span>
                                    </div>
                                    <ProgressBar value={context.progressPercent} />
                                </div>
                                <div className="flex gap-3">
                                    <Button className="flex-1" onClick={(e) => { e.stopPropagation(); navigate('/student/projects'); }}>View Strategy</Button>
                                    <Button variant="secondary" className="flex-1" onClick={(e) => { e.stopPropagation(); navigate('/student/tasks'); }}>Milestones</Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* 4. Mentor Section */}
                <section className="space-y-6 pb-8">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Mentor Insights</h3>
                    <Card className="flex flex-col md:flex-row gap-6">
                        <div className="h-14 w-14 rounded-full overflow-hidden shrink-0 border border-slate-100 shadow-sm">
                            <img src={getAvatarUrl(context.coach?.name || 'Coach')} alt="Coach" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="flex justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900">{context.coach?.name || 'Pending Assignment'}</h4>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Primary Mentor</p>
                                </div>
                                <Button variant="tertiary" onClick={() => navigate('/student/messages')}>Message</Button>
                            </div>
                            <p className="text-sm text-slate-600 italic bg-slate-50 p-3 rounded-lg border border-slate-100">
                                "Focus on identifying your core customer segment before building more features."
                            </p>
                        </div>
                    </Card>
                </section>
            </div>

            {/* RIGHT COLUMN (4 cols) */}
            <div className="lg:col-span-4 space-y-8">

                {/* 1. Quick Access */}
                <section className="space-y-6">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Quick Access</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'New Task', icon: CheckCircle2, path: '/student/tasks' },
                            { label: 'Find Mentor', icon: Users, path: '/student/sessions' },
                            { label: 'Documents', icon: FileText, path: '/student/resources' },
                            { label: 'Schedule', icon: Calendar, path: '/student/calendar' },
                        ].map((action, i) => (
                            <button
                                key={i}
                                onClick={() => navigate(action.path)}
                                className="flex flex-col items-center justify-center gap-3 p-5 bg-white border border-slate-200 rounded-lg hover:border-student-primary hover:shadow-md transition-all group"
                            >
                                <div className="p-2.5 bg-slate-50 text-slate-500 rounded-md group-hover:bg-blue-50 group-hover:text-student-primary transition-colors">
                                    <action.icon className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-900">{action.label}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* 2. Upcoming Events */}
                <section className="space-y-6">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Upcoming</h3>
                    <Card padding={false} className="divide-y divide-slate-50">
                        {tasks.filter(t => t.type === 'session').length > 0 ? (
                            tasks.filter(t => t.type === 'session').slice(0, 3).map((ev, i) => (
                                <div key={i} className="p-4 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                                    <div className="p-2 bg-slate-100 text-slate-400 rounded-sm group-hover:bg-white group-hover:text-student-primary transition-all h-fit">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 leading-tight">{ev.title}</p>
                                        <p className="text-xs text-slate-400 mt-1 font-medium">{formatDateTime(ev.date)}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-center text-xs text-slate-400 font-medium uppercase tracking-wider">No upcoming sessions</div>
                        )}
                        <button className="w-full py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-student-primary hover:bg-slate-50 transition-colors">
                            View Calendar
                        </button>
                    </Card>
                </section>

                {/* 3. Strategic Metrics */}
                <section className="space-y-6">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Strategic Metrics</h3>
                    <Card className="space-y-5">
                        {[
                            { label: 'Tasks Pending', value: tasks.length, color: 'text-amber-500' },
                            { label: 'Phase Progress', value: `${Math.round(context.progressPercent)}%`, color: 'text-student-primary' },
                        ].map((m, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-600">{m.label}</span>
                                <span className={`text-lg font-bold ${m.color}`}>{m.value}</span>
                            </div>
                        ))}

                        <div className="pt-2 border-t border-slate-50">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Quarterly Goal</span>
                                <span className="text-[10px] font-bold text-slate-900">75%</span>
                            </div>
                            <ProgressBar value={75} className="h-1" />
                        </div>
                    </Card>
                </section>

                {/* 4. Pro Card Mockup */}
                <Card className="bg-student-primary border-none p-8 text-center text-white space-y-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-all duration-500" />
                    <div className="relative z-10">
                        <h4 className="text-xl font-bold tracking-tight">Venture Pro</h4>
                        <p className="text-xs text-white/80 mt-2 mb-6 font-medium leading-relaxed">
                            Unlock deep analytics and unlimited mentor sessions.
                        </p>
                        <button className="w-full py-3 bg-white text-student-primary text-[10px] font-bold uppercase tracking-widest rounded-sm hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                            Upgrade Now
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    )
}
