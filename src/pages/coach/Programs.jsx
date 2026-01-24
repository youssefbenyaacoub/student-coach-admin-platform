import { useMemo, useState } from 'react'
import { BookOpen, Users, Target, TrendingUp, Calendar } from 'lucide-react'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import ProgressBar from '../../components/common/ProgressBar'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { formatDate } from '../../utils/time'

export default function CoachPrograms() {
  const { currentUser } = useAuth()
  const { data } = useData()
  const [selectedProgram, setSelectedProgram] = useState(null)

  const myPrograms = useMemo(() => {
    if (!currentUser?.id || !data) return []
    return (data.programs ?? []).filter((p) => p.coachIds.includes(currentUser.id))
  }, [currentUser, data])

  const programStats = useMemo(() => {
    if (!data) return {}

    const stats = {}
    myPrograms.forEach((program) => {
      const students = program.participantStudentIds.length
      const sessions = (data.coachingSessions ?? []).filter(
        (s) => s.programId === program.id
      ).length
      const deliverables = (data.deliverables ?? []).filter(
        (d) => d.programId === program.id
      )
      const totalSubmissions = deliverables.reduce(
        (sum, d) => sum + (d.submissions?.length ?? 0),
        0
      )
      const gradedSubmissions = deliverables.reduce(
        (sum, d) =>
          sum + (d.submissions?.filter((s) => s.status === 'graded').length ?? 0),
        0
      )
      const submissionRate =
        totalSubmissions > 0 ? Math.round((gradedSubmissions / totalSubmissions) * 100) : 0

      stats[program.id] = {
        students,
        sessions,
        deliverables: deliverables.length,
        submissionRate,
      }
    })
    return stats
  }, [myPrograms, data])

  const selectedProgramData = useMemo(() => {
    if (!selectedProgram || !data) return null

    const program = myPrograms.find((p) => p.id === selectedProgram)
    if (!program) return null

    const students = (data.users ?? []).filter((u) =>
      program.participantStudentIds.includes(u.id)
    )
    const deliverables = (data.deliverables ?? []).filter(
      (d) => d.programId === program.id
    )

    const studentProgress = students.map((student) => {
      const submissions = deliverables.flatMap((d) =>
        (d.submissions ?? []).filter((s) => s.studentId === student.id)
      )
      const completed = submissions.filter((s) => s.status === 'graded').length
      const total = deliverables.length
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0

      const grades = submissions
        .filter((s) => s.grade !== null && s.grade !== undefined)
        .map((s) => s.grade)
      const avgGrade =
        grades.length > 0
          ? Math.round(grades.reduce((sum, g) => sum + g, 0) / grades.length)
          : null

      return {
        student,
        completed,
        total,
        progress,
        avgGrade,
        xp: student.xp ?? 0,
        level: student.level ?? 1,
      }
    })

    return {
      program,
      students,
      deliverables,
      studentProgress,
    }
  }, [selectedProgram, myPrograms, data])

  if (myPrograms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <BookOpen className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold text-foreground">No Programs Yet</h2>
        <p className="mt-2 text-muted-foreground">
          You haven't been assigned to any programs yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Programs</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your {myPrograms.length} assigned program{myPrograms.length === 1 ? '' : 's'}
        </p>
      </div>

      {!selectedProgram ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {myPrograms.map((program) => {
            const stats = programStats[program.id] ?? {}
            return (
              <Card key={program.id} className="cursor-pointer hover:border-primary/50">
                <div
                  onClick={() => setSelectedProgram(program.id)}
                  className="space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground">{program.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {program.description}
                      </p>
                    </div>
                    <StatusBadge value={program.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{stats.students} students</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{stats.sessions} sessions</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Target className="h-4 w-4" />
                      <span>{stats.deliverables} deliverables</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      <span>{stats.submissionRate}% graded</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {formatDate(program.startDate)} - {formatDate(program.endDate)}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setSelectedProgram(null)}
          >
            ← Back to all programs
          </button>

          {selectedProgramData && (
            <div className="space-y-6">
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold text-foreground">
                      {selectedProgramData.program.name}
                    </h2>
                    <p className="mt-1 text-muted-foreground">
                      {selectedProgramData.program.description}
                    </p>
                    <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        📅 {formatDate(selectedProgramData.program.startDate)} -{' '}
                        {formatDate(selectedProgramData.program.endDate)}
                      </span>
                      <span>👥 {selectedProgramData.students.length} students</span>
                      <span>📝 {selectedProgramData.deliverables.length} deliverables</span>
                    </div>
                  </div>
                  <StatusBadge value={selectedProgramData.program.status} />
                </div>
              </Card>

              <Card
                title="Student Progress"
                subtitle={`${selectedProgramData.students.length} enrolled students`}
              >
                <div className="space-y-3">
                  {selectedProgramData.studentProgress.map((item) => (
                    <div
                      key={item.student.id}
                      className="flex items-center gap-4 rounded-lg border border-border/50 bg-muted/30 p-4"
                    >
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                        <div className="text-center">
                          <div className="text-sm font-bold">{item.level}</div>
                          <div className="text-[10px]">lvl</div>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium text-foreground">
                              {item.student.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {item.student.university} • {item.xp} XP
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-foreground">
                              {item.completed} / {item.total} completed
                            </div>
                            {item.avgGrade !== null && (
                              <div className="text-sm text-muted-foreground">
                                Avg: {item.avgGrade}%
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-2">
                          <ProgressBar value={item.progress} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Deliverables" subtitle="Assignments for this program">
                <div className="space-y-2">
                  {selectedProgramData.deliverables.map((deliverable) => {
                    const submissions = deliverable.submissions ?? []
                    const graded = submissions.filter((s) => s.status === 'graded').length
                    const pending = submissions.filter((s) => s.status === 'submitted').length

                    return (
                      <div
                        key={deliverable.id}
                        className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3"
                      >
                        <div>
                          <div className="font-medium text-foreground">
                            {deliverable.title}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            Due: {formatDate(deliverable.dueDate)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-success-700">✓ {graded} graded</span>
                          {pending > 0 && (
                            <span className="text-warning-700">⏳ {pending} pending</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
