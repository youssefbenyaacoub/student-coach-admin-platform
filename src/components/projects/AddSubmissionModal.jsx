import { useMemo, useState } from 'react'
import Modal from '../common/Modal'
import { ProjectSubmissionType, submissionTypeLabel } from '../../models/projects'

const fileMeta = (file, localUrl) => {
  if (!file) return null
  return {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    lastModified: file.lastModified,
    localUrl,
  }
}

export default function AddSubmissionModal({ open, onClose, onSubmit, ideaSubmitted }) {
  const [type, setType] = useState(ProjectSubmissionType.document)
  const [busy, setBusy] = useState(false)

  const [docFile, setDocFile] = useState(null)
  const [demoUrl, setDemoUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoFile, setVideoFile] = useState(null)

  const canSubmit = useMemo(() => {
    if (!ideaSubmitted) return false
    if (type === ProjectSubmissionType.document) return !!docFile
    if (type === ProjectSubmissionType.demoLink) return String(demoUrl).trim().length > 0
    if (type === ProjectSubmissionType.video) return String(videoUrl).trim().length > 0 || !!videoFile
    return false
  }, [ideaSubmitted, type, docFile, demoUrl, videoUrl, videoFile])

  const reset = () => {
    setDocFile(null)
    setDemoUrl('')
    setVideoUrl('')
    setVideoFile(null)
    setType(ProjectSubmissionType.document)
  }

  const submit = async () => {
    if (!canSubmit || busy) return
    setBusy(true)
    try {
      const now = new Date().toISOString()
      if (type === ProjectSubmissionType.document) {
        const localUrl = URL.createObjectURL(docFile)
        await onSubmit?.({
          type,
          payload: {
            uploadedAt: now,
            file: fileMeta(docFile, localUrl),
            note: 'Stored locally in the browser (prototype mode).',
          },
        })
      }

      if (type === ProjectSubmissionType.demoLink) {
        await onSubmit?.({
          type,
          payload: {
            url: String(demoUrl).trim(),
            addedAt: now,
          },
        })
      }

      if (type === ProjectSubmissionType.video) {
        if (String(videoUrl).trim()) {
          await onSubmit?.({
            type,
            payload: {
              url: String(videoUrl).trim(),
              addedAt: now,
            },
          })
        } else {
          const localUrl = URL.createObjectURL(videoFile)
          await onSubmit?.({
            type,
            payload: {
              uploadedAt: now,
              file: fileMeta(videoFile, localUrl),
              note: 'Stored locally in the browser (prototype mode).',
            },
          })
        }
      }

      reset()
      onClose?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Add submission"
      onClose={() => {
        reset()
        onClose?.()
      }}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={() => {
            reset()
            onClose?.()
          }}>
            Cancel
          </button>
          <button type="button" className="btn-primary" disabled={!canSubmit || busy} onClick={submit}>
            Add
          </button>
        </>
      }
    >
      {!ideaSubmitted ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Submit your IDEA first before adding other submission types.
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="submissionType">Submission type</label>
          <select
            id="submissionType"
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={!ideaSubmitted}
          >
            <option value={ProjectSubmissionType.document}>{submissionTypeLabel(ProjectSubmissionType.document)}</option>
            <option value={ProjectSubmissionType.demoLink}>{submissionTypeLabel(ProjectSubmissionType.demoLink)}</option>
            <option value={ProjectSubmissionType.video}>{submissionTypeLabel(ProjectSubmissionType.video)}</option>
          </select>
        </div>

        {type === ProjectSubmissionType.document ? (
          <div>
            <label className="label" htmlFor="docFile">PDF document</label>
            <input
              id="docFile"
              className="input"
              type="file"
              accept="application/pdf"
              onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              disabled={!ideaSubmitted}
            />
            <p className="mt-2 text-xs text-slate-500">PDF is stored locally for now (no database/storage yet).</p>
          </div>
        ) : null}

        {type === ProjectSubmissionType.demoLink ? (
          <div>
            <label className="label" htmlFor="demoUrl">Demo URL</label>
            <input
              id="demoUrl"
              className="input"
              type="url"
              placeholder="https://your-demo.example"
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
              disabled={!ideaSubmitted}
            />
          </div>
        ) : null}

        {type === ProjectSubmissionType.video ? (
          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="videoUrl">Video URL (recommended)</label>
              <input
                id="videoUrl"
                className="input"
                type="url"
                placeholder="https://youtube.com/... or https://drive.google.com/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                disabled={!ideaSubmitted}
              />
            </div>
            <div className="text-xs text-slate-500">Or upload a video file (stored locally for now).</div>
            <div>
              <label className="label" htmlFor="videoFile">Video file</label>
              <input
                id="videoFile"
                className="input"
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                disabled={!ideaSubmitted}
              />
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
