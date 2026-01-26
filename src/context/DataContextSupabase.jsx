import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { makeId } from '../utils/ids'
import { DataContext } from './DataContextBase'
import {
  ProjectSubmissionType,
  SubmissionStatus,
  canAddNonIdeaSubmissions,
  normalizeStage,
  validateIdeaPayload,
} from '../models/projects'
import { TaskStatus, TaskType, normalizeTaskStatus, normalizeTaskType } from '../models/tasks'

export function DataProvider({ children }) {
  const [hydrated, setHydrated] = useState(false)
  const [authUserId, setAuthUserId] = useState(null)
  const notificationsChannelRef = useRef(null)
  const tasksChannelRef = useRef(null)
  const messagesChannelRef = useRef({ inbox: null, outbox: null })
  const presenceChannelRef = useRef(null)
  const projectsChannelRef = useRef(null)

  const [presence, setPresence] = useState({})
  const [data, setData] = useState({
    users: [],
    programs: [],
    applications: [],
    coachingSessions: [],
    deliverables: [],
    messages: [],
    messageDeletions: [],
    projects: [],
    projectSubmissions: [],
    notifications: [],
    tasks: [],
  })

  const mapProgram = useCallback((p) => {
    const coachIds = p.program_coaches?.map((pc) => pc.coach_id) || []
    const participantStudentIds = p.program_participants?.map((pp) => pp.student_id) || []
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      durationWeeks: p.duration_weeks,
      startDate: p.start_date,
      endDate: p.end_date,
      capacity: p.capacity,
      status: p.status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      coachIds,
      participantStudentIds,
    }
  }, [])

  const mapApplication = useCallback((a) => {
    return {
      id: a.id,
      programId: a.program_id,
      studentId: a.student_id,
      status: a.status,
      motivation: a.motivation,
      decisionNote: a.decision_note,
      reviewedBy: a.reviewed_by,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }
  }, [])

  const mapCoachingSession = useCallback((s) => {
    const attendeeStudentIds = s.session_attendees?.map((sa) => sa.student_id) || []
    return {
      id: s.id,
      programId: s.program_id,
      coachId: s.coach_id,
      title: s.title,
      description: s.description,
      startsAt: s.starts_at,
      endsAt: s.ends_at,
      location: s.location,
      status: s.status,
      notes: s.notes,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      attendeeStudentIds,
      attendance: s.session_attendees || [],
    }
  }, [])

  const mapSubmission = useCallback((sub) => {
    return {
      id: sub.id,
      deliverableId: sub.deliverable_id,
      studentId: sub.student_id,
      status: sub.status,
      submittedAt: sub.submitted_at,
      files: sub.files,
      grade: sub.grade,
      feedback: sub.feedback,
      reviewedAt: sub.reviewed_at,
      reviewerId: sub.reviewer_id,
      createdAt: sub.created_at,
      updatedAt: sub.updated_at,
    }
  }, [])

  const mapDeliverable = useCallback(
    (d) => {
      const assignedStudentIds = d.deliverable_assignments?.map((da) => da.student_id) || []
      const submissions = (d.submissions || []).map(mapSubmission)
      return {
        id: d.id,
        programId: d.program_id,
        title: d.title,
        description: d.description,
        dueDate: d.due_date,
        maxScore: d.max_score,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        assignedStudentIds,
        submissions,
      }
    },
    [mapSubmission],
  )

  const mapMessage = useCallback((m) => {
    return {
      id: m.id,
      senderId: m.sender_id,
      receiverId: m.recipient_id,
      subject: m.subject,
      content: m.body,
      sentAt: m.created_at,
      readAt: m.seen_at || (m.read ? m.updated_at ?? m.created_at : null),
      seenAt: m.seen_at,
    }
  }, [])

  const mapMessageDeletion = useCallback((row) => {
    return {
      id: row.id,
      userId: row.user_id,
      messageId: row.message_id,
      deletedAt: row.deleted_at,
    }
  }, [])

  const mapNotification = useCallback((n) => {
    return {
      id: n.id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      message: n.message,
      linkUrl: n.link_url,
      meta: n.meta,
      createdAt: n.created_at,
      readAt: n.read_at,
    }
  }, [])

  const mapTaskRow = useCallback((t) => {
    return {
      id: t.id,
      projectId: t.project_id,
      submissionId: t.submission_id ?? null,
      title: t.title,
      description: t.description ?? null,
      taskType: normalizeTaskType(t.task_type),
      status: normalizeTaskStatus(t.status),
      deadline: t.deadline ?? null,
      checklistItems: t.checklist_items ?? null,
      studentSubmission: t.student_submission ?? null,
      coachFeedback: t.coach_feedback ?? null,
      createdBy: t.created_by,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      submittedAt: t.submitted_at ?? null,
      reviewedAt: t.reviewed_at ?? null,
      reviewedBy: t.reviewed_by ?? null,
    }
  }, [])

  const mapProjectRow = useCallback((p) => {
    return {
      id: p.id,
      studentId: p.student_id,
      title: p.title,
      stage: p.stage,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }
  }, [])

  const mapProjectSubmissionRow = useCallback((s) => {
    return {
      id: s.id,
      projectId: s.project_id,
      type: s.type,
      status: s.status,
      payload: s.payload,
      comments: s.comments,
      reviewerId: s.reviewer_id,
      reviewedAt: s.reviewed_at,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }
  }, [])

  const isMissingTableError = useCallback((err) => {
    const code = err?.code
    const msg = String(err?.message ?? '')
    if (code === '42P01') return true // postgres undefined_table

    // PostgREST can surface these as plain messages.
    const normalized = msg.toLowerCase()
    if (normalized.includes('could not find the table')) return true
    if (normalized.includes('relation') && normalized.includes('does not exist')) return true
    if (normalized.includes('schema cache') && normalized.includes('projects')) return true
    if (normalized.includes('schema cache') && normalized.includes('project_submissions')) return true

    return false
  }, [])

  const mapPresenceRow = useCallback((row) => {
    return {
      userId: row.user_id,
      online: Boolean(row.online),
      lastSeenAt: row.last_seen_at,
      updatedAt: row.updated_at,
    }
  }, [])

  const fetchAllData = useCallback(async () => {
    try {
      // Fetch all data in parallel
      const [
        usersRes,
        programsRes,
        applicationsRes,
        sessionsRes,
        deliverablesRes,
        messagesRes,
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('programs').select(`
          *,
          program_coaches(coach_id),
          program_participants(student_id)
        `),
        supabase.from('applications').select('*'),
        supabase.from('coaching_sessions').select(`
          *,
          session_attendees(student_id, attendance_status)
        `),
        supabase.from('deliverables').select(`
          *,
          deliverable_assignments(student_id),
          submissions(*)
        `),
        supabase.from('messages').select('*'),
      ])

      // 1. Fetch message deletions (for "delete for me")
      let messageDeletions = []
      try {
        const { data: delData } = await supabase.from('message_deletions').select('*')
        messageDeletions = (delData || []).map(mapMessageDeletion)
      } catch (err) {
        // table might not exist in old schema
        console.warn('Could not fetch message_deletions', err)
      }

      // Transform data to match mock data structure (camelCase)
      const programs = (programsRes.data || []).map(mapProgram)
      const applications = (applicationsRes.data || []).map(mapApplication)
      const sessions = (sessionsRes.data || []).map(mapCoachingSession)
      const deliverables = (deliverablesRes.data || []).map(mapDeliverable)
      const messages = (messagesRes.data || []).map(mapMessage)

      // 2. Fetch projects & submissions from Supabase.
      let projects = []
      let projectSubmissions = []
      try {
        const [projectsRes, submissionsRes] = await Promise.all([
          supabase.from('projects').select('*').order('updated_at', { ascending: false }),
          supabase.from('project_submissions').select('*').order('created_at', { ascending: true }),
        ])

        if (projectsRes.error) throw projectsRes.error
        if (submissionsRes.error) throw submissionsRes.error

        projects = (projectsRes.data ?? []).map(mapProjectRow)
        projectSubmissions = (submissionsRes.data ?? []).map(mapProjectSubmissionRow)
      } catch (err) {
        console.error('Could not fetch projects from Supabase:', err)
        projects = []
        projectSubmissions = []
      }

      let notifications = []
      try {
        const { data: ntfData, error: ntfError } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })

        if (!ntfError && Array.isArray(ntfData)) {
          notifications = ntfData.map(mapNotification)
        }
      } catch {
        // notifications table may not exist yet; ignore
      }

      let tasks = []
      try {
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false })

        if (!tasksError && Array.isArray(tasksData)) {
          tasks = tasksData.map(mapTaskRow)
        }
      } catch (err) {
        console.warn('Could not fetch tasks from Supabase:', err)
      }

      setData({
        users: usersRes.data || [],
        programs,
        applications,
        coachingSessions: sessions,
        deliverables,
        messages,
        messageDeletions,
        projects,
        projectSubmissions,
        notifications,
        tasks,
      })

      setHydrated(true)
    } catch (error) {
      console.error('Error fetching data:', error)
      setHydrated(true)
    }
  }, [mapApplication, mapCoachingSession, mapDeliverable, mapMessage, mapMessageDeletion, mapNotification, mapProgram, mapProjectRow, mapProjectSubmissionRow, mapTaskRow])

  const refreshProjects = useCallback(async () => {
    try {
      const [projectsRes, submissionsRes] = await Promise.all([
        supabase.from('projects').select('*').order('updated_at', { ascending: false }),
        supabase.from('project_submissions').select('*').order('created_at', { ascending: true }),
      ])

      if (projectsRes.error) throw projectsRes.error
      if (submissionsRes.error) throw submissionsRes.error

      const projects = (projectsRes.data ?? []).map(mapProjectRow)
      const projectSubmissions = (submissionsRes.data ?? []).map(mapProjectSubmissionRow)

      setData((prev) => ({ ...prev, projects, projectSubmissions }))
      return { success: true }
    } catch (err) {
      if (isMissingTableError(err)) {
        return { success: false, error: err, missingTable: true }
      }
      return { success: false, error: err }
    }
  }, [isMissingTableError, mapProjectRow, mapProjectSubmissionRow])

  // Initial data fetch & Refetch on Auth Change
  useEffect(() => {
    if (authUserId) {
        fetchAllData()
    } else {
        // Optional: clear data on logout to be safe
        // setData(prev => ({ ...prev, messages: [], deliverables: [], users: [] }))
    }
  }, [fetchAllData, authUserId])

  // Realtime: projects + submissions
  useEffect(() => {
    if (!authUserId) return

    let channel
    try {
      channel = supabase
        .channel('realtime-projects')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'projects' },
          (payload) => {
            setData((prev) => {
              const current = prev.projects ?? []
              const eventType = payload.eventType
              if (eventType === 'DELETE') {
                const id = payload.old?.id
                return { ...prev, projects: current.filter((p) => p.id !== id) }
              }
              const mapped = payload.new ? mapProjectRow(payload.new) : null
              if (!mapped) return prev
              const exists = current.some((p) => p.id === mapped.id)
              if (eventType === 'INSERT' && !exists) {
                return { ...prev, projects: [mapped, ...current] }
              }
              if (eventType === 'UPDATE' && exists) {
                return { ...prev, projects: current.map((p) => (p.id === mapped.id ? mapped : p)) }
              }
              if (!exists) {
                return { ...prev, projects: [mapped, ...current] }
              }
              return prev
            })
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'project_submissions' },
          (payload) => {
            setData((prev) => {
              const current = prev.projectSubmissions ?? []
              const eventType = payload.eventType
              if (eventType === 'DELETE') {
                const id = payload.old?.id
                return { ...prev, projectSubmissions: current.filter((s) => s.id !== id) }
              }
              const mapped = payload.new ? mapProjectSubmissionRow(payload.new) : null
              if (!mapped) return prev
              const exists = current.some((s) => s.id === mapped.id)
              if (eventType === 'INSERT' && !exists) {
                return { ...prev, projectSubmissions: [...current, mapped] }
              }
              if (eventType === 'UPDATE' && exists) {
                return { ...prev, projectSubmissions: current.map((s) => (s.id === mapped.id ? mapped : s)) }
              }
              if (!exists) {
                return { ...prev, projectSubmissions: [...current, mapped] }
              }
              return prev
            })
          },
        )
        .subscribe()

      projectsChannelRef.current = channel
    } catch (err) {
      console.warn('Projects realtime channel setup failed:', err)
    }

    return () => {
      try {
        if (projectsChannelRef.current) {
          supabase.removeChannel(projectsChannelRef.current)
          projectsChannelRef.current = null
        }
      } catch {
        // ignore
      }
    }
  }, [authUserId, mapProjectRow, mapProjectSubmissionRow])

  // Realtime: tasks
  useEffect(() => {
    if (tasksChannelRef.current) {
      supabase.removeChannel(tasksChannelRef.current)
      tasksChannelRef.current = null
    }

    if (!authUserId) return

    const channel = supabase
      .channel('realtime-tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          setData((prev) => {
            const current = prev.tasks ?? []
            const eventType = payload.eventType

            if (eventType === 'DELETE') {
              const id = payload.old?.id
              return { ...prev, tasks: current.filter((t) => t.id !== id) }
            }

            const mapped = payload.new ? mapTaskRow(payload.new) : null
            if (!mapped) return prev

            const exists = current.some((t) => t.id === mapped.id)
            if (eventType === 'INSERT' && !exists) {
              return { ...prev, tasks: [mapped, ...current] }
            }
            if (eventType === 'UPDATE' && exists) {
              return { ...prev, tasks: current.map((t) => (t.id === mapped.id ? mapped : t)) }
            }
            if (!exists) {
              return { ...prev, tasks: [mapped, ...current] }
            }
            return prev
          })
        },
      )
      .subscribe()

    tasksChannelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
      if (tasksChannelRef.current === channel) tasksChannelRef.current = null
    }
  }, [authUserId, mapTaskRow])

  // Track Supabase auth user (DataProvider lives outside AuthProvider)
  useEffect(() => {
    let alive = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return
      setAuthUserId(session?.user?.id ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return
      setAuthUserId(session?.user?.id ?? null)
    })

    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [])

  // ===================
  // PRESENCE (online/last seen)
  // ===================

  const refreshPresence = useCallback(async () => {
    try {
      const { data: rows, error } = await supabase.from('user_presence').select('*')
      if (error) return { success: false, error }

      const next = {}
      ;(rows ?? []).forEach((r) => {
        const mapped = mapPresenceRow(r)
        next[mapped.userId] = mapped
      })
      setPresence(next)
      return { success: true }
    } catch (e) {
      return { success: false, error: e }
    }
  }, [mapPresenceRow])

  // Heartbeat: keep my presence fresh so others can see I'm online.
  useEffect(() => {
    if (!authUserId) return

    let stopped = false

    const upsertOnline = async () => {
      try {
        const now = new Date().toISOString()
        await supabase
          .from('user_presence')
          .upsert({ user_id: authUserId, online: true, last_seen_at: now }, { onConflict: 'user_id' })
      } catch {
        // non-blocking; table may not exist yet
      }
    }

    const setOffline = async () => {
      try {
        const now = new Date().toISOString()
        await supabase
          .from('user_presence')
          .upsert({ user_id: authUserId, online: false, last_seen_at: now }, { onConflict: 'user_id' })
      } catch {
        // ignore
      }
    }

    upsertOnline()
    const id = window.setInterval(() => {
      if (stopped) return
      upsertOnline()
    }, 20000)

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        setOffline()
      } else {
        upsertOnline()
      }
    }

    window.addEventListener('beforeunload', setOffline)
    document.addEventListener('visibilitychange', onVis)

    return () => {
      stopped = true
      window.clearInterval(id)
      window.removeEventListener('beforeunload', setOffline)
      document.removeEventListener('visibilitychange', onVis)
      setOffline()
    }
  }, [authUserId])

  // Realtime presence subscription
  useEffect(() => {
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current)
      presenceChannelRef.current = null
    }

    if (!authUserId) return

    refreshPresence()

    const channel = supabase
      .channel('user_presence')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        (payload) => {
          const row = payload?.new
          if (!row) return
          const mapped = mapPresenceRow(row)
          setPresence((prev) => ({ ...prev, [mapped.userId]: mapped }))
        },
      )
      .subscribe()

    presenceChannelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
      if (presenceChannelRef.current === channel) presenceChannelRef.current = null
    }
  }, [authUserId, mapPresenceRow, refreshPresence])

  // ===================
  // GETTER FUNCTIONS
  // ===================

  // ===================
  // NOTIFICATIONS
  // ===================

  const listNotifications = useCallback(({ userId, unreadOnly, limit } = {}) => {
    const all = data.notifications ?? []
    let filtered = userId ? all.filter((n) => n.userId === userId) : all
    if (unreadOnly) filtered = filtered.filter((n) => !n.readAt)
    filtered = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    if (limit && Number.isFinite(limit)) filtered = filtered.slice(0, Math.max(0, limit))
    return filtered
  }, [data.notifications])

  const listStaffUserIds = useCallback(() => {
    return (data.users ?? [])
      .filter((u) => u?.role === 'admin' || u?.role === 'coach')
      .map((u) => u.id)
      .filter(Boolean)
  }, [data.users])

  const refreshNotifications = useCallback(async () => {
    try {
      const { data: ntfData, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) return { success: false, error }
      const mapped = (ntfData ?? []).map(mapNotification)
      setData((prev) => ({ ...prev, notifications: mapped }))
      return { success: true }
    } catch (e) {
      return { success: false, error: e }
    }
  }, [mapNotification])

  // Realtime notifications (INSERT/UPDATE) for the logged-in user.
  // Requires: notifications table exists + added to supabase_realtime publication.
  useEffect(() => {
    // Always clean up previous subscription (also helps with React StrictMode double-invocation in dev)
    if (notificationsChannelRef.current) {
      supabase.removeChannel(notificationsChannelRef.current)
      notificationsChannelRef.current = null
    }

    if (!authUserId) return

    // Initial sync (non-fatal if table doesn't exist yet)
    refreshNotifications()

    const channel = supabase
      .channel(`notifications:${authUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${authUserId}`,
        },
        (payload) => {
          if (!payload?.new) return
          const mapped = mapNotification(payload.new)
          setData((prev) => {
            const existing = prev.notifications ?? []
            if (existing.some((n) => n.id === mapped.id)) return prev
            return { ...prev, notifications: [mapped, ...existing] }
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${authUserId}`,
        },
        (payload) => {
          if (!payload?.new) return
          const mapped = mapNotification(payload.new)
          setData((prev) => {
            const existing = prev.notifications ?? []
            const next = existing.map((n) => (n.id === mapped.id ? { ...n, ...mapped } : n))
            return { ...prev, notifications: next }
          })
        },
      )

      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Ensure we have a clean baseline after subscription.
          refreshNotifications().catch(() => {})
        }
        if (status === 'CHANNEL_ERROR') {
          console.warn('[Notifications] Realtime channel error. Ensure notifications is in supabase_realtime publication and policies allow SELECT.', {
            userId: authUserId,
          })
        }
      })

    notificationsChannelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      if (notificationsChannelRef.current === channel) {
        notificationsChannelRef.current = null
      }
    }
  }, [authUserId, mapNotification, refreshNotifications])

  // ===================
  // MESSAGES (Realtime)
  // ===================

  useEffect(() => {
    // Cleanup existing channels
    if (messagesChannelRef.current?.inbox) {
      supabase.removeChannel(messagesChannelRef.current.inbox)
      messagesChannelRef.current.inbox = null
    }
    if (messagesChannelRef.current?.outbox) {
      supabase.removeChannel(messagesChannelRef.current.outbox)
      messagesChannelRef.current.outbox = null
    }

    if (!authUserId) return

    const onUpsert = (payload) => {
      const eventType = payload?.eventType

      // Handle DELETE so "delete for everyone" removes the message in realtime
      if (eventType === 'DELETE') {
        const oldRow = payload?.old
        const deletedId = oldRow?.id
        if (!deletedId) return
        setData((prev) => ({
          ...prev,
          messages: (prev.messages ?? []).filter((m) => m.id !== deletedId),
        }))
        return
      }

      const row = payload?.new
      if (!row) return
      const mapped = mapMessage(row)
      setData((prev) => {
        const existing = prev.messages ?? []
        const idx = existing.findIndex((m) => m.id === mapped.id)
        if (idx >= 0) {
          const next = [...existing]
          next[idx] = { ...next[idx], ...mapped }
          return { ...prev, messages: next }
        }
        return { ...prev, messages: [...existing, mapped] }
      })

      // Emit a global event for UI notifications/sound.
      // Only fire for brand-new incoming messages (inbox INSERT).
      if (typeof window !== 'undefined') {
        const eventType = payload?.eventType
        const isIncoming = row?.recipient_id === authUserId && row?.sender_id && row?.sender_id !== authUserId
        
        if (eventType === 'INSERT' && isIncoming) {
          console.log('[DataContext] Dispatching sea:new-message', mapped)
          window.dispatchEvent(
            new CustomEvent('sea:new-message', {
              detail: {
                message: mapped,
              },
            }),
          )
        }
      }
    }

    // Inbox: messages where I'm recipient
    const inbox = supabase
      .channel(`messages:in:${authUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${authUserId}` },
        (payload) => onUpsert(payload),
      )
      .subscribe()

    // Outbox: messages where I'm sender (for seen/read updates)
    const outbox = supabase
      .channel(`messages:out:${authUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `sender_id=eq.${authUserId}` },
        (payload) => onUpsert(payload),
      )
      .subscribe()

    messagesChannelRef.current = { inbox, outbox }

    return () => {
      supabase.removeChannel(inbox)
      supabase.removeChannel(outbox)
      if (messagesChannelRef.current?.inbox === inbox) messagesChannelRef.current.inbox = null
      if (messagesChannelRef.current?.outbox === outbox) messagesChannelRef.current.outbox = null
    }
  }, [authUserId, mapMessage])

  const createNotification = useCallback(async ({ userId, title, message, type, linkUrl, meta } = {}) => {
    if (!userId) throw new Error('Missing userId')

    const { data: inserted, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: type ?? 'info',
        title: title ?? 'Notification',
        message: message ?? null,
        link_url: linkUrl ?? null,
        meta: meta ?? null,
      })
      .select('*')
      .single()

    if (error) throw error

    const mapped = mapNotification(inserted)
    setData((prev) => ({ ...prev, notifications: [mapped, ...(prev.notifications ?? [])] }))
    return mapped
  }, [mapNotification])

  const markNotificationRead = useCallback(async ({ notificationId } = {}) => {
    if (!notificationId) throw new Error('Missing notificationId')
    const now = new Date().toISOString()

    try {
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', notificationId)
    } catch {
      // ignore and still update local state
    }

    setData((prev) => {
      const next = (prev.notifications ?? []).map((n) =>
        n.id === notificationId ? { ...n, readAt: n.readAt ?? now } : n,
      )
      return { ...prev, notifications: next }
    })
    return { success: true }
  }, [])

  const markAllNotificationsRead = useCallback(async ({ userId } = {}) => {
    if (!userId) throw new Error('Missing userId')
    const now = new Date().toISOString()

    try {
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', userId)
        .is('read_at', null)
    } catch {
      // ignore and still update local state
    }

    setData((prev) => {
      const next = (prev.notifications ?? []).map((n) =>
        n.userId === userId ? { ...n, readAt: n.readAt ?? now } : n,
      )
      return { ...prev, notifications: next }
    })
    return { success: true }
  }, [])

  const getUserById = useCallback((id) => {
    return data.users.find((u) => u.id === id) ?? null
  }, [data.users])

  const getProgramById = useCallback((id) => {
    return data.programs.find((p) => p.id === id) ?? null
  }, [data.programs])

  const listUsers = useCallback(({ role } = {}) => {
    return role ? data.users.filter((u) => u.role === role) : data.users
  }, [data.users])

  const listPrograms = useCallback(({ status } = {}) => {
    return status ? data.programs.filter((p) => p.status === status) : data.programs
  }, [data.programs])

  const listApplications = useCallback(({ status, programId, studentId } = {}) => {
    let apps = data.applications
    if (status) apps = apps.filter((a) => a.status === status)
    if (programId) apps = apps.filter((a) => a.programId === programId)
    if (studentId) apps = apps.filter((a) => a.studentId === studentId)
    return apps
  }, [data.applications])

  const listSessions = useCallback(({ programId, coachId } = {}) => {
    let sessions = data.coachingSessions
    if (programId) sessions = sessions.filter((s) => s.programId === programId)
    if (coachId) sessions = sessions.filter((s) => s.coachId === coachId)
    return sessions
  }, [data.coachingSessions])

  const listDeliverables = useCallback(({ programId } = {}) => {
    return programId
      ? data.deliverables.filter((d) => d.programId === programId)
      : data.deliverables
  }, [data.deliverables])

  const listMessages = useCallback(({ userId } = {}) => {
    if (!userId) return data.messages
    const deletedIds = new Set(
      (data.messageDeletions ?? [])
        .filter((d) => d.userId === userId)
        .map((d) => d.messageId),
    )
    return (data.messages ?? [])
      .filter((m) => m.senderId === userId || m.receiverId === userId)
      .filter((m) => !deletedIds.has(m.id))
  }, [data.messageDeletions, data.messages])

  // ===================
  // MESSAGE DELETIONS ("Delete for me")
  // ===================

  const refreshMessageDeletions = useCallback(async () => {
    try {
      if (!authUserId) return { success: false, error: new Error('Not authenticated') }

      const { data: rows, error } = await supabase
        .from('message_deletions')
        .select('*')
        .eq('user_id', authUserId)

      if (error) return { success: false, error }

      const mapped = (rows ?? []).map(mapMessageDeletion)
      setData((prev) => ({ ...prev, messageDeletions: mapped }))
      return { success: true }
    } catch (e) {
      return { success: false, error: e }
    }
  }, [authUserId, mapMessageDeletion])

  useEffect(() => {
    if (!authUserId) return

    // Best effort: table may not exist yet
    refreshMessageDeletions()

    const channel = supabase
      .channel(`message_deletions:${authUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_deletions',
          filter: `user_id=eq.${authUserId}`,
        },
        (payload) => {
          const eventType = payload?.eventType
          if (eventType === 'DELETE') {
            const oldRow = payload?.old
            const deletedId = oldRow?.id
            if (!deletedId) return
            setData((prev) => ({
              ...prev,
              messageDeletions: (prev.messageDeletions ?? []).filter((d) => d.id !== deletedId),
            }))
            return
          }

          const row = payload?.new
          if (!row) return
          const mapped = mapMessageDeletion(row)
          setData((prev) => {
            const existing = prev.messageDeletions ?? []
            const idx = existing.findIndex((d) => d.id === mapped.id)
            if (idx >= 0) {
              const next = [...existing]
              next[idx] = { ...next[idx], ...mapped }
              return { ...prev, messageDeletions: next }
            }
            return { ...prev, messageDeletions: [...existing, mapped] }
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [authUserId, mapMessageDeletion, refreshMessageDeletions])

  const deleteMessageForMe = useCallback(async ({ messageId }) => {
    try {
      if (!authUserId) throw new Error('Not authenticated')
      if (!messageId) throw new Error('Missing messageId')

      const { data: inserted, error } = await supabase
        .from('message_deletions')
        .insert({ user_id: authUserId, message_id: messageId })
        .select('*')
        .single()

      if (error) throw error

      const mapped = mapMessageDeletion(inserted)
      setData((prev) => {
        const existing = prev.messageDeletions ?? []
        if (existing.some((d) => d.id === mapped.id)) return prev
        return { ...prev, messageDeletions: [...existing, mapped] }
      })

      return { success: true }
    } catch (error) {
      console.error('Error deleting message for me:', error)
      return { success: false, error }
    }
  }, [authUserId, mapMessageDeletion])

  const deleteMessageForEveryone = useCallback(async ({ messageId }) => {
    try {
      if (!authUserId) throw new Error('Not authenticated')
      if (!messageId) throw new Error('Missing messageId')

      // Sender-only delete (avoid RLS errors)
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', authUserId)

      if (error) throw error

      // Optimistically remove
      setData((prev) => ({
        ...prev,
        messages: (prev.messages ?? []).filter((m) => m.id !== messageId),
      }))

      return { success: true }
    } catch (error) {
      console.error('Error deleting message for everyone:', error)
      return { success: false, error }
    }
  }, [authUserId])

  // ===================
  // PROJECTS (Supabase-backed; local fallback)
  // ===================

  const getProjectById = useCallback((id) => {
    return (data.projects ?? []).find((p) => p.id === id) ?? null
  }, [data.projects])

  const listProjectSubmissions = useCallback(({ projectId } = {}) => {
    const all = data.projectSubmissions ?? []
    const filtered = projectId ? all.filter((s) => s.projectId === projectId) : all
    return [...filtered].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  }, [data.projectSubmissions])

  const listProjects = useCallback(({ studentId, coachId } = {}) => {
    let projects = data.projects ?? []

    if (studentId) {
      projects = projects.filter((p) => p.studentId === studentId)
    }

    if (coachId) {
      const coachedPrograms = (data.programs ?? []).filter((p) => (p.coachIds ?? []).includes(coachId))
      const coachedStudentIds = new Set()
      coachedPrograms.forEach((p) => (p.participantStudentIds ?? []).forEach((sid) => coachedStudentIds.add(sid)))

      // If no program assignments exist yet, show all projects (prototype-friendly)
      if (coachedStudentIds.size > 0) {
        projects = projects.filter((p) => coachedStudentIds.has(p.studentId))
      }
    }

    return [...projects].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }, [data.projects, data.programs])

  const createProjectWithIdea = useCallback(async ({ studentId, idea }) => {
    const stage = normalizeStage(idea?.stage)
    const validation = validateIdeaPayload({ ...idea, stage })
    if (!validation.ok) {
      return { success: false, errors: validation.errors }
    }

    const now = new Date().toISOString()
    const projectId = makeId('prj')
    const submissionId = makeId('psub')

    const project = {
      id: projectId,
      studentId,
      title: String(idea.title).trim(),
      stage,
      createdAt: now,
      updatedAt: now,
    }

    const ideaSubmission = {
      id: submissionId,
      projectId,
      type: ProjectSubmissionType.idea,
      status: SubmissionStatus.pending,
      payload: {
        title: String(idea.title).trim(),
        problemStatement: String(idea.problemStatement).trim(),
        targetUsers: String(idea.targetUsers).trim(),
        proposedSolution: String(idea.proposedSolution).trim(),
        stage,
      },
      comments: [],
      reviewerId: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    }

    // Prefer Supabase. If schema isn't installed yet, fall back to local store.
    try {
      const { data: projRow, error: projErr } = await supabase
        .from('projects')
        .insert({
          id: projectId,
          student_id: studentId,
          title: project.title,
          stage: project.stage,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single()

      if (projErr) throw projErr

      const { data: subRow, error: subErr } = await supabase
        .from('project_submissions')
        .insert({
          id: submissionId,
          project_id: projectId,
          type: ideaSubmission.type,
          status: ideaSubmission.status,
          payload: ideaSubmission.payload,
          comments: ideaSubmission.comments,
          reviewer_id: null,
          reviewed_at: null,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single()

      if (subErr) {
        try {
          await supabase.from('projects').delete().eq('id', projectId)
        } catch {
          // ignore best-effort rollback
        }
        throw subErr
      }

      const mappedProject = mapProjectRow(projRow)
      const mappedSubmission = mapProjectSubmissionRow(subRow)

      setData((prev) => {
        const nextProjects = [mappedProject, ...(prev.projects ?? []).filter((p) => p.id !== mappedProject.id)]
        const nextSubs = [...(prev.projectSubmissions ?? []).filter((s) => s.id !== mappedSubmission.id), mappedSubmission]
        return { ...prev, projects: nextProjects, projectSubmissions: nextSubs }
      })

      // Keep lists consistent for admin/coach views.
      refreshProjects().catch(() => {})

      return { success: true, project: mappedProject, submission: mappedSubmission }
    } catch (err) {
      let supabaseHost = ''
      try {
        supabaseHost = new URL(import.meta.env.VITE_SUPABASE_URL).host
      } catch {
        supabaseHost = ''
      }

      const msg = `Failed to create project in Supabase.${supabaseHost ? ` Connected Supabase: ${supabaseHost}.` : ''} Ensure you ran supabase-projects.sql in the same Supabase project and that RLS policies allow inserts/selects.`
      console.error(msg, err)
      return { success: false, errors: { form: msg }, error: err }
    }
  }, [mapProjectRow, mapProjectSubmissionRow, refreshProjects])

  const addProjectSubmission = useCallback(async ({ projectId, type, payload }) => {
    const project = getProjectById(projectId)
    if (!project) return { success: false, error: 'Project not found' }

    const submissions = listProjectSubmissions({ projectId })

    if (type !== ProjectSubmissionType.idea && !canAddNonIdeaSubmissions(submissions)) {
      return { success: false, error: 'Submit the IDEA first before adding other submission types.' }
    }

    if (type === ProjectSubmissionType.idea && submissions.some((s) => s.type === ProjectSubmissionType.idea)) {
      return { success: false, error: 'IDEA submission already exists for this project.' }
    }

    const now = new Date().toISOString()
    const submission = {
      id: makeId('psub'),
      projectId,
      type,
      status: SubmissionStatus.pending,
      payload: payload ?? {},
      comments: [],
      reviewerId: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    }

    try {
      const { data: subRow, error: subErr } = await supabase
        .from('project_submissions')
        .insert({
          id: submission.id,
          project_id: projectId,
          type: submission.type,
          status: submission.status,
          payload: submission.payload,
          comments: submission.comments,
          reviewer_id: null,
          reviewed_at: null,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single()

      if (subErr) throw subErr

      // bump project updated_at
      try {
        await supabase.from('projects').update({ updated_at: now }).eq('id', projectId)
      } catch {
        // ignore
      }

      const mappedSubmission = mapProjectSubmissionRow(subRow)
      setData((prev) => {
        const nextSubs = [...(prev.projectSubmissions ?? []).filter((s) => s.id !== mappedSubmission.id), mappedSubmission]
        const nextProjects = (prev.projects ?? []).map((p) =>
          p.id === projectId ? { ...p, updatedAt: now } : p,
        )
        return { ...prev, projects: nextProjects, projectSubmissions: nextSubs }
      })

      refreshProjects().catch(() => {})

      return { success: true, submission: mappedSubmission }
    } catch (err) {
      console.error('Error adding project submission in Supabase:', err)
      return { success: false, error: err }
    }
  }, [getProjectById, listProjectSubmissions, mapProjectSubmissionRow, refreshProjects])

  const addProjectSubmissionComment = useCallback(async ({ submissionId, authorId, text }) => {
    const content = String(text ?? '').trim()
    if (!content) return { success: false, error: 'Comment cannot be empty' }
    const now = new Date().toISOString()
    const comment = { id: makeId('c'), authorId, text: content, createdAt: now }

    const localSub = (data.projectSubmissions ?? []).find((s) => s.id === submissionId) ?? null
    const nextComments = [...(localSub?.comments ?? []), comment]

    try {
      const { data: updatedRow, error } = await supabase
        .from('project_submissions')
        .update({ comments: nextComments, updated_at: now })
        .eq('id', submissionId)
        .select('*')
        .single()

      if (error) throw error

      const mapped = mapProjectSubmissionRow(updatedRow)
      setData((prev) => {
        const nextSubs = (prev.projectSubmissions ?? []).map((s) => (s.id === submissionId ? mapped : s))
        return { ...prev, projectSubmissions: nextSubs }
      })

      refreshProjects().catch(() => {})

      // Notify the other side about the new comment
      try {
        const projectId = localSub?.projectId
        const project = projectId ? (data.projects ?? []).find((p) => p.id === projectId) : null
        const projectStudentId = project?.studentId
        const authorRole = authorId ? (data.users ?? []).find((u) => u.id === authorId)?.role : null
        const isStaffAuthor = authorRole === 'admin' || authorRole === 'coach'

        if (isStaffAuthor && projectStudentId) {
          await createNotification({
            userId: projectStudentId,
            type: 'info',
            title: 'New comment on your submission',
            message: project?.title ? `A coach/admin commented on ${project.title}.` : 'A coach/admin commented on your submission.',
            linkUrl: '/student/projects',
            meta: { submissionId, projectId, authorId },
            allowLocalFallback: false,
          }).catch((e) => {
            console.warn('Notification insert failed (staff comment -> student):', e)
            return null
          })
        }

        const isStudentAuthor = authorRole === 'student' || (authorId && projectStudentId && String(authorId) === String(projectStudentId))
        if (isStudentAuthor) {
          const staffIds = listStaffUserIds().filter((id) => String(id) !== String(authorId))
          if (staffIds.length > 0) {
            await Promise.all(
              staffIds.map((uid) =>
                createNotification({
                  userId: uid,
                  type: 'info',
                  title: 'New student comment',
                  message: project?.title ? `New comment on ${project.title}.` : 'A student commented on a submission.',
                  linkUrl: '/coach/projects',
                  meta: { submissionId, projectId, authorId, studentId: projectStudentId },
                  allowLocalFallback: false,
                }).catch((e) => {
                  console.warn('Notification insert failed (student comment -> staff):', e)
                  return null
                }),
              ),
            )
          }
        }
      } catch (e) {
        console.warn('Notification fan-out failed (submission comment):', e)
      }

      return { success: true, comment }
    } catch (err) {
      console.error('Error adding submission comment in Supabase:', err)
      return { success: false, error: err }
    }
  }, [createNotification, data.projects, data.projectSubmissions, data.users, listStaffUserIds, mapProjectSubmissionRow, refreshProjects])

  const setProjectSubmissionStatus = useCallback(async ({ submissionId, status, reviewerId }) => {
    const nextStatus = Object.values(SubmissionStatus).includes(status) ? status : SubmissionStatus.pending
    const now = new Date().toISOString()

    const prevSub = (data.projectSubmissions ?? []).find((s) => s.id === submissionId) ?? null

    const isReviewed = nextStatus !== SubmissionStatus.pending
    const reviewedAt = isReviewed ? (prevSub?.reviewedAt ?? now) : null

    try {
      const { data: updatedRow, error } = await supabase
        .from('project_submissions')
        .update({
          status: nextStatus,
          reviewer_id: reviewerId ?? prevSub?.reviewerId ?? null,
          reviewed_at: reviewedAt,
          updated_at: now,
        })
        .eq('id', submissionId)
        .select('*')
        .single()

      if (error) throw error

      const mapped = mapProjectSubmissionRow(updatedRow)
      setData((prev) => {
        const nextSubs = (prev.projectSubmissions ?? []).map((s) => (s.id === submissionId ? mapped : s))
        return { ...prev, projectSubmissions: nextSubs }
      })

      refreshProjects().catch(() => {})
    } catch (err) {
      console.error('Error setting submission status in Supabase:', err)
      return { success: false, error: err }
    }

    return { success: true }
  }, [data.projectSubmissions, mapProjectSubmissionRow, refreshProjects])

  const setProjectStage = useCallback(async ({ projectId, stage }) => {
    const nextStage = normalizeStage(stage)
    const now = new Date().toISOString()

    try {
      const { data: updatedRow, error } = await supabase
        .from('projects')
        .update({ stage: nextStage, updated_at: now })
        .eq('id', projectId)
        .select('*')
        .single()

      if (error) throw error

      const mapped = mapProjectRow(updatedRow)
      setData((prev) => {
        const nextProjects = (prev.projects ?? []).map((p) => (p.id === projectId ? mapped : p))
        return { ...prev, projects: nextProjects }
      })

      refreshProjects().catch(() => {})

      // Staff action: notify student that stage changed
      try {
        const actorId = authUserId
        const actorRole = actorId ? (data.users ?? []).find((u) => u.id === actorId)?.role : null
        const isStaffActor = actorRole === 'admin' || actorRole === 'coach'
        if (isStaffActor && mapped?.studentId) {
          await createNotification({
            userId: mapped.studentId,
            type: 'info',
            title: 'Project stage updated',
            message: `${mapped.title} is now in stage: ${mapped.stage}.`,
            linkUrl: '/student/projects',
            meta: { projectId: mapped.id, stage: mapped.stage, actorId },
            allowLocalFallback: false,
          }).catch((e) => {
            console.warn('Notification insert failed (stage update -> student):', e)
            return null
          })
        }
      } catch (e) {
        console.warn('Notification fan-out failed (stage update):', e)
      }

      return { success: true }
    } catch (err) {
      console.error('Error setting project stage in Supabase:', err)
      return { success: false, error: err }
    }
  }, [authUserId, createNotification, data.users, mapProjectRow, refreshProjects])

  // ===================
  // MUTATION FUNCTIONS
  // ===================

  const upsertUser = useCallback(async (user) => {
    try {
      const { data: updatedUser, error } = await supabase
        .from('users')
        .upsert(user)
        .select()
        .single()

      if (error) throw error

      // Update local state
      setData(prev => ({
        ...prev,
        users: prev.users.some(u => u.id === updatedUser.id)
          ? prev.users.map(u => u.id === updatedUser.id ? updatedUser : u)
          : [...prev.users, updatedUser]
      }))

      return updatedUser
    } catch (error) {
      console.error('Error upserting user:', error)
      throw error
    }
  }, [])

  const deleteUser = useCallback(async (userId) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) throw error

      setData(prev => ({
        ...prev,
        users: prev.users.filter(u => u.id !== userId)
      }))
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  }, [])

  const upsertProgram = useCallback(async (program) => {
    try {
      const { coachIds, participantStudentIds, ...programData } = program

      const previousProgram = programData?.id
        ? (data.programs ?? []).find((p) => p.id === programData.id) ?? null
        : null
      const prevParticipantIds = new Set(previousProgram?.participantStudentIds ?? [])

      // Map UI camelCase -> DB snake_case
      const payload = {
        id: programData.id,
        name: programData.name,
        description: programData.description,
        duration_weeks: programData.durationWeeks,
        start_date: programData.startDate,
        end_date: programData.endDate,
        capacity: programData.capacity,
        status: programData.status,
      }

      // For new programs, do NOT send id=null/empty; let Postgres default generate UUID.
      if (payload.id === null || payload.id === '' || payload.id === undefined) {
        delete payload.id
      }

      // Remove undefined keys to avoid overwriting with null
      Object.keys(payload).forEach((k) => {
        if (payload[k] === undefined) delete payload[k]
      })

      const isCreate = !programData?.id

      const { data: updatedProgram, error } = isCreate
        ? await supabase.from('programs').insert(payload).select().single()
        : await supabase.from('programs').upsert(payload).select().single()

      if (error) throw error

      const programId = updatedProgram?.id

      // Handle coach assignments
      if (coachIds && programId) {
        await supabase.from('program_coaches').delete().eq('program_id', programId)
        if (coachIds.length > 0) {
          await supabase.from('program_coaches').insert(
            coachIds.map(coachId => ({ program_id: programId, coach_id: coachId }))
          )
        }
      }

      // Handle participant assignments
      if (participantStudentIds && programId) {
        await supabase.from('program_participants').delete().eq('program_id', programId)
        if (participantStudentIds.length > 0) {
          await supabase.from('program_participants').insert(
            participantStudentIds.map(studentId => ({ program_id: programId, student_id: studentId }))
          )
        }
      }

      // Notify newly added participants (admin/coach action)
      if (participantStudentIds && participantStudentIds.length > 0) {
        const added = participantStudentIds.filter((sid) => !prevParticipantIds.has(sid))
        if (added.length > 0) {
          const programName = programData?.name ?? updatedProgram?.name ?? 'a program'
          await Promise.all(
            added.map((studentId) =>
              createNotification({
                userId: studentId,
                type: 'info',
                title: 'Added to program',
                message: `You were added to ${programName}.`,
                linkUrl: '/student/programs',
                meta: { programId, programName },
                allowLocalFallback: false,
              }).catch((e) => {
                console.warn('Notification insert failed (program participant):', e)
                return null
              }),
            ),
          )
        }
      }

      // Refresh programs data
      await fetchAllData()

      return updatedProgram
    } catch (error) {
      console.error('Error upserting program:', error)
      throw error
    }
  }, [createNotification, data.programs, fetchAllData])

  const deleteProgram = useCallback(async (programId) => {
    try {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', programId)

      if (error) throw error

      setData(prev => ({
        ...prev,
        programs: prev.programs.filter(p => p.id !== programId)
      }))
    } catch (error) {
      console.error('Error deleting program:', error)
      throw error
    }
  }, [])

  const setApplicationStatus = useCallback(async ({ applicationId, status, decisionNote, actorId }) => {
    try {
      const { data: updated, error } = await supabase
        .from('applications')
        .update({
          status,
          decision_note: decisionNote,
          reviewed_by: actorId,
        })
        .eq('id', applicationId)
        .select()
        .single()

      if (error) throw error

      try {
        const mapped = mapApplication(updated)
        const normalized = String(status ?? '').toLowerCase()
        const label = normalized === 'accepted' ? 'accepted' : normalized === 'rejected' ? 'rejected' : normalized || 'updated'
        if (mapped?.studentId) {
          await createNotification({
            userId: mapped.studentId,
            type: label === 'accepted' ? 'success' : label === 'rejected' ? 'danger' : 'info',
            title: 'Application update',
            message: `Your program application was ${label}.`,
            linkUrl: '/student/applications',
            meta: { applicationId: mapped.id, programId: mapped.programId, status: mapped.status },
            allowLocalFallback: false,
          })
        }
      } catch {
        // non-blocking
      }

      // If accepted, add student to program participants
      if (status === 'accepted') {
        const application = data.applications.find(a => a.id === applicationId)
        if (application) {
          await supabase.from('program_participants').insert({
            program_id: application.programId,
            student_id: application.studentId,
          })
        }
      }

      // Refresh data
      await fetchAllData()

      return updated
    } catch (error) {
      console.error('Error updating application status:', error)
      throw error
    }
  }, [createNotification, data.applications, fetchAllData, mapApplication])

  const createApplication = useCallback(async ({ programId, studentId, motivation } = {}) => {
    try {
      if (!programId || !studentId) throw new Error('Missing programId or studentId')

      const { data: created, error } = await supabase
        .from('applications')
        .insert({
          program_id: programId,
          student_id: studentId,
          status: 'pending',
          motivation: motivation ?? null,
        })
        .select('*')
        .single()

      if (error) {
        // Common: unique constraint or RLS
        if (String(error.code) === '23505') {
          throw new Error('You already applied to this program.')
        }
        if ((error.message || '').toLowerCase().includes('row-level security')) {
          throw new Error('Application could not be submitted due to permissions (RLS).')
        }
        throw error
      }

      const mapped = mapApplication(created)

      setData((prev) => ({
        ...prev,
        applications: [mapped, ...(prev.applications ?? [])],
      }))

      // Student action: notify staff (coach/admin) about a new application
      try {
        const staffIds = listStaffUserIds().filter((id) => String(id) !== String(studentId))
        const programName = (data.programs ?? []).find((p) => p.id === programId)?.name ?? 'a program'
        if (staffIds.length > 0) {
          await Promise.all(
            staffIds.map((uid) =>
              createNotification({
                userId: uid,
                type: 'info',
                title: 'New program application',
                message: `A student applied to ${programName}.`,
                linkUrl: '/admin/applications',
                meta: { applicationId: mapped.id, programId, studentId },
                allowLocalFallback: false,
              }).catch((e) => {
                console.warn('Notification insert failed (student application -> staff):', e)
                return null
              }),
            ),
          )
        }
      } catch (e) {
        console.warn('Notification fan-out failed (application create -> staff):', e)
      }

      return mapped
    } catch (error) {
      console.error('Error creating application:', error)
      throw error
    }
  }, [createNotification, data.programs, listStaffUserIds, mapApplication])

  const assignCoachToProgram = useCallback(async ({ programId, coachId }) => {
    try {
      const { error } = await supabase
        .from('program_coaches')
        .insert({ program_id: programId, coach_id: coachId })

      if (error) throw error

      await fetchAllData()
    } catch (error) {
      console.error('Error assigning coach:', error)
      throw error
    }
  }, [fetchAllData])

  const assignStudentToProgram = useCallback(async ({ programId, studentId }) => {
    try {
      const { error } = await supabase
        .from('program_participants')
        .insert({ program_id: programId, student_id: studentId })

      if (error) throw error

      await fetchAllData()
    } catch (error) {
      console.error('Error assigning student:', error)
      throw error
    }
  }, [fetchAllData])

  const sendMessage = useCallback(async ({ senderId, receiverId, content, subject = 'New Message' }) => {
    try {
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          sender_id: senderId,
          recipient_id: receiverId,
          subject,
          body: content,
          read: false,
        })
        .select()
        .single()

      if (error) throw error

      const mapped = mapMessage(newMessage)

      setData((prev) => {
        const existing = prev.messages ?? []
        if (existing.some((m) => m.id === mapped.id)) return prev
        return { ...prev, messages: [...existing, mapped] }
      })

      return mapped
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }, [mapMessage])

  const markAsRead = useCallback(async ({ messageIds }) => {
    try {
      if (!Array.isArray(messageIds) || messageIds.length === 0) return
      // Only mark messages where I'm the recipient (avoids RLS errors and ensures correctness)
      if (!authUserId) return

      const now = new Date().toISOString()
      const { error } = await supabase
        .from('messages')
        .update({ seen_at: now, read: true })
        .in('id', messageIds)
        .eq('recipient_id', authUserId)

      if (error) throw error

      setData(prev => ({
        ...prev,
        messages: prev.messages.map(m =>
          messageIds.includes(m.id) ? { ...m, readAt: now, seenAt: now } : m
        )
      }))
    } catch (error) {
      console.error('Error marking messages as read:', error)
      throw error
    }
  }, [authUserId])

  const getPresenceForUser = useCallback((userId) => {
    if (!userId) return { online: false, lastSeenAt: null }
    const row = presence?.[userId]
    if (!row?.updatedAt) return { online: false, lastSeenAt: row?.lastSeenAt ?? null }

    // Treat user as online if we heard from them recently (heartbeat)
    const updated = new Date(row.updatedAt).getTime()
    const online = Date.now() - updated < 45000
    return { online, lastSeenAt: row.lastSeenAt ?? row.updatedAt ?? null }
  }, [presence])

  // ===================
  // TASKS (Supabase)
  // ===================

  const getTaskById = useCallback((taskId) => {
    return (data.tasks ?? []).find((t) => t.id === taskId) ?? null
  }, [data.tasks])

  const listTasks = useCallback(({ projectId, submissionId, status, studentId } = {}) => {
    let tasks = data.tasks ?? []

    if (projectId) tasks = tasks.filter((t) => t.projectId === projectId)
    if (submissionId) tasks = tasks.filter((t) => t.submissionId === submissionId)
    if (status) tasks = tasks.filter((t) => String(t.status) === String(status))

    if (studentId) {
      const projectIds = new Set(
        (data.projects ?? []).filter((p) => String(p.studentId) === String(studentId)).map((p) => p.id),
      )
      tasks = tasks.filter((t) => projectIds.has(t.projectId))
    }

    return [...tasks].sort((a, b) => {
      const ad = a.deadline ?? a.createdAt
      const bd = b.deadline ?? b.createdAt
      return new Date(ad).getTime() - new Date(bd).getTime()
    })
  }, [data.projects, data.tasks])

  const listTasksGroupedByProject = useCallback(({ studentId, coachId } = {}) => {
    const projects = studentId
      ? (data.projects ?? []).filter((p) => String(p.studentId) === String(studentId))
      : coachId
        ? listProjects({ coachId })
        : (data.projects ?? [])

    return projects.map((p) => ({ project: p, tasks: listTasks({ projectId: p.id }) }))
  }, [data.projects, listProjects, listTasks])

  const createTask = useCallback(async ({ projectId, submissionId, title, description, taskType, deadline, checklistItems } = {}) => {
    if (!authUserId) throw new Error('Not authenticated')
    if (!projectId) throw new Error('Missing projectId')
    if (!String(title ?? '').trim()) throw new Error('Missing title')

    const actorRole = (data.users ?? []).find((u) => u.id === authUserId)?.role
    if (actorRole !== 'coach') throw new Error('Only coaches can create tasks')

    const project = (data.projects ?? []).find((p) => p.id === projectId) ?? null
    if (!project) throw new Error('Project not found')

    const normalizedType = normalizeTaskType(taskType)

    const normalizedChecklist =
      normalizedType === TaskType.checklist
        ? (Array.isArray(checklistItems) ? checklistItems : []).map((it) => ({
            id: it?.id ?? makeId('chk'),
            text: String(it?.text ?? '').trim(),
          })).filter((it) => it.text)
        : null

    const id = makeId('tsk')

    const { data: inserted, error } = await supabase
      .from('tasks')
      .insert({
        id,
        project_id: projectId,
        submission_id: submissionId ?? null,
        student_id: project.studentId,
        title: String(title).trim(),
        description: String(description ?? '').trim() || null,
        task_type: normalizedType,
        status: TaskStatus.pending,
        deadline: deadline ?? null,
        checklist_items: normalizedChecklist,
        created_by: authUserId,
        student_submission: null,
        submitted_at: null,
        coach_feedback: null,
        reviewed_at: null,
        reviewed_by: null,
      })
      .select('*')
      .single()

    if (error) throw error

    const mapped = mapTaskRow(inserted)
    setData((prev) => {
      const existing = prev.tasks ?? []
      if (existing.some((t) => t.id === mapped.id)) return prev
      return { ...prev, tasks: [mapped, ...existing] }
    })

    return mapped
  }, [authUserId, data.projects, data.users, mapTaskRow])

  const submitTask = useCallback(async ({ taskId, submission } = {}) => {
    if (!authUserId) throw new Error('Not authenticated')
    if (!taskId) throw new Error('Missing taskId')

    const task = (data.tasks ?? []).find((t) => t.id === taskId) ?? null
    if (!task) throw new Error('Task not found')

    const project = (data.projects ?? []).find((p) => p.id === task.projectId) ?? null
    if (!project) throw new Error('Project not found')
    if (String(project.studentId) !== String(authUserId)) throw new Error('Only the project student can submit this task')

    const now = new Date().toISOString()

    const { data: updated, error } = await supabase
      .from('tasks')
      .update({
        status: TaskStatus.submitted,
        student_submission: submission ?? null,
        submitted_at: now,
      })
      .eq('id', taskId)
      .select('*')
      .single()

    if (error) throw error

    const mapped = mapTaskRow(updated)
    setData((prev) => {
      const current = prev.tasks ?? []
      const exists = current.some((t) => t.id === mapped.id)
      return {
        ...prev,
        tasks: exists ? current.map((t) => (t.id === mapped.id ? mapped : t)) : [mapped, ...current],
      }
    })

    return { success: true }
  }, [authUserId, data.projects, data.tasks, mapTaskRow])

  const reviewTask = useCallback(async ({ taskId, status, feedback } = {}) => {
    if (!authUserId) throw new Error('Not authenticated')
    if (!taskId) throw new Error('Missing taskId')

    const actorRole = (data.users ?? []).find((u) => u.id === authUserId)?.role
    if (actorRole !== 'coach') throw new Error('Only coaches can review tasks')

    const nextStatus = normalizeTaskStatus(status)
    const now = new Date().toISOString()

    const { data: updated, error } = await supabase
      .from('tasks')
      .update({
        status: nextStatus,
        coach_feedback: String(feedback ?? '').trim() || null,
        reviewed_at: now,
        reviewed_by: authUserId,
      })
      .eq('id', taskId)
      .select('*')
      .single()

    if (error) throw error

    const mapped = mapTaskRow(updated)
    setData((prev) => {
      const current = prev.tasks ?? []
      const exists = current.some((t) => t.id === mapped.id)
      return {
        ...prev,
        tasks: exists ? current.map((t) => (t.id === mapped.id ? mapped : t)) : [mapped, ...current],
      }
    })

    return { success: true }
  }, [authUserId, data.users, mapTaskRow])

  const reset = useCallback(async () => {
    // This would require careful consideration in production
    // For now, just refresh data
    await fetchAllData()
  }, [fetchAllData])

  const value = useMemo(
    () => ({
      hydrated,
      data,
      reset,
      // Notifications
      listNotifications,
      refreshNotifications,
      createNotification,
      markNotificationRead,
      markAllNotificationsRead,
      getUserById,
      getProgramById,
      listUsers,
      listPrograms,
      listApplications,
      listSessions,
      listDeliverables,
      listMessages,
      // Projects
      getProjectById,
      listProjects,
      listProjectSubmissions,
      createProjectWithIdea,
      addProjectSubmission,
      addProjectSubmissionComment,
      setProjectSubmissionStatus,
      setProjectStage,
      sendMessage,
      markAsRead,
      deleteMessageForMe,
      deleteMessageForEveryone,
      // Presence
      refreshPresence,
      getPresenceForUser,
      upsertProgram,
      deleteProgram,
      upsertUser,
      deleteUser,
      setApplicationStatus,
      createApplication,
      assignCoachToProgram,
      assignStudentToProgram,
      // Tasks
      getTaskById,
      listTasks,
      listTasksGroupedByProject,
      createTask,
      submitTask,
      reviewTask,
    }),
    [
      hydrated,
      data,
      reset,
      listNotifications,
      refreshNotifications,
      createNotification,
      markNotificationRead,
      markAllNotificationsRead,
      getUserById,
      getProgramById,
      listUsers,
      listPrograms,
      listApplications,
      listSessions,
      listDeliverables,
      listMessages,
      getProjectById,
      listProjects,
      listProjectSubmissions,
      createProjectWithIdea,
      addProjectSubmission,
      addProjectSubmissionComment,
      setProjectSubmissionStatus,
      setProjectStage,
      sendMessage,
      markAsRead,
      deleteMessageForMe,
      deleteMessageForEveryone,
      refreshPresence,
      getPresenceForUser,
      upsertProgram,
      deleteProgram,
      upsertUser,
      deleteUser,
      setApplicationStatus,
      createApplication,
      assignCoachToProgram,
      assignStudentToProgram,
      getTaskById,
      listTasks,
      listTasksGroupedByProject,
      createTask,
      submitTask,
      reviewTask,
    ]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
