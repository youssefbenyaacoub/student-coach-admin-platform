import { useState } from 'react'
import { MessageSquare, Send, CornerDownRight, Lock } from 'lucide-react'
import Button from './Button'

/**
 * Threaded Discussion Component
 * Supports nested comments and internal notes
 */
export default function DiscussionThread({ comments = [], onPostComment, userRole, currentUserId }) {
    const [newComment, setNewComment] = useState('')
    const [replyTo, setReplyTo] = useState(null)
    const [isInternal, setIsInternal] = useState(false)

    // Organize flat comments into tree
    const commentTree = comments.filter(c => !c.parent_id).map(root => ({
        ...root,
        replies: comments.filter(r => r.parent_id === root.id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!newComment.trim()) return

        onPostComment({
            content: newComment,
            parent_id: replyTo,
            is_internal_note: isInternal
        })

        setNewComment('')
        setReplyTo(null)
        setIsInternal(false)
    }

    const renderComment = (comment, isReply = false) => {
        // Hide internal notes from students
        if (comment.is_internal_note && userRole === 'student') return null

        const isOwn = comment.user_id === currentUserId

        return (
            <div key={comment.id} className={`group ${isReply ? 'ml-8 mt-2' : 'mt-4 border-b border-slate-100 dark:border-slate-800 pb-4'}`}>
                <div className={`p-3 rounded-lg ${comment.is_internal_note ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900 dark:text-white">
                                {isOwn ? 'You' : 'User'}
                            </span>
                            {comment.is_internal_note && (
                                <span className="text-xs px-1.5 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded flex items-center gap-1">
                                    <Lock size={10} /> Internal
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-slate-500">
                            {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                    </div>

                    <p className="text-sm text-slate-700 dark:text-slate-300">{comment.content}</p>

                    {!isReply && (
                        <button
                            onClick={() => setReplyTo(comment.id)}
                            className="text-xs text-student-primary mt-2 font-medium hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <CornerDownRight size={12} /> Reply
                        </button>
                    )}
                </div>

                {/* Nested Replies */}
                {comment.replies && comment.replies.map(reply => renderComment(reply, true))}

                {/* Reply Input */}
                {replyTo === comment.id && (
                    <form onSubmit={handleSubmit} className="ml-8 mt-2">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                placeholder="Write a reply..."
                                className="flex-1 px-3 py-1.5 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                autoFocus
                            />
                            <Button size="sm" type="submit">Send</Button>
                            <button
                                type="button"
                                onClick={() => setReplyTo(null)}
                                className="px-2 text-xs text-slate-500 hover:text-slate-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-slate-400" />
                <h3 className="font-semibold text-slate-900 dark:text-white">Discussion</h3>
            </div>

            {/* Main Input */}
            {!replyTo && (
                <form onSubmit={handleSubmit} className="mb-6">
                    <textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Ask a question or leave a note..."
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-student-primary/20 dark:bg-slate-800 dark:border-slate-700"
                        rows={2}
                    />
                    <div className="flex justify-between items-center mt-2">
                        {userRole !== 'student' && (
                            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isInternal}
                                    onChange={e => setIsInternal(e.target.checked)}
                                    className="rounded text-amber-500 focus:ring-amber-500"
                                />
                                <Lock size={12} /> Internal Note (Coach only)
                            </label>
                        )}
                        <div className="flex-1" /> {/* Spacer */}
                        <Button type="submit" disabled={!newComment.trim()}>
                            <Send size={14} className="mr-2" /> Post
                        </Button>
                    </div>
                </form>
            )}

            {/* Comment List */}
            <div className="space-y-1">
                {commentTree.length === 0 ? (
                    <p className="text-center text-sm text-slate-500 py-4">No comments yet. Start the discussion!</p>
                ) : (
                    commentTree.map(c => renderComment(c))
                )}
            </div>
        </div>
    )
}
