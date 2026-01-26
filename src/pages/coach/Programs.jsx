import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Users, Target, TrendingUp, Calendar } from 'lucide-react'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import ProgressBar from '../../components/common/ProgressBar'
import Modal from '../../components/common/Modal'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useProgramManagement } from '../../hooks/useProgramManagement'
import { formatDate } from '../../utils/time'

export default function CoachPrograms() {
  const { currentUser } = useAuth()
  const { data } = useData()
  const {
    templates,
    templateDetailsById,
    instances,
    instanceDetailsById,
    fetchTemplateDetails,
    fetchInstanceDetails,
    subscribeToInstanceTasks,
    approveInstanceTask,
    reorderInstanceTasks,
    advanceInstanceStage,
    injectTask,
    extendTaskDeadline,
  } = useProgramManagement()

  const [selectedProgram, setSelectedProgram] = useState(null)
  const [instanceOpen, setInstanceOpen] = useState(false)
  const [selectedInstanceId, setSelectedInstanceId] = useState(null)

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

  const allInstances = useMemo(() => instances ?? [], [instances])

  const selectedInstanceDetails = useMemo(() => {
    if (!selectedInstanceId) return null
    return instanceDetailsById[selectedInstanceId] ?? null
  }, [instanceDetailsById, selectedInstanceId])

  const selectedInstance = selectedInstanceDetails?.instance ?? null
  const selectedTasks = selectedInstanceDetails?.tasks ?? []
  const selectedTemplate = selectedInstance
    ? templates.find((t) => t.id === selectedInstance.templateId) ?? null
    : null
  const selectedTemplateDetails = selectedInstance
    ? templateDetailsById[selectedInstance.templateId] ?? null
    : null

  const selectedStudent = useMemo(() => {
    if (!selectedInstance?.studentId) return null
    return (data?.users ?? []).find((u) => u.id === selectedInstance.studentId) ?? null
  }, [data?.users, selectedInstance])

  useEffect(() => {
    if (!instanceOpen || !selectedInstanceId) return
    let cancelled = false
    ;(async () => {
      try {
        const details = await fetchInstanceDetails(selectedInstanceId)
        if (cancelled) return
        if (details?.instance?.templateId) {
          await fetchTemplateDetails(details.instance.templateId)
        }
        await subscribeToInstanceTasks(selectedInstanceId)
      } catch {
        // UI is intentionally simple; errors will surface via missing data
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fetchInstanceDetails, fetchTemplateDetails, instanceOpen, selectedInstanceId, subscribeToInstanceTasks])

  const openInstance = (id) => {
    setSelectedInstanceId(id)
    setInstanceOpen(true)
  }

  const closeInstance = () => {
    setInstanceOpen(false)
    setSelectedInstanceId(null)
  }

  const moveTask = async (taskId, direction) => {
    const idx = selectedTasks.findIndex((t) => t.id === taskId)
    if (idx < 0) return
    const next = [...selectedTasks]
    const swapWith = direction === 'up' ? idx - 1 : idx + 1
    if (swapWith < 0 || swapWith >= next.length) return
    ;[next[idx], next[swapWith]] = [next[swapWith], next[idx]]
    await reorderInstanceTasks({ instanceId: selectedInstanceId, orderedTaskIds: next.map((t) => t.id) })
  }

  const handleApprove = async (taskId, approved) => {
    const feedback = window.prompt('Coach feedback (optional):', '')
    await approveInstanceTask({ taskId, feedback: feedback ?? null, approved })
  }

  const handleAdvanceStage = async () => {
    if (!selectedInstanceId || !selectedTemplateDetails?.stages?.length) return
    const stageNames = selectedTemplateDetails.stages.map((s) => s.name).join(', ')
    const picked = window.prompt(`Advance stage to: ${stageNames}`, selectedTemplateDetails.stages[0]?.name ?? '')
    if (!picked) return
    const stage = selectedTemplateDetails.stages.find((s) => s.name.toLowerCase() === picked.toLowerCase())
    if (!stage) return
    await advanceInstanceStage({ instanceId: selectedInstanceId, stageId: stage.id })
  }

  const handleInjectTask = async () => {
    if (!selectedInstanceId) return
    const title = window.prompt('New task title:', '')
    if (!title) return
    const description = window.prompt('Description (optional):', '')

    let stageId = selectedInstance?.currentStageId ?? null
    if (selectedTemplateDetails?.stages?.length) {
      const stageNames = selectedTemplateDetails.stages.map((s) => s.name).join(', ')
      const picked = window.prompt(`Assign to stage: ${stageNames}`, selectedTemplateDetails.stages[0]?.name ?? '')
      const stage = selectedTemplateDetails.stages.find((s) => s.name.toLowerCase() === String(picked ?? '').toLowerCase())
      if (stage) stageId = stage.id
    }

    if (!stageId) return
    await injectTask({ instanceId: selectedInstanceId, stageId, title, description })
  }

  const handleExtendDeadline = async (taskId) => {
    const date = window.prompt('New deadline date (YYYY-MM-DD):', '')
    if (!date) return
    const iso = new Date(`${date}T00:00:00.000Z`).toISOString()
    await extendTaskDeadline({ taskId, deadline: iso })
  }

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
      {/* Program Instances (Roadmaps) */}
      <Card
        title="Program Instances"
        subtitle="Editable roadmaps generated from templates (videos/courses + tasks)"
      >
        {allInstances.length === 0 ? (
          <div className="text-sm text-muted-foreground">No program instances yet.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {allInstances.slice(0, 6).map((inst) => {
              const tpl = templates.find((t) => t.id === inst.templateId)
              const student = (data?.users ?? []).find((u) => u.id === inst.studentId)
              return (
                <div key={inst.id} className="rounded-lg border border-border/50 bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate">{tpl?.name ?? 'Program'}</div>
                      <div className="mt-1 text-sm text-muted-foreground truncate">
                        Student: {student?.name ?? inst.studentId}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">Started: {formatDate(inst.startedAt)}</div>
                    </div>
                    <button type="button" className="btn" onClick={() => openInstance(inst.id)}>
                      Open
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

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

      <Modal
        isOpen={instanceOpen}
        onClose={closeInstance}
        title={selectedTemplate ? `Instance: ${selectedTemplate.name}` : 'Program Instance'}
      >
        {!selectedInstance ? (
          <div className="text-sm text-muted-foreground">Loading instance…</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
              <div className="font-semibold text-foreground">Student</div>
              <div className="text-sm text-muted-foreground">{selectedStudent?.name ?? selectedInstance.studentId}</div>
              <div className="mt-2 text-xs text-muted-foreground">Current stage: {selectedInstance.currentStageId ?? '—'}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn-ghost" onClick={handleAdvanceStage}>
                  Advance Stage
                </button>
                <button type="button" className="btn-ghost" onClick={handleInjectTask}>
                  Inject Task
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {selectedTasks.length === 0 ? (
                <div className="text-sm text-muted-foreground">No tasks in this instance yet.</div>
              ) : (
                selectedTasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-border/50 bg-muted/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">{task.title}</div>
                        {task.description ? (
                          <div className="mt-1 text-sm text-muted-foreground">{task.description}</div>
                        ) : null}
                        <div className="mt-2 text-xs text-muted-foreground">
                          Status: {task.status}
                          {task.deadline ? ` • Due: ${formatDate(task.deadline)}` : ''}
                        </div>
                      </div>
                      <StatusBadge value={task.status} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className="btn-ghost" onClick={() => moveTask(task.id, 'up')}>
                        ↑
                      </button>
                      <button type="button" className="btn-ghost" onClick={() => moveTask(task.id, 'down')}>
                        ↓
                      </button>
                      <button type="button" className="btn-ghost" onClick={() => handleExtendDeadline(task.id)}>
                        Extend
                      </button>
                      <button type="button" className="btn" onClick={() => handleApprove(task.id, true)}>
                        Approve
                      </button>
                      <button type="button" className="btn-ghost" onClick={() => handleApprove(task.id, false)}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
