import { useMemo, useState } from 'react'
import { BookOpen, Calendar, Users, Target, CheckCircle } from 'lucide-react'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast'
import { formatDate } from '../../utils/time'

export default function StudentPrograms() {
  const { currentUser } = useAuth()
  const { data } = useData()
  const { showToast } = useToast()
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [showEnrollModal, setShowEnrollModal] = useState(false)

  const { enrolledPrograms, availablePrograms } = useMemo(() => {
    if (!currentUser?.id || !data) return { enrolledPrograms: [], availablePrograms: [] }

    const enrolled = (data.programs ?? []).filter((p) =>
      p.participantStudentIds.includes(currentUser.id)
    )
    const available = (data.programs ?? []).filter(
      (p) =>
        !p.participantStudentIds.includes(currentUser.id) &&
        p.status === 'active'
    )

    return { enrolledPrograms: enrolled, availablePrograms: available }
  }, [currentUser, data])

  const programStats = useMemo(() => {
    if (!data) return {}

    const stats = {}
    const allPrograms = [...enrolledPrograms, ...availablePrograms]

    allPrograms.forEach((program) => {
      const sessions = (data.coachingSessions ?? []).filter(
        (s) => s.programId === program.id
      ).length
      const deliverables = (data.deliverables ?? []).filter(
        (d) => d.programId === program.id
      ).length
      const coaches = (data.users ?? []).filter((u) => program.coachIds.includes(u.id))

      stats[program.id] = {
        sessions,
        deliverables,
        students: program.participantStudentIds.length,
        coaches,
      }
    })
    return stats
  }, [enrolledPrograms, availablePrograms, data])

  const handleEnroll = (program) => {
    setSelectedProgram(program)
    setShowEnrollModal(true)
  }

  const confirmEnroll = () => {
    showToast('Application submitted successfully!', 'success')
    setShowEnrollModal(false)
    setSelectedProgram(null)
  }

  const getProgramProgress = (programId) => {
    if (!currentUser?.id) return 0

    const deliverables = (data?.deliverables ?? []).filter(
      (d) => d.programId === programId && d.assignedStudentIds.includes(currentUser.id)
    )

    if (deliverables.length === 0) return 0

    const completed = deliverables.filter((d) => {
      const submission = d.submissions?.find((s) => s.studentId === currentUser.id)
      return submission?.status === 'graded'
    }).length

    return Math.round((completed / deliverables.length) * 100)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Programs</h1>
        <p className="mt-1 text-muted-foreground">
          Browse and enroll in entrepreneurship programs
        </p>
      </div>

      {enrolledPrograms.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">My Programs</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {enrolledPrograms.map((program) => {
              const stats = programStats[program.id] ?? {}
              const progress = getProgramProgress(program.id)

              return (
                <Card key={program.id}>
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-success-500/10">
                      <CheckCircle className="h-6 w-6 text-success-700" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-foreground">{program.name}</h3>
                          <StatusBadge value={program.status} />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {program.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {stats.sessions} sessions
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Target className="h-3 w-3" />
                          {stats.deliverables} deliverables
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3 w-3" />
                          {stats.students} students
                        </div>
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-3 w-3" />
                          {progress}% complete
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {formatDate(program.startDate)} - {formatDate(program.endDate)}
                      </div>

                      {stats.coaches && stats.coaches.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          👤 Coach: {stats.coaches.map((c) => c.name).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Available Programs ({availablePrograms.length})
        </h2>
        {availablePrograms.length === 0 ? (
          <Card>
            <div className="py-8 text-center text-sm text-muted-foreground">
              No programs available at the moment. Check back later!
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availablePrograms.map((program) => {
              const stats = programStats[program.id] ?? {}

              return (
                <Card key={program.id} className="flex flex-col">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground">{program.name}</h3>
                      <StatusBadge value={program.status} />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {program.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {stats.sessions} sessions
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Target className="h-3 w-3" />
                        {stats.deliverables} deliverables
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3 w-3" />
                        {stats.students} enrolled
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {formatDate(program.startDate)} - {formatDate(program.endDate)}
                    </div>

                    {stats.coaches && stats.coaches.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        👤 Coach: {stats.coaches.map((c) => c.name).join(', ')}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn-primary mt-4 w-full"
                    onClick={() => handleEnroll(program)}
                  >
                    Apply Now
                  </button>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {showEnrollModal && selectedProgram && (
        <Modal
          title="Apply to Program"
          onClose={() => setShowEnrollModal(false)}
          footer={
            <>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowEnrollModal(false)}
              >
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={confirmEnroll}>
                Submit Application
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">{selectedProgram.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedProgram.description}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <p className="text-muted-foreground">
                By applying to this program, you confirm that you meet the eligibility
                requirements and are committed to participating in all sessions and
                completing all deliverables.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
