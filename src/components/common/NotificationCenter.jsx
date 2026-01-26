import { useState, useEffect } from 'react'
import { useNotifications } from '../../hooks/useNotifications'
import { Bell, Check, CheckCheck, X } from 'lucide-react'

export default function NotificationCenter() {
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead, requestPermission } = useNotifications()
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        requestPermission()
    }, [])

    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id)
        }

        // Navigate to related entity if applicable
        if (notification.entity_type && notification.entity_id) {
            // Handle navigation based on entity type
            console.log('Navigate to:', notification.entity_type, notification.entity_id)
        }
    }

    return (
        <div className="relative">
            {/* Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
                <Bell size={20} className="text-slate-700 dark:text-slate-300" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-800 rounded-lg shadow-xl border dark:border-slate-700 z-50 max-h-[600px] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
                            <h3 className="font-semibold text-slate-900 dark:text-white">
                                Notifications
                            </h3>
                            <div className="flex gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-sm text-blue-600 hover:text-blue-700"
                                    >
                                        Mark all read
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="overflow-y-auto flex-1">
                            {loading ? (
                                <div className="p-8 text-center text-slate-500">Loading...</div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    No notifications yet
                                </div>
                            ) : (
                                <div className="divide-y dark:divide-slate-700">
                                    {notifications.map((notification) => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            onClick={() => handleNotificationClick(notification)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

function NotificationItem({ notification, onClick }) {
    const getIcon = () => {
        const iconMap = {
            deadline_approaching: '⏰',
            feedback_ready: '✅',
            session_invite: '📅',
            student_stalled: '⚠️',
            stage_advanced: '🎉',
            message_received: '💬',
            task_assigned: '📋',
            application_status: '📝'
        }
        return iconMap[notification.notification_type] || '🔔'
    }

    return (
        <button
            onClick={onClick}
            className={`w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
        >
            <div className="flex gap-3">
                <div className="text-2xl">{getIcon()}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-slate-900 dark:text-white text-sm">
                            {notification.title}
                        </h4>
                        {!notification.is_read ? (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                        ) : (
                            <CheckCheck size={14} className="text-slate-400 flex-shrink-0 mt-1" />
                        )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                        {notification.message}
                    </p>
                    <div className="text-xs text-slate-500 mt-2">
                        {formatTimestamp(notification.created_at)}
                    </div>
                </div>
            </div>
        </button>
    )
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
}
