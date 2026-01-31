import { useState, useMemo } from 'react'
import { Plus, Search, FileText, Trash2, Edit, Filter } from 'lucide-react'
import { useData } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast'
import Card from '../../components/common/Card'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'

export default function ResourceManagement() {
    const { data, upsertGlobalResource, deleteGlobalResource } = useData()
    const { showToast } = useToast()

    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingResource, setEditingResource] = useState(null)
    const [isDeleting, setIsDeleting] = useState(null) // ID of resource to delete
    const [busy, setBusy] = useState(false)

    const resources = useMemo(() => data?.globalResources ?? [], [data?.globalResources])

    const categories = useMemo(() => {
        const cats = new Set(resources.map(r => r.category).filter(Boolean))
        return Array.from(cats).sort()
    }, [resources])

    const filteredResources = useMemo(() => {
        return resources.filter(r => {
            const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.description?.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter
            return matchesSearch && matchesCategory
        })
    }, [resources, searchTerm, categoryFilter])

    const handleSubmit = async (e) => {
        e.preventDefault()
        const formData = new FormData(e.target)
        const payload = {
            id: editingResource?.id,
            title: formData.get('title'),
            description: formData.get('description'),
            category: formData.get('category'),
            url: formData.get('url'),
            fileType: formData.get('fileType'),
            iconName: formData.get('iconName') || 'FileText',
            isFeatured: formData.get('isFeatured') === 'on',
        }

        setBusy(true)
        try {
            await upsertGlobalResource(payload)
            showToast(editingResource ? 'Resource updated' : 'Resource added', 'success')
            setIsModalOpen(false)
            setEditingResource(null)
        } catch (err) {
            showToast('Failed to save resource', 'error')
        } finally {
            setBusy(false)
        }
    }

    const handleDelete = async () => {
        if (!isDeleting) return
        setBusy(true)
        try {
            await deleteGlobalResource(isDeleting)
            showToast('Resource deleted', 'success')
            setIsDeleting(null)
        } catch (err) {
            showToast('Failed to delete resource', 'error')
        } finally {
            setBusy(false)
        }
    }

    const openEdit = (res) => {
        setEditingResource(res)
        setIsModalOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Resource Management</h1>
                    <p className="text-slate-500 dark:text-slate-400">Add and manage documents for students</p>
                </div>
                <button
                    onClick={() => { setEditingResource(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    Add Resource
                </button>
            </div>

            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search resources..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-slate-400" />
                        <select
                            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResources.map(res => (
                    <Card key={res.id} className="relative group overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                    <FileText size={24} />
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(res)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => setIsDeleting(res.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white mb-1 leading-tight">{res.title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 h-10">{res.description}</p>

                            <div className="flex items-center justify-between text-xs font-medium">
                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full italic">
                                    {res.category || 'Uncategorized'}
                                </span>
                                <span className="text-slate-400 uppercase tracking-wider">{res.fileType || 'Link'}</span>
                            </div>
                        </div>
                        <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block py-3 px-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 text-center text-sm font-bold text-indigo-600 hover:text-indigo-700 hover:bg-slate-100 transition-all font-heading"
                        >
                            View Resource
                        </a>
                    </Card>
                ))}

                {filteredResources.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                        <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-700">
                            <Search className="text-slate-400" />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">No resources found.</p>
                    </div>
                )}
            </div>

            <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingResource ? 'Edit Resource' : 'Add New Resource'}
            >
                <form onSubmit={handleSubmit} className="p-1 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Title *</label>
                        <input
                            name="title"
                            defaultValue={editingResource?.title}
                            required
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                        <textarea
                            name="description"
                            defaultValue={editingResource?.description}
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                            <input
                                name="category"
                                defaultValue={editingResource?.category}
                                placeholder="e.g., Marketing, Legal"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">File Type</label>
                            <select
                                name="fileType"
                                defaultValue={editingResource?.fileType || 'Link'}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none cursor-pointer"
                            >
                                <option value="PDF">PDF Document</option>
                                <option value="Video">Video Tutorial</option>
                                <option value="Link">External Link</option>
                                <option value="Zip">Compressed File</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">URL *</label>
                        <input
                            name="url"
                            defaultValue={editingResource?.url}
                            required
                            placeholder="https://..."
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                        <input
                            type="checkbox"
                            name="isFeatured"
                            id="isFeatured"
                            defaultChecked={editingResource?.isFeatured}
                            className="h-5 w-5 text-indigo-600 border-slate-300 rounded-lg focus:ring-indigo-500 cursor-pointer"
                        />
                        <label htmlFor="isFeatured" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">Feature this resource prominently</label>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={busy}
                            className="px-8 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
                        >
                            {busy ? 'Saving...' : 'Save Resource'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                open={!!isDeleting}
                title="Delete Resource"
                message="Are you sure you want to delete this resource? Students will no longer be able to access it."
                confirmLabel="Delete Resource"
                danger
                busy={busy}
                onClose={() => setIsDeleting(null)}
                onConfirm={handleDelete}
            />
        </div>
    )
}
