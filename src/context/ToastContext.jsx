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
      onClick: typeof toast.onClick === 'function' ? toast.onClick : null,
    }

    setToasts((prev) => [next, ...prev].slice(0, 5))

    if (next.durationMs > 0) {
      window.setTimeout(() => dismiss(id), next.durationMs)
    }

    return id
  }, [dismiss])

  // Backward-compatible helper used by older screens.
  // Usage: showToast('Saved!', 'success')
  const showToast = useCallback(
    (message, type = 'info', title) => {
      const normalizedType = type === 'error' ? 'danger' : type
      return push({
        type: normalizedType,
        title: title ?? (normalizedType === 'danger' ? 'Error' : 'Notification'),
        message: message ?? '',
      })
    },
    [push],
  )

  const value = useMemo(() => ({ toasts, push, dismiss, showToast }), [toasts, push, dismiss, showToast])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}
