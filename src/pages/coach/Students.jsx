import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Percent, User, AlertTriangle } from 'lucide-react'
import DataTable from '../../components/common/DataTable'
import ProgressBar from '../../components/common/ProgressBar'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { formatDate } from '../../utils/time'

// Utility to mock/randomize data since we might not have enough history in mockData for everything
const getMockProgress = (studentId) => {
    // Deterministic pseudo-random based on ID char codes
    const seed = studentId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    return (seed % 60) + 30 // 30% to 90%
}

const getMockRisk = (studentId) => {
    const seed = studentId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const val = seed % 10
    if (val < 2) return 'High'
    if (val < 5) return 'Medium'
    return 'Low'
}

export default function CoachStudents() {
  const { currentUser } = useAuth()
  const { data } = useData()

  const students = useMemo(() => {
    if (!currentUser?.id || !data) return []

    // 1. Find programs led by this coach
    const myPrograms = (data.programs ?? []).filter((p) =>
      p.coachIds.includes(currentUser.id)
    )
    const myProgramIds = myPrograms.map(p => p.id)

    // 2. Find all students in these programs
    const studentIds = new Set()
    myPrograms.forEach(p => {
        p.participantStudentIds.forEach(id => studentIds.add(id))
    })

    // 3. Map students to row data
    const allStudents = (data.users ?? []).filter(u => studentIds.has(u.id))
    
    // If we have fewer than 6 students (as requested by prompt), let's duplicate or mock some
    // purely for visual demonstration if the real data is sparse.
    // However, mockData.js seems to have 7 students. Let's see if they are assigned to this coach.
    // Coach 2 (Sana) is usually the main mocked coach.
    // Let's rely on data first, but fallback to "Extended" data if needed to meet the "at least 6" requirement visually.
    
    let processedStudents = allStudents.map(student => {
        // Find student's program (first match)
        const program = myPrograms.find(p => p.participantStudentIds.includes(student.id))
        
        // Find last session
        const sessions = (data.coachingSessions ?? [])
            .filter(s => s.attendeeStudentIds.includes(student.id) && s.status === 'completed')
            .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))
        
        const lastSession = sessions.length > 0 ? sessions[0].startsAt : null

        return {
            id: student.id,
            name: student.name,
            email: student.email,
            avatar: student.avatar,
            programName: program?.name ?? 'Unassigned',
            progress: getMockProgress(student.id),
            lastSession,
            riskLevel: getMockRisk(student.id)
        }
    })

    // Fallback: If we have very few students (e.g. < 4), let's concat some mock ones to satisfy the prompt
    // strictly for the UI requirement "Use mock data with at least 6 students"
    if (processedStudents.length < 6) {
        const extraMocks = Array.from({ length: 6 - processedStudents.length }).map((_, i) => ({
            id: `mock_student_${i}`,
            name: `Test Student ${i + 1}`,
            email: `test${i}@example.com`,
            programName: processedStudents[0]?.programName ?? 'Idea to MVP',
            progress: 45 + (i * 10),
            lastSession: new Date(Date.now() - (i * 86400000 * 3)).toISOString(),
            riskLevel: i % 3 === 0 ? 'High' : (i % 2 === 0 ? 'Medium' : 'Low')
        }))
        processedStudents = [...processedStudents, ...extraMocks]
    }

    return processedStudents
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
            <button className="text-sm font-medium text-primary hover:underline">
                View Details
            </button>
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
