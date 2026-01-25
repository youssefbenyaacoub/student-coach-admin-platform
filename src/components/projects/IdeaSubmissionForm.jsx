import { useMemo, useState } from 'react'
import { ProjectStage, validateIdeaPayload } from '../../models/projects'

export default function IdeaSubmissionForm({ initialValue, onSubmit, onCancel, submitLabel = 'Create project' }) {
  const [value, setValue] = useState(() => ({
    title: initialValue?.title ?? '',
    problemStatement: initialValue?.problemStatement ?? '',
    targetUsers: initialValue?.targetUsers ?? '',
    proposedSolution: initialValue?.proposedSolution ?? '',
    stage: initialValue?.stage ?? ProjectStage.idea,
  }))

  const validation = useMemo(() => validateIdeaPayload(value), [value])

  const setField = (key, next) => setValue((v) => ({ ...v, [key]: next }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const v = validateIdeaPayload(value)
    if (!v.ok) return
    onSubmit?.(value)
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="label" htmlFor="projectTitle">Project title</label>
        <input
          id="projectTitle"
          className="input"
          value={value.title}
          onChange={(e) => setField('title', e.target.value)}
          placeholder="e.g., EcoEat"
          autoComplete="off"
          required
        />
        {validation.errors?.title ? <p className="mt-1 text-xs text-red-600">{validation.errors.title}</p> : null}
      </div>

      <div>
        <label className="label" htmlFor="problemStatement">Problem statement</label>
        <textarea
          id="problemStatement"
          className="input min-h-[96px]"
          value={value.problemStatement}
          onChange={(e) => setField('problemStatement', e.target.value)}
          placeholder="What problem are you solving?"
          required
        />
        {validation.errors?.problemStatement ? <p className="mt-1 text-xs text-red-600">{validation.errors.problemStatement}</p> : null}
      </div>

      <div>
        <label className="label" htmlFor="targetUsers">Target users</label>
        <textarea
          id="targetUsers"
          className="input min-h-[80px]"
          value={value.targetUsers}
          onChange={(e) => setField('targetUsers', e.target.value)}
          placeholder="Who will benefit from this project?"
          required
        />
        {validation.errors?.targetUsers ? <p className="mt-1 text-xs text-red-600">{validation.errors.targetUsers}</p> : null}
      </div>

      <div>
        <label className="label" htmlFor="proposedSolution">Proposed solution</label>
        <textarea
          id="proposedSolution"
          className="input min-h-[96px]"
          value={value.proposedSolution}
          onChange={(e) => setField('proposedSolution', e.target.value)}
          placeholder="Describe your solution at a high level."
          required
        />
        {validation.errors?.proposedSolution ? <p className="mt-1 text-xs text-red-600">{validation.errors.proposedSolution}</p> : null}
      </div>

      <div>
        <label className="label" htmlFor="stage">Project stage</label>
        <select
          id="stage"
          className="input"
          value={value.stage}
          onChange={(e) => setField('stage', e.target.value)}
          required
        >
          <option value={ProjectStage.idea}>Idea</option>
          <option value={ProjectStage.prototype}>Prototype</option>
          <option value={ProjectStage.mvp}>MVP</option>
        </select>
        {validation.errors?.stage ? <p className="mt-1 text-xs text-red-600">{validation.errors.stage}</p> : null}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel ? (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        <button type="submit" className="btn-primary" disabled={!validation.ok}>
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
