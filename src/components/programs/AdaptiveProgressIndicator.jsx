import { TrendingUp, Award, Zap, Lock } from 'lucide-react'

/**
 * Adaptive Progress Indicator
 * Shows adaptive status, difficulty level, and recommendations
 */
export default function AdaptiveProgressIndicator({ instance, analytics, recommendations }) {
    if (!instance?.adaptiveModeEnabled) {
        return null
    }

    const difficultyConfig = {
        beginner: {
            label: 'Beginner',
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            borderColor: 'border-blue-200 dark:border-blue-800',
            icon: TrendingUp,
        },
        standard: {
            label: 'Standard',
            color: 'text-purple-600 dark:text-purple-400',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20',
            borderColor: 'border-purple-200 dark:border-purple-800',
            icon: Award,
        },
        advanced: {
            label: 'Advanced',
            color: 'text-orange-600 dark:text-orange-400',
            bgColor: 'bg-orange-50 dark:bg-orange-900/20',
            borderColor: 'border-orange-200 dark:border-orange-800',
            icon: Zap,
        },
    }

    const difficulty = difficultyConfig[instance.difficultyLevel] || difficultyConfig.standard
    const DifficultyIcon = difficulty.icon

    const canAutoAdvance = analytics?.averageQualityScore >= 0.7

    return (
        <div className="space-y-3">
            {/* Difficulty Level Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${difficulty.bgColor} ${difficulty.borderColor}`}>
                <DifficultyIcon className={`w-4 h-4 ${difficulty.color}`} />
                <span className={`text-sm font-semibold ${difficulty.color}`}>
                    {difficulty.label} Track
                </span>
            </div>

            {/* Auto-Advancement Status */}
            {canAutoAdvance && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 ml-2">
                    <Award className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        Eligible for Auto-Advancement
                    </span>
                </div>
            )}

            {/* Top Recommendations */}
            {recommendations && recommendations.length > 0 && (
                <div className="mt-4 space-y-2">
                    {recommendations.slice(0, 2).map((rec, idx) => (
                        <div
                            key={idx}
                            className={`p-3 rounded-lg border ${rec.type === 'unlock_advanced'
                                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                                    : rec.type === 'remediation'
                                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                {rec.type === 'unlock_advanced' && <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />}
                                {rec.type === 'remediation' && <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />}
                                {rec.type === 'content_suggestion' && <Award className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />}
                                <div className="flex-1">
                                    <div className="font-semibold text-sm text-slate-900 dark:text-white">{rec.title}</div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">{rec.description}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Unlocked Content Badge */}
            {instance.difficultyLevel === 'advanced' && (
                <div className="mt-4 p-4 bg-gradient-to-r from-purple-500/10 to-orange-500/10 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <div className="font-semibold text-sm text-slate-900 dark:text-white">
                                🎉 Advanced Content Unlocked!
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                Your excellent performance has unlocked advanced tasks and materials
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
