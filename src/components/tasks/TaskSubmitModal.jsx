import { useMemo, useState } from 'react'
import Modal from '../common/Modal'
import { TaskType } from '../../models/tasks'

function ChecklistEditor({ templateItems, value, onChange }) {
  const items = Array.isArray(templateItems) ? templateItems : []
  const checked = new Set(Array.isArray(value) ? value : [])

  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <div className="text-sm text-slate-500">No checklist items.</div>
      ) : (
        items.map((it) => (
          <label key={it.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
            <input
              type="checkbox"
              checked={checked.has(it.id)}
              onChange={(e) => {
                const next = new Set(checked)
                if (e.target.checked) next.add(it.id)
                else next.delete(it.id)
                onChange(Array.from(next))
              }}
            />
            <span className="text-sm text-slate-800">{it.text}</span>
          </label>
        ))
      )}
    </div>
  )
}

export default function TaskSubmitModal({ open, task, onClose, onSubmit }) {
  const taskType = String(task?.taskType ?? '').toUpperCase()

  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [checkedIds, setCheckedIds] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const canSubmit = useMemo(() => {
    if (busy) return false
    if (!task) return false
    if (taskType === TaskType.text) return Boolean(text.trim())
    if (taskType === TaskType.link) return Boolean(url.trim())
    if (taskType === TaskType.file) return Boolean(file)
    if (taskType === TaskType.checklist) return true
    return false
  }, [busy, file, task, taskType, text, url])

  const reset = () => {
    setText('')
    setUrl('')
    setFile(null)
    setCheckedIds([])
    setError(null)
  }

  const renderBody = () => {
    if (!task) return null

    if (taskType === TaskType.text) {
      return (
        <textarea
          className="input min-h-[140px]"
          placeholder="Write your response…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )
    }

    if (taskType === TaskType.link) {
      return (
        <input
          className="input"
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      )
    }

    if (taskType === TaskType.file) {
      return (
        <div className="space-y-2">
          <input
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null
              setFile(f)
            }}
          />
          {file ? <div className="text-xs text-slate-600">Selected: {file.name}</div> : null}
          <div className="text-xs text-slate-500">(Mock-only) File is stored as name + local preview URL.</div>
        </div>
      )
    }

    if (taskType === TaskType.checklist) {
      return (
        <ChecklistEditor
          templateItems={task?.checklistItems}
          value={checkedIds}
          onChange={setCheckedIds}
        />
      )
    }

    return <div className="text-sm text-slate-500">Unsupported task type.</div>
  }

  const handleSubmit = async () => {
    if (!task) return
    setError(null)
    setBusy(true)

    try {
      const submission = (() => {
        if (taskType === TaskType.text) return { text: text.trim() }
        if (taskType === TaskType.link) return { url: url.trim() }
        if (taskType === TaskType.file) {
          const localUrl = file ? URL.createObjectURL(file) : null
          return { fileName: file?.name ?? null, localUrl }
        }
        if (taskType === TaskType.checklist) return { checkedItemIds: checkedIds }
        return null
      })()

      await onSubmit?.({ taskId: task.id, submission })
      reset()
      onClose?.()
    } catch (e) {
      setError(e?.message ?? 'Failed to submit task')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title={task ? `Submit task: ${task.title}` : 'Submit task'}
      onClose={() => {
        reset()
        onClose?.()
      }}
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="space-y-4">
        {renderBody()}

        <div className="flex items-center justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => onClose?.()} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
            {busy ? 'Submitting…' : 'Submit Task'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
