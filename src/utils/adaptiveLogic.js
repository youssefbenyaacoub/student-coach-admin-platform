/**
 * Adaptive logic utilities for intelligent progression and branching
 */

/**
 * Determine if a task qualifies for auto-advancement
 * @param {Object} task - Task object with quality score
 * @param {number} threshold - Minimum quality threshold (0-1)
 * @returns {boolean} Whether task meets advancement criteria
 */
export function shouldAutoAdvance(task, threshold = 0.7) {
    if (!task || task.status !== 'approved') return false
    if (task.qualityScore == null) return false
    return task.qualityScore >= threshold
}

/**
 * Evaluate if a conditional rule should trigger
 * @param {Object} rule - Conditional rule object
 * @param {Object} context - Current context (task, instance, etc.)
 * @returns {boolean} Whether rule conditions are met
 */
export function evaluateConditionalRule(rule, context) {
    if (!rule || !rule.triggerCondition || !context) return false

    const { triggerCondition } = rule
    const { event, taskType, stageName, qualityThreshold } = triggerCondition

    // Check event type
    if (event && context.eventType !== event) return false

    // Check task type filter
    if (taskType && context.task?.taskType !== taskType) return false

    // Check stage name filter
    if (stageName && context.stage?.name !== stageName) return false

    // Check quality threshold
    if (qualityThreshold != null && context.task?.qualityScore != null) {
        if (event === 'quality_below_threshold' && context.task.qualityScore >= qualityThreshold) {
            return false
        }
        if (event === 'quality_above_threshold' && context.task.qualityScore < qualityThreshold) {
            return false
        }
    }

    return true
}

/**
 * Calculate appropriate difficulty level based on performance
 * @param {Object} performanceData - Student performance metrics
 * @returns {string} Difficulty level: 'beginner' | 'standard' | 'advanced'
 */
export function calculateDifficultyLevel(performanceData) {
    if (!performanceData) return 'standard'

    const { averageQualityScore, completionPercentage, onTimeCompletionRate } = performanceData

    // Not enough data yet
    if (completionPercentage < 20) return 'standard'

    const avgQuality = averageQualityScore || 0
    const onTimeRate = onTimeCompletionRate || 0

    // High performer
    if (avgQuality >= 0.85 && onTimeRate >= 0.8) {
        return 'advanced'
    }

    // Struggling
    if (avgQuality < 0.6 || onTimeRate < 0.5) {
        return 'beginner'
    }

    return 'standard'
}

/**
 * Generate an adaptive learning path based on student data
 * @param {Object} template - Program template with stages
 * @param {Object} studentData - Student performance and progress data
 * @returns {Object} Personalized roadmap configuration
 */
export function generateAdaptivePath(template, studentData) {
    if (!template || !studentData) return null

    const { stages } = template
    const { performanceData, strengthAreas, weaknessAreas } = studentData

    const adaptivePath = {
        recommendedStages: [],
        skipableStages: [],
        additionalResources: [],
    }

    const difficultyLevel = calculateDifficultyLevel(performanceData)

    stages.forEach((stage) => {
        const stageConfig = {
            stageId: stage.id,
            name: stage.name,
            recommended: true,
            reason: '',
        }

        // Advanced students can skip beginner stages
        if (difficultyLevel === 'advanced' && stage.name.toLowerCase().includes('intro')) {
            stageConfig.recommended = false
            stageConfig.reason = 'Your strong performance suggests you can skip this introductory stage'
            adaptivePath.skipableStages.push(stageConfig)
        }
        // Beginners get extra support in advanced stages
        else if (difficultyLevel === 'beginner' && stage.name.toLowerCase().includes('advanced')) {
            stageConfig.reason = 'Additional support materials recommended for this stage'
            adaptivePath.recommendedStages.push(stageConfig)
        } else {
            adaptivePath.recommendedStages.push(stageConfig)
        }
    })

    // Add resources based on weaknesses
    if (weaknessAreas && weaknessAreas.length > 0) {
        weaknessAreas.forEach((weakness) => {
            adaptivePath.additionalResources.push({
                skill: weakness.skill,
                type: 'remediation',
                priority: 'high',
                reason: `Score in ${weakness.skill} is ${Math.round(weakness.score * 100)}%`,
            })
        })
    }

    return adaptivePath
}

/**
 * Determine which tasks to inject based on a rule action
 * @param {Object} actionConfig - Rule action configuration
 * @param {Object} context - Current context
 * @returns {Array} Array of task objects to inject
 */
