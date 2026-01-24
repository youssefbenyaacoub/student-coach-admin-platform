import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Modal({ open, title, children, onClose, footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        className="surface-soft relative z-10 w-full max-w-2xl p-4"
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Dialog'}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            {title ? <div className="text-sm font-semibold text-foreground">{title}</div> : null}
          </div>
          <button type="button" className="btn-ghost p-2" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3">{children}</div>
        {footer ? <div className="mt-4 flex items-center justify-end gap-2">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
