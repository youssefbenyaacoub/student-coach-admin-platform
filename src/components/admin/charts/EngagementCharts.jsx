import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MessageSquare, Clock, Users } from 'lucide-react';

export default function EngagementCharts({ data, loading = false }) {
    if (loading) {
        return (
            <div className="space-y-6">
                {[1, 2].map(i => (
                    <div key={i} className="bg-white rounded-lg shadow p-6">
                        <div className="h-8 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
                        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                ))}
            </div>
        );
    }

    const responseTimeData = data.responseTimes || [];
    const engagementData = data.engagementScores || [];

    // Top engaged users
    const topUsers = engagementData.slice(0, 10);

    return (
        <div className="space-y-6">
            {/* Message Response Times */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Average Response Time</h3>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={responseTimeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="message_date"
                            tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                        <Tooltip
                            labelFormatter={(date) => new Date(date).toLocaleDateString()}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="avg_response_minutes"
                            stroke="#4F46E5"
                            strokeWidth={2}
                            name="Avg Response Time (min)"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Top Engaged Users */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Top Engaged Users</h3>
                    </div>
                </div>
                <div className="space-y-3">
                    {topUsers.map((user, index) => (
                        <div key={user.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-indigo-600">#{index + 1}</span>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{user.name}</p>
                                    <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                                        <span>{user.forum_posts} posts</span>
                                        <span>•</span>
                                        <span>{user.messages_sent} messages</span>
                                        <span>•</span>
                                        <span className="capitalize">{user.role}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="text-right">
                                    <p className="text-lg font-bold text-indigo-600">{user.engagement_score}</p>
                                    <p className="text-xs text-gray-500">score</p>
                                </div>
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-indigo-600 h-2 rounded-full"
                                        style={{ width: `${user.engagement_score}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    {topUsers.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No engagement data available</p>
                    )}
                </div>
            </div>

            {/* Forum Activity Summary */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <MessageSquare className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Engagement Breakdown</h3>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">Total Forum Posts</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">
                            {engagementData.reduce((sum, u) => sum + u.forum_posts, 0)}
                        </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">Total Messages</p>
                        <p className="text-2xl font-bold text-green-900 mt-1">
                            {engagementData.reduce((sum, u) => sum + u.messages_sent, 0)}
                        </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-600 font-medium">Forum Replies</p>
                        <p className="text-2xl font-bold text-purple-900 mt-1">
                            {engagementData.reduce((sum, u) => sum + u.forum_replies, 0)}
                        </p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-orange-600 font-medium">Avg Engagement</p>
                        <p className="text-2xl font-bold text-orange-900 mt-1">
                            {engagementData.length > 0
                                ? Math.round(engagementData.reduce((sum, u) => sum + u.engagement_score, 0) / engagementData.length)
                                : 0}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
