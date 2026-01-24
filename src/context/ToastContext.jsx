import { useCallback, useMemo, useState } from 'react'
import { makeId } from '../utils/ids'
import { ToastContext } from './ToastContextBase'

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((toast) => {
    const id = toast.id ?? makeId('toast')
    const next = {
      id,
      title: toast.title ?? 'Notification',
      message: toast.message ?? '',
      type: toast.type ?? 'info',
      durationMs: toast.durationMs ?? 3500,
    }

    setToasts((prev) => [next, ...prev].slice(0, 5))

    if (next.durationMs > 0) {
      window.setTimeout(() => dismiss(id), next.durationMs)
    }

    return id
  }, [dismiss])

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}
