import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Card from '../common/Card'
import Button from '../common/Button'
import { Plus, Users, Calendar, TrendingUp } from 'lucide-react'

export default function CohortManager() {
    const [cohorts, setCohorts] = useState([])
    const [templates, setTemplates] = useState([])
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [loading, setLoading] = useState(true)

    const fetchCohorts = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('cohorts')
            .select('*, program_templates(name)')
            .order('created_at', { ascending: false })

        if (!error) setCohorts(data || [])
        setLoading(false)
    }

    const fetchTemplates = async () => {
        const { data } = await supabase
            .from('program_templates')
            .select('id, name')
            .eq('is_active', true)

        setTemplates(data || [])
    }

    useEffect(() => {
        fetchCohorts()
        fetchTemplates()
    }, [])

    const createCohort = async (formData) => {
        const { error } = await supabase
            .from('cohorts')
            .insert([{
                template_id: formData.templateId,
                name: formData.name,
                description: formData.description,
                program_type: formData.programType,
                start_date: formData.startDate,
                end_date: formData.endDate,
                capacity: formData.capacity,
                application_deadline: formData.applicationDeadline,
                status: 'planning'
            }])

        if (!error) {
            fetchCohorts()
            setShowCreateModal(false)
        }
    }

    if (loading) return <div className="p-8">Loading...</div>

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Cohort Management</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">Manage program cohorts and track applications</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus size={16} className="mr-2" /> New Cohort
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard icon={Users} label="Total Cohorts" value={cohorts.length} color="blue" />
                <StatCard icon={Calendar} label="Active" value={cohorts.filter(c => c.status === 'in_progress').length} color="green" />
                <StatCard icon={TrendingUp} label="Accepting Applications" value={cohorts.filter(c => c.status === 'accepting_applications').length} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {cohorts.map(cohort => (
                    <CohortCard key={cohort.id} cohort={cohort} />
                ))}
            </div>

            {showCreateModal && (
                <CreateCohortModal
                    templates={templates}
                    onClose={() => setShowCreateModal(false)}
                    onCreate={createCohort}
                />
            )}
        </div>
    )
}

function StatCard({ icon: Icon, label, value, color }) {
    const colors = {
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
    }

    return (
        <Card className="p-6">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${colors[color]}`}>
                    <Icon size={24} />
                </div>
                <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">{label}</div>
                </div>
            </div>
        </Card>
    )
}

function CohortCard({ cohort }) {
    const [applications, setApplications] = useState([])

    const fetchApplications = async () => {
        const { data } = await supabase
            .from('cohort_applications')
            .select('status')
            .eq('cohort_id', cohort.id)

        setApplications(data || [])
    }

    useEffect(() => {
        fetchApplications()
    }, [cohort.id])

    const statusColors = {
        planning: 'bg-gray-100 text-gray-700',
        accepting_applications: 'bg-blue-100 text-blue-700',
        in_progress: 'bg-green-100 text-green-700',
        completed: 'bg-purple-100 text-purple-700',
        archived: 'bg-slate-100 text-slate-700'
    }

    return (
        <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{cohort.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {cohort.program_templates?.name}
                    </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[cohort.status]}`}>
                    {cohort.status.replace('_', ' ')}
                </span>
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Start Date</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                        {new Date(cohort.start_date).toLocaleDateString()}
                    </span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Capacity</span>
                    <span className="font-medium text-slate-900 dark:text-white">{cohort.capacity || 'Unlimited'}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Applications</span>
                    <span className="font-medium text-slate-900 dark:text-white">{applications.length}</span>
                </div>
            </div>

            <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1">
                    View Details
                </Button>
                <Button size="sm" className="flex-1">
                    Manage Applications
                </Button>
            </div>
        </Card>
    )
}

function CreateCohortModal({ templates, onClose, onCreate }) {
    const [formData, setFormData] = useState({
        templateId: '',
        name: '',
        description: '',
        programType: 'tech',
        startDate: '',
        endDate: '',
        capacity: '',
        applicationDeadline: ''
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        onCreate(formData)
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Create New Cohort</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Program Template
                            </label>
                            <select
                                value={formData.templateId}
                                onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                required
                            >
                                <option value="">Select a template</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Cohort Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                placeholder="e.g., Tech Accelerator Spring 2024"
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
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Capacity
                                </label>
                                <input
                                    type="number"
                                    value={formData.capacity}
                                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                    placeholder="Leave empty for unlimited"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Application Deadline
                                </label>
                                <input
                                    type="date"
                                    value={formData.applicationDeadline}
                                    onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1">
                                Create Cohort
                            </Button>
                        </div>
                    </form>
                </div>
            </Card>
        </div>
    )
}
