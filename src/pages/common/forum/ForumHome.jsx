import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../../hooks/useData'
import { useAuth } from '../../../hooks/useAuth'
import Card from '../../../components/common/Card'
import * as LucideIcons from 'lucide-react'
import { MessageSquare, ChevronRight } from 'lucide-react'

export default function ForumHome() {
    const { listForumCategories, listForumTopics } = useData()
    const navigate = useNavigate()

    const categories = useMemo(() => listForumCategories(), [listForumCategories])
    const topics = useMemo(() => listForumTopics(), [listForumTopics])

    const getTopicCount = (catId) => topics.filter(t => t.categoryId === catId).length

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 font-heading">Community Forum</h1>
                    <p className="text-slate-500 mt-1">Connect, share ideas, and grow with the community.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map((cat) => {
                    const IconComponent = LucideIcons[cat.icon] || MessageSquare
                    const topicCount = getTopicCount(cat.id)

                    return (
                        <div
                            key={cat.id}
                            onClick={() => navigate(`category/${cat.id}`)}
                            className="group cursor-pointer"
                        >
                            <Card className="h-full hover:border-indigo-500/50 hover:shadow-md transition-all duration-300">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                        <IconComponent className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-heading font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">
                                                {cat.name}
                                            </h3>
                                            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-400 transform group-hover:translate-x-1 transition-all" />
                                        </div>
                                        <p className="text-slate-500 text-sm mt-1 line-clamp-2">
                                            {cat.description || 'No description provided.'}
                                        </p>
                                        <div className="mt-4 flex items-center gap-4 text-xs font-medium">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full border border-slate-200">
                                                {topicCount} {topicCount === 1 ? 'Topic' : 'Topics'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )
                })}
            </div>

            {categories.length === 0 && (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
                    <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <MessageSquare className="h-10 w-10" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No categories found</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2">
                        The administrators haven't set up any forum categories yet.
                    </p>
                </div>
            )}
        </div>
    )
}
