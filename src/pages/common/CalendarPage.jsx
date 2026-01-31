import EventCalendar from '../../components/common/Calendar/EventCalendar'

export default function CalendarPage() {
    return (
        <div className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-heading font-bold text-slate-900 dark:text-white">Interactive Calendar</h1>
                    <p className="text-lg text-slate-500 font-medium mt-2 max-w-2xl">
                        Schedule your journey, register for workshops, and track coaching sessions in one place.
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
                        <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                        Workshops
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        Coaching
                    </div>
                </div>
            </div>

            <EventCalendar />
        </div>
    )
}
