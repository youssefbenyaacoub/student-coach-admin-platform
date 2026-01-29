import { useMemo } from 'react'
import DataTable from '../../components/common/DataTable'
import ProgressBar from '../../components/common/ProgressBar'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { formatDate } from '../../utils/time'

export default function CoachStudents() {
  const { currentUser } = useAuth()
  const { data } = useData()

  const students = useMemo(() => {
    if (!currentUser?.id || !data) return []

    const myPrograms = (data.programs ?? []).filter((p) => (p.coachIds ?? []).includes(currentUser.id))

    const studentIds = new Set()
    myPrograms.forEach((p) => {
      ; (p.participantStudentIds ?? []).forEach((id) => studentIds.add(id))
    })

    const allStudents = (data.users ?? []).filter((u) => studentIds.has(u.id))

    return allStudents.map((student) => {
      const program = myPrograms.find((p) => (p.participantStudentIds ?? []).includes(student.id))

      const sessions = (data.coachingSessions ?? [])
        .filter((s) => (s.attendeeStudentIds ?? []).includes(student.id) && s.status === 'completed')
        .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))
      const lastSession = sessions.length > 0 ? sessions[0].startsAt : null

      const assignedDeliverables = (data.deliverables ?? []).filter((d) =>
        (d.assignedStudentIds ?? []).includes(student.id)
      )

      const completedDeliverables = assignedDeliverables.filter((d) =>
        (d.submissions ?? []).some((s) => String(s.studentId) === String(student.id))
      )

      const assignedCount = assignedDeliverables.length
      const completedCount = completedDeliverables.length
      const progress = assignedCount === 0 ? 0 : Math.round((completedCount / assignedCount) * 100)

      const riskLevel = assignedCount > completedCount ? 'Medium' : 'Low'

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        avatar: student.avatar,
        programName: program?.name ?? 'Unassigned',
        progress,
        lastSession,
        riskLevel,
      }
    })
  }, [currentUser, data])

  const columns = [
    {
      key: 'name',
      header: 'Student',
      searchable: true,
      accessor: (row) => row.name,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
            {row.name.charAt(0)}
          </div>
          <div>
            <div className="font-medium text-foreground">{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'program',
      header: 'Project / Program',
      accessor: (row) => row.programName,
      render: (row) => (
        <span className="text-sm text-foreground/80">{row.programName}</span>
      ),
    },
    {
      key: 'progress',
      header: 'Progress',
      accessor: (row) => row.progress.toString(),
      render: (row) => (
        <div className="w-[120px]">
          <ProgressBar value={row.progress} />
        </div>
      )
    },
    {
      key: 'lastSession',
      header: 'Last Session',
      accessor: (row) => row.lastSession ?? '',
      render: (row) => (
        <div className="text-sm">
          {row.lastSession ? (
            <span className="text-foreground">{formatDate(row.lastSession)}</span>
          ) : (
            <span className="text-muted-foreground italic">No sessions yet</span>
          )}
        </div>
      ),
    },
    {
      key: 'risk',
      header: 'Risk Level',
      accessor: (row) => row.riskLevel,
      render: (row) => {
        let colorClass = 'bg-success-50 text-success-700 border-success-200'
        if (row.riskLevel === 'High') colorClass = 'bg-danger-50 text-danger-700 border-danger-200'
        if (row.riskLevel === 'Medium') colorClass = 'bg-warning-50 text-warning-700 border-warning-200'

        return (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${colorClass}`}>
            {row.riskLevel}
          </span>
        )
      }
    },
    {
      key: 'actions',
      header: '',
      accessor: () => '',
      render: (row) => (
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('sea:open-chat', { detail: { peerId: row.id } }))}
            className="text-sm font-medium text-coach-primary hover:underline flex items-center gap-1"
          >
            Message
          </button>
          <button className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors">
            View Details
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">My Students</h1>
        <p className="text-muted-foreground">Manage and track progress of your assigned students.</p>
      </div>

      <DataTable
        title="Students List"
        rows={students}
        columns={columns}
        getRowId={(r) => r.id}
        initialSort={{ key: 'name', dir: 'asc' }}
      />
    </div>
  )
}
