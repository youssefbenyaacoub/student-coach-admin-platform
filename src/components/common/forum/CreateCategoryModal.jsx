import React, { useState } from 'react'
import Modal from '../Modal'
import { useAuth } from '../../../hooks/useAuth'

export default function CreateCategoryModal({ open, onClose, onCreated }) {
    const { currentUser } = useAuth()
    const [busy, setBusy] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        icon: 'MessageSquare',
    })

    const onSubmit = async (e) => {
        e.preventDefault()
        if (!formData.name.trim()) return

        setBusy(true)
        try {
            await onCreated({
                name: formData.name,
                description: formData.description,
                icon: formData.icon,
            })
            setFormData({ name: '', description: '', icon: 'MessageSquare' })
            onClose()
        } finally {
            setBusy(false)
        }
    }

    const icons = ['MessageSquare', 'Rocket', 'LifeBuoy', 'Bell', 'Lightbulb', 'Users', 'Target', 'Coffee']

    return (
        <Modal
            open={open}
            title="Create New Category"
            onClose={onClose}
            footer={
                <>
                    <button
                        type="button"
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        onClick={onClose}
                        disabled={busy}
                    >
                        Cancel
                    </button>
                    <button
                        form="create-category-form"
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={busy || !formData.name.trim()}
                    >
                        {busy ? 'Creating...' : 'Create Category'}
                    </button>
                </>
            }
        >
            <form id="create-category-form" onSubmit={onSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Category Name</label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        placeholder="e.g., Marketing Strategies"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={busy}
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                    <textarea
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                        placeholder="Briefly describe what this category is for..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        disabled={busy}
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Pick an Icon</label>
                    <div className="grid grid-cols-4 gap-2">
                        {icons.map(icon => (
                            <button
                                key={icon}
                                type="button"
                                onClick={() => setFormData({ ...formData, icon })}
                                className={`p-3 rounded-xl border transition-all flex items-center justify-center ${formData.icon === icon ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50 text-slate-400'}`}
                            >
                                <span className="text-xs">{icon}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </form>
        </Modal>
    )
}
