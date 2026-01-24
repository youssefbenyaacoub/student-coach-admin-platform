import { useMemo, useState } from 'react'
import { Calendar, Clock, MapPin, Users, Filter } from 'lucide-react'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { formatDateTime } from '../../utils/time'

export default function CoachSessions() {
  const { currentUser } = useAuth()
  const { data } = useData()
  const [filter, setFilter] = useState('all') // all, upcoming, past, today

  const mySessions = useMemo(() => {
    if (!currentUser?.id || !data) return []

    const sessions = (data.coachingSessions ?? []).filter((s) =>
      s.coachId === currentUser.id
    )

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    return sessions
      .filter((s) => {
        const sessionDate = new Date(s.startsAt)
        if (filter === 'upcoming') return sessionDate >= now && s.status === 'scheduled'
        if (filter === 'past') return sessionDate < now || s.status === 'completed'
        if (filter === 'today')
          return sessionDate >= todayStart && sessionDate < todayEnd
        return true
      })
      .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))
  }, [currentUser, data, filter])

  const sessionsByMonth = useMemo(() => {
    const grouped = {}
    mySessions.forEach((session) => {
      const date = new Date(session.startsAt)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(session)
    })
    return grouped
  }, [mySessions])

  const stats = useMemo(() => {
    const now = new Date()
    const upcoming = mySessions.filter(
      (s) => new Date(s.startsAt) >= now && s.status === 'scheduled'
    ).length
    const past = mySessions.filter(
      (s) => new Date(s.startsAt) < now || s.status === 'completed'
    ).length
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)
    const today = mySessions.filter((s) => {
      const sessionDate = new Date(s.startsAt)
      return sessionDate >= todayStart && sessionDate < todayEnd
    }).length

    return { total: mySessions.length, upcoming, past, today }
  }, [mySessions])

  const getProgramName = (programId) => {
    const program = (data?.programs ?? []).find((p) => p.id === programId)
    return program?.name ?? 'Unknown Program'
  }

  const getMonthLabel = (key) => {
    const [year, month] = key.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  if (mySessions.length === 0 && filter === 'all') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Calendar className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold text-foreground">No Sessions Yet</h2>
        <p className="mt-2 text-muted-foreground">
          You don't have any coaching sessions scheduled.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Sessions</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your coaching sessions and track attendance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Sessions</div>
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/10 text-secondary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Today</div>
              <div className="text-2xl font-bold text-foreground">{stats.today}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-success-500/10 text-success-700">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Upcoming</div>
              <div className="text-2xl font-bold text-foreground">{stats.upcoming}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Completed</div>
              <div className="text-2xl font-bold text-foreground">{stats.past}</div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filter:</span>
          <div className="flex gap-2">
            {['all', 'today', 'upcoming', 'past'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {mySessions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No sessions found for this filter
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(sessionsByMonth).map(([monthKey, sessions]) => (
              <div key={monthKey}>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                  {getMonthLabel(monthKey)}
                </h3>
                <div className="space-y-3">
                  {sessions.map((session) => {
                    const now = new Date()
                    const isPast = new Date(session.startsAt) < now

                    return (
                      <div
                        key={session.id}
                        className={`flex items-start gap-4 rounded-lg border p-4 ${
                          isPast
                            ? 'border-border/30 bg-muted/20'
                            : 'border-border/50 bg-muted/40'
                        }`}
                      >
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-primary/10">
                          <div className="text-center">
                            <div className="text-xl font-bold text-primary">
                              {new Date(session.startsAt).getDate()}
                            </div>
                            <div className="text-[10px] uppercase text-primary">
                              {new Date(session.startsAt).toLocaleDateString('en-US', {
                                month: 'short',
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-semibold text-foreground">
                                {session.title}
                              </h4>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {getProgramName(session.programId)}
                              </p>
                            </div>
                            <StatusBadge value={session.status} />
                          </div>

                          {session.description && (
                            <p className="mt-2 text-sm text-muted-foreground">
                              {session.description}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
                              {formatDateTime(session.startsAt)}
                            </div>
                            {session.location && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                {session.location}
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <Users className="h-4 w-4" />
                              {session.attendeeStudentIds.length} student
                              {session.attendeeStudentIds.length === 1 ? '' : 's'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
