export const TaskType = {
  text: 'TEXT',
  file: 'FILE',
  link: 'LINK',
  checklist: 'CHECKLIST',
}

export const TaskStatus = {
  pending: 'PENDING',
  submitted: 'SUBMITTED',
  reviewed: 'REVIEWED',
  approved: 'APPROVED',
  revision: 'REVISION',
}

export const taskTypeLabel = (taskType) => {
  const t = String(taskType ?? '').toUpperCase()
  if (t === TaskType.text) return 'Text'
  if (t === TaskType.file) return 'File'
  if (t === TaskType.link) return 'Link'
  if (t === TaskType.checklist) return 'Checklist'
  return 'Task'
}

export const taskStatusLabel = (status) => {
  const s = String(status ?? '').toUpperCase()
  if (s === TaskStatus.pending) return 'Pending'
  if (s === TaskStatus.submitted) return 'Submitted'
  if (s === TaskStatus.reviewed) return 'Reviewed'
  if (s === TaskStatus.approved) return 'Approved'
  if (s === TaskStatus.revision) return 'Revision'
  return 'Pending'
}

export const canStudentSubmitTask = (status) => {
  const s = String(status ?? '').toUpperCase()
  return s === TaskStatus.pending || s === TaskStatus.revision
}

export const isCoachReviewableTask = (status) => {
  const s = String(status ?? '').toUpperCase()
  return s === TaskStatus.submitted
}

export const normalizeTaskStatus = (status) => {
  const s = String(status ?? TaskStatus.pending).toUpperCase()
  return Object.values(TaskStatus).includes(s) ? s : TaskStatus.pending
}

export const normalizeTaskType = (taskType) => {
  const t = String(taskType ?? TaskType.text).toUpperCase()
  return Object.values(TaskType).includes(t) ? t : TaskType.text
}
