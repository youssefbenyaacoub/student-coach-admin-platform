import { FolderOpen } from 'lucide-react'

export default function EmptyState({ title = 'No results found', message, action, icon = FolderOpen }) {
  const Icon = icon
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
         <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-heading font-semibold text-slate-900 text-base">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
