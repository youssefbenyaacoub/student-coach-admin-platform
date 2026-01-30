import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useNotifications() {
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const channelRef = useRef(null)

    const fetchNotifications = async () => {
        setLoading(true)
        const user = await supabase.auth.getUser()

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.data.user?.id)
            .order('created_at', { ascending: false })
            .limit(50)

        if (!error) {
            setNotifications(data || [])
            setUnreadCount(data?.filter(n => !n.is_read).length || 0)
        }
        setLoading(false)
    }

    const subscribeToNotifications = async () => {
        const user = await supabase.auth.getUser()
        const userId = user.data.user?.id

        if (!userId) return

        const channel = supabase
            .channel(`notifications:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    setNotifications(prev => [payload.new, ...prev])
                    setUnreadCount(prev => prev + 1)

                    // Show browser notification if permitted
                    if (Notification.permission === 'granted') {
                        new Notification(payload.new.title, {
                            body: payload.new.message,
                            icon: '/logo.png'
                        })
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    setNotifications(prev =>
                        prev.map(n => n.id === payload.new.id ? payload.new : n)
                    )
                    if (payload.new.is_read && !payload.old.is_read) {
                        setUnreadCount(prev => Math.max(0, prev - 1))
                    }
                }
            )
            .subscribe()

        channelRef.current = channel
    }

    useEffect(() => {
        fetchNotifications()
        subscribeToNotifications()

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
            }
        }
    }, [])

    const markAsRead = async (notificationIds) => {
        const { error } = await supabase.rpc('mark_notifications_read', {
            p_notification_ids: Array.isArray(notificationIds) ? notificationIds : [notificationIds]
        })

        if (!error) {
            setNotifications(prev =>
                prev.map(n =>
                    (Array.isArray(notificationIds) ? notificationIds : [notificationIds]).includes(n.id)
                        ? { ...n, is_read: true, read_at: new Date().toISOString() }
                        : n
                )
            )
        }
    }

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
        if (unreadIds.length > 0) {
            await markAsRead(unreadIds)
        }
    }

    const requestPermission = async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission()
        }
    }

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        requestPermission
    }
}
