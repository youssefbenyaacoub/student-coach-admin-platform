import { useState } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import enUS from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useCalendar } from '../../../context/CalendarContext'
import WorkshopRegistration from './WorkshopRegistration'
import Card from '../Card'

const locales = {
    'en-US': enUS,
}

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
})

export default function EventCalendar() {
    const { events, loading } = useCalendar()
    const [selectedEvent, setSelectedEvent] = useState(null)
    const [view, setView] = useState('month')

    const eventStyleGetter = (event) => {
        let backgroundColor = '#3b82f6' // default blue
        if (event.event_type === 'workshop') {
            backgroundColor = '#8b5cf6' // purple
        } else if (event.event_type === 'deadline') {
            backgroundColor = '#ef4444' // red
        } else if (event.event_type === 'coaching') {
            backgroundColor = '#3b82f6' // blue
        }

        if (event.isRegistered) {
            // Add a border or distinct style for registered events
            return {
                style: {
                    backgroundColor,
                    borderRadius: '8px',
                    opacity: 1,
                    color: 'white',
                    border: '2px solid white',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    display: 'block',
                    fontWeight: 'bold'
                }
            }
        }

        return {
            style: {
                backgroundColor,
                borderRadius: '8px',
                opacity: 0.85,
                color: 'white',
                border: 'none',
                display: 'block'
            }
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading calendar events...</div>
    }

    return (
        <div className="h-[700px] bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%', minHeight: '600px' }}
                onSelectEvent={(event) => setSelectedEvent(event)}
                views={['month', 'week', 'day']}
                view={view}
                onView={setView}
                eventPropGetter={eventStyleGetter}
                className="font-sans"
            />

            <WorkshopRegistration
                event={selectedEvent}
                isOpen={!!selectedEvent}
                onClose={() => setSelectedEvent(null)}
            />
        </div>
    )
}
