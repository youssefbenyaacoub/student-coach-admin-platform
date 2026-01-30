import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Card from '../common/Card'
import Button from '../common/Button'
import { Calendar, Users, Video, Plus } from 'lucide-react'

export default function DemoDayScheduler() {
    const [demoDays, setDemoDays] = useState([])
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [loading, setLoading] = useState(true)

    const fetchDemoDays = async () => {
        const { data } = await supabase
            .from('demo_days')
            .select('*, demo_day_participants(count)')
            .order('event_date', { ascending: true })

        setDemoDays(data || [])
        setLoading(false)
    }

    useEffect(() => {
        fetchDemoDays()
    }, [])

    const createDemoDay = async (formData) => {
        const { error } = await supabase
            .from('demo_days')
            .insert([formData])

        if (!error) {
            fetchDemoDays()
            setShowCreateModal(false)
        }
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Demo Days</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">Schedule and manage pitch events</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus size={16} className="mr-2" /> Create Demo Day
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {demoDays.map(demoDay => (
                        <DemoDayCard key={demoDay.id} demoDay={demoDay} />
                    ))}
                </div>
            )}

            {showCreateModal && (
                <CreateDemoDayModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={createDemoDay}
                />
            )}
        </div>
    )
}

function DemoDayCard({ demoDay }) {
    const participantCount = demoDay.demo_day_participants?.[0]?.count || 0

    return (
        <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{demoDay.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{demoDay.description}</p>
                </div>
            </div>

            <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                    <Calendar size={16} className="text-slate-500" />
                    <span className="text-slate-700 dark:text-slate-300">
                        {new Date(demoDay.event_date).toLocaleDateString()} at{' '}
                        {new Date(demoDay.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <Users size={16} className="text-slate-500" />
                    <span className="text-slate-700 dark:text-slate-300">
                        {participantCount} / {demoDay.max_participants || '∞'} participants
                    </span>
                </div>
                {demoDay.virtual_link && (
                    <div className="flex items-center gap-2 text-sm">
                        <Video size={16} className="text-slate-500" />
                        <span className="text-slate-700 dark:text-slate-300">Virtual Event</span>
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="flex-1">
                    View Details
                </Button>
                <Button size="sm" className="flex-1">
                    Register
                </Button>
            </div>
        </Card>
    )
}

function CreateDemoDayModal({ onClose, onCreate }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        event_date: '',
        duration_minutes: 180,
        location: '',
        virtual_link: '',
        max_participants: ''
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        onCreate(formData)
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Create Demo Day</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Event Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Event Date & Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.event_date}
                                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Max Participants
                                </label>
                                <input
                                    type="number"
                                    value={formData.max_participants}
                                    onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                    placeholder="Leave empty for unlimited"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Virtual Link (optional)
                            </label>
                            <input
                                type="url"
                                value={formData.virtual_link}
                                onChange={(e) => setFormData({ ...formData, virtual_link: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                placeholder="https://zoom.us/..."
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1">
                                Create Demo Day
                            </Button>
                        </div>
                    </form>
                </div>
            </Card>
        </div>
    )
}
