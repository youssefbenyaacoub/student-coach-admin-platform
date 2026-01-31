import { Dialog } from '@headlessui/react'
import { Clock, Users, Calendar, CheckCircle, MapPin, Video, ExternalLink } from 'lucide-react'
import Button from '../Button'
import { formatDate } from '../../../utils/time'
import { useCalendar } from '../../../context/CalendarContext'
import { useState } from 'react'

export default function WorkshopRegistration({ event, isOpen, onClose }) {
    const { registerForEvent, unregisterFromEvent } = useCalendar()
    const [loading, setLoading] = useState(false)

    if (!event) return null

    const handleAction = async () => {
        setLoading(true)
        try {
            if (event.isRegistered) {
                await unregisterFromEvent(event.id)
            } else {
                await registerForEvent(event.id)
            }
            onClose() // Close on success? Or keep open? Let's close for now.
        } catch (error) {
            console.error('Action failed:', error)
        } finally {
            setLoading(false)
        }
    }

    const isFull = event.capacity && (event.attendees_count || 0) >= event.capacity

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-md w-full rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl border border-slate-200 dark:border-slate-700">
                    <Dialog.Title className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        {event.title}
                    </Dialog.Title>

                    <div className="space-y-4 my-6">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <Calendar size={18} />
                            <span>{formatDate(event.start)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <Clock size={18} />
                            <span>
                                {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                {event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        {event.capacity && (
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                <Users size={18} />
                                <span>{event.attendees_count || 0} / {event.capacity} spots filled</span>
                            </div>
                        )}

                        {event.location && (
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                {event.location.startsWith('http') ? <Video size={18} /> : <MapPin size={18} />}
                                {event.location.startsWith('http') ? (
                                    <a href={event.location} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                                        Join Meeting <ExternalLink size={14} />
                                    </a>
                                ) : (
                                    <span>{event.location}</span>
                                )}
                            </div>
                        )}

                        <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                            {event.description || 'No description provided.'}
                        </p>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={onClose}>
                            Close
                        </Button>
                        {event.event_type !== 'coaching' && event.event_type !== 'deadline' && (
                            <Button
                                onClick={handleAction}
                                disabled={loading || (!event.isRegistered && isFull)}
                                className={event.isRegistered ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                            >
                                {loading ? 'Processing...' : event.isRegistered ? 'Unregister' : isFull ? 'Full' : 'Register'}
                            </Button>
                        )}
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    )
}