export function generateTasksFromRule(actionConfig, context) {
    if (!actionConfig || !actionConfig.tasks) return []

    const tasksToInject = []

    actionConfig.tasks.forEach((taskTemplate) => {
        tasksToInject.push({
            title: taskTemplate.title,
            description: taskTemplate.description,
            taskType: taskTemplate.taskType || 'general',
            stageId: context.stageId,
            deadline: taskTemplate.deadlineOffsetDays
                ? new Date(Date.now() + taskTemplate.deadlineOffsetDays * 24 * 60 * 60 * 1000)
                : null,
            requiresApproval: taskTemplate.requiresApproval !== false,
            meta: {
                injectedByRule: context.ruleId,
                injectedReason: context.reason,
            },
        })
    })

    return tasksToInject
}

/**
 * Check if student meets prerequisites for a stage
 * @param {Object} stage - Stage object with prerequisites
 * @param {Array} completedStages - Array of completed stage IDs
 * @returns {Object} Result with canAccess and missingPrerequisites
 */
export function checkStagePrerequisites(stage, completedStages) {
    if (!stage || !stage.prerequisiteStageIds || stage.prerequisiteStageIds.length === 0) {
        return { canAccess: true, missingPrerequisites: [] }
    }

    const completed = new Set(completedStages || [])
    const missing = stage.prerequisiteStageIds.filter((prereqId) => !completed.has(prereqId))

    return {
        canAccess: missing.length === 0,
        missingPrerequisites: missing,
    }
}

/**
 * Calculate adaptive score for task prioritization
 * @param {Object} task - Task object
 * @param {Object} studentData - Student performance data
 * @returns {number} Priority score (higher = more important)
 */
export function calculateAdaptivePriority(task, studentData) {
    let priority = 0

    // Base priority from order
    priority += (100 - (task.orderIndex || 0)) * 0.1

    // Boost priority for weakness areas
    if (studentData.weaknessAreas) {
        const taskSkills = task.performanceData?.skillTags || [task.taskType]
        const isWeakArea = studentData.weaknessAreas.some((w) => taskSkills.includes(w.skill))
        if (isWeakArea) priority += 20
    }

    // Boost priority for overdue tasks
    if (task.deadline) {
        const deadline = new Date(task.deadline)
        const now = new Date()
        const daysUntilDeadline = (deadline - now) / (1000 * 60 * 60 * 24)

        if (daysUntilDeadline < 0) {
            priority += 50 // Overdue
        } else if (daysUntilDeadline < 3) {
            priority += 30 // Due soon
        }
    }

    // Reduce priority for tasks in strength areas (can be done later)
    if (studentData.strengthAreas) {
        const taskSkills = task.performanceData?.skillTags || [task.taskType]
        const isStrengthArea = studentData.strengthAreas.some((s) => taskSkills.includes(s.skill))
        if (isStrengthArea) priority -= 10
    }

    return priority
}

/**
 * Suggest next best action for student
 * @param {Object} instance - Program instance with tasks
 * @param {Object} analytics - Student analytics
 * @returns {Object} Suggested action
 */
export function suggestNextAction(instance, analytics) {
    if (!instance || !instance.tasks) {
        return { action: 'none', message: 'No tasks available' }
    }

    const tasks = instance.tasks

    // Check for overdue tasks
    const overdueTasks = tasks.filter((t) => {
        if (t.status === 'approved' || !t.deadline) return false
        return new Date(t.deadline) < new Date()
    })

    if (overdueTasks.length > 0) {
        return {
            action: 'complete_overdue',
            message: `You have ${overdueTasks.length} overdue task(s). Focus on these first.`,
            tasks: overdueTasks,
        }
    }

    // Check for submitted tasks awaiting review
    const submittedTasks = tasks.filter((t) => t.status === 'submitted')

    if (submittedTasks.length > 0) {
        return {
            action: 'wait_for_review',
            message: `${submittedTasks.length} task(s) submitted and awaiting coach review.`,
            tasks: submittedTasks,
        }
    }

    // Check for in-progress tasks
    const inProgressTasks = tasks.filter((t) => t.status === 'in_progress')

    if (inProgressTasks.length > 0) {
        return {
            action: 'continue_current',
            message: 'Continue working on your in-progress tasks.',
            tasks: inProgressTasks,
        }
    }

    // Suggest next todo task based on adaptive priority
    const todoTasks = tasks.filter((t) => t.status === 'todo')

    if (todoTasks.length > 0) {
        const prioritized = todoTasks
            .map((t) => ({
                ...t,
                adaptivePriority: calculateAdaptivePriority(t, analytics),
            }))
            .sort((a, b) => b.adaptivePriority - a.adaptivePriority)

        return {
            action: 'start_next',
            message: 'Ready to start your next task!',
            tasks: [prioritized[0]],
        }
    }

    return {
        action: 'all_complete',
        message: 'All tasks complete! Great work!',
        tasks: [],
    }
}
