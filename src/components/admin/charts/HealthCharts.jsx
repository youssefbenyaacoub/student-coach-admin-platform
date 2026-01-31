import { Activity, AlertCircle, Database, Zap } from 'lucide-react';

export default function HealthCharts({ data, loading = false }) {
    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="h-8 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-gray-100 rounded animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    const health = data.platformHealth || {};
    const uptime = health.uptime_percentage || 0;
    const errorCount = health.error_count || 0;
    const storageUsed = health.storage_used_gb || 0;
    const activeConnections = health.active_connections || 0;

    // Get color based on uptime
    const getUptimeColor = (uptime) => {
        if (uptime >= 99.9) return 'text-green-600 bg-green-100';
        if (uptime >= 99) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    // Get storage percentage (assuming 100GB total for demo)
    const totalStorage = 100;
    const storagePercentage = (storageUsed / totalStorage) * 100;

    return (
        <div className="space-y-6">
            {/* Platform Health Overview */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Platform Health</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Uptime Gauge */}
                    <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <Activity className="w-5 h-5 text-green-600" />
                                <h4 className="font-medium text-gray-900">System Uptime</h4>
                            </div>
                        </div>
                        <div className="flex items-center justify-center">
                            <div className="relative w-32 h-32">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke="#E5E7EB"
                                        strokeWidth="12"
                                        fill="none"
                                    />
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke="#10B981"
                                        strokeWidth="12"
                                        fill="none"
                                        strokeDasharray={`${(uptime / 100) * 351.86} 351.86`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-green-600">{uptime}%</p>
                                        <p className="text-xs text-gray-600">uptime</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Error Count */}
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <AlertCircle className="w-5 h-5 text-blue-600" />
                                <h4 className="font-medium text-gray-900">Error Rate</h4>
                            </div>
                        </div>
                        <div className="flex items-center justify-center h-32">
                            <div className="text-center">
                                <p className="text-5xl font-bold text-blue-600">{errorCount}</p>
                                <p className="text-sm text-gray-600 mt-2">errors in last hour</p>
                                {errorCount === 0 && (
                                    <p className="text-xs text-green-600 mt-1">✓ All systems operational</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Storage Usage */}
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <Database className="w-5 h-5 text-purple-600" />
                                <h4 className="font-medium text-gray-900">Storage Usage</h4>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Used</span>
                                <span className="text-sm font-medium text-gray-900">{storageUsed.toFixed(2)} GB</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                                <div
                                    className={`h-4 rounded-full transition-all ${storagePercentage >= 90 ? 'bg-red-500' :
                                            storagePercentage >= 70 ? 'bg-yellow-500' :
                                                'bg-purple-500'
                                        }`}
                                    style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Total</span>
                                <span className="text-sm font-medium text-gray-900">{totalStorage} GB</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {storagePercentage.toFixed(1)}% of total capacity
                            </p>
                        </div>
                    </div>

                    {/* Active Connections */}
                    <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <Zap className="w-5 h-5 text-orange-600" />
                                <h4 className="font-medium text-gray-900">Active Connections</h4>
                            </div>
                        </div>
                        <div className="flex items-center justify-center h-32">
                            <div className="text-center">
                                <p className="text-5xl font-bold text-orange-600">{activeConnections}</p>
                                <p className="text-sm text-gray-600 mt-2">concurrent connections</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Platform Statistics */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Total Users</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{health.total_users || 0}</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Total Programs</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{health.total_programs || 0}</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Total Submissions</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{health.total_submissions || 0}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
