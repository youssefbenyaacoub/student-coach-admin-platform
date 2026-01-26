import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { MessageCircle, X, Send } from 'lucide-react'

export default function FeedbackWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [feedbackType, setFeedbackType] = useState('general')
    const [content, setContent] = useState('')
    const [rating, setRating] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        const { error } = await supabase.rpc('submit_feedback', {
            p_feedback_type: feedbackType,
            p_content: content,
            p_rating: rating,
            p_page_url: window.location.href
        })

        if (!error) {
            setSubmitted(true)
            setTimeout(() => {
                setIsOpen(false)
                setSubmitted(false)
                setContent('')
                setRating(null)
            }, 2000)
        }

        setSubmitting(false)
    }

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all z-50"
                aria-label="Send Feedback"
            >
                <MessageCircle size={24} />
            </button>

            {/* Feedback Modal */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-96 bg-white dark:bg-slate-800 rounded-lg shadow-2xl border dark:border-slate-700 z-50">
                    <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-900 dark:text-white">Send Feedback</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {submitted ? (
                        <div className="p-8 text-center">
                            <div className="text-green-600 text-5xl mb-4">✓</div>
                            <p className="text-slate-900 dark:text-white font-medium">Thank you for your feedback!</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            {/* Feedback Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Type
                                </label>
                                <select
                                    value={feedbackType}
                                    onChange={(e) => setFeedbackType(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                                >
                                    <option value="general">General Feedback</option>
                                    <option value="bug">Report a Bug</option>
                                    <option value="feature">Feature Request</option>
                                    <option value="nps">Rate Experience</option>
                                </select>
                            </div>

                            {/* Rating (for NPS) */}
                            {feedbackType === 'nps' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        How likely are you to recommend us? (1-10)
                                    </label>
                                    <div className="flex gap-2">
                                        {[...Array(10)].map((_, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => setRating(i + 1)}
                                                className={`w-10 h-10 rounded-lg font-medium transition-colors ${rating === i + 1
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                                    }`}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Content */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Message
                                </label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 resize-none"
                                    rows={4}
                                    placeholder="Tell us what you think..."
                                    required
                                />
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Send size={16} />
                                {submitting ? 'Sending...' : 'Send Feedback'}
                            </button>
                        </form>
                    )}
                </div>
            )}
        </>
    )
}
