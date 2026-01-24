export default function ProgressBar({ value = 0 }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className="w-full">
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary"
          style={{ width: `${safe}%` }}
          aria-label={`Progress ${safe}%`}
        />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{safe}%</div>
    </div>
  )
}
