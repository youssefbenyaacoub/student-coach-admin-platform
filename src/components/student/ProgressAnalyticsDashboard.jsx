import { useMemo } from 'react'
import { TrendingUp, Target, Clock, Award, AlertCircle, Calendar } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import Card from '../common/Card'
import { formatDate } from '../../utils/time'

/**
 * Progress Analytics Dashboard Component
 * Displays comprehensive analytics for student progress
 */
export default function ProgressAnalyticsDashboard({ analytics, tasks, instanceName }) {
    // Prepare data for radar chart (strengths/weaknesses)
    const skillsData = useMemo(() => {
        if (!analytics) return []

        const allSkills = new Map()

        // Add strengths
        analytics.strengthAreas?.forEach((skill) => {
            allSkills.set(skill.skill, {
                skill: skill.skill.replace(/_/g, ' '),
                score: Math.round(skill.score * 100),
                fullMark: 100,
            })
        })

        // Add weaknesses
        analytics.weaknessAreas?.forEach((skill) => {
            if (!allSkills.has(skill.skill)) {
                allSkills.set(skill.skill, {
                    skill: skill.skill.replace(/_/g, ' '),
                    score: Math.round(skill.score * 100),
                    fullMark: 100,
                })
            }
        })

        return Array.from(allSkills.values())
    }, [analytics])

    // Prepare data for progress timeline
    const timelineData = useMemo(() => {
        if (!tasks) return []

        const completed = tasks.filter((t) => t.status === 'approved').sort((a, b) => new Date(a.approvedAt) - new Date(b.approvedAt))

        return completed.map((task, index) => ({
            name: `Task ${index + 1}`,
            completed: index + 1,
            quality: task.qualityScore ? Math.round(task.qualityScore * 100) : null,
        }))
    }, [tasks])

    if (!analytics) {
        return (
            <div className="p-8 text-center text-slate-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Analytics data not available yet. Complete some tasks to see your progress!</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Completion Progress */}
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-student-primary/10 rounded-lg">
                            <Target className="w-5 h-5 text-student-primary" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                {Math.round(analytics.completionPercentage || 0)}%
                            </div>
                            <div className="text-xs text-slate-500">Completion</div>
                        </div>
                    </div>
                    <div className="mt-3 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-student-primary transition-all duration-500"
                            style={{ width: `${analytics.completionPercentage || 0}%` }}
                        />
                    </div>
                </Card>

                {/* Average Quality */}
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                {analytics.averageQualityScore ? Math.round(analytics.averageQualityScore * 100) : '--'}%
                            </div>
                            <div className="text-xs text-slate-500">Avg Quality</div>
                        </div>
                    </div>
                </Card>

                {/* On-Time Rate */}
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                {analytics.onTimeCompletionRate ? Math.round(analytics.onTimeCompletionRate * 100) : '--'}%
                            </div>
                            <div className="text-xs text-slate-500">On-Time</div>
                        </div>
                    </div>
                </Card>

                {/* Current Pace */}
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                {analytics.currentPaceTasksPerWeek || '--'}
                            </div>
                            <div className="text-xs text-slate-500">Tasks/Week</div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Skills Radar Chart */}
                {skillsData.length > 0 && (
                    <Card>
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="font-semibold text-slate-900 dark:text-white">Skills Analysis</h3>
                            <p className="text-sm text-slate-500 mt-1">Your performance across different skill areas</p>
                        </div>
                        <div className="p-4">
                            <ResponsiveContainer width="100%" height={300}>
                                <RadarChart data={skillsData}>
                                    <PolarGrid stroke="#94a3b8" />
                                    <PolarAngleAxis dataKey="skill" tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#64748b' }} />
                                    <Radar name="Score" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                                    <Tooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                )}

                {/* Progress Timeline */}
                {timelineData.length > 0 && (
                    <Card>
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="font-semibold text-slate-900 dark:text-white">Progress Timeline</h3>
                            <p className="text-sm text-slate-500 mt-1">Task completion over time</p>
                        </div>
                        <div className="p-4">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={timelineData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <YAxis tick={{ fill: '#64748b' }} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="completed" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                )}
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                {analytics.strengthAreas && analytics.strengthAreas.length > 0 && (
                    <Card>
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <Award className="w-5 h-5 text-green-600" />
                                Your Strengths
                            </h3>
                        </div>
                        <div className="p-4 space-y-3">
                            {analytics.strengthAreas.map((strength, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                                        {strength.skill.replace(/_/g, ' ')}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 transition-all"
                                                style={{ width: `${Math.round(strength.score * 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-bold text-green-600 dark:text-green-400 w-12 text-right">
                                            {Math.round(strength.score * 100)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* Weaknesses */}
                {analytics.weaknessAreas && analytics.weaknessAreas.length > 0 && (
                    <Card>
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-orange-600" />
                                Areas for Improvement
                            </h3>
                        </div>
                        <div className="p-4 space-y-3">
                            {analytics.weaknessAreas.map((weakness, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                                        {weakness.skill.replace(/_/g, ' ')}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-orange-500 transition-all"
                                                style={{ width: `${Math.round(weakness.score * 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-bold text-orange-600 dark:text-orange-400 w-12 text-right">
                                            {Math.round(weakness.score * 100)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>

            {/* Bottlenecks & Predictions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bottlenecks */}
                {analytics.bottleneckTasks && analytics.bottleneckTasks.length > 0 && (
                    <Card>
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                Tasks Needing Attention
                            </h3>
                        </div>
                        <div className="p-4 space-y-2">
                            {analytics.bottleneckTasks.map((bottleneck, idx) => (
                                <div key={idx} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <div className="font-medium text-sm text-slate-900 dark:text-white">{bottleneck.title}</div>
                                    <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                        Stuck for {bottleneck.daysStuck} days
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* Predicted Completion */}
                {analytics.predictedCompletionDate && (
                    <Card>
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                Predicted Completion
                            </h3>
                        </div>
                        <div className="p-6 text-center">
                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                                {formatDate(analytics.predictedCompletionDate)}
                            </div>
                            <p className="text-sm text-slate-500">
                                Based on your current pace of {analytics.currentPaceTasksPerWeek || 0} tasks per week
                            </p>
                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    {analytics.tasksTotal - analytics.tasksCompleted} tasks remaining
                                </p>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    )
}
