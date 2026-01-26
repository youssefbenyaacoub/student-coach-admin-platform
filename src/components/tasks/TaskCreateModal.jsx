import { useMemo, useState } from 'react'
import Modal from '../common/Modal'
import { TaskType, taskTypeLabel } from '../../models/tasks'
import { makeId } from '../../utils/ids'

const TYPE_OPTIONS = [TaskType.text, TaskType.file, TaskType.link, TaskType.checklist]

function ChecklistBuilder({ items, onChange }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Checklist items</div>

      {(items ?? []).map((it) => (
        <div key={it.id} className="flex items-center gap-2">
          <input
            className="input flex-1"
            placeholder="Checklist item…"
            value={it.text}
            onChange={(e) => {
              const next = (items ?? []).map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x))
              onChange(next)
            }}
          />
          <button
            type="button"
            className="btn-ghost"
            onClick={() => onChange((items ?? []).filter((x) => x.id !== it.id))}
            title="Remove item"
          >
            Remove
          </button>
        </div>
      ))}

      <button
        type="button"
        className="btn-secondary"
        onClick={() => onChange([...(items ?? []), { id: makeId('chk'), text: '' }])}
      >
        + Add item
      </button>
    </div>
  )
}

export default function TaskCreateModal({ open, project, submissions, onClose, onCreate }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [taskType, setTaskType] = useState(TaskType.text)
  const [deadline, setDeadline] = useState('')
  const [submissionId, setSubmissionId] = useState('')
  const [checklistItems, setChecklistItems] = useState([{ id: makeId('chk'), text: '' }])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const projectTitle = project?.title ?? 'Project'

  const canCreate = useMemo(() => {
    if (busy) return false
    if (!project?.id) return false
    return Boolean(String(title).trim())
  }, [busy, project?.id, title])

  const reset = () => {
    setTitle('')
    setDescription('')
    setTaskType(TaskType.text)
    setDeadline('')
    setSubmissionId('')
    setChecklistItems([{ id: makeId('chk'), text: '' }])
    setBusy(false)
    setError(null)
  }

  const normalizedDeadline = useMemo(() => {
    if (!deadline) return null
    // datetime-local gives "YYYY-MM-DDTHH:mm"
    const d = new Date(deadline)
    if (Number.isNaN(d.getTime())) return null
    return d.toISOString()
  }, [deadline])

  const handleCreate = async () => {
    if (!project?.id) return
    setError(null)
    setBusy(true)
    try {
      await onCreate?.({
        projectId: project.id,
        submissionId: submissionId || null,
        title,
        description,
        taskType,
        deadline: normalizedDeadline,
        checklistItems: taskType === TaskType.checklist ? checklistItems : null,
      })
      reset()
      onClose?.()
    } catch (e) {
      setError(e?.message ?? 'Failed to create task')
    } finally {
      setBusy(false)
    }
  }

  const submissionOptions = Array.isArray(submissions) ? submissions : []

  return (
    <Modal
      open={open}
      title={`Create Task • ${projectTitle}`}
      onClose={() => {
        reset()
        onClose?.()
      }}
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="space-y-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Title</div>
          <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title…" />
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</div>
          <textarea
            className="input mt-1 min-h-[120px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details…"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Task type</div>
            <select className="input mt-1" value={taskType} onChange={(e) => setTaskType(e.target.value)}>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {taskTypeLabel(t)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Deadline</div>
            <input className="input mt-1" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Link to submission (optional)</div>
          <select className="input mt-1" value={submissionId} onChange={(e) => setSubmissionId(e.target.value)}>
            <option value="">None</option>
            {submissionOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.type} • {new Date(s.createdAt).toLocaleString()}
              </option>
            ))}
          </select>
        </div>

        {String(taskType).toUpperCase() === TaskType.checklist ? (
          <ChecklistBuilder items={checklistItems} onChange={setChecklistItems} />
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => onClose?.()} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleCreate} disabled={!canCreate}>
            {busy ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
