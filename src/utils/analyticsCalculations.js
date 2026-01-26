/**
 * Analytics calculation utilities for student progress tracking
 */

/**
 * Calculate completion rate from tasks
 * @param {Array} tasks - Array of task objects
 * @returns {number} Completion percentage (0-100)
 */
export function calculateCompletionRate(tasks) {
    if (!tasks || tasks.length === 0) return 0
    const completed = tasks.filter((t) => t.status === 'approved').length
    return Math.round((completed / tasks.length) * 100)
}

/**
 * Identify bottleneck tasks (tasks taking longer than expected)
 * @param {Array} tasks - Array of task objects with timestamps
 * @returns {Array} Array of bottleneck task objects
 */
export function identifyBottlenecks(tasks) {
    if (!tasks || tasks.length === 0) return []

    const now = new Date()
    const bottlenecks = []

    tasks.forEach((task) => {
        if (task.status === 'in_progress' || task.status === 'submitted') {
            const createdAt = new Date(task.createdAt)
            const daysStuck = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24))

            // Consider a task a bottleneck if it's been in progress for more than 7 days
            if (daysStuck > 7) {
                bottlenecks.push({
                    taskId: task.id,
                    title: task.title,
                    daysStuck,
                    status: task.status,
                })
            }
        }
    })

    return bottlenecks.sort((a, b) => b.daysStuck - a.daysStuck)
}

/**
 * Predict completion date based on current pace
 * @param {Array} tasks - Array of task objects
 * @param {Date} startedAt - Program start date
 * @returns {Date|null} Predicted completion date
 */
export function predictCompletionDate(tasks, startedAt) {
    if (!tasks || tasks.length === 0 || !startedAt) return null

    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.status === 'approved').length

    if (completedTasks === 0) return null

    const now = new Date()
    const start = new Date(startedAt)
    const daysElapsed = Math.max(1, (now - start) / (1000 * 60 * 60 * 24))
    const tasksPerDay = completedTasks / daysElapsed

    if (tasksPerDay === 0) return null

    const remainingTasks = totalTasks - completedTasks
    const daysRemaining = remainingTasks / tasksPerDay

    const predicted = new Date(now)
    predicted.setDate(predicted.getDate() + Math.ceil(daysRemaining))

    return predicted
}

/**
 * Calculate skill scores from task performance data
 * @param {Array} tasks - Array of task objects with performance data
 * @returns {Object} Object with strengthAreas and weaknessAreas arrays
 */
export function calculateSkillScores(tasks) {
    if (!tasks || tasks.length === 0) {
        return { strengthAreas: [], weaknessAreas: [] }
    }

    // Group tasks by skill tags
    const skillMap = new Map()

    tasks.forEach((task) => {
        if (task.status === 'approved' && task.qualityScore != null) {
            const skills = task.performanceData?.skillTags || [task.taskType || 'general']

            skills.forEach((skill) => {
                if (!skillMap.has(skill)) {
                    skillMap.set(skill, { scores: [], count: 0 })
                }
                skillMap.get(skill).scores.push(task.qualityScore)
                skillMap.get(skill).count++
            })
        }
    })

    // Calculate average scores per skill
    const skillScores = []
    skillMap.forEach((data, skill) => {
        const avgScore = data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length
        skillScores.push({
            skill,
            score: avgScore,
            taskCount: data.count,
        })
    })

    // Sort by score
    skillScores.sort((a, b) => b.score - a.score)

    // Top 3 are strengths, bottom 3 are weaknesses (if score < 0.7)
    const strengthAreas = skillScores.slice(0, 3)
    const weaknessAreas = skillScores
        .filter((s) => s.score < 0.7)
        .slice(-3)
        .reverse()

    return { strengthAreas, weaknessAreas }
}

/**
 * Generate adaptive recommendations based on analytics
 * @param {Object} analytics - Progress analytics object
 * @param {Array} tasks - Array of task objects
 * @returns {Array} Array of recommendation objects
 */
