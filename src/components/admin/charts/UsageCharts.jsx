import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Clock, TrendingUp } from 'lucide-react';

const COLORS = ['#4F46E5', '#EC4899', '#10B981', '#F59E0B', '#EF4444'];

export default function UsageCharts({ data, loading = false }) {
    if (loading) {
        return (
            <div className="space-y-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-lg shadow p-6">
                        <div className="h-8 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
                        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                ))}
            </div>
        );
    }

    // Prepare data for active users chart
    const activeUsersData = data.usageStats || [];

    // Aggregate by role for pie chart
    const roleDistribution = activeUsersData.reduce((acc, item) => {
        const existing = acc.find(r => r.name === item.role);
        if (existing) {
            existing.value += item.active_users;
        } else {
            acc.push({ name: item.role, value: item.active_users });
        }
        return acc;
    }, []);

    // Session duration data
    const sessionData = activeUsersData.map(item => ({
        date: new Date(item.activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        duration: item.avg_session_duration || 0,
        role: item.role
    }));

    // Feature adoption data
    const featureData = data.featureAdoption || [];

    return (
        <div className="space-y-6">
            {/* Active Users Line Chart */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Daily Active Users</h3>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={activeUsersData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="activity_date"
                            tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis />
                        <Tooltip
                            labelFormatter={(date) => new Date(date).toLocaleDateString()}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="active_users" stroke="#4F46E5" strokeWidth={2} name="Active Users" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Session Duration Bar Chart */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Average Session Duration</h3>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sessionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="duration" fill="#4F46E5" name="Duration (min)" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Feature Adoption Pie Chart */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Feature Adoption</h3>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={featureData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="unique_users"
                        >
                            {featureData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
