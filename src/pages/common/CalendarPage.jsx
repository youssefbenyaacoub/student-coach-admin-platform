import EventCalendar from '../../components/common/Calendar/EventCalendar'

export default function CalendarPage() {
    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Calendar</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">
                        Manage your workshops, coaching sessions, and deadlines.
                    </p>
                </div>
            </div>

            <EventCalendar />
        </div>
    )
}
