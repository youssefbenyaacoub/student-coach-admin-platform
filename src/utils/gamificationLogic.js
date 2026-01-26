import { Award, Zap, Trophy, Target, Star, Users } from 'lucide-react'

// Default badge definitions if not loaded from DB
const DEFAULT_BADGES = [
    {
        id: 'badge_first_step',
        name: 'First Step',
        description: 'Completed your first task',
        icon_key: 'flag',
        category: 'milestone',
        rarity: 'common',
        criteria_type: 'tasks_completed',
        criteria_value: 1,
    },
    {
        id: 'badge_on_fire',
        name: 'On Fire',
        description: 'Reached a 3-day split streak',
        icon_key: 'fire',
        category: 'streak',
        rarity: 'rare',
        criteria_type: 'daily_streak',
        criteria_value: 3,
    },
    {
        id: 'badge_qa_master',
        name: 'Quality Master',
        description: 'Achieved high quality scores on 5 tasks',
        icon_key: 'star',
        category: 'skill',
        rarity: 'epic',
        criteria_type: 'high_quality_tasks',
        criteria_value: 5,
    },
]

/**
 * Check if user qualifies for new badges based on updated activity
 * @param {Object} userActivity - Consolidated user stats
 * @param {Array} existingBadges - IDs of badges user already has
 * @returns {Array} New badges earned
 */
export function checkBadgeCriteria(userActivity, existingBadges = []) {
    if (!userActivity) return []

    const earned = []
    const existingSet = new Set(existingBadges)

    DEFAULT_BADGES.forEach((badge) => {
        if (existingSet.has(badge.id)) return

        let qualified = false

        switch (badge.criteria_type) {
            case 'tasks_completed':
                if ((userActivity.tasksCompleted || 0) >= badge.criteria_value) qualified = true
                break
            case 'daily_streak':
                if ((userActivity.currentStreak || 0) >= badge.criteria_value) qualified = true
                break
            case 'high_quality_tasks':
                // Assuming userActivity tracks count of high-quality tasks
                if ((userActivity.highQualityCount || 0) >= badge.criteria_value) qualified = true
                break
            default:
                break
        }

        if (qualified) {
            earned.push(badge)
        }
    })

    return earned
}

/**
 * Calculate streak based on activity dates
 * Note: This is a client-side approximation/display helper. 
 * Real truth comes from DB triggers.
 */
export function calculateStreakDisplay(lastActivityDate) {
    if (!lastActivityDate) return 0

    const last = new Date(lastActivityDate)
    const today = new Date()

    // Reset time part
    last.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)

    const diffTime = Math.abs(today - last)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 1) return true // Active within 24h window
    return false
}

export function getBadgeIcon(iconKey) {
    switch (iconKey) {
        case 'fire': return Zap
        case 'trophy': return Trophy
        case 'star': return Star
        case 'users': return Users
        default: return Award
    }
}
