import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ProgramManagementContext } from './ProgramManagementContextBase'
import { useAuth } from '../hooks/useAuth'

const mapTemplate = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description ?? '',
  isActive: Boolean(row.is_active),
  createdBy: row.created_by ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const mapStage = (row) => ({
  id: row.id,
  templateId: row.template_id,
  name: row.name,
  description: row.description ?? '',
  orderIndex: row.order_index ?? 0,
})

const mapContent = (row) => ({
  id: row.id,
  stageId: row.stage_id,
  contentType: row.content_type,
  title: row.title,
  description: row.description ?? '',
  url: row.url,
  provider: row.provider ?? '',
  durationMinutes: row.duration_minutes ?? null,
  orderIndex: row.order_index ?? 0,
  meta: row.meta ?? {},
})

const mapTaskTemplate = (row) => ({
  id: row.id,
  stageId: row.stage_id,
  title: row.title,
  description: row.description ?? '',
  taskType: row.task_type ?? 'general',
  orderIndex: row.order_index ?? 0,
  dueOffsetDays: row.due_offset_days ?? null,
  requiresApproval: Boolean(row.requires_approval),
  meta: row.meta ?? {},
})

const mapInstance = (row) => ({
  id: row.id,
  templateId: row.template_id,
  studentId: row.student_id,
  projectId: row.project_id ?? null,
  status: row.status,
  currentStageId: row.current_stage_id ?? null,
  startedAt: row.started_at,
  pausedAt: row.paused_at ?? null,
  completedAt: row.completed_at ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const mapInstanceTask = (row) => ({
  id: row.id,
  instanceId: row.instance_id,
  stageId: row.stage_id ?? null,
  templateTaskId: row.template_task_id ?? null,
  title: row.title,
  description: row.description ?? '',
  taskType: row.task_type ?? 'general',
  status: row.status,
  orderIndex: row.order_index ?? 0,
  deadline: row.deadline ?? null,
  requiresApproval: Boolean(row.requires_approval),
  studentSubmission: row.student_submission ?? null,
  submittedAt: row.submitted_at ?? null,
  coachFeedback: row.coach_feedback ?? null,
  approvedAt: row.approved_at ?? null,
  approvedBy: row.approved_by ?? null,
  qualityScore: row.quality_score ?? null,
  performanceData: row.performance_data ?? {},
  timeSpentMinutes: row.time_spent_minutes ?? null,
  autoAdvanced: Boolean(row.auto_advanced),
  skipReason: row.skip_reason ?? null,
  submissionAttempts: row.submission_attempts ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export function ProgramManagementProvider({ children }) {
  const { currentUser } = useAuth()

  const [hydrated, setHydrated] = useState(false)
  const [busy, setBusy] = useState(false)

  const [templates, setTemplates] = useState([])
  const [templateDetailsById, setTemplateDetailsById] = useState({})
  const [instances, setInstances] = useState([])
  const [instanceDetailsById, setInstanceDetailsById] = useState({})

  const instanceChannelRef = useRef(null)

  const fetchTemplates = useCallback(async () => {
    setBusy(true)
    try {
      const { data, error } = await supabase
        .from('program_templates')
        .select('*')
        .order('updated_at', { ascending: false })
      if (error) throw error
      setTemplates((data ?? []).map(mapTemplate))
    } catch (err) {
      // Silence legacy table 404s
      if (!String(err?.message || '').toLowerCase().includes('relation') && !String(err?.message || '').toLowerCase().includes('not find the table')) {
        console.warn('Error fetching templates:', err)
      }
    } finally {
      setBusy(false)
    }
  }, [])

  const fetchTemplateDetails = useCallback(async (templateId) => {
    if (!templateId) return null

    const stagesRes = await supabase
      .from('program_template_stages')
      .select('*')
      .eq('template_id', templateId)
      .order('order_index', { ascending: true })
    if (stagesRes.error) throw stagesRes.error

    const stages = (stagesRes.data ?? []).map(mapStage)
    const stageIds = stages.map((s) => s.id)

    if (stageIds.length === 0) {
      const details = { templateId, stages: [], contents: [], taskTemplates: [] }
      setTemplateDetailsById((prev) => ({ ...prev, [templateId]: details }))
      return details
    }

    const [contentsRes, taskTemplatesRes] = await Promise.all([
      supabase
        .from('program_template_contents')
        .select('*')
        .in('stage_id', stageIds)
        .order('order_index', { ascending: true }),
      supabase
        .from('program_task_templates')
        .select('*')
        .in('stage_id', stageIds)
        .order('order_index', { ascending: true }),
    ])

    if (contentsRes.error) throw contentsRes.error
    if (taskTemplatesRes.error) throw taskTemplatesRes.error

    const stageOrderById = new Map(stages.map((s) => [s.id, s.orderIndex]))

    const contents = (contentsRes.data ?? [])
      .map(mapContent)
      .sort((a, b) => {
        const sa = stageOrderById.get(a.stageId) ?? 0
        const sb = stageOrderById.get(b.stageId) ?? 0
        if (sa !== sb) return sa - sb
        return (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
      })

    const taskTemplates = (taskTemplatesRes.data ?? [])
      .map(mapTaskTemplate)
      .sort((a, b) => {
        const sa = stageOrderById.get(a.stageId) ?? 0
        const sb = stageOrderById.get(b.stageId) ?? 0
        if (sa !== sb) return sa - sb
        return (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
      })

    const details = { templateId, stages, contents, taskTemplates }
    setTemplateDetailsById((prev) => ({ ...prev, [templateId]: details }))
    return details
  }, [])

  const upsertTemplate = useCallback(async ({ id, name, description, isActive } = {}) => {
    if (!name) throw new Error('Template name is required')
    const payload = {
      ...(id ? { id } : {}),
      name,
      description: description ?? null,
      is_active: typeof isActive === 'boolean' ? isActive : true,
      created_by: currentUser?.id ?? null,
    }

    const { data, error } = await supabase
      .from('program_templates')
      .upsert(payload)
      .select('*')
      .single()

    if (error) throw error
    const mapped = mapTemplate(data)
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== mapped.id)
      return [mapped, ...next]
    })
    return mapped
  }, [currentUser?.id])

  const deleteTemplate = useCallback(async (templateId) => {
    const { error } = await supabase.from('program_templates').delete().eq('id', templateId)
    if (error) throw error
    setTemplates((prev) => prev.filter((t) => t.id !== templateId))
    setTemplateDetailsById((prev) => {
      const next = { ...prev }
      delete next[templateId]
      return next
    })
  }, [])

  const addStage = useCallback(async ({ templateId, name, description, orderIndex } = {}) => {
    if (!templateId) throw new Error('templateId required')
    if (!name) throw new Error('Stage name required')

    const { data, error } = await supabase
      .from('program_template_stages')
      .insert({ template_id: templateId, name, description: description ?? null, order_index: orderIndex ?? 0 })
      .select('*')
      .single()

    if (error) throw error

    const stage = mapStage(data)
    setTemplateDetailsById((prev) => {
      const details = prev[templateId] ?? { templateId, stages: [], contents: [], taskTemplates: [] }
      return { ...prev, [templateId]: { ...details, stages: [...details.stages, stage].sort((a, b) => a.orderIndex - b.orderIndex) } }
    })

    return stage
  }, [])

  const addContentItem = useCallback(async ({ stageId, contentType, title, url, description, provider, durationMinutes, orderIndex, meta } = {}) => {
    if (!stageId) throw new Error('stageId required')
    if (!contentType) throw new Error('contentType required')
    if (!title) throw new Error('title required')
    if (!url) throw new Error('url required')

    const { data, error } = await supabase
      .from('program_template_contents')
      .insert({
        stage_id: stageId,
        content_type: contentType,
        title,
        description: description ?? null,
        url,
        provider: provider ?? null,
        duration_minutes: durationMinutes ?? null,
        order_index: orderIndex ?? 0,
        meta: meta ?? {},
      })
      .select('*')
      .single()

    if (error) throw error

    const item = mapContent(data)
    setTemplateDetailsById((prev) => {
      const next = { ...prev }
      for (const templateId of Object.keys(next)) {
        const details = next[templateId]
        if (!details) continue
        if (!details.stages?.some((s) => s.id === stageId)) continue
        next[templateId] = {
          ...details,
          contents: [...details.contents, item].sort((a, b) => (a.stageId === b.stageId ? a.orderIndex - b.orderIndex : 0)),
        }
      }
      return next
    })

    return item
  }, [])

  const addTaskTemplate = useCallback(async ({ stageId, title, description, taskType, orderIndex, dueOffsetDays, requiresApproval, meta } = {}) => {
    if (!stageId) throw new Error('stageId required')
    if (!title) throw new Error('title required')

    const { data, error } = await supabase
      .from('program_task_templates')
      .insert({
        stage_id: stageId,
        title,
        description: description ?? null,
        task_type: taskType ?? 'general',
        order_index: orderIndex ?? 0,
        due_offset_days: dueOffsetDays ?? null,
        requires_approval: typeof requiresApproval === 'boolean' ? requiresApproval : true,
        meta: meta ?? {},
      })
      .select('*')
      .single()

    if (error) throw error

    const tt = mapTaskTemplate(data)
    setTemplateDetailsById((prev) => {
      const next = { ...prev }
      for (const templateId of Object.keys(next)) {
        const details = next[templateId]
        if (!details) continue
        if (!details.stages?.some((s) => s.id === stageId)) continue
        next[templateId] = {
          ...details,
          taskTemplates: [...details.taskTemplates, tt].sort((a, b) => (a.stageId === b.stageId ? a.orderIndex - b.orderIndex : 0)),
        }
      }
      return next
    })

    return tt
  }, [])

  const deleteStage = useCallback(async ({ templateId, stageId } = {}) => {
    if (!templateId) throw new Error('templateId required')
    if (!stageId) throw new Error('stageId required')

    const { error } = await supabase.from('program_template_stages').delete().eq('id', stageId)
    if (error) throw error

    setTemplateDetailsById((prev) => {
      const details = prev[templateId]
      if (!details) return prev
      const next = { ...prev }
      next[templateId] = {
        ...details,
        stages: (details.stages ?? []).filter((s) => s.id !== stageId),
        contents: (details.contents ?? []).filter((c) => c.stageId !== stageId),
        taskTemplates: (details.taskTemplates ?? []).filter((t) => t.stageId !== stageId),
      }
      return next
    })
  }, [])

  const deleteContentItem = useCallback(async ({ contentId } = {}) => {
    if (!contentId) throw new Error('contentId required')
    const { error } = await supabase.from('program_template_contents').delete().eq('id', contentId)
    if (error) throw error

    setTemplateDetailsById((prev) => {
      const next = { ...prev }
      for (const templateId of Object.keys(next)) {
        const details = next[templateId]
        if (!details) continue
        if (!(details.contents ?? []).some((c) => c.id === contentId)) continue
        next[templateId] = { ...details, contents: (details.contents ?? []).filter((c) => c.id !== contentId) }
      }
      return next
    })
  }, [])

  const deleteTaskTemplate = useCallback(async ({ taskTemplateId } = {}) => {
    if (!taskTemplateId) throw new Error('taskTemplateId required')
    const { error } = await supabase.from('program_task_templates').delete().eq('id', taskTemplateId)
    if (error) throw error

    setTemplateDetailsById((prev) => {
      const next = { ...prev }
      for (const templateId of Object.keys(next)) {
        const details = next[templateId]
        if (!details) continue
        if (!(details.taskTemplates ?? []).some((t) => t.id === taskTemplateId)) continue
        next[templateId] = { ...details, taskTemplates: (details.taskTemplates ?? []).filter((t) => t.id !== taskTemplateId) }
      }
      return next
    })
  }, [])

  const fetchMyInstances = useCallback(async () => {
    if (!currentUser?.id) {
      setInstances([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('program_instances')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      const mapped = (data ?? []).map(mapInstance)
      setInstances(mapped)
      return mapped
    } catch (err) {
      // Silence legacy table 404s
      if (!String(err?.message || '').toLowerCase().includes('relation') && !String(err?.message || '').toLowerCase().includes('not find the table')) {
        console.warn('Error fetching instances:', err)
      }
      return []
    }
  }, [currentUser?.id])

  const fetchInstanceDetails = useCallback(async (instanceId) => {
    if (!instanceId) return null

    const [instanceRes, tasksRes] = await Promise.all([
      supabase.from('program_instances').select('*').eq('id', instanceId).single(),
      supabase
        .from('program_instance_tasks')
        .select('*')
        .eq('instance_id', instanceId)
        .order('order_index', { ascending: true }),
    ])

    if (instanceRes.error) throw instanceRes.error
    if (tasksRes.error) throw tasksRes.error

    const instance = mapInstance(instanceRes.data)
    const tasks = (tasksRes.data ?? []).map(mapInstanceTask)

    const details = { instance, tasks }
    setInstanceDetailsById((prev) => ({ ...prev, [instanceId]: details }))
    return details
  }, [])

  const createInstanceFromTemplate = useCallback(async ({ templateId, projectId } = {}) => {
    if (!templateId) throw new Error('templateId required')
    const { data, error } = await supabase.rpc('create_program_instance', {
      p_template_id: templateId,
      p_project_id: projectId ?? null,
    })
    if (error) throw error

    const instanceId = data
    await fetchMyInstances()
    if (instanceId) await fetchInstanceDetails(instanceId)
    return instanceId
  }, [fetchInstanceDetails, fetchMyInstances])

  const submitInstanceTask = useCallback(async ({ taskId, submission } = {}) => {
    if (!taskId) throw new Error('taskId required')
    const { error } = await supabase.rpc('submit_program_instance_task', {
      p_task_id: taskId,
      p_submission: submission ?? {},
    })
    if (error) throw error

    // refresh task list
    const details = instanceDetailsById
    const instanceId = Object.keys(details).find((id) => details[id]?.tasks?.some((t) => t.id === taskId))
    if (instanceId) await fetchInstanceDetails(instanceId)
  }, [fetchInstanceDetails, instanceDetailsById])

  const approveInstanceTask = useCallback(async ({ taskId, feedback, approved } = {}) => {
    if (!taskId) throw new Error('taskId required')
    const { error } = await supabase.rpc('approve_program_instance_task', {
      p_task_id: taskId,
      p_feedback: feedback ?? null,
      p_approved: typeof approved === 'boolean' ? approved : true,
    })
    if (error) throw error

    const details = instanceDetailsById
    const instanceId = Object.keys(details).find((id) => details[id]?.tasks?.some((t) => t.id === taskId))
    if (instanceId) await fetchInstanceDetails(instanceId)
  }, [fetchInstanceDetails, instanceDetailsById])

  const reorderInstanceTasks = useCallback(async ({ instanceId, orderedTaskIds } = {}) => {
    if (!instanceId) throw new Error('instanceId required')
    if (!Array.isArray(orderedTaskIds) || orderedTaskIds.length === 0) return

    const { error } = await supabase.rpc('reorder_program_instance_tasks', {
      p_instance_id: instanceId,
      p_task_ids: orderedTaskIds,
    })

    if (error) throw error
    await fetchInstanceDetails(instanceId)
  }, [fetchInstanceDetails])

  const advanceInstanceStage = useCallback(async ({ instanceId, stageId } = {}) => {
    if (!instanceId) throw new Error('instanceId required')
    if (!stageId) throw new Error('stageId required')

    const { error } = await supabase.rpc('advance_program_instance_stage', {
      p_instance_id: instanceId,
      p_stage_id: stageId,
    })

    if (error) throw error
    await fetchInstanceDetails(instanceId)
  }, [fetchInstanceDetails])

  const injectTask = useCallback(async ({ instanceId, stageId, title, description, taskType, deadline, requiresApproval } = {}) => {
    if (!instanceId) throw new Error('instanceId required')
    if (!stageId) throw new Error('stageId required')
    if (!title) throw new Error('title required')

    const { data, error } = await supabase.rpc('inject_program_instance_task', {
      p_instance_id: instanceId,
      p_stage_id: stageId,
      p_title: title,
      p_description: description ?? null,
      p_task_type: taskType ?? 'general',
      p_deadline: deadline ?? null,
      p_requires_approval: typeof requiresApproval === 'boolean' ? requiresApproval : true,
    })

    if (error) throw error
    await fetchInstanceDetails(instanceId)
    return data
  }, [fetchInstanceDetails])

  const extendTaskDeadline = useCallback(async ({ taskId, deadline } = {}) => {
    if (!taskId) throw new Error('taskId required')
    if (!deadline) throw new Error('deadline required')

    const { error } = await supabase.rpc('extend_program_instance_task_deadline', {
      p_task_id: taskId,
      p_deadline: deadline,
    })

    if (error) throw error

    const details = instanceDetailsById
    const instanceId = Object.keys(details).find((id) => details[id]?.tasks?.some((t) => t.id === taskId))
    if (instanceId) await fetchInstanceDetails(instanceId)
  }, [fetchInstanceDetails, instanceDetailsById])

  const fetchStudentAnalytics = useCallback(async (instanceId) => {
    if (!instanceId) return null
    const { data, error } = await supabase
      .from('student_progress_analytics')
      .select('*')
      .eq('instance_id', instanceId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.warn('Error fetching student analytics:', error)
      return null
    }

    if (!data) return null

    const mapped = {
      id: data.id,
      instanceId: data.instance_id,
      studentId: data.student_id,
      completionPercentage: data.completion_percentage,
      tasksTotal: data.tasks_total,
      tasksCompleted: data.tasks_completed,
      tasksInProgress: data.tasks_in_progress,
      averageQualityScore: data.average_quality_score,
      averageTimePerTaskMinutes: data.average_time_per_task_minutes,
      onTimeCompletionRate: data.on_time_completion_rate,
      strengthAreas: data.strength_areas ?? [],
      weaknessAreas: data.weakness_areas ?? [],
      predictedCompletionDate: data.predicted_completion_date,
      currentPaceTasksPerWeek: data.current_pace_tasks_per_week,
      bottleneckTasks: data.bottleneck_tasks ?? [],
      lastCalculatedAt: data.last_calculated_at,
    }

    return mapped
  }, [])

  const recalculateAnalytics = useCallback(async (instanceId) => {
    if (!instanceId) return null
    const { data, error } = await supabase.rpc('calculate_student_progress_analytics', {
      p_instance_id: instanceId,
    })
    if (error) {
      console.error('Error recalculating analytics:', error)
      throw error
    }
    return data
  }, [])

  const subscribeToInstanceTasks = useCallback(
    async (instanceId) => {
      if (!instanceId) return

      if (instanceChannelRef.current) {
        supabase.removeChannel(instanceChannelRef.current)
        instanceChannelRef.current = null
      }

      const channel = supabase
        .channel(`program_instance_tasks:${instanceId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'program_instance_tasks', filter: `instance_id=eq.${instanceId}` },
          () => {
            fetchInstanceDetails(instanceId).catch(() => { })
          },
        )
        .subscribe()

      instanceChannelRef.current = channel
    },
    [fetchInstanceDetails],
  )

  useEffect(() => {
    // Hydrate base lists when authenticated user changes
    if (!currentUser?.id) {
      setHydrated(true)
      setTemplates([])
      setInstances([])
      return
    }

    let cancelled = false
      ; (async () => {
        try {
          await Promise.all([fetchTemplates(), fetchMyInstances()])
        } catch {
          // ignore; UI will surface via toasts at call sites
        } finally {
          if (!cancelled) setHydrated(true)
        }
      })()

    return () => {
      cancelled = true
    }
  }, [currentUser?.id, fetchMyInstances, fetchTemplates])

  useEffect(() => {
    return () => {
      if (instanceChannelRef.current) supabase.removeChannel(instanceChannelRef.current)
      instanceChannelRef.current = null
    }
  }, [])

  const value = useMemo(
    () => ({
      hydrated,
      busy,
      templates,
      templateDetailsById,
      instances,
      instanceDetailsById,
      fetchTemplates,
      fetchTemplateDetails,
      upsertTemplate,
      deleteTemplate,
      addStage,
      addContentItem,
      addTaskTemplate,
      deleteStage,
      deleteContentItem,
      deleteTaskTemplate,
      fetchMyInstances,
      fetchInstanceDetails,
      createInstanceFromTemplate,
      submitInstanceTask,
      approveInstanceTask,
      reorderInstanceTasks,
      advanceInstanceStage,
      injectTask,
      extendTaskDeadline,
      fetchStudentAnalytics,
      recalculateAnalytics,
      subscribeToInstanceTasks,
    }),
    [
      hydrated,
      busy,
      templates,
      templateDetailsById,
      instances,
      instanceDetailsById,
      fetchTemplates,
      fetchTemplateDetails,
      upsertTemplate,
      deleteTemplate,
      addStage,
      addContentItem,
      addTaskTemplate,
      deleteStage,
      deleteContentItem,
      deleteTaskTemplate,
      fetchMyInstances,
      fetchInstanceDetails,
      createInstanceFromTemplate,
      submitInstanceTask,
      approveInstanceTask,
      reorderInstanceTasks,
      advanceInstanceStage,
      injectTask,
      extendTaskDeadline,
      fetchStudentAnalytics,
      recalculateAnalytics,
      subscribeToInstanceTasks,
    ],
  )

  return <ProgramManagementContext.Provider value={value}>{children}</ProgramManagementContext.Provider>
}
