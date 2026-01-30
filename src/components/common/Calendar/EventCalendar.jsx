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
        if (event.event_type === 'workshop') backgroundColor = '#8b5cf6' // purple
        if (event.event_type === 'deadline') backgroundColor = '#ef4444' // red
        if (event.isRegistered) backgroundColor = '#10b981' // green

        return {
            style: {
                backgroundColor,
                borderRadius: '6px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading calendar events...</div>
    }

    return (
        <Card className="h-[600px] p-4 bg-white dark:bg-slate-900 border-none shadow-none">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                onSelectEvent={(event) => setSelectedEvent(event)}
                views={['month', 'week', 'day']}
                view={view}
                onView={setView}
                eventPropGetter={eventStyleGetter}
                className="dark:text-slate-300"
            />

            <WorkshopRegistration
                event={selectedEvent}
                isOpen={!!selectedEvent}
                onClose={() => setSelectedEvent(null)}
            />
        </Card>
    )
}
