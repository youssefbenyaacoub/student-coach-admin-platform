const map = {
  active: 'badge-success',
  archived: 'badge-neutral',
  pending: 'badge-warning',
  accepted: 'badge-success',
  rejected: 'badge-danger',
  scheduled: 'badge-neutral',
  cancelled: 'badge-danger',
  completed: 'badge-success',
  submitted: 'badge-warning',
  graded: 'badge-success',
  admin: 'badge-neutral',
  coach: 'badge-neutral',
  student: 'badge-neutral',
}

export default function StatusBadge({ value }) {
  const cls = map[String(value ?? '').toLowerCase()] ?? 'badge-neutral'
  return <span className={cls}>{String(value ?? '')}</span>
}
