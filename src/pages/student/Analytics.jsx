import { useEffect, useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useProgramManagement } from '../../hooks/useProgramManagement'
import Card from '../../components/common/Card'
import GamificationHub from '../../components/student/GamificationHub'
import ProgressAnalyticsDashboard from '../../components/student/ProgressAnalyticsDashboard'
import {
  calculateCompletionRate,
  calculateOnTimeRate,
  calculateSkillScores,
  identifyBottlenecks,
  predictCompletionDate,
} from '../../utils/analyticsCalculations'
import { checkBadgeCriteria } from '../../utils/gamificationLogic'

function computeDailyStreak(isoDates = []) {
  const uniqueDays = new Set(
    isoDates
      .filter(Boolean)
      .map((d) => {
        const dt = new Date(d)
        if (Number.isNaN(dt.getTime())) return null
        dt.setHours(0, 0, 0, 0)
        return dt.getTime()
      })
      .filter((t) => t != null),
  )

  if (uniqueDays.size === 0) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let streak = 0
  for (; ;) {
    const day = new Date(today)
    day.setDate(day.getDate() - streak)
    if (uniqueDays.has(day.getTime())) streak += 1
    else break
  }

  return streak
}

export default function StudentAnalytics() {
  const { currentUser } = useAuth()
  const {
    hydrated,
    busy,
    instances,
    templates,
    instanceDetailsById,
    fetchMyInstances,
    fetchInstanceDetails,
    fetchStudentAnalytics,
    recalculateAnalytics,
  } = useProgramManagement()

  const myInstances = useMemo(() => {
    if (!currentUser?.id) return []
    return (instances ?? []).filter((i) => i.studentId === currentUser.id)
  }, [currentUser, instances])

  const [selectedInstanceId, setSelectedInstanceId] = useState('')

  const effectiveInstanceId = useMemo(() => {
    return selectedInstanceId || myInstances[0]?.id || ''
  }, [myInstances, selectedInstanceId])

  useEffect(() => {
    if (!hydrated) return
    if (!currentUser?.id) return

    // Provider *usually* fetches these on mount, but keep this page resilient.
    fetchMyInstances().catch(() => { })
  }, [currentUser?.id, fetchMyInstances, hydrated])

  useEffect(() => {
    if (!effectiveInstanceId) return
    fetchInstanceDetails(effectiveInstanceId).catch(() => { })
  }, [effectiveInstanceId, fetchInstanceDetails])

  const selectedDetails = useMemo(() => {
    if (!effectiveInstanceId) return null
    return instanceDetailsById[effectiveInstanceId] ?? null
  }, [effectiveInstanceId, instanceDetailsById])

  const [dbAnalytics, setDbAnalytics] = useState(null)

  useEffect(() => {
    if (!effectiveInstanceId) return

    let cancelled = false
    const load = async () => {
      try {
        // Recalculate to ensure fresh data (non-blocking)
        await recalculateAnalytics(effectiveInstanceId)
        const ana = await fetchStudentAnalytics(effectiveInstanceId)
        if (!cancelled && ana) setDbAnalytics(ana)
      } catch (err) {
        console.warn('Could not load analytics from DB:', err)
      }
    }
    load()
    return () => { cancelled = true }
  }, [effectiveInstanceId, fetchStudentAnalytics, recalculateAnalytics])

  const selectedInstance = selectedDetails?.instance ?? null
  const selectedTasks = useMemo(() => selectedDetails?.tasks ?? [], [selectedDetails])

  const instanceName = useMemo(() => {
    if (!selectedInstance) return ''
    const tpl = (templates ?? []).find((t) => t.id === selectedInstance.templateId)
    return tpl?.name ?? 'My Program'
  }, [selectedInstance, templates])

  const analytics = useMemo(() => {
    // If we have DB analytics, prioritize them but merge with local task info
    const baseAnalytics = dbAnalytics || {}

    if (!selectedInstance) return null

    const tasks = selectedTasks

    // Fallback/Local calculations
    const completionPercentage = baseAnalytics.completionPercentage ?? calculateCompletionRate(tasks)
    const tasksTotal = baseAnalytics.tasksTotal ?? tasks.length
    const tasksCompleted = baseAnalytics.tasksCompleted ?? tasks.filter((t) => t.status === 'approved').length
    const tasksInProgress = baseAnalytics.tasksInProgress ?? tasks.filter((t) => t.status === 'in_progress' || t.status === 'submitted').length

    const onTimeCompletionRate = baseAnalytics.onTimeCompletionRate ?? calculateOnTimeRate(tasks)
    const bottleneckTasks = baseAnalytics.bottleneckTasks?.length ? baseAnalytics.bottleneckTasks : identifyBottlenecks(tasks)

    const predicted = predictCompletionDate(tasks, selectedInstance.startedAt)

    const start = new Date(selectedInstance.startedAt)
    const now = new Date()
    const daysElapsed = Math.max(1, (now - start) / (1000 * 60 * 60 * 24))
    const currentPaceTasksPerWeek = baseAnalytics.currentPaceTasksPerWeek ?? (Math.round((tasksCompleted / daysElapsed) * 7 * 10) / 10)

    const { strengthAreas, weaknessAreas } = calculateSkillScores(tasks)

    return {
      id: baseAnalytics.id || `analytics_${selectedInstance.id}`,
      instanceId: selectedInstance.id,
      studentId: selectedInstance.studentId,
      completionPercentage,
      tasksTotal,
      tasksCompleted,
      tasksInProgress,
      averageQualityScore: baseAnalytics.averageQualityScore || (tasksCompleted > 0 ? (tasks.reduce((acc, t) => acc + (t.qualityScore || 0), 0) / tasksCompleted) : null),
      averageTimePerTaskMinutes: baseAnalytics.averageTimePerTaskMinutes || (tasksCompleted > 0 ? (tasks.reduce((acc, t) => acc + (t.timeSpentMinutes || 0), 0) / tasksCompleted) : null),
      onTimeCompletionRate,
      strengthAreas: baseAnalytics.strengthAreas?.length ? baseAnalytics.strengthAreas : strengthAreas,
      weaknessAreas: baseAnalytics.weaknessAreas?.length ? baseAnalytics.weaknessAreas : weaknessAreas,
      predictedCompletionDate: baseAnalytics.predictedCompletionDate || (predicted ? predicted.toISOString() : null),
      currentPaceTasksPerWeek,
      bottleneckTasks,
      lastCalculatedAt: baseAnalytics.lastCalculatedAt || new Date().toISOString(),
    }
  }, [dbAnalytics, selectedInstance, selectedTasks])

  const gamification = useMemo(() => {
    const approvedDates = selectedTasks
      .filter((t) => t.status === 'approved')
      .map((t) => t.approvedAt)

    const userStats = {
      tasksCompleted: selectedTasks.filter((t) => t.status === 'approved').length,
      currentStreak: computeDailyStreak(approvedDates),
      highQualityCount: 0,
    }

    const earnedBadges = checkBadgeCriteria(userStats, [])
    return { userStats, earnedBadges }
  }, [selectedTasks])

  if (!currentUser?.id) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Sign in to view analytics.</div>
      </div>
    )
  }

  if (!hydrated || busy) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading analytics…</div>
      </div>
    )
  }

  if (myInstances.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white">Analytics</h1>
          <p className="mt-2 text-slate-500 font-medium">Start a roadmap to unlock progress analytics and achievements.</p>
        </div>
        <Card className="p-8 border-dashed">
          <div className="text-center text-slate-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <div className="font-semibold text-slate-800 dark:text-slate-200">No roadmap started yet</div>
            <div className="text-sm mt-1">Go to “My Progress” and start a template.</div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white">Analytics</h1>
          <p className="mt-2 text-slate-500 font-medium">Track your streak, achievements, and roadmap progress.</p>
        </div>

        <div className="w-full md:w-72">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Roadmap</label>
          <select
            value={effectiveInstanceId}
            onChange={(e) => setSelectedInstanceId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-student-primary/30 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
          >
            {myInstances.map((inst) => {
              const tpl = (templates ?? []).find((t) => t.id === inst.templateId)
              return (
                <option key={inst.id} value={inst.id}>
                  {tpl?.name ?? 'Program'}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      <GamificationHub userStats={gamification.userStats} earnedBadges={gamification.earnedBadges} />

      <Card className="p-4">
        <div className="text-sm text-slate-500">Roadmap</div>
        <div className="text-xl font-heading font-bold text-slate-900 dark:text-white">{instanceName}</div>
      </Card>

      <ProgressAnalyticsDashboard analytics={analytics} tasks={selectedTasks} instanceName={instanceName} />
    </div>
  )
}
