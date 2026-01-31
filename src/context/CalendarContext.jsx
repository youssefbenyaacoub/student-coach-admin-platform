import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const CalendarContext = createContext(null)

export function CalendarProvider({ children }) {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const { currentUser } = useAuth()
    const channelRef = useRef(null)

    useEffect(() => {
        if (currentUser) {
            fetchEvents()
            subscribeToEvents()
        }

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
            }
        }
    }, [currentUser])

    const fetchEvents = async () => {
        setLoading(true)

        // 1. Fetch generic calendar events
        const { data: eventsData, error: eventsError } = await supabase
            .from('calendar_events')
            .select('*')
            .order('start_time', { ascending: true })

        // 2. Fetch coaching sessions (as events)
        const { data: sessionsData, error: sessionsError } = await supabase
            .from('coaching_sessions')
            .select('*, users!coaching_sessions_coach_id_fkey(name)')
            .order('starts_at', { ascending: true })

        if (eventsError || sessionsError) {
            console.error('Error fetching calendar data:', eventsError || sessionsError)
            setLoading(false)
            return
        }

        // Fetch user's attendances (for workshops/generic events)
        let myAttendances = []
        if (currentUser) {
            const { data: attendanceData } = await supabase
                .from('event_attendees')
                .select('event_id')
                .eq('user_id', currentUser.id)

            if (attendanceData) {
                myAttendances = attendanceData.map(a => a.event_id)
            }
        }

        // 3. Process generic events
        const processedEvents = (eventsData ?? []).map(event => ({
            ...event,
            start: new Date(event.start_time),
            end: new Date(event.end_time),
            isRegistered: myAttendances.includes(event.id)
        }))

        // 4. Process coaching sessions as calendar events
        const sessionEvents = (sessionsData ?? []).map(s => ({
            id: s.id,
            title: `Coaching: ${s.title}`,
            description: s.description,
            start: new Date(s.starts_at),
            end: new Date(s.ends_at),
            event_type: 'coaching',
            coach: s.users?.name,
            location: s.location,
            isRegistered: true // Sessions are pre-assigned in this platform
        }))

        setEvents([...processedEvents, ...sessionEvents])
        setLoading(false)
    }

    const subscribeToEvents = () => {
        // Subscribe to public changes on calendar_events
        const channel = supabase
            .channel('calendar_updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'calendar_events' },
                () => {
                    // Refetch all for now to keep it simple and consistent
                    fetchEvents()
                }
            )
            .subscribe()

        channelRef.current = channel
    }

    const createEvent = async (eventData) => {
        const { title, description, start_time, end_time, event_type, capacity, is_recurring } = eventData

        const { data, error } = await supabase
            .from('calendar_events')
            .insert([{
                title,
                description,
                start_time,
                end_time,
                event_type,
                capacity: capacity || null,
                is_recurring: is_recurring || false,
                created_by: currentUser.id
            }])
            .select()
            .single()

        if (error) {
            throw error
        }

        // Optimistic update handled by subscription mostly, but we can append manually if needed
        return data
    }

    const deleteEvent = async (eventId) => {
        const { error } = await supabase
            .from('calendar_events')
            .delete()
            .eq('id', eventId)

        if (error) throw error
    }

    const registerForEvent = async (eventId) => {
        if (!currentUser) return false

        const { error } = await supabase
            .from('event_attendees')
            .insert([{
                event_id: eventId,
                user_id: currentUser.id
            }])

        if (error) throw error

        // Optimistic update
        setEvents(prev => prev.map(e =>
            e.id === eventId ? { ...e, isRegistered: true } : e
        ))

        return true
    }

    const unregisterFromEvent = async (eventId) => {
        if (!currentUser) return false

        const { error } = await supabase
            .from('event_attendees')
            .delete()
            .eq('event_id', eventId)
            .eq('user_id', currentUser.id)

        if (error) throw error

        // Optimistic update
        setEvents(prev => prev.map(e =>
            e.id === eventId ? { ...e, isRegistered: false } : e
        ))

        return true
    }

    return (
        <CalendarContext.Provider value={{
            events,
            loading,
            fetchEvents,
            createEvent,
            deleteEvent,
            registerForEvent,
            unregisterFromEvent
        }}>
            {children}
        </CalendarContext.Provider>
    )
}

export function useCalendar() {
    const context = useContext(CalendarContext)
    if (!context) {
        throw new Error('useCalendar must be used within a CalendarProvider')
    }
    return context
}
