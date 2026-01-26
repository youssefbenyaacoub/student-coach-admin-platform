import { useState } from 'react'
import { FolderKanban, Target } from 'lucide-react'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import TaskCard from '../../components/tasks/TaskCard'
import TaskSubmitModal from '../../components/tasks/TaskSubmitModal'
import { canStudentSubmitTask, taskStatusLabel, TaskStatus, TaskType } from '../../models/tasks'

function SubmissionSummary({ task }) {
  const type = String(task?.taskType ?? '').toUpperCase()
  const s = task?.studentSubmission ?? null

  if (!s) return <div className="text-sm text-slate-500">No submission yet.</div>

  if (type === TaskType.text) return <div className="text-sm text-slate-700 whitespace-pre-wrap">{s.text}</div>
  if (type === TaskType.link) {
    return (
      <a className="text-sm font-semibold text-blue-600 hover:underline" href={s.url} target="_blank" rel="noreferrer">
        {s.url}
      </a>
    )
  }
  if (type === TaskType.file) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-slate-700">{s.fileName ?? 'File'}</div>
        {s.localUrl ? (
          <a className="text-sm font-semibold text-blue-600 hover:underline" href={s.localUrl} target="_blank" rel="noreferrer">
            Open file
          </a>
        ) : null}
      </div>
    )
  }
  if (type === TaskType.checklist) {
    const checked = new Set(s.checkedItemIds ?? [])
    const items = task?.checklistItems ?? []
    return (
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={checked.has(it.id)} readOnly />
            <span>{it.text}</span>
          </div>
        ))}
      </div>
    )
  }

  return <div className="text-sm text-slate-500">Submission details unavailable.</div>
}

export default function StudentTasks() {
  const { currentUser } = useAuth()
  const { getUserById, listTasksGroupedByProject, submitTask } = useData()

  const [selectedTaskId, setSelectedTaskId] = useState(null)

  const grouped = currentUser?.id ? listTasksGroupedByProject?.({ studentId: currentUser.id }) ?? [] : []
  const allTasks = grouped.flatMap((g) => g.tasks ?? [])
  const selectedTask = grouped.flatMap((g) => g.tasks ?? []).find((t) => t.id === selectedTaskId) ?? null

  const pendingCount = allTasks.filter((t) => {
    const s = String(t.status ?? TaskStatus.pending).toUpperCase()
    return s === TaskStatus.pending || s === TaskStatus.revision
  }).length

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white">My Tasks</h1>
          <p className="mt-2 text-lg text-slate-500 font-medium">Submit work requested by your coach, per project.</p>
        </div>
        <div className="hidden md:flex gap-4">
          <div className="rounded-2xl bg-white px-5 py-3 shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</div>
            <div className="text-2xl font-heading font-bold text-slate-900 dark:text-white">{allTasks.length}</div>
          </div>
          <div className="rounded-2xl bg-white px-5 py-3 shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Needs action</div>
            <div className="text-2xl font-heading font-bold text-amber-600">{pendingCount}</div>
          </div>
        </div>
      </div>

      {allTasks.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No tasks yet"
          message="When your coach creates tasks for your projects, they will appear here."
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(({ project, tasks }) => (
            <Card
              key={project?.id ?? 'project'}
              title={
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-5 w-5 text-slate-500" />
                  <span className="font-heading font-bold text-slate-900">{project?.title ?? 'Project'}</span>
                </div>
              }
              subtitle={project?.studentId ? `Student: ${getUserById?.(project.studentId)?.name ?? project.studentId}` : null}
            >
              {(tasks ?? []).length === 0 ? (
                <div className="text-sm text-slate-500">No tasks for this project.</div>
              ) : (
                <div className="space-y-4">
                  {(tasks ?? []).map((t) => {
                    const canSubmit = canStudentSubmitTask(t.status)
                    const statusText = taskStatusLabel(t.status)

                    return (
                      <TaskCard
                        key={t.id}
                        task={t}
                        primaryAction={
                          <button
                            type="button"
                            className={canSubmit ? 'btn-primary' : 'btn-secondary'}
                            onClick={() => setSelectedTaskId(t.id)}
                            title={canSubmit ? 'Submit your work' : 'View task details'}
                          >
                            {canSubmit ? 'Submit' : 'View'}
                          </button>
                        }
                      >
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Your submission</div>
                          <div className="mt-2">
                            <SubmissionSummary task={t} />
                          </div>
                        </div>

                        {t.coachFeedback ? (
                          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                            <div className="text-xs font-bold uppercase tracking-wider text-blue-700">Coach feedback ({statusText})</div>
                            <div className="mt-2 text-sm text-blue-900 whitespace-pre-wrap">{t.coachFeedback}</div>
                          </div>
                        ) : null}
                      </TaskCard>
                    )
                  })}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <TaskSubmitModal
        open={Boolean(selectedTaskId)}
        task={selectedTask}
        onClose={() => setSelectedTaskId(null)}
        onSubmit={async ({ taskId, submission }) => {
          await submitTask?.({ taskId, submission })
        }}
      />
    </div>
  )
}
