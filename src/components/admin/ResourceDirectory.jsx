import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Card from '../common/Card'
import Button from '../common/Button'
import { Plus, Search, UserPlus, Briefcase, DollarSign, Tool } from 'lucide-react'

const RESOURCE_TYPES = {
    mentor: { icon: UserPlus, color: 'blue', label: 'Mentor' },
    investor: { icon: DollarSign, color: 'green', label: 'Investor' },
    expert: { icon: Briefcase, color: 'purple', label: 'Expert' },
    tool: { icon: Tool, color: 'orange', label: 'Tool' },
    partner: { icon: UserPlus, color: 'pink', label: 'Partner' }
}

export default function ResourceDirectory() {
    const [resources, setResources] = useState([])
    const [filteredResources, setFilteredResources] = useState([])
    const [selectedType, setSelectedType] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddModal, setShowAddModal] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchResources()
    }, [])

    useEffect(() => {
        filterResources()
    }, [resources, selectedType, searchQuery])

    const fetchResources = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('resource_directory')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (!error) setResources(data || [])
        setLoading(false)
    }

    const filterResources = () => {
        let filtered = resources

        if (selectedType !== 'all') {
            filtered = filtered.filter(r => r.resource_type === selectedType)
        }

        if (searchQuery) {
            filtered = filtered.filter(r =>
                r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.description?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        setFilteredResources(filtered)
    }

    const addResource = async (formData) => {
        const { error } = await supabase
            .from('resource_directory')
            .insert([formData])

        if (!error) {
            fetchResources()
            setShowAddModal(false)
        }
    }

    const assignResource = async (resourceId, userId) => {
        const { error } = await supabase
            .from('resource_assignments')
            .insert([{
                resource_id: resourceId,
                user_id: userId,
                status: 'active'
            }])

        if (!error) {
            // Show success notification
            alert('Resource assigned successfully')
        }
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Resource Directory</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">
                        Manage mentors, investors, experts, and tools
                    </p>
                </div>
                <Button onClick={() => setShowAddModal(true)}>
                    <Plus size={16} className="mr-2" /> Add Resource
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search resources..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setSelectedType('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedType === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                    >
                        All
                    </button>
                    {Object.entries(RESOURCE_TYPES).map(([type, config]) => (
                        <button
                            key={type}
                            onClick={() => setSelectedType(type)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedType === type
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                        >
                            {config.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Resource Grid */}
            {loading ? (
                <div className="text-center py-12">Loading resources...</div>
            ) : filteredResources.length === 0 ? (
                <Card className="p-12 text-center text-slate-500">
                    No resources found
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredResources.map(resource => (
                        <ResourceCard
                            key={resource.id}
                            resource={resource}
                            onAssign={assignResource}
                        />
                    ))}
                </div>
            )}

            {showAddModal && (
                <AddResourceModal
                    onClose={() => setShowAddModal(false)}
                    onAdd={addResource}
                />
            )}
        </div>
    )
}

function ResourceCard({ resource, onAssign }) {
    const config = RESOURCE_TYPES[resource.resource_type] || RESOURCE_TYPES.tool
    const Icon = config.icon

    return (
        <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-lg bg-${config.color}-100 text-${config.color}-600`}>
                    <Icon size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-slate-900 dark:text-white">{resource.name}</h3>
                    <span className="text-xs text-slate-500">{config.label}</span>
                </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">
                {resource.description}
            </p>

            {resource.expertise_areas && resource.expertise_areas.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {resource.expertise_areas.slice(0, 3).map((area, i) => (
                        <span
                            key={i}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-xs rounded-full text-slate-700 dark:text-slate-300"
                        >
                            {area}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="flex-1">
                    View Details
                </Button>
                <Button size="sm" className="flex-1">
                    Assign
                </Button>
            </div>
        </Card>
    )
}

function AddResourceModal({ onClose, onAdd }) {
    const [formData, setFormData] = useState({
        resource_type: 'mentor',
        name: '',
        description: '',
        contact_info: {},
        expertise_areas: [],
        availability: '',
        is_active: true
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        onAdd(formData)
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Add New Resource</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Resource Type
                            </label>
                            <select
                                value={formData.resource_type}
                                onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                required
                            >
                                {Object.entries(RESOURCE_TYPES).map(([type, config]) => (
                                    <option key={type} value={type}>{config.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Name
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

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Expertise Areas (comma-separated)
                            </label>
                            <input
                                type="text"
                                onChange={(e) => setFormData({
                                    ...formData,
                                    expertise_areas: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                })}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                placeholder="e.g., Marketing, Finance, Legal"
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1">
                                Add Resource
                            </Button>
                        </div>
                    </form>
                </div>
            </Card>
        </div>
    )
}
