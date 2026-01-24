export default function ProgressBar({ value = 0, colorClass = "bg-blue-600" }) {
    const safe = Math.max(0, Math.min(100, Number(value) || 0))
    return (
      <div className="w-full">
        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
            style={{ width: `${safe}%` }}
            aria-label={`Progress ${safe}%`}
          />
        </div>
        <div className="mt-1.5 flex justify-end">
             <span className="text-xs font-semibold text-slate-500">{safe}%</span>
        </div>
      </div>
    )
  }