export function generateRecommendations(analytics, tasks) {
    const recommendations = []

    if (!analytics || !tasks) return recommendations

    // High performer - unlock advanced content
    if (analytics.averageQualityScore >= 0.85 && analytics.completionPercentage > 30) {
        recommendations.push({
            type: 'unlock_advanced',
            title: 'Advanced Content Available',
            description: 'Your excellent performance qualifies you for advanced tasks and materials.',
            priority: 10,
        })
    }

    // Low quality - suggest remediation
    if (analytics.averageQualityScore < 0.6 && analytics.tasksCompleted > 3) {
        recommendations.push({
            type: 'remediation',
            title: 'Additional Support Recommended',
            description: 'Consider reviewing foundational materials to strengthen your understanding.',
            priority: 9,
        })
    }

    // Bottlenecks detected
    if (analytics.bottleneckTasks && analytics.bottleneckTasks.length > 0) {
        recommendations.push({
            type: 'bottleneck_alert',
            title: 'Tasks Need Attention',
            description: `You have ${analytics.bottleneckTasks.length} task(s) that may need help or clarification.`,
            priority: 8,
        })
    }

    // Behind schedule
    if (analytics.predictedCompletionDate) {
        const predicted = new Date(analytics.predictedCompletionDate)
        const now = new Date()
        const monthsAway = (predicted - now) / (1000 * 60 * 60 * 24 * 30)

        if (monthsAway > 6) {
            recommendations.push({
                type: 'pace_alert',
                title: 'Consider Increasing Pace',
                description: 'Your current pace suggests a longer timeline. Consider dedicating more time weekly.',
                priority: 7,
            })
        }
    }

    // Weakness areas - suggest content
    if (analytics.weaknessAreas && analytics.weaknessAreas.length > 0) {
        analytics.weaknessAreas.forEach((weakness) => {
            recommendations.push({
                type: 'content_suggestion',
                title: `Strengthen ${weakness.skill}`,
                description: `Additional resources available to improve in this area (current score: ${Math.round(weakness.score * 100)}%).`,
                priority: 6,
            })
        })
    }

    return recommendations.sort((a, b) => b.priority - a.priority)
}

/**
 * Calculate on-time completion rate
 * @param {Array} tasks - Array of task objects with deadlines
 * @returns {number} On-time rate (0-1)
 */
export function calculateOnTimeRate(tasks) {
    if (!tasks || tasks.length === 0) return 0

    const tasksWithDeadlines = tasks.filter(
        (t) => t.status === 'approved' && t.deadline && t.approvedAt
    )

    if (tasksWithDeadlines.length === 0) return 0

    const onTime = tasksWithDeadlines.filter((t) => {
        const deadline = new Date(t.deadline)
        const approved = new Date(t.approvedAt)
        return approved <= deadline
    }).length

    return onTime / tasksWithDeadlines.length
}

/**
 * Calculate average time per task
 * @param {Array} tasks - Array of task objects with time spent
 * @returns {number} Average minutes per task
 */
export function calculateAverageTime(tasks) {
    if (!tasks || tasks.length === 0) return 0

    const tasksWithTime = tasks.filter((t) => t.timeSpentMinutes > 0)

    if (tasksWithTime.length === 0) return 0

    const totalTime = tasksWithTime.reduce((sum, t) => sum + t.timeSpentMinutes, 0)
    return Math.round(totalTime / tasksWithTime.length)
}

/**
 * Format analytics data for display
 * @param {Object} analytics - Raw analytics object
 * @returns {Object} Formatted analytics for UI
 */
export function formatAnalyticsForDisplay(analytics) {
    if (!analytics) return null

    return {
        ...analytics,
        completionPercentage: Math.round(analytics.completionPercentage || 0),
        averageQualityScore: analytics.averageQualityScore
            ? Math.round(analytics.averageQualityScore * 100)
            : null,
        onTimeCompletionRate: analytics.onTimeCompletionRate
            ? Math.round(analytics.onTimeCompletionRate * 100)
            : null,
        averageTimePerTaskMinutes: analytics.averageTimePerTaskMinutes
            ? Math.round(analytics.averageTimePerTaskMinutes)
            : null,
        currentPaceTasksPerWeek: analytics.currentPaceTasksPerWeek
            ? analytics.currentPaceTasksPerWeek.toFixed(1)
            : null,
    }
}
