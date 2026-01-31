import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
    fetchUsageStatistics,
    fetchProjectProgress,
    fetchEngagementScores,
    fetchPlatformHealth,
    getActiveUsersRealtime,
    fetchFeatureAdoption,
    fetchMessageResponseTimes,
    calculateTrend,
    getPresetTimeRanges,
    getCachedMetrics,
    cacheMetrics,
    formatNumber
} from '../../utils/analyticsUtils';
import MetricCard from '../../components/admin/MetricCard';
import TimeRangeSelector from '../../components/admin/TimeRangeSelector';
import ExportToolbar from '../../components/admin/ExportToolbar';
import UsageCharts from '../../components/admin/charts/UsageCharts';
import ProjectCharts from '../../components/admin/charts/ProjectCharts';
import EngagementCharts from '../../components/admin/charts/EngagementCharts';
import HealthCharts from '../../components/admin/charts/HealthCharts';
import {
    Users,
    Activity,
    MessageSquare,
    Server,
    RefreshCw,
    TrendingUp
} from 'lucide-react';

export default function AnalyticsDashboard() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('usage'); // 'usage', 'projects', 'engagement', 'health'
    const [timeRange, setTimeRange] = useState(getPresetTimeRanges().last7days);
    const [activeUsersLive, setActiveUsersLive] = useState([]);

    // Data states
    const [usageData, setUsageData] = useState({});
    const [projectData, setProjectData] = useState({});
    const [engagementData, setEngagementData] = useState({});
    const [healthData, setHealthData] = useState({});

    // Metrics for cards
    const [metrics, setMetrics] = useState({
        totalActiveUsers: 0,
        totalSessions: 0,
        avgEngagement: 0,
        systemUptime: 0
    });

    // Refs for chart export
    const chartRefs = [useRef(), useRef(), useRef()];

    // Load data
    const loadData = async (showLoader = true) => {
        if (showLoader) setLoading(true);

        try {
            // Check cache first
            const cacheKey = `analytics_${timeRange.start.toISOString()}_${timeRange.end.toISOString()}`;
            const cached = getCachedMetrics(cacheKey);

            if (cached) {
                setUsageData(cached.usageData);
                setProjectData(cached.projectData);
                setEngagementData(cached.engagementData);
                setHealthData(cached.healthData);
                setMetrics(cached.metrics);
                setLoading(false);
                return;
            }

            // Fetch all data in parallel
            const [
                usageStats,
                projectProgress,
                engagementScores,
                platformHealth,
                featureAdoption,
                responseTimes
            ] = await Promise.all([
                fetchUsageStatistics(timeRange.start, timeRange.end),
                fetchProjectProgress(),
                fetchEngagementScores(),
                fetchPlatformHealth(),
                fetchFeatureAdoption(),
                fetchMessageResponseTimes(30)
            ]);

            const usage = {
                usageStats,
                featureAdoption
            };

            const project = {
                projectProgress
            };

            const engagement = {
                engagementScores,
                responseTimes
            };

            const health = {
                platformHealth
            };

            // Calculate metrics
            const totalActiveUsers = usageStats.reduce((sum, item) => sum + item.active_users, 0);
            const totalSessions = usageStats.reduce((sum, item) => sum + item.total_sessions, 0);
            const avgEngagement = engagementScores.length > 0
                ? engagementScores.reduce((sum, u) => sum + u.engagement_score, 0) / engagementScores.length
                : 0;
            const systemUptime = platformHealth.uptime_percentage || 0;

            const metricsData = {
                totalActiveUsers,
                totalSessions,
                avgEngagement: Math.round(avgEngagement),
                systemUptime
            };

            setUsageData(usage);
            setProjectData(project);
            setEngagementData(engagement);
            setHealthData(health);
            setMetrics(metricsData);

            // Cache the data
            cacheMetrics(cacheKey, {
                usageData: usage,
                projectData: project,
                engagementData: engagement,
                healthData: health,
                metrics: metricsData
            }, 300); // 5 minutes TTL

        } catch (error) {
            console.error('Error loading analytics data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Load live active users
    const loadLiveActiveUsers = async () => {
        const activeUsers = await getActiveUsersRealtime();
        setActiveUsersLive(activeUsers);
    };

    // Initial load
    useEffect(() => {
        loadData();
        loadLiveActiveUsers();

        // Set up real-time subscription for live metrics
        const channel = supabase
            .channel('analytics_live')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'users' },
                () => {
                    loadLiveActiveUsers();
                }
            )
            .subscribe();

        // Auto-refresh every 5 minutes
        const interval = setInterval(() => {
            loadData(false);
            loadLiveActiveUsers();
        }, 300000);

        return () => {
            channel.unsubscribe();
            clearInterval(interval);
        };
    }, []);

    // Reload when time range changes
    useEffect(() => {
        if (timeRange) {
            loadData();
        }
    }, [timeRange]);

    // Handle time range change
    const handleTimeRangeChange = (start, end) => {
        setTimeRange({ start, end });
    };

    // Handle refresh
    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
        loadLiveActiveUsers();
    };

    // Prepare export data
    const exportData = {
        'Usage Statistics': usageData.usageStats || [],
        'Project Progress': projectData.projectProgress || [],
        'Engagement Scores': engagementData.engagementScores || [],
        'Platform Health': [healthData.platformHealth] || []
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
                        <p className="text-gray-600 mt-1">Platform insights and metrics</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <ExportToolbar
                            data={usageData.usageStats || []}
                            chartRefs={chartRefs}
                            reportData={exportData}
                        />
                    </div>
                </div>
            </div>

            {/* Time Range Selector */}
            <div className="mb-6">
                <TimeRangeSelector
                    onRangeChange={handleTimeRangeChange}
                    defaultRange="last7days"
                />
            </div>

            {/* Live Active Users */}
            <div className="mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm opacity-90">Active Users Right Now</p>
                        <div className="flex items-center space-x-4 mt-2">
                            {activeUsersLive.map((roleData, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="text-2xl font-bold">{roleData.active_count}</span>
                                    <span className="text-sm opacity-90 capitalize">{roleData.role}s</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Activity className="w-12 h-12 opacity-50" />
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <MetricCard
                    title="Total Active Users"
                    value={formatNumber(metrics.totalActiveUsers)}
                    trend="up"
                    change="12.5"
                    icon={Users}
                    loading={loading}
                />
                <MetricCard
                    title="Total Sessions"
                    value={formatNumber(metrics.totalSessions)}
                    trend="up"
                    change="8.3"
                    icon={Activity}
                    loading={loading}
                />
                <MetricCard
                    title="Avg Engagement Score"
                    value={metrics.avgEngagement}
                    trend="up"
                    change="5.2"
                    icon={TrendingUp}
                    loading={loading}
                />
                <MetricCard
                    title="System Uptime"
                    value={`${metrics.systemUptime}%`}
                    trend="neutral"
                    change="0"
                    icon={Server}
                    loading={loading}
                />
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        {[
                            { id: 'usage', label: 'Usage Statistics', icon: Users },
                            { id: 'projects', label: 'Project Progress', icon: Activity },
                            { id: 'engagement', label: 'Engagement', icon: MessageSquare },
                            { id: 'health', label: 'Platform Health', icon: Server }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <tab.icon className="w-5 h-5" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Charts */}
            <div ref={chartRefs[0]}>
                {activeTab === 'usage' && (
                    <UsageCharts data={usageData} loading={loading} />
                )}
                {activeTab === 'projects' && (
                    <ProjectCharts data={projectData} loading={loading} />
                )}
                {activeTab === 'engagement' && (
                    <EngagementCharts data={engagementData} loading={loading} />
                )}
                {activeTab === 'health' && (
                    <HealthCharts data={healthData} loading={loading} />
                )}
            </div>
        </div>
    );
}
