export default function LoadingSkeleton({ rows = 5 }) {
  return (
    <div className="surface p-4">
      <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="h-3 w-full animate-pulse rounded bg-slate-200" />
        ))}
      </div>
    </div>
  )
}
