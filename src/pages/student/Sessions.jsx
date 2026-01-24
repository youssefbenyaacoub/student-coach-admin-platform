import { useMemo, useState } from 'react'
import { Calendar, Clock, MapPin, User, CheckCircle, XCircle, AlertCircle, Video } from 'lucide-react'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import EmptyState from '../../components/common/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { formatDateTime, formatDate } from '../../utils/time'

const ATTENDANCE_CONFIG = {
  present: {
    label: 'Present',
    icon: CheckCircle,
    color: 'text-success-700 bg-success-50 border-success-200',
  },
  absent: {
    label: 'Absent',
    icon: XCircle,
    color: 'text-danger-700 bg-danger-50 border-danger-200',
  },
  late: {
    label: 'Late',
    icon: AlertCircle,
    color: 'text-warning-700 bg-warning-50 border-warning-200',
  },
  pending: {
    label: 'Upcoming',
    icon: Clock,
    color: 'text-muted-foreground bg-muted border-border',
  },
}

export default function StudentSessions() {
  const { currentUser } = useAuth()
  const { data } = useData()
  const [filter, setFilter] = useState('all') // all, upcoming, past

  const sessions = useMemo(() => {
    if (!currentUser?.id || !data) return []

    const mySessions = (data.coachingSessions ?? []).filter((s) =>
      s.attendeeStudentIds.includes(currentUser.id)
    )

    return mySessions
      .map((s) => {
        const coach = (data.users ?? []).find((u) => u.id === s.coachId)
        
        let attendanceStatus = 'pending'
        if (s.status === 'completed') {
            const record = s.attendance?.find(a => a.studentId === currentUser.id)
            if (record) {
                attendanceStatus = record.status
            } else {
                // If completed but no record, assume present or just show completed?
                // For this mock, if no record is found in a completed session, we might assume 'present' or 'excused'
                // Let's stick to 'pending' or a generic 'completed' if needed, but 'pending' (Upcoming logic) implies future.
                // Let's default to 'present' if completed and no explicit 'absent' record for simplicity,
                // or handle the case where attendance wasn't taken.
                attendanceStatus = 'present' 
            }
        } else if (new Date(s.startsAt) < new Date() && s.status !== 'completed') {
            // In past but not marked completed (shouldn't happen in good data)
            attendanceStatus = 'pending' 
        }

        const start = new Date(s.startsAt)
        const end = new Date(s.endsAt)
        const durationMin = Math.round((end - start) / 60000)

        return {
          ...s,
          coachName: coach?.name ?? 'Unknown Coach',
          duration: `${durationMin} min`,
          attendanceStatus,
          isUpcoming: new Date(s.startsAt) > new Date(),
        }
      })
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
  }, [currentUser, data])

  const filteredSessions = useMemo(() => {
    const now = new Date()
    return sessions.filter(s => {
        if (filter === 'upcoming') return new Date(s.startsAt) >= now
        if (filter === 'past') return new Date(s.startsAt) < now
        return true
    })
  }, [sessions, filter])

  if (sessions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">Coaching Sessions</h1>
          <p className="mt-1 text-slate-500 font-medium">
            Your schedule and attendance history
          </p>
        </div>
        <EmptyState
          icon={Calendar}
          title="No Sessions Scheduled"
          description="You don't have any coaching sessions scheduled yet."
        />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white">Coaching Sessions</h1>
          <p className="mt-2 text-slate-500 font-medium max-w-2xl">
            Track your upcoming meetings with coaches and review your past attendance interaction records.
          </p>
        </div>
        
        {/* Summary Mini-Cards */}
        <div className="flex gap-4">
           <div className="rounded-2xl bg-white px-5 py-3 shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
               <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Upcoming</div>
               <div className="text-2xl font-heading font-bold text-student-primary">
                    {sessions.filter(s => new Date(s.startsAt) > new Date()).length}
               </div>
           </div>
           <div className="rounded-2xl bg-white px-5 py-3 shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
               <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Attendance</div>
               <div className="text-2xl font-heading font-bold text-emerald-600">
                    {Math.round(sessions.reduce((acc, s) => acc + (s.status === 'completed' ? 1 : 0), 0) / Math.max(1, sessions.length) * 100)}%
               </div>
           </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Filter Status:</span>
                <div className="flex bg-slate-200/50 p-1 rounded-xl dark:bg-slate-900/50">
                    {['all', 'upcoming', 'past'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                                filter === f 
                                ? 'bg-white text-student-primary shadow-sm ring-1 ring-slate-200 dark:bg-slate-700 dark:ring-slate-600 dark:text-white' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>
        </div>
        
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredSessions.length === 0 ? (
                 <div className="p-12 text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                        <Calendar className="h-6 w-6" />
                    </div>
                    <div className="text-slate-900 font-semibold">No sessions found</div>
                    <div className="text-slate-500 text-sm">Try adjusting your filters</div>
                 </div>
            ) : (
                filteredSessions.map((session) => {
                    const statusConfig = ATTENDANCE_CONFIG[session.attendanceStatus] || ATTENDANCE_CONFIG.pending
                    const StatusIcon = statusConfig.icon

                    return (
                        <div key={session.id} className="group p-6 hover:bg-slate-50 transition-colors dark:hover:bg-slate-800/50">
                            <div className="flex flex-col md:flex-row md:items-center gap-6">
                                {/* Date Column */}
                                <div className="flex-shrink-0 w-32 flex flex-col items-center justify-center rounded-2xl bg-blue-50/50 p-3 border border-blue-100 dark:bg-blue-900/10 dark:border-blue-800">
                                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                        {formatDate(session.startsAt).split(',')[0]}
                                    </span>
                                    <span className="text-2xl font-heading font-bold text-slate-800 dark:text-white">
                                        {new Date(session.startsAt).getDate()}
                                    </span>
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                        {formatDateTime(session.startsAt).split(',')[1].trim()}
                                    </span>
                                </div>

                                {/* Main Info */}
                                <div className="flex-1 min-w-0 py-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-heading font-bold text-slate-800 dark:text-white group-hover:text-student-primary transition-colors">
                                            {session.title}
                                        </h3>
                                        {session.isUpcoming && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm">
                                                Upcoming
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400 mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                <User className="h-3.5 w-3.5" />
                                            </div>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{session.coachName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                <Clock className="h-3.5 w-3.5" />
                                            </div>
                                            <span>{session.duration}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                <MapPin className="h-3.5 w-3.5" />
                                            </div>
                                            <span>{session.location}</span>
                                        </div>
                                    </div>
                                    
                                    {session.description && (
                                        <p className="text-sm text-slate-500 line-clamp-1 pl-1 border-l-2 border-slate-200 dark:border-slate-700">
                                            {session.description}
                                        </p>
                                    )}
                                </div>

                                {/* Status/Attendance Button */}
                                <div className="flex-shrink-0 flex flex-col items-end gap-3 min-w-[140px]">
                                    {session.status === 'completed' ? (
                                        <div className={`flex w-full items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm ring-1 ring-inset ${statusConfig.color} bg-opacity-10 ring-opacity-20`}>
                                            <StatusIcon className="h-4 w-4" />
                                            {statusConfig.label}
                                        </div>
                                    ) : (
                                        <div>
                                            {session.isUpcoming ? (
                                                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-student-primary px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-blue-600 active:scale-95 transition-all">
                                                    <Video className="h-4 w-4" />
                                                    Join Room
                                                </button>
                                            ) : (
                                                <StatusBadge value={session.status} />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })
            )}
        </div>
      </div>
    </div>
  )
}
