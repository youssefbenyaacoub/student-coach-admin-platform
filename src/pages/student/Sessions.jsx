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
          <h1 className="text-2xl font-bold text-foreground">Coaching Sessions</h1>
          <p className="mt-1 text-muted-foreground">
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Coaching Sessions</h1>
        <p className="mt-1 text-muted-foreground">Your schedule and attendance history</p>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Filter:</span>
                {['all', 'upcoming', 'past'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            filter === f 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-background hover:bg-muted-foreground/10 text-muted-foreground'
                        }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>
        </div>
        
        <div className="divide-y divide-border">
            {filteredSessions.length === 0 ? (
                 <div className="p-8 text-center text-muted-foreground text-sm">
                    No {filter} sessions found.
                 </div>
            ) : (
                filteredSessions.map((session) => {
                    const statusConfig = ATTENDANCE_CONFIG[session.attendanceStatus] || ATTENDANCE_CONFIG.pending
                    const StatusIcon = statusConfig.icon

                    return (
                        <div key={session.id} className="p-4 hover:bg-muted/20 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                {/* Date Column */}
                                <div className="flex-shrink-0 w-32 flex flex-col">
                                    <span className="text-sm font-semibold text-foreground">
                                        {formatDate(session.startsAt)}
                                    </span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDateTime(session.startsAt).split(',')[1].trim()}
                                    </span>
                                    <span className="text-xs text-muted-foreground mt-1">
                                        {session.duration}
                                    </span>
                                </div>

                                {/* Main Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                                        {session.title}
                                    </h3>
                                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <User className="h-3.5 w-3.5" />
                                            {session.coachName}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5" />
                                            {session.location}
                                        </div>
                                    </div>
                                    {session.description && (
                                        <p className="mt-2 text-sm text-muted-foreground line-clamp-1">
                                            {session.description}
                                        </p>
                                    )}
                                </div>

                                {/* Status/Attendance */}
                                <div className="flex-shrink-0 flex flex-col items-end gap-2 min-w-[120px]">
                                    {session.status === 'completed' ? (
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                                            <StatusIcon className="h-3.5 w-3.5" />
                                            {statusConfig.label}
                                        </div>
                                    ) : (
                                        <StatusBadge value={session.status} />
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })
            )}
        </div>
      </Card>
        
      {/* Summary Logic could go here */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="flex flex-col items-center justify-center p-4">
               <span className="text-3xl font-bold text-foreground">{sessions.length}</span>
               <span className="text-xs text-muted-foreground">Total Sessions</span>
          </Card>
          <Card className="flex flex-col items-center justify-center p-4">
               <span className="text-3xl font-bold text-success-600">
                    {sessions.filter(s => s.attendanceStatus === 'present').length}
               </span>
               <span className="text-xs text-muted-foreground">Present</span>
          </Card>
           <Card className="flex flex-col items-center justify-center p-4">
               <span className="text-3xl font-bold text-foreground">
                    {sessions.filter(s => new Date(s.startsAt) > new Date()).length}
               </span>
               <span className="text-xs text-muted-foreground">Upcoming</span>
          </Card>
           <Card className="flex flex-col items-center justify-center p-4">
               <span className="text-3xl font-bold text-primary">
                    {Math.round(sessions.reduce((acc, s) => acc + (s.status === 'completed' ? 1 : 0), 0) / Math.max(1, sessions.length) * 100)}%
               </span>
               <span className="text-xs text-muted-foreground">Completion Rate</span>
          </Card>
      </div>
    </div>
  )
}