import { X } from 'lucide-react'
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion'
import { useToast } from '../../hooks/useToast'

const typeToClasses = {
  info: 'border-white/20 bg-white/50 dark:border-white/10 dark:bg-slate-950/30',
  success: 'border-success-500/30 bg-success-50/70 dark:bg-success-500/10',
  warning: 'border-warning-500/30 bg-warning-50/70 dark:bg-warning-500/10',
  danger: 'border-danger-500/30 bg-danger-50/70 dark:bg-danger-500/10',
}

export default function Toasts() {
  const { toasts, dismiss } = useToast()

  return (
    <div
      className="fixed right-4 top-4 z-[60] flex w-[92vw] max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`surface flex items-start justify-between gap-3 border p-3 shadow-soft ${
              typeToClasses[t.type] ?? typeToClasses.info
            }`}
            role="status"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">
                {t.title}
              </div>
              {t.message ? (
                <div className="mt-1 break-words text-sm text-muted-foreground">
                  {t.message}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="btn-ghost -mr-1 -mt-1 p-2"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
