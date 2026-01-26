import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtimeChannel(channelId) {
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(true)
    const [typing, setTyping] = useState([])
    const channelRef = useRef(null)
    const typingTimeoutRef = useRef(null)

    useEffect(() => {
        if (!channelId) return

        fetchMessages()
        subscribeToChannel()

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
            }
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }
        }
    }, [channelId])

    const fetchMessages = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('messages')
            .select('*, users(id, full_name, avatar_url)')
            .eq('channel_id', channelId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true })
            .limit(100)

        if (!error) setMessages(data || [])
        setLoading(false)
    }

    const subscribeToChannel = () => {
        const channel = supabase
            .channel(`messages:${channelId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `channel_id=eq.${channelId}`
                },
                async (payload) => {
                    // Fetch full message with user data
                    const { data } = await supabase
                        .from('messages')
                        .select('*, users(id, full_name, avatar_url)')
                        .eq('id', payload.new.id)
                        .single()

                    if (data) {
                        setMessages(prev => [...prev, data])
                    }
                }
            )
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState()
                const typingUsers = Object.values(state)
                    .flat()
                    .filter(user => user.typing)
                    .map(user => user.user_id)
                setTyping(typingUsers)
            })
            .subscribe()

        channelRef.current = channel
    }

    const sendMessage = async (content, attachments = []) => {
        const { error } = await supabase
            .from('messages')
            .insert([{
                channel_id: channelId,
                content,
                attachments
            }])

        if (error) {
            console.error('Error sending message:', error)
            return false
        }

        return true
    }

    const broadcastTyping = (isTyping) => {
        if (!channelRef.current) return

        channelRef.current.track({
            typing: isTyping,
            user_id: supabase.auth.getUser().then(({ data }) => data.user?.id)
        })

        // Clear typing after 3 seconds of inactivity
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }

        if (isTyping) {
            typingTimeoutRef.current = setTimeout(() => {
                broadcastTyping(false)
            }, 3000)
        }
    }

    const markAsRead = async () => {
        await supabase
            .from('channel_members')
            .update({ last_read_at: new Date().toISOString() })
            .eq('channel_id', channelId)
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    }

    return {
        messages,
        loading,
        typing,
        sendMessage,
        broadcastTyping,
        markAsRead
    }
}
