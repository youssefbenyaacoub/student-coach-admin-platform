import { useMemo, useState } from 'react'
import { FileText, Link2, Lightbulb, Video, Target } from 'lucide-react'
import Card from '../common/Card'
import StatusBadge from '../common/StatusBadge'
import { formatDateTime } from '../../utils/time'
import { ProjectSubmissionType, SubmissionStatus, submissionTypeLabel } from '../../models/projects'
import TaskStatusBadge from '../tasks/TaskStatusBadge'
import { taskTypeLabel, taskStatusLabel } from '../../models/tasks'

const ICONS = {
  [ProjectSubmissionType.idea]: Lightbulb,
  [ProjectSubmissionType.document]: FileText,
  [ProjectSubmissionType.demoLink]: Link2,
  [ProjectSubmissionType.video]: Video,
}

function Section({ label, children }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-sm text-slate-700 leading-relaxed">{children}</div>
    </div>
  )
}

export default function ProjectTimeline({
  submissions,
  tasks,
  getUserById,
  allowComment,
  allowReview,
  currentUserId,
  onComment,
  onSetStatus,
}) {
  const ordered = useMemo(() => {
    const items = []
    for (const s of submissions ?? []) items.push({ kind: 'submission', id: s.id, at: s.createdAt, submission: s })
    for (const t of tasks ?? []) items.push({ kind: 'task', id: t.id, at: t.createdAt, task: t })
    return items.sort((a, b) => new Date(a.at) - new Date(b.at))
  }, [submissions, tasks])

  if (ordered.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        No activity yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {ordered.map((it) =>
        it.kind === 'submission' ? (
          <SubmissionCard
            key={`sub:${it.id}`}
            submission={it.submission}
            getUserById={getUserById}
            allowComment={allowComment}
            allowReview={allowReview}
            currentUserId={currentUserId}
            onComment={onComment}
            onSetStatus={onSetStatus}
          />
        ) : (
          <TaskTimelineCard key={`tsk:${it.id}`} task={it.task} getUserById={getUserById} />
        ),
      )}
    </div>
  )
}

