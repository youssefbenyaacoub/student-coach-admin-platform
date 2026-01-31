import React, { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useData } from '../../../hooks/useData'
import { useAuth } from '../../../hooks/useAuth'
import Card from '../../../components/common/Card'
import { ArrowLeft, User, Clock, Send, Trash2, MessageCircle } from 'lucide-react'
import { getAvatarUrl } from '../../../utils/avatarUtils'

export default function TopicView() {
    const { topicId } = useParams()
    const navigate = useNavigate()
    const { listForumTopics, listForumPosts, postForumReply, deleteForumPost, deleteForumTopic, getUserById } = useData()
    const { currentUser } = useAuth()

    const [replyContent, setReplyContent] = useState('')
    const [busy, setBusy] = useState(false)

    const allTopics = useMemo(() => listForumTopics(), [listForumTopics])
    const topic = allTopics.find(t => t.id === topicId)

    const allPosts = useMemo(() => listForumPosts(), [listForumPosts])
    const posts = allPosts.filter(p => p.topicId === topicId)

    const author = topic ? getUserById(topic.authorId) : null
    const topicDate = topic ? new Date(topic.createdAt).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : ''

    const handlePostReply = async (e) => {
        e.preventDefault()
        if (!replyContent.trim()) return

        setBusy(true)
        try {
            await postForumReply({
                topicId,
                authorId: currentUser.id,
                content: replyContent,
            })
            setReplyContent('')
        } finally {
            setBusy(false)
        }
    }

    const handleDeleteTopic = async () => {
        if (!window.confirm('Are you sure you want to delete this topic and all its replies?')) return
        await deleteForumTopic(topicId)
        navigate('..')
    }

    const handleDeletePost = async (postId) => {
        if (!window.confirm('Are you sure you want to delete this reply?')) return
        await deleteForumPost(postId)
    }

    if (!topic) {
        return (
            <div className="p-12 text-center">
                <p className="text-slate-500">Topic not found.</p>
                <button onClick={() => navigate('..')} className="mt-4 text-indigo-600 font-medium hover:underline">
                    Back to Forum
                </button>
            </div>
        )
    }

    const isTopicAuthor = currentUser?.id === topic.authorId
    const isAdmin = currentUser?.role === 'admin'

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('..')}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-xl font-bold text-slate-900 font-heading truncate">{topic.title}</h1>
            </div>

            {/* Main Topic Card */}
            <Card className="border-indigo-100 ring-1 ring-indigo-50 shadow-md">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-indigo-50">
                                <img
                                    src={getAvatarUrl(author?.name || 'Anonymous')}
                                    alt="Author"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm">{author?.name || 'Anonymous'}</p>
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <Clock className="h-3.5 w-3.5" />
                                    {topicDate}
                                </div>
                            </div>
                        </div>
                        {(isTopicAuthor || isAdmin) && (
                            <button
                                onClick={handleDeleteTopic}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete Topic"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <div className="text-slate-700 leading-relaxed whitespace-pre-wrap pt-2">
                        {topic.content}
                    </div>
                </div>
            </Card>

            <div className="flex items-center gap-2 px-2">
                <MessageCircle className="h-5 w-5 text-slate-400" />
                <h2 className="font-heading font-bold text-slate-800">{posts.length} {posts.length === 1 ? 'Reply' : 'Replies'}</h2>
            </div>

            {/* Replies List */}
            <div className="space-y-4">
                {posts.map((post) => {
                    const postAuthor = getUserById(post.authorId)
                    const postDate = new Date(post.createdAt).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })
                    const isPostAuthor = currentUser?.id === post.authorId

                    return (
                        <div key={post.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Card>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full overflow-hidden ring-1 ring-slate-100">
                                                <img
                                                    src={getAvatarUrl(postAuthor?.name || 'Anonymous')}
                                                    alt="Author"
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-xs">{postAuthor?.name || 'Anonymous'}</p>
                                                <p className="text-[10px] text-slate-400">{postDate}</p>
                                            </div>
                                        </div>
                                        {(isPostAuthor || isAdmin) && (
                                            <button
                                                onClick={() => handleDeletePost(post.id)}
                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                        {post.content}
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )
                })}
            </div>

            {/* Reply Form */}
            <div className="sticky bottom-4 pt-4">
                <form onSubmit={handlePostReply} className="relative">
                    <textarea
                        rows={2}
                        className="w-full pl-4 pr-16 py-4 rounded-3xl border border-slate-200 shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none bg-white/95 backdrop-blur-sm"
                        placeholder="Write a reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        disabled={busy}
                    />
                    <button
                        type="submit"
                        disabled={busy || !replyContent.trim()}
                        className="absolute right-3 bottom-3 p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 shadow-lg shadow-indigo-200 transition-all"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </form>
            </div>
        </div>
    )
}
