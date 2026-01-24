import { useMemo } from 'react'
import {
  Calendar,
  MessageCircle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { formatDateTime } from '../../utils/time'

// Mock project phases for a simpler progress view
const PROJECT_PHASES = ['Ideation', 'Validation', 'MVP', 'Growth']

// Mock project data for specific students (Simplified)
const PROJECT_DATA = {
  u_student_1: {
    name: 'EcoEat',
    phaseIndex: 2, // MVP
    nextMilestone: 'Prototype Demo',
  },
  u_student_2: {
    name: 'FinHacks',
    phaseIndex: 1, // Validation
    nextMilestone: 'Customer Interviews',
  },
  default: {
    name: 'New Venture',
    phaseIndex: 0,
    nextMilestone: 'Problem Statement',
  },
}

export default function StudentDashboard() {
  const { currentUser } = useAuth()
  const { data } = useData()
  const navigate = useNavigate()

  // 1. Get Student & Project Context
  const context = useMemo(() => {
    if (!currentUser?.id || !data) return null
    const student = data.users.find((u) => u.id === currentUser.id)
    const project = PROJECT_DATA[student?.id] || PROJECT_DATA.default
    const phaseName = PROJECT_PHASES[project.phaseIndex]
    const progressPercent = ((project.phaseIndex + 0.5) / PROJECT_PHASES.length) * 100

    return { student, project, phaseName, progressPercent }
  }, [currentUser, data])

  // 2. Derive Actions (Tasks)
  const todaysTasks = useMemo(() => {
    if (!currentUser?.id || !data) return []
    const tasks = []

    // A. Upcoming Sessions (Next 48h)
    const now = new Date()
    const next48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    
    const sessions = (data.coachingSessions ?? [])
      .filter((s) => s.attendeeStudentIds.includes(currentUser.id))
      .filter((s) => {
        const d = new Date(s.startsAt)
        return d >= now && d <= next48h
      })
      .slice(0, 1) // Just the next one
    
    sessions.forEach(s => {
        tasks.push({
            id: s.id,
            type: 'session',
            title: `Coaching Session: ${s.title}`,
            time: s.startsAt,
            icon: Calendar,
            actionLabel: 'Join Room',
            actionUrl: '/student/sessions' 
        })
    })

    // B. Pending Deliverables (Overdue or Due Soon)
    const deliverables = (data.deliverables ?? [])
      .filter(d => d.assignedStudentIds.includes(currentUser.id))
      .filter(d => {
        // Not submitted
        const sub = d.submissions?.find(s => s.studentId === currentUser.id)
        if (sub) return false 
        // Due soon?
        const due = new Date(d.dueDate)
        return due <= next48h // Overdue or due in 48h
      })
      .slice(0, 2)

    deliverables.forEach(d => {
        tasks.push({
            id: d.id,
            type: 'deliverable',
            title: `Submit: ${d.title}`,
            time: d.dueDate,
            icon: CheckCircle2,
            actionLabel: 'Complete',
            actionUrl: `/student/deliverables`
        })
    })
    
    // Fallback if empty
    if (tasks.length === 0) {
        tasks.push({
            id: 'default-1',
            type: 'review',
            title: 'Review your project plan',
            time: null,
            icon: TrendingUp,
            actionLabel: 'View Project',
            actionUrl: '/student/programs'
        })
    }

    return tasks.sort((a, b) => (a.time && b.time ? new Date(a.time) - new Date(b.time) : 0))
  }, [currentUser, data])

  // 3. Get Coach Message Preview
  const coachMessage = useMemo(() => {
    if (!currentUser?.id || !data) return null
    
    // Find last message from a coach
    const msgs = (data.messages ?? [])
        .filter(m => m.receiverId === currentUser.id)
        .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))

    const lastCoachMsg = msgs.find(m => {
        const sender = data.users.find(u => u.id === m.senderId)
        return sender?.role === 'coach'
    })

    if (!lastCoachMsg) return null
    const coach = data.users.find(u => u.id === lastCoachMsg.senderId)

    return {
        id: lastCoachMsg.id,
        senderName: coach?.name || 'Coach',
        senderAvatar: coach?.name.charAt(0),
        text: lastCoachMsg.content,
        time: lastCoachMsg.sentAt,
        isRead: !!lastCoachMsg.readAt
    }

  }, [currentUser, data])


  if (!context) return null
  const { student, project, phaseName } = context

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
      
      {/* 1. Welcome Header */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-student-primary to-blue-600 px-8 py-10 shadow-xl text-white">
            <div className="relative z-10">
                <h1 className="text-4xl font-heading font-bold tracking-tight mb-3">
                    Hello, {student.name.split(' ')[0]}. 👋
                </h1>
                <p className="text-lg text-blue-50 font-medium max-w-xl leading-relaxed">
                    You're making solid progress on <span className="font-bold text-white bg-white/20 px-2 py-0.5 rounded-lg">{project.name}</span>.
                    Let's continue pushing the boundaries today.
                </p>
                
                <div className="mt-8 flex items-center gap-4">
                     <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2backdrop-blur-sm">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-100">Current Phase</span>
                        <span className="font-heading font-bold">{phaseName}</span>
                     </div>
                </div>
            </div>
            {/* Decorative background circles */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
      </header>

      <div className="grid gap-8 md:grid-cols-5">
        
        {/* LEFT COLUMN: Tasks & Progress (wider) */}
        <div className="md:col-span-3 space-y-8">
            
            {/* Today's Focus */}
            <section>
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-xl font-heading font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-student-primary" />
                        Priority Tasks
                    </h2>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                        {new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                    </span>
                </div>
                
                <div className="space-y-4">
                    {todaysTasks.map(task => {
                        const Icon = task.icon
                        return (
                            <div key={task.id} className="group relative flex items-center gap-5 rounded-2xl bg-white p-5 shadow-sm border border-slate-100 transition-all hover:shadow-lg hover:border-student-primary/30 hover:-translate-y-0.5 px-6">
                                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-inner ${
                                    task.type === 'session' 
                                    ? 'bg-blue-50 text-blue-600' 
                                    : 'bg-emerald-50 text-emerald-600'
                                }`}>
                                    <Icon className="h-7 w-7" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                             task.type === 'session' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {task.type}
                                        </span>
                                        {task.time && (
                                            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                                 • {formatDateTime(task.time)}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-semibold font-heading text-slate-800 text-lg truncate">{task.title}</h3>
                                </div>
                                <button 
                                    onClick={() => navigate(task.actionUrl)}
                                    className="shrink-0 rounded-xl bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-600 transition-all hover:bg-student-primary hover:text-white hover:shadow-md active:scale-95"
                                >
                                    {task.actionLabel}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* Project Progress (Simplified) */}
            <section>
                <h2 className="mb-4 text-xl font-semibold">Current Phase: {phaseName}</h2>
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 dark:bg-card dark:border-border">
                   <div className="mb-6 flex justify-between text-sm">
                        <span className="text-muted-foreground">Start</span>
                        <span className="font-semibold text-primary">{project.nextMilestone} next</span>
                   </div>
                   
                   {/* Visual Stepper */}
                   <div className="relative mb-2 h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                        <div 
                            className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-1000"
                            style={{ width: `${context.progressPercent}%` }}
                        />
                        {/* Dots */}
                        <div className="absolute top-1/2 -ml-1 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-primary" style={{ left: '0%' }}></div>
                        <div className="absolute top-1/2 -ml-1 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-primary" style={{ left: '25%' }}></div>
                        <div className="absolute top-1/2 -ml-1 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-primary" style={{ left: '50%' }}></div>
                        <div className="absolute top-1/2 -ml-1 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-slate-300" style={{ left: '75%' }}></div>
                        <div className="absolute top-1/2 -ml-1 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-slate-300" style={{ left: '100%' }}></div>
                   </div>
                   <div className="mt-4 flex justify-between text-xs font-medium text-slate-400">
                      {PROJECT_PHASES.map((p, i) => (
                          <div key={p} className={i <= project.phaseIndex ? 'text-primary' : ''}>{p}</div>
                      ))}
                   </div>
                </div>
            </section>

        </div>

        {/* RIGHT COLUMN: Support & Communication */}
        <div className="md:col-span-2 space-y-6">
            
            {/* Coach Card */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-lg">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-bold backdrop-blur-sm">
                        {coachMessage?.senderAvatar ?? 'C'}
                    </div>
                    <div>
                        <div className="font-semibold">Your Coach</div>
                        <div className="text-sm opacity-90">Usually replies in 1h</div>
                    </div>
                </div>
                
                {coachMessage ? (
                    <div className="mb-6 rounded-xl bg-white/10 p-4 backdrop-blur-sm">
                        <div className="mb-1 text-xs opacity-75">Latest message received:</div>
                        <p className="line-clamp-2 text-sm italic">"{coachMessage.text}"</p>
                    </div>
                ) : (
                   <div className="mb-6 h-12"></div>
                )}

                <button 
                    // In a real app, this would open the specific chat thread
                    onClick={() => {/* Trigger global chat open if possible, or Nav */}}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold text-indigo-600 transition-all hover:bg-indigo-50 active:scale-95"
                >
                    <MessageCircle className="h-5 w-5" />
                    Message My Coach
                </button>
            </div>

            {/* Quick Tips or Motivation */}
            <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-3 font-semibold text-foreground">Tip of the week</h3>
                <p className="text-sm text-muted-foreground">
                    "Don't worry about scalability yet. Do things that don't scale to learn faster from your first customers."
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-primary font-medium cursor-pointer hover:underline">
                    Read article <ArrowRight className="h-3 w-3" />
                </div>
            </div>

        </div>

      </div>
    </div>
  )
}