function TaskTimelineCard({ task, getUserById }) {
  const creator = task?.createdBy ? getUserById?.(task.createdBy) : null

  return (
    <Card
      title={
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <div className="font-heading font-bold text-slate-900">Task: {task?.title}</div>
            <div className="text-xs text-slate-500">
              {taskTypeLabel(task?.taskType)} • {taskStatusLabel(task?.status)} • {formatDateTime(task?.createdAt)}
            </div>
          </div>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <TaskStatusBadge status={task?.status} />
        </div>
      }
    >
      <div className="space-y-4">
        {task?.description ? (
          <div className="text-sm text-slate-700 whitespace-pre-wrap">{task.description}</div>
        ) : (
          <div className="text-sm text-slate-500">No description.</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Created by</div>
            <div className="mt-1 text-sm font-semibold text-slate-800">{creator?.name ?? task?.createdBy ?? 'Coach'}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Student submission</div>
            <div className="mt-1 text-sm text-slate-700">{task?.studentSubmission ? 'Submitted' : 'Not submitted yet.'}</div>
          </div>
        </div>

        {task?.coachFeedback ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-700">Coach feedback</div>
            <div className="mt-2 text-sm text-blue-900 whitespace-pre-wrap">{task.coachFeedback}</div>
          </div>
        ) : null}
      </div>
    </Card>
  )
}

function SubmissionCard({ submission, getUserById, allowComment, allowReview, currentUserId, onComment, onSetStatus }) {
  const Icon = ICONS[submission.type] ?? FileText
  const [text, setText] = useState('')

  const statusValue = String(submission.status ?? SubmissionStatus.pending).toLowerCase()
  const badgeValue = statusValue === 'approved' ? 'approved' : statusValue === 'reviewed' ? 'reviewed' : 'pending'

  const comments = submission.comments ?? []

  const payload = submission.payload ?? {}

  const content = (() => {
    if (submission.type === ProjectSubmissionType.idea) {
      return (
        <div className="space-y-4">
          <Section label="Problem statement">{payload.problemStatement}</Section>
          <Section label="Target users">{payload.targetUsers}</Section>
          <Section label="Proposed solution">{payload.proposedSolution}</Section>
          <Section label="Stage">{payload.stage}</Section>
        </div>
      )
    }

    if (submission.type === ProjectSubmissionType.document) {
      const file = payload.file
      return (
        <div className="space-y-2">
          <Section label="PDF">{file?.fileName ?? 'Document'}</Section>
          {file?.localUrl ? (
            <a className="text-sm font-semibold text-blue-600 hover:underline" href={file.localUrl} target="_blank" rel="noreferrer">
              Open document
            </a>
          ) : null}
          {payload.note ? <div className="text-xs text-slate-500">{payload.note}</div> : null}
        </div>
      )
    }

    if (submission.type === ProjectSubmissionType.demoLink) {
      return (
        <div className="space-y-2">
          <Section label="Demo link">
            <a className="text-blue-600 hover:underline" href={payload.url} target="_blank" rel="noreferrer">
              {payload.url}
            </a>
          </Section>
        </div>
      )
    }

    if (submission.type === ProjectSubmissionType.video) {
      const file = payload.file
      return (
        <div className="space-y-2">
          {payload.url ? (
            <Section label="Video link">
              <a className="text-blue-600 hover:underline" href={payload.url} target="_blank" rel="noreferrer">
                {payload.url}
              </a>
            </Section>
          ) : null}
          {file?.fileName ? <Section label="Video file">{file.fileName}</Section> : null}
          {file?.localUrl ? (
            <a className="text-sm font-semibold text-blue-600 hover:underline" href={file.localUrl} target="_blank" rel="noreferrer">
              Open video
            </a>
          ) : null}
          {payload.note ? <div className="text-xs text-slate-500">{payload.note}</div> : null}
        </div>
      )
    }

    return <div className="text-sm text-slate-600">Submission details unavailable.</div>
  })()

  return (
    <Card
      title={
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="font-heading font-bold text-slate-900">{submissionTypeLabel(submission.type)}</div>
            <div className="text-xs text-slate-500">{formatDateTime(submission.createdAt)}</div>
          </div>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <StatusBadge value={badgeValue} />
          {allowReview ? (
            <>
              {badgeValue === 'pending' ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => onSetStatus?.({ submissionId: submission.id, status: SubmissionStatus.reviewed, reviewerId: currentUserId })}
                >
                  Mark reviewed
                </button>
              ) : null}
              {badgeValue !== 'approved' ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onSetStatus?.({ submissionId: submission.id, status: SubmissionStatus.approved, reviewerId: currentUserId })}
                >
                  Approve
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      }
    >
      <div className="space-y-6">
        {content}

        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Feedback</div>
          {comments.length === 0 ? (
            <div className="text-sm text-slate-500">No feedback yet.</div>
          ) : (
            <div className="space-y-2">
              {comments.map((c) => {
                const author = getUserById?.(c.authorId)
                return (
                  <div key={c.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-bold text-slate-800 truncate">{author?.name ?? 'Coach'}</div>
                      <div className="text-xs text-slate-500">{formatDateTime(c.createdAt)}</div>
                    </div>
                    <div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{c.text}</div>
                  </div>
                )
              })}
            </div>
          )}

          {allowComment ? (
            <div className="mt-3 flex items-end gap-2">
              <textarea
                className="input min-h-[44px]"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write feedback…"
              />
              <button
                type="button"
                className="btn-primary"
                disabled={!String(text).trim()}
                onClick={async () => {
                  const v = String(text).trim()
                  if (!v) return
                  await onComment?.({ submissionId: submission.id, text: v })
                  setText('')
                }}
              >
                Send
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
