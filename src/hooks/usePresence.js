import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function usePresence(channelId) {
    const [onlineUsers, setOnlineUsers] = useState([])
    const channelRef = useRef(null)
    const heartbeatRef = useRef(null)

    const subscribeToPresence = async () => {
        const user = await supabase.auth.getUser()
        const userId = user.data.user?.id

        if (!userId) return

        const channel = supabase
            .channel(`presence:${channelId}`)
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState()
                const users = Object.values(state).flat()
                setOnlineUsers(users)
            })
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                console.log('User joined:', newPresences)
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                console.log('User left:', leftPresences)
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: userId,
                        online_at: new Date().toISOString()
                    })
                }
            })

        channelRef.current = channel
    }

    const startHeartbeat = () => {
        // Update presence every 30 seconds
        heartbeatRef.current = setInterval(async () => {
            if (channelRef.current) {
                const user = await supabase.auth.getUser()
                await channelRef.current.track({
                    user_id: user.data.user?.id,
                    online_at: new Date().toISOString()
                })
            }
        }, 30000)
    }

    useEffect(() => {
        if (!channelId) return

        subscribeToPresence()
        startHeartbeat()

        return () => {
            if (channelRef.current) {
                channelRef.current.untrack()
                supabase.removeChannel(channelRef.current)
            }
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current)
            }
        }
    }, [channelId])

    const updateStatus = async (status) => {
        await supabase.rpc('update_presence', {
            p_status: status,
            p_channel_id: channelId
        })
    }

    return {
        onlineUsers,
        updateStatus
    }
}
