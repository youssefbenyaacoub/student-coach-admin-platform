import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Activity, Clock, AlertTriangle } from 'lucide-react';

export default function ProjectCharts({ data, loading = false }) {
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

    const projectData = data.projectProgress || [];

    // Get color based on completion rate
    const getCompletionColor = (rate) => {
        if (rate >= 80) return '#10B981'; // Green
        if (rate >= 50) return '#F59E0B'; // Yellow
        return '#EF4444'; // Red
    };

    // Get color based on bottleneck severity
    const getBottleneckColor = (severity) => {
        if (severity === 'high') return '#EF4444';
        if (severity === 'medium') return '#F59E0B';
        return '#10B981';
    };

    return (
        <div className="space-y-6">
            {/* Phase Completion Rates */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <Activity className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Phase Completion Rates</h3>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={projectData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="phase" />
                        <YAxis label={{ value: 'Completion %', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="completion_rate" name="Completion Rate">
                            {projectData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getCompletionColor(entry.completion_rate)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Average Time Per Phase */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Average Time Per Phase</h3>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={projectData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
                        <YAxis dataKey="phase" type="category" width={100} />
                        <Tooltip />
                        <Bar dataKey="avg_time_days" fill="#4F46E5" name="Avg Days" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Bottleneck Identification */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Bottleneck Analysis</h3>
                    </div>
                </div>
                <div className="space-y-3">
                    {projectData.map((phase, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                    <h4 className="font-medium text-gray-900">{phase.phase}</h4>
                                    <span className="text-sm text-gray-500">({phase.program_name})</span>
                                </div>
                                <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                                    <span>{phase.completed_students}/{phase.total_students} completed</span>
                                    <span>•</span>
                                    <span>{phase.completion_rate}% completion</span>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${phase.bottleneck_severity === 'high' ? 'bg-red-100 text-red-700' :
                                    phase.bottleneck_severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-green-100 text-green-700'
                                }`}>
                                {phase.bottleneck_severity.toUpperCase()}
                            </div>
                        </div>
                    ))}
                    {projectData.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No project data available</p>
                    )}
                </div>
            </div>
        </div>
    );
}
