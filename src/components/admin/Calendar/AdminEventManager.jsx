import { useState } from 'react'
import { Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react'
import { useCalendar } from '../../../context/CalendarContext'
import Button from '../../common/Button'
import Card from '../../common/Card'
import { Dialog } from '@headlessui/react'

export default function AdminEventManager() {
    const { events, createEvent, deleteEvent, loading } = useCalendar()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        event_type: 'workshop',
        capacity: ''
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const start = new Date(`${formData.start_date}T${formData.start_time}`)
            const end = new Date(`${formData.end_date}T${formData.end_time}`)

            await createEvent({
                title: formData.title,
                description: formData.description,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                event_type: formData.event_type,
                capacity: formData.capacity ? parseInt(formData.capacity) : null
            })
            setIsModalOpen(false)
            setFormData({
                title: '',
                description: '',
                start_date: '',
                start_time: '',
                end_date: '',
                end_time: '',
                event_type: 'workshop',
                capacity: ''
            })
        } catch (error) {
            console.error('Failed to create event:', error)
            alert('Error creating event')
        }
    }

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this event?')) {
            try {
                await deleteEvent(id)
            } catch (error) {
                console.error('Failed to delete event:', error)
            }
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Event Management</h2>
                    <p className="text-slate-500 dark:text-slate-400">Create and manage workshops, sessions, and deadlines.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus className="h-5 w-5 mr-2" />
                    Create Event
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                    <Card key={event.id} className="relative group">
                        <div className={`absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                            <button
                                onClick={() => handleDelete(event.id)}
                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg ${event.event_type === 'workshop' ? 'bg-purple-100 text-purple-600' :
                                    event.event_type === 'deadline' ? 'bg-red-100 text-red-600' :
                                        'bg-blue-100 text-blue-600'
                                }`}>
                                <CalendarIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">{event.title}</h3>
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">{event.event_type}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                                    {event.description || 'No description'}
                                </p>
                                <div className="mt-3 text-xs text-slate-500">
                                    {new Date(event.start).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
                <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="mx-auto max-w-lg w-full rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl border border-slate-200">
                        <Dialog.Title className="text-xl font-bold text-slate-900 dark:text-white mb-4">Create New Event</Dialog.Title>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-transparent"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-transparent"
                                        value={formData.start_date}
                                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
                                    <input
                                        type="time"
                                        required
                                        className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-transparent"
                                        value={formData.start_time}
                                        onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-transparent"
                                        value={formData.end_date}
                                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Time</label>
                                    <input
                                        type="time"
                                        required
                                        className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-transparent"
                                        value={formData.end_time}
                                        onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                                    <select
                                        className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-transparent"
                                        value={formData.event_type}
                                        onChange={e => setFormData({ ...formData, event_type: e.target.value })}
                                    >
                                        <option value="workshop">Workshop</option>
                                        <option value="coaching">Coaching</option>
                                        <option value="deadline">Deadline</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Capacity</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-transparent"
                                        placeholder="Optional"
                                        value={formData.capacity}
                                        onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                <textarea
                                    className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-transparent"
                                    rows={3}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    Create Event
                                </Button>
                            </div>
                        </form>
                    </Dialog.Panel>
                </div>
            </Dialog>
        </div>
    )
}
