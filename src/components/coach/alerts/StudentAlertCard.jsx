import { AlertTriangle, Clock, Calendar } from 'lucide-react'

export default function StudentAlertCard({ student, alerts, severity, isSelected, onClick }) {

    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-3 rounded-lg border transition-all relative group
                ${isSelected
                    ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                    : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'
                }
            `}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs
                        ${severity === 'high' ? 'bg-red-100 text-red-700' :
                            severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'}
                    `}>
                        {student.name.charAt(0)}
                    </div>
                    <div>
                        <div className="font-semibold text-sm text-slate-800">{student.name}</div>
                        <div className="text-xs text-slate-500">{alerts.length} Active Alert{alerts.length !== 1 && 's'}</div>
                    </div>
                </div>
                {severity === 'high' && (
                    <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                )}
            </div>

            <div className="space-y-1">
                {alerts.slice(0, 2).map(alert => (
                    <div key={alert.id} className={`text-xs px-2 py-1 rounded flex items-center gap-2
                        ${alert.severity === 'high' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}
                    `}>
                        <span className="w-1 h-1 rounded-full bg-current opacity-60" />
                        <span className="truncate">{alert.message}</span>
                    </div>
                ))}
            </div>

            {alerts.length > 2 && (
                <div className="mt-1 text-[10px] text-slate-400 text-center">
                    +{alerts.length - 2} more
                </div>
            )}
        </button>
    )
}
