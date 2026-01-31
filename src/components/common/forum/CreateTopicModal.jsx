import React, { useState } from 'react'
import Modal from '../Modal'
import { useAuth } from '../../../hooks/useAuth'
import { useData } from '../../../hooks/useData'

export default function CreateTopicModal({ open, categoryId, onClose, onCreated }) {
    const { currentUser } = useAuth()
    const { listForumCategories } = useData()
    const [busy, setBusy] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        selectedCategoryId: categoryId || '',
    })

    const categories = listForumCategories()

    const onSubmit = async (e) => {
        e.preventDefault()
        const catId = categoryId || formData.selectedCategoryId
        if (!catId || !formData.title.trim() || !formData.content.trim()) return

        setBusy(true)
        try {
            await onCreated({
                categoryId: catId,
                authorId: currentUser.id,
                title: formData.title,
                content: formData.content,
            })
            setFormData({ title: '', content: '', selectedCategoryId: categoryId || '' })
            onClose()
        } finally {
            setBusy(false)
        }
    }

    return (
        <Modal
            open={open}
            title="Create New Topic"
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
                        form="create-topic-form"
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={busy || (!categoryId && !formData.selectedCategoryId) || !formData.title.trim() || !formData.content.trim()}
                    >
                        {busy ? 'Creating...' : 'Create Topic'}
                    </button>
                </>
            }
        >
            <form id="create-topic-form" onSubmit={onSubmit} className="space-y-4">
                {!categoryId && (
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Select Category</label>
                        <select
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                            required
                            value={formData.selectedCategoryId}
                            onChange={(e) => setFormData({ ...formData, selectedCategoryId: e.target.value })}
                            disabled={busy}
                        >
                            <option value="">Select a category...</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Topic Title</label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        placeholder="What's on your mind?"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        disabled={busy}
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Content</label>
                    <textarea
                        required
                        rows={6}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                        placeholder="Share your thoughts or questions here..."
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        disabled={busy}
                    />
                </div>
            </form>
        </Modal>
    )
}
