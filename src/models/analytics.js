/**
 * @typedef {Object} ProgressAnalytics
 * @property {string} id
 * @property {string} instanceId
 * @property {string} studentId
 * @property {number} completionPercentage - 0-100
 * @property {number} tasksTotal
 * @property {number} tasksCompleted
 * @property {number} tasksInProgress
 * @property {number} averageQualityScore - 0-1
 * @property {number} averageTimePerTaskMinutes
 * @property {number} onTimeCompletionRate - 0-1
 * @property {SkillScore[]} strengthAreas
 * @property {SkillScore[]} weaknessAreas
 * @property {string} predictedCompletionDate - ISO date string
 * @property {number} currentPaceTasksPerWeek
 * @property {Bottleneck[]} bottleneckTasks
 * @property {string} lastCalculatedAt - ISO date string
 */

/**
 * @typedef {Object} SkillScore
 * @property {string} skill - Skill name (e.g., "market_research", "prototyping")
 * @property {number} score - 0-1
 * @property {number} taskCount - Number of tasks in this skill area
 */

/**
 * @typedef {Object} Bottleneck
 * @property {string} taskId
 * @property {string} title
 * @property {number} daysStuck
 * @property {string} status
 */

/**
 * @typedef {Object} TaskPerformance
 * @property {string} id
 * @property {string} taskId
 * @property {string} instanceId
 * @property {number} qualityScore - 0-1
 * @property {number} timeSpentMinutes
 * @property {number} submissionAttempts
 * @property {number} contentItemsViewed
 * @property {number} contentCompletionRate - 0-1
 * @property {string[]} skillTags
 */

/**
 * @typedef {Object} ConditionalRule
 * @property {string} id
 * @property {string} templateId
 * @property {string} ruleName
 * @property {string} description
 * @property {boolean} isActive
 * @property {TriggerCondition} triggerCondition
 * @property {string} actionType - 'inject_tasks' | 'skip_tasks' | 'change_difficulty' | 'send_notification' | 'advance_stage'
 * @property {Object} actionConfig
 * @property {number} priority
 */

/**
 * @typedef {Object} TriggerCondition
 * @property {string} event - 'task_failed' | 'task_approved' | 'quality_below_threshold' | 'quality_above_threshold'
 * @property {string} [taskType] - Optional task type filter
 * @property {string} [stageName] - Optional stage name filter
 * @property {number} [qualityThreshold] - Optional quality threshold
 */

/**
 * @typedef {Object} QuizQuestion
 * @property {string} id
 * @property {string} contentId
 * @property {string} questionText
 * @property {string} questionType - 'multiple_choice' | 'true_false' | 'short_answer'
 * @property {string[]} options - For multiple choice
 * @property {any} correctAnswer - Format depends on question type
 * @property {string} explanation
 * @property {number} points
 * @property {number} orderIndex
 */

/**
 * @typedef {Object} QuizResponse
 * @property {string} questionId
 * @property {any} answer - Format depends on question type
 */

/**
 * @typedef {Object} QuizResult
 * @property {number} score - Percentage 0-100
 * @property {number} earnedPoints
 * @property {number} totalPoints
 * @property {boolean} passed
 * @property {QuizResponse[]} responses
 */

/**
 * @typedef {Object} StudentContentProgress
 * @property {string} id
 * @property {string} studentId
 * @property {string} contentId
 * @property {string} instanceId
 * @property {boolean} isCompleted
 * @property {number} completionPercentage - 0-100
 * @property {number} timeSpentMinutes
 * @property {number} quizScore - Percentage 0-100
 * @property {Object} quizResponses
 * @property {number} quizAttempts
 * @property {string} lastAccessedAt - ISO date string
 * @property {string} completedAt - ISO date string
 */

/**
 * @typedef {Object} AdaptiveRecommendation
 * @property {string} type - 'unlock_advanced' | 'remediation' | 'skip_basic' | 'content_suggestion'
 * @property {string} title
 * @property {string} description
 * @property {string} [taskId] - Related task ID if applicable
 * @property {string} [contentId] - Related content ID if applicable
 * @property {number} priority - Higher = more important
 */

/**
 * @typedef {Object} DashboardData
 * @property {InstanceAnalytics[]} instances
 * @property {OverallStats} overallStats
 */

/**
 * @typedef {Object} InstanceAnalytics
 * @property {string} instanceId
 * @property {string} templateName
 * @property {string} status
 * @property {string} startedAt
 * @property {ProgressAnalytics} analytics
 */

/**
 * @typedef {Object} OverallStats
 * @property {number} totalPrograms
 * @property {number} activePrograms
 * @property {number} totalTasks
 * @property {number} completedTasks
 * @property {number} averageQuality
 */

export { }
