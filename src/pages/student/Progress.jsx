import { useMemo } from 'react'
import {
    CheckCircle2,
    Clock,
    TrendingUp,
    Target,
    Zap,
    BookOpen,
    Calendar,
    ArrowUpRight
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import Card from '../../components/common/Card'
import { formatDate } from '../../utils/time'

const STAGE_ORDER = ['Idea', 'Prototype', 'MVP', 'Lanzamiento']

export default function StudentProgress() {
    const { currentUser } = useAuth()
    const { data } = useData()

    const stats = useMemo(() => {
        if (!currentUser?.id || !data) return null

        // 1. Project Info
        const project = (data.projects ?? []).find(p => p.studentId === currentUser.id)
        const currentStage = project?.stage || 'Idea'
        const stageIndex = STAGE_ORDER.indexOf(currentStage)
        const progressPercent = stageIndex === -1 ? 0 : ((stageIndex + 1) / STAGE_ORDER.length) * 100

        // 2. Deliverables Stats
        const deliverables = (data.deliverables ?? []).filter(d => (d.assignedStudentIds ?? []).includes(currentUser.id))
        const totalDeliverables = deliverables.length
        const completedDeliverables = deliverables.filter(d => {
            const sub = (d.submissions ?? []).find(s => s.studentId === currentUser.id)
            return sub?.status === 'graded' && sub.grade >= 80
        }).length

        // 3. Task Stats
        const studentTasks = (data.tasks ?? []).filter(t => t.studentId === currentUser.id)
        const totalTasks = studentTasks.length
        const completedTasks = studentTasks.filter(t => t.status === 'completed' || t.status === 'reviewed').length

        // 4. Attendance
        const sessions = (data.coachingSessions ?? []).filter(s => (s.attendeeStudentIds ?? []).includes(currentUser.id))
        const attendedSessions = sessions.filter(s => {
            const myAttendance = s.attendance?.find(a => a.student_id === currentUser.id)
            return myAttendance?.attendance_status === 'present'
        }).length

        return {
            project: project || { title: 'New Venture', stage: 'Idea' },
            currentStage,
            progressPercent,
            deliverables: { completed: completedDeliverables, total: totalDeliverables },
            tasks: { completed: completedTasks, total: totalTasks },
            attendance: { attended: attendedSessions, total: sessions.length },
            sessions
        }
    }, [currentUser, data])

    if (!stats) return <div className="p-8 text-center text-slate-500">Loading your progress...</div>

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {/* Header */}
            <header>
                <h1 className="text-4xl font-heading font-bold text-slate-900">Your Journey Progress</h1>
                <p className="mt-2 text-lg text-slate-500 font-medium max-w-2xl">
                    Track your milestones, monitor your deliverables, and see how far you've come.
                </p>
            </header>

            {/* Quick Stats Grid */}
            <div className="grid gap-6 md:grid-cols-4">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 flex flex-col justify-between p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-blue-600">
                            <Target className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-bold text-blue-600 bg-white/50 px-2 py-1 rounded-lg">Goal</span>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Current Phase</div>
                        <div className="text-2xl font-bold text-slate-900">{stats.currentStage}</div>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100 flex flex-col justify-between p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-600">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-bold text-emerald-600 bg-white/50 px-2 py-1 rounded-lg">Completed</span>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Deliverables</div>
                        <div className="text-2xl font-bold text-slate-900">{stats.deliverables.completed} / {stats.deliverables.total}</div>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100 flex flex-col justify-between p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-amber-600">
                            <Zap className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-bold text-amber-600 bg-white/50 px-2 py-1 rounded-lg">Tasks</span>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Action Items</div>
                        <div className="text-2xl font-bold text-slate-900">{stats.tasks.completed} / {stats.tasks.total}</div>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100 flex flex-col justify-between p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-purple-600">
                            <Clock className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-bold text-purple-600 bg-white/50 px-2 py-1 rounded-lg">Attendance</span>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Sessions</div>
                        <div className="text-2xl font-bold text-slate-900">{stats.attendance.attended} / {stats.attendance.total}</div>
                    </div>
                </Card>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Visual Journey Card */}
                <Card className="p-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-student-primary" />
                        Milestone Roadmap
                    </h2>

                    <div className="relative pt-8 pb-4">
                        {/* Connecting Line */}
                        <div className="absolute top-[3.75rem] left-0 w-full h-1 bg-slate-100 rounded-full dark:bg-slate-800" />
                        <div
                            className="absolute top-[3.75rem] left-0 h-1 bg-gradient-to-r from-student-primary to-blue-400 rounded-full transition-all duration-1000"
                            style={{ width: `${stats.progressPercent}%` }}
                        />

                        {/* Nodes */}
                        <div className="relative flex justify-between">
                            {STAGE_ORDER.map((stage, i) => {
                                const isCompleted = i < stats.stageIndex + 1
                                const isCurrent = i === stats.stageIndex
                                return (
                                    <div key={stage} className="flex flex-col items-center">
                                        <div className={`relative z-10 h-10 w-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 ${isCompleted ? 'bg-student-primary text-white scale-110 shadow-blue-500/20' : 'bg-white text-slate-300 border-2 border-slate-100'}`}>
                                            {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <span>{i + 1}</span>}
                                            {isCurrent && <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-400 border-2 border-white animate-pulse" />}
                                        </div>
                                        <div className={`mt-3 text-xs font-bold uppercase tracking-wider ${isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>{stage}</div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="mt-12 p-6 rounded-2xl bg-slate-50 border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                        <h3 className="font-bold text-slate-800 mb-2">Project: {stats.project.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            You are currently in the <strong>{stats.currentStage}</strong> phase.
                            Complete remaining tasks and deliverables to unlock the next milestone.
                        </p>
                    </div>
                </Card>

                {/* Session History */}
                <Card className="p-8 overflow-hidden h-full">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-student-primary" />
                        Attendance History
                    </h2>
                    <div className="space-y-4 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
                        {stats.sessions.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 italic">No sessions scheduled for your program yet.</div>
                        ) : (
                            stats.sessions.map((s) => {
                                const myAtt = s.attendance?.find(a => a.student_id === currentUser.id)
                                const status = myAtt?.attendance_status || 'not_recorded'
                                return (
                                    <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors bg-white">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                                <Calendar className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{s.title}</div>
                                                <div className="text-xs text-slate-500">{formatDate(s.startsAt)}</div>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {status.replace('_', ' ')}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </Card>
            </div>
        </div>
    )
}
