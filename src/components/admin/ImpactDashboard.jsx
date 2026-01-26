import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Card from '../common/Card'
import Button from '../common/Button'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, Award, DollarSign, Download } from 'lucide-react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function ImpactDashboard({ cohortId }) {
    const [metrics, setMetrics] = useState(null)
    const [cohorts, setCohorts] = useState([])
    const [selectedCohort, setSelectedCohort] = useState(cohortId)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchCohorts()
    }, [])

    useEffect(() => {
        if (selectedCohort) {
            fetchMetrics()
        }
    }, [selectedCohort])

    const fetchCohorts = async () => {
        const { data } = await supabase
            .from('cohorts')
            .select('id, name')
            .order('created_at', { ascending: false })

        setCohorts(data || [])
        if (!selectedCohort && data?.length > 0) {
            setSelectedCohort(data[0].id)
        }
    }

    const fetchMetrics = async () => {
        setLoading(true)

        // Fetch calculated metrics
        const { data: metricsData } = await supabase.rpc('calculate_cohort_metrics', {
            p_cohort_id: selectedCohort
        })

        // Fetch post-program survey data
        const { data: surveyData } = await supabase
            .from('post_program_surveys')
            .select('*')
            .eq('cohort_id', selectedCohort)

        // Fetch graduation records
        const { data: graduationData } = await supabase
            .from('graduation_records')
            .select('*')
            .eq('cohort_id', selectedCohort)

        setMetrics({
            ...metricsData,
            surveys: surveyData || [],
            graduations: graduationData || []
        })

        setLoading(false)
    }

    const exportReport = () => {
        // Generate CSV export
        const csvData = generateCSVReport(metrics)
        const blob = new Blob([csvData], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `impact-report-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
    }

    if (loading) return <div className="p-8">Loading metrics...</div>

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Impact Dashboard</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">Track program outcomes and metrics</p>
                </div>
                <div className="flex gap-3">
                    <select
                        value={selectedCohort}
                        onChange={(e) => setSelectedCohort(e.target.value)}
                        className="px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                    >
                        {cohorts.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <Button onClick={exportReport}>
                        <Download size={16} className="mr-2" /> Export Report
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <MetricCard
                    icon={Users}
                    label="Total Students"
                    value={metrics?.total_students || 0}
                    color="blue"
                />
                <MetricCard
                    icon={Award}
                    label="Completion Rate"
                    value={`${Math.round(metrics?.completion_rate || 0)}%`}
                    color="green"
                />
                <MetricCard
                    icon={TrendingUp}
                    label="Avg Quality Score"
                    value={metrics?.avg_quality_score?.toFixed(1) || 'N/A'}
                    color="purple"
                />
                <MetricCard
                    icon={DollarSign}
                    label="Funding Raised"
                    value={`$${calculateTotalFunding(metrics?.surveys)}`}
                    color="yellow"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        Completion Progress
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'Completed', value: metrics?.completed || 0 },
                                    { name: 'In Progress', value: (metrics?.total_students || 0) - (metrics?.completed || 0) }
                                ]}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {[0, 1].map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>

                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        Post-Program Outcomes
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={getOutcomesData(metrics?.surveys)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* Detailed Metrics Table */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Detailed Metrics
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left py-3 px-4 text-slate-700 dark:text-slate-300">Metric</th>
                                <th className="text-right py-3 px-4 text-slate-700 dark:text-slate-300">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b">
                                <td className="py-3 px-4">Total Enrolled</td>
                                <td className="py-3 px-4 text-right font-medium">{metrics?.total_students || 0}</td>
                            </tr>
                            <tr className="border-b">
                                <td className="py-3 px-4">Graduated</td>
                                <td className="py-3 px-4 text-right font-medium">{metrics?.completed || 0}</td>
                            </tr>
                            <tr className="border-b">
                                <td className="py-3 px-4">Jobs Created</td>
                                <td className="py-3 px-4 text-right font-medium">
                                    {metrics?.surveys?.filter(s => s.job_created).length || 0}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <td className="py-3 px-4">Companies Launched</td>
                                <td className="py-3 px-4 text-right font-medium">
                                    {metrics?.surveys?.filter(s => s.company_launched).length || 0}
                                </td>
                            </tr>
                            <tr>
                                <td className="py-3 px-4">Total Funding Raised</td>
                                <td className="py-3 px-4 text-right font-medium">
                                    ${calculateTotalFunding(metrics?.surveys)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}

function MetricCard({ icon: Icon, label, value, color }) {
    const colors = {
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
    }

    return (
        <Card className="p-6">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${colors[color]}`}>
                    <Icon size={24} />
                </div>
                <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">{label}</div>
                </div>
            </div>
        </Card>
    )
}

function calculateTotalFunding(surveys = []) {
    return surveys.reduce((sum, s) => sum + (parseFloat(s.funding_raised) || 0), 0).toLocaleString()
}

function getOutcomesData(surveys = []) {
    return [
        { name: 'Jobs Created', count: surveys.filter(s => s.job_created).length },
        { name: 'Companies Launched', count: surveys.filter(s => s.company_launched).length },
        { name: 'Funding Received', count: surveys.filter(s => s.funding_raised > 0).length }
    ]
}

function generateCSVReport(metrics) {
    const headers = ['Metric', 'Value']
    const rows = [
        ['Total Students', metrics?.total_students || 0],
        ['Completed', metrics?.completed || 0],
        ['Completion Rate', `${Math.round(metrics?.completion_rate || 0)}%`],
        ['Jobs Created', metrics?.surveys?.filter(s => s.job_created).length || 0],
        ['Companies Launched', metrics?.surveys?.filter(s => s.company_launched).length || 0],
        ['Total Funding Raised', `$${calculateTotalFunding(metrics?.surveys)}`]
    ]

    return [headers, ...rows].map(row => row.join(',')).join('\n')
}
