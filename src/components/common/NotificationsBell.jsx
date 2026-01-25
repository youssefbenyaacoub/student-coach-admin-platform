import { Bell, CheckCheck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'

export default function NotificationsBell({ className = '', buttonClassName = '' }) {
  const { currentUser } = useAuth()
  const {
    listNotifications,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useData()

  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  const notifications = useMemo(() => {
    if (!currentUser?.id || !listNotifications) return []
    return listNotifications({ userId: currentUser.id, limit: 8 })
  }, [currentUser?.id, listNotifications])

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.readAt).length
  }, [notifications])

  useEffect(() => {
    const onDown = (e) => {
      if (!open) return
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (!currentUser?.id || !refreshNotifications) return

    // One-time sync; realtime subscription keeps it fresh
    refreshNotifications()
  }, [currentUser?.id, refreshNotifications])

  const onItemClick = async (n) => {
    try {
      if (!n.readAt && markNotificationRead) {
        await markNotificationRead({ notificationId: n.id })
      }
    } finally {
      setOpen(false)
      if (n.linkUrl) navigate(n.linkUrl)
    }
  }

  return (
    <div ref={rootRef} className={["relative", className].join(' ')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          'relative p-2 rounded-full transition-colors',
          'text-slate-400 hover:text-slate-700 hover:bg-slate-100',
          buttonClassName,
        ].join(' ')}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="text-sm font-heading font-bold text-slate-900">Notifications</div>
            <button
              type="button"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
              onClick={async () => {
                if (!currentUser?.id || !markAllNotificationsRead) return
                await markAllNotificationsRead({ userId: currentUser.id })
              }}
              disabled={!currentUser?.id || unreadCount === 0}
              title="Mark all as read"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">No notifications yet.</div>
          ) : (
            <div className="max-h-[380px] overflow-auto">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onItemClick(n)}
                  className={[
                    'w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors',
                    !n.readAt ? 'bg-blue-50/40' : 'bg-white',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{n.title ?? 'Notification'}</div>
                      {n.message ? (
                        <div className="mt-0.5 text-xs text-slate-600 line-clamp-2">{n.message}</div>
                      ) : null}
                      <div className="mt-1 text-[10px] text-slate-400">
                        {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                      </div>
                    </div>
                    {!n.readAt ? <span className="mt-1 h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" /> : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
