import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Card from './Card'
import { CheckCircle, XCircle, MessageSquare, Upload, TrendingUp, Award } from 'lucide-react'

export default function ActivityFeed({ instanceId, cohortId }) {
    const [activities, setActivities] = useState([])
    const [filter, setFilter] = useState('all')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchActivities()
        subscribeToActivities()
    }, [instanceId, cohortId, filter])

    const fetchActivities = async () => {
        setLoading(true)

        let query = supabase
            .from('activity_feed')
            .select('*, users(full_name, avatar_url)')
            .order('created_at', { ascending: false })
            .limit(50)

        if (instanceId) {
            query = query.eq('instance_id', instanceId)
        } else if (cohortId) {
            query = query.eq('cohort_id', cohortId)
        }

        if (filter !== 'all') {
            query = query.eq('activity_type', filter)
        }

        const { data, error } = await query

        if (!error) setActivities(data || [])
        setLoading(false)
    }

    const subscribeToActivities = () => {
        const channel = supabase
            .channel(`activity_feed:${instanceId || cohortId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'activity_feed',
                    filter: instanceId
                        ? `instance_id=eq.${instanceId}`
                        : cohortId
                            ? `cohort_id=eq.${cohortId}`
                            : undefined
                },
                async (payload) => {
                    // Fetch full activity with user data
                    const { data } = await supabase
                        .from('activity_feed')
                        .select('*, users(full_name, avatar_url)')
                        .eq('id', payload.new.id)
                        .single()

                    if (data) {
                        setActivities(prev => [data, ...prev])
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Activity Feed
                </h3>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-3 py-1 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700"
                >
                    <option value="all">All Activities</option>
                    <option value="task_submitted">Submissions</option>
                    <option value="task_approved">Approvals</option>
                    <option value="feedback_posted">Feedback</option>
                    <option value="stage_advanced">Stage Changes</option>
                    <option value="comment_added">Comments</option>
                </select>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-8 text-slate-500">Loading activities...</div>
                ) : activities.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">No activities yet</div>
                ) : (
                    activities.map((activity) => (
                        <ActivityItem key={activity.id} activity={activity} />
                    ))
                )}
            </div>
        </Card>
    )
}

function ActivityItem({ activity }) {
    const getIcon = () => {
        const iconMap = {
            task_submitted: { icon: Upload, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
            task_approved: { icon: CheckCircle, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
            task_rejected: { icon: XCircle, color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
            feedback_posted: { icon: MessageSquare, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
            stage_advanced: { icon: TrendingUp, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
            instance_completed: { icon: Award, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' },
            comment_added: { icon: MessageSquare, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800' }
        }
        return iconMap[activity.activity_type] || iconMap.comment_added
    }

    const { icon: Icon, color } = getIcon()

    return (
        <div className="flex gap-3">
            <div className={`p-2 rounded-lg ${color} flex-shrink-0 h-fit`}>
                <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h4 className="font-medium text-slate-900 dark:text-white text-sm">
                            {activity.title}
                        </h4>
                        {activity.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                {activity.description}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <span>{activity.users?.full_name || 'System'}</span>
                    <span>•</span>
                    <span>{formatTimestamp(activity.created_at)}</span>
                </div>
            </div>
        </div>
    )
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
}
