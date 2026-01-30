import React, { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useData } from '../../../hooks/useData'
const { listForumCategories, listForumTopics, listForumPosts, createForumTopic, getUserById } = useData()
import Card from '../../../components/common/Card'
import CreateTopicModal from '../../../components/common/forum/CreateTopicModal'
import { MessageSquare, Plus, ArrowLeft, Clock, User, MessageCircle } from 'lucide-react'

export default function CategoryView() {
    const { categoryId } = useParams()
    const navigate = useNavigate()
    const { listForumCategories, listForumTopics, listForumPosts, createForumTopic, getUserById } = useData()

    const [isModalOpen, setIsModalOpen] = useState(false)

    const categories = useMemo(() => listForumCategories(), [listForumCategories])
    const category = categories.find(c => c.id === categoryId)

    const allTopics = useMemo(() => listForumTopics(), [listForumTopics])
    const topics = allTopics.filter(t => t.categoryId === categoryId)

    const allPosts = useMemo(() => listForumPosts(), [listForumPosts])

    const getPostCount = (topicId) => allPosts.filter(p => p.topicId === topicId).length

    const handleCreateTopic = async (data) => {
        const topic = await createForumTopic(data)
        if (topic) {
            navigate(`../topic/${topic.id}`)
        }
    }

    if (!category) {
        return (
            <div className="p-12 text-center">
                <p className="text-slate-500">Category not found.</p>
                <button
                    onClick={() => navigate('..')}
                    className="mt-4 text-indigo-600 font-medium hover:underline flex items-center gap-2 mx-auto"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Forum
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('..')}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 font-heading">{category.name}</h1>
                        <p className="text-slate-500 text-sm">{category.description}</p>
                    </div>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all font-medium"
                >
                    <Plus className="h-5 w-5" />
                    <span>New Topic</span>
                </button>
            </div>

            <div className="space-y-3">
                {topics.map((topic) => {
                    const author = getUserById(topic.authorId)
                    const postCount = getPostCount(topic.id)
                    const date = new Date(topic.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    })

                    return (
                        <div
                            key={topic.id}
                            onClick={() => navigate(`../topic/${topic.id}`)}
                            className="group cursor-pointer"
                        >
                            <Card className="hover:border-indigo-500/50 hover:shadow-md transition-all duration-300">
                                <div className="flex items-center justify-between gap-6">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            <MessageSquare className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-heading font-bold text-slate-800 text-base group-hover:text-indigo-600 transition-colors truncate">
                                                {topic.title}
                                            </h3>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                                                <span className="flex items-center gap-1.5">
                                                    <User className="h-3.5 w-3.5" />
                                                    {author?.name || 'Anonymous'}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {date}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-center hidden sm:block">
                                            <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                                                <MessageCircle className="h-4 w-4 text-slate-400" />
                                                <span>{postCount}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Posts</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )
                })}

                {topics.length === 0 && (
                    <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 mt-4">
                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <MessageSquare className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">No topics yet</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-2">
                            Be the first to start a conversation in this category!
                        </p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="mt-6 text-indigo-600 font-bold hover:underline"
                        >
                            Start a discussion
                        </button>
                    </div>
                )}
            </div>

            <CreateTopicModal
                open={isModalOpen}
                categoryId={categoryId}
                onClose={() => setIsModalOpen(false)}
                onCreated={handleCreateTopic}
            />
        </div>
    )
}
