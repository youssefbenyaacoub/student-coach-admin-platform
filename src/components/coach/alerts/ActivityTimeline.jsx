import { useEffect, useState } from 'react'
import { Clock, MessageSquare, FileText, Globe, CheckCircle } from 'lucide-react'
import { formatDateTime } from '../../../utils/time'
import { supabase } from '../../../lib/supabase'

export default function ActivityTimeline({ studentId }) {
    const [timeline, setTimeline] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!studentId) return

        const fetchActivity = async () => {
            setLoading(true)
            try {
                // Fetch from the new table
                const { data: logs, error } = await supabase
                    .from('student_activity_logs')
                    .select('*')
                    .eq('student_id', studentId)
                    .order('created_at', { ascending: false })
                    .limit(20)

                if (error && error.code !== 'PGRST116') { // Ignore if table doesn't exist yet/RLS error for now in dev
                    console.warn("Could not fetch activity logs", error)
                }

                // Setup fallback/mock data if empty (for demo purposes if no logs generated yet)
                const items = logs || []

                // If we have no real logs, we can simulate some for the UX review
                if (items.length === 0) {
                    // This is typically replaced by real data
                }

                setTimeline(items)
            } finally {
                setLoading(false)
            }
        }

        fetchActivity()
    }, [studentId])

    const getIcon = (type) => {
        switch (type) {
            case 'message': return <MessageSquare className="h-4 w-4 text-blue-500" />
            case 'submission': return <FileText className="h-4 w-4 text-purple-500" />
            case 'login': return <Globe className="h-4 w-4 text-green-500" />
            default: return <Clock className="h-4 w-4 text-slate-400" />
        }
    }

    return (
        <div className="h-full flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-bold text-lg text-slate-800">Activity Timeline</h2>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    Real-time monitoring
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-slate-100"></div>
                                <div className="flex-1 h-12 bg-slate-50 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : timeline.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No activity logged yet.</p>
                        <p className="text-xs mt-1">Actions like messages and submissions will appear here.</p>
                    </div>
                ) : (
                    <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pl-8 py-2">
                        {timeline.map((item, idx) => (
                            <div key={item.id || idx} className="relative">
                                {/* Dot on the line */}
                                <div className="absolute -left-[41px] top-0 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm z-10">
                                    {getIcon(item.activity_type)}
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-semibold text-slate-700 capitalize">
                                            {item.activity_type.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {formatDateTime(item.created_at)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        {item.description}
                                    </p>
                                    {item.metadata && Object.keys(item.metadata).length > 0 && (
                                        <div className="mt-2 text-xs text-slate-500 font-mono bg-white p-2 border border-slate-100 rounded">
                                            {JSON.stringify(item.metadata, null, 2)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
