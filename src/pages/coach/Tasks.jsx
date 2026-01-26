import { useState } from 'react'
import { FolderKanban, Plus, CheckCircle2, RotateCcw } from 'lucide-react'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import TaskCard from '../../components/tasks/TaskCard'
import TaskCreateModal from '../../components/tasks/TaskCreateModal'
import { isCoachReviewableTask, TaskStatus } from '../../models/tasks'

export default function CoachTasks() {
  const { currentUser } = useAuth()
  const {
    getUserById,
    listProjects,
    listProjectSubmissions,
    listTasks,
    createTask,
    reviewTask,
  } = useData()

  const projects = currentUser?.id ? listProjects?.({ coachId: currentUser.id }) ?? [] : []

  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)

  const resolvedProjectId =
    selectedProjectId && projects.some((p) => p.id === selectedProjectId)
      ? selectedProjectId
      : projects[0]?.id ?? null

  const selectedProject = resolvedProjectId ? projects.find((p) => p.id === resolvedProjectId) ?? null : null
  const tasks = selectedProject?.id ? listTasks?.({ projectId: selectedProject.id }) ?? [] : []
  const submissions = selectedProject?.id ? listProjectSubmissions?.({ projectId: selectedProject.id }) ?? [] : []

  const [feedbackByTaskId, setFeedbackByTaskId] = useState({})

  const updateFeedback = (taskId, value) => {
    setFeedbackByTaskId((prev) => ({ ...prev, [taskId]: value }))
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white">Tasks</h1>
          <p className="mt-2 text-lg text-slate-500 font-medium">Create tasks per project and review student submissions.</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setCreateOpen(true)}
          disabled={!selectedProject}
          title={!selectedProject ? 'Select a project first' : 'Create a new task'}
        >
          <Plus className="h-4 w-4" />
          Create task
        </button>
      </div>

      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects" message="Once you have students with projects, you can create tasks here." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card title="Projects">
              <div className="space-y-2">
                {projects.map((p) => {
                  const active = selectedProject?.id === p.id
                  const student = getUserById?.(p.studentId)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProjectId(p.id)}
                      className={[
                        'w-full text-left rounded-xl border p-4 transition-colors',
                        active ? 'border-coach-primary/30 bg-white' : 'border-slate-200 bg-white hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-heading font-bold text-slate-900 truncate">{p.title}</div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{p.stage}</div>
                      </div>
                      <div className="mt-1 text-xs text-slate-500 truncate">Student: {student?.name ?? 'Student'}</div>
                    </button>
                  )
                })}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {!selectedProject ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                Select a project to manage tasks.
              </div>
            ) : (
              <Card
                title={selectedProject.title}
                subtitle={`Student: ${getUserById?.(selectedProject.studentId)?.name ?? 'Student'} • Stage: ${selectedProject.stage}`}
              >
                {tasks.length === 0 ? (
                  <EmptyState
                    icon={Plus}
                    title="No tasks for this project"
                    message="Create the first task to guide the student through the project."
                    action={
                      <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
                        <Plus className="h-4 w-4" />
                        Create task
                      </button>
                    }
                  />
                ) : (
                  <div className="space-y-4">
                    {tasks.map((t) => {
                      const reviewable = isCoachReviewableTask(t.status)
                      const feedbackValue = feedbackByTaskId[t.id] ?? t.coachFeedback ?? ''

                      return (
                        <TaskCard
                          key={t.id}
                          task={t}
                          primaryAction={
                            reviewable ? (
                              <button
                                type="button"
                                className="btn-primary"
                                onClick={async () => {
                                  await reviewTask?.({ taskId: t.id, status: TaskStatus.approved, feedback: feedbackValue })
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Approve
                              </button>
                            ) : null
                          }
                          secondaryAction={
                            reviewable ? (
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={async () => {
                                  await reviewTask?.({ taskId: t.id, status: TaskStatus.revision, feedback: feedbackValue })
                                }}
                              >
                                <RotateCcw className="h-4 w-4" />
                                Revision
                              </button>
                            ) : null
                          }
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Student submission</div>
                              <div className="mt-2 text-sm text-slate-700">
                                {t.studentSubmission ? 'Submitted' : 'Not submitted yet.'}
                              </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Coach feedback</div>
                              <textarea
                                className="input mt-2 min-h-[88px]"
                                placeholder="Optional feedback…"
                                value={feedbackValue}
                                onChange={(e) => updateFeedback(t.id, e.target.value)}
                              />
                              <div className="mt-2 text-xs text-slate-500">Actions enabled when status is SUBMITTED.</div>
                            </div>
                          </div>
                        </TaskCard>
                      )
                    })}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      <TaskCreateModal
        open={createOpen}
        project={selectedProject}
        submissions={submissions}
        onClose={() => setCreateOpen(false)}
        onCreate={async (payload) => {
          await createTask?.(payload)
        }}
      />
    </div>
  )
}
