const styles = {
  success: 'bg-green-100 text-green-700 border border-green-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger: 'bg-red-50 text-red-700 border border-red-200',
  neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
}

const map = {
  active: 'success',
  archived: 'neutral',
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
  scheduled: 'info',
  cancelled: 'danger',
  completed: 'success',
  submitted: 'warning',
  graded: 'success',
  admin: 'neutral',
  coach: 'neutral',
  student: 'neutral',
}

export default function StatusBadge({ value }) {
  const statusKey = String(value ?? '').toLowerCase()
  const variant = map[statusKey] || 'neutral'
  const classes = styles[variant]
  
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize tracking-wide ${classes}`}>
      {String(value ?? '')}
    </span>
  )
}
