import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { makeId } from '../utils/ids'
import { storage } from '../utils/storage'
import { DataContext } from './DataContextBase'
import {
  ProjectSubmissionType,
  SubmissionStatus,
  canAddNonIdeaSubmissions,
  normalizeStage,
  validateIdeaPayload,
} from '../models/projects'

const PROJECTS_STORAGE_KEY = 'sea_projects_v1'
const NOTIFICATIONS_STORAGE_KEY = 'sea_notifications_v1'

const ensureProjectsStore = () => {
  const existing = storage.get(PROJECTS_STORAGE_KEY, null)
  if (existing && Array.isArray(existing.projects) && Array.isArray(existing.projectSubmissions)) {
    return existing
  }
  const seeded = { projects: [], projectSubmissions: [] }
  storage.set(PROJECTS_STORAGE_KEY, seeded)
  return seeded
}

const ensureNotificationsStore = () => {
  const existing = storage.get(NOTIFICATIONS_STORAGE_KEY, null)
  if (existing && Array.isArray(existing.notifications)) {
    return existing
  }
  const seeded = { notifications: [] }
  storage.set(NOTIFICATIONS_STORAGE_KEY, seeded)
  return seeded
}

export function DataProvider({ children }) {
  const [hydrated, setHydrated] = useState(false)
  const [authUserId, setAuthUserId] = useState(null)
  const notificationsChannelRef = useRef(null)
  const messagesChannelRef = useRef({ inbox: null, outbox: null })
  const presenceChannelRef = useRef(null)

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
  })

  const persistProjects = useCallback((projects, projectSubmissions) => {
    storage.set(PROJECTS_STORAGE_KEY, { projects, projectSubmissions })
  }, [])

  const persistNotifications = useCallback((notifications) => {
    storage.set(NOTIFICATIONS_STORAGE_KEY, { notifications })
  }, [])

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
      const projectStore = ensureProjectsStore()
      const notificationsStore = ensureNotificationsStore()

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

      let notifications = notificationsStore.notifications ?? []
      try {
        const { data: ntfData, error: ntfError } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })

        if (!ntfError && Array.isArray(ntfData)) {
          notifications = ntfData.map(mapNotification)
          persistNotifications(notifications)
        }
      } catch {
        // notifications table may not exist yet; ignore
      }

      setData({
        users: usersRes.data || [],
        programs,
        applications,
        coachingSessions: sessions,
        deliverables,
        messages,
        messageDeletions,
        projects: projectStore.projects ?? [],
        projectSubmissions: projectStore.projectSubmissions ?? [],
        notifications,
      })

      setHydrated(true)
    } catch (error) {
      console.error('Error fetching data:', error)
      setHydrated(true)
    }
  }, [mapApplication, mapCoachingSession, mapDeliverable, mapMessage, mapMessageDeletion, mapNotification, mapProgram, persistNotifications])

  // Initial data fetch & Refetch on Auth Change
  useEffect(() => {
    if (authUserId) {
        fetchAllData()
    } else {
        // Optional: clear data on logout to be safe
        // setData(prev => ({ ...prev, messages: [], deliverables: [], users: [] }))
    }
  }, [fetchAllData, authUserId])

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

  const refreshNotifications = useCallback(async () => {
    try {
      const { data: ntfData, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) return { success: false, error }
      const mapped = (ntfData ?? []).map(mapNotification)
      setData((prev) => {
        persistNotifications(mapped)
        return { ...prev, notifications: mapped }
      })
      return { success: true }
    } catch (e) {
      return { success: false, error: e }
    }
  }, [mapNotification, persistNotifications])

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
            const next = [mapped, ...existing]
            persistNotifications(next)
            return { ...prev, notifications: next }
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
            persistNotifications(next)
            return { ...prev, notifications: next }
          })
        },
      )
      .subscribe()

    notificationsChannelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      if (notificationsChannelRef.current === channel) {
        notificationsChannelRef.current = null
      }
    }
  }, [authUserId, mapNotification, persistNotifications, refreshNotifications])

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

  const createNotification = useCallback(async ({ userId, title, message, type, linkUrl, meta, allowLocalFallback = true } = {}) => {
    if (!userId) throw new Error('Missing userId')

    // Prefer DB-backed notifications when available (cross-user/device)
    try {
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

      if (error) {
        if (!allowLocalFallback) {
          throw error
        }
      }

      if (!error && inserted) {
        const mapped = mapNotification(inserted)
        setData((prev) => {
          const next = [mapped, ...(prev.notifications ?? [])]
          persistNotifications(next)
          return { ...prev, notifications: next }
        })
        return mapped
      }
    } catch {
      // fall back to local storage
    }

    if (!allowLocalFallback) {
      // Cross-user notifications cannot work without DB insert; don't silently pretend.
      throw new Error('Failed to create notification in database. Check notifications table + RLS policies.')
    }

    const now = new Date().toISOString()
    const notification = {
      id: makeId('ntf'),
      userId,
      type: type ?? 'info',
      title: title ?? 'Notification',
      message: message ?? null,
      linkUrl: linkUrl ?? null,
      meta: meta ?? null,
      createdAt: now,
      readAt: null,
    }

    setData((prev) => {
      const next = [notification, ...(prev.notifications ?? [])]
      persistNotifications(next)
      return { ...prev, notifications: next }
    })

    return notification
  }, [mapNotification, persistNotifications])

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
      persistNotifications(next)
      return { ...prev, notifications: next }
    })
    return { success: true }
  }, [persistNotifications])

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
      persistNotifications(next)
      return { ...prev, notifications: next }
    })
    return { success: true }
  }, [persistNotifications])

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
  // PROJECTS (LOCAL)
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

    setData((prev) => {
      const nextProjects = [project, ...(prev.projects ?? [])]
      const nextSubs = [...(prev.projectSubmissions ?? []), ideaSubmission]
      persistProjects(nextProjects, nextSubs)
      return { ...prev, projects: nextProjects, projectSubmissions: nextSubs }
    })

    return { success: true, project, submission: ideaSubmission }
  }, [persistProjects])

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

    setData((prev) => {
      const nextSubs = [...(prev.projectSubmissions ?? []), submission]
      const nextProjects = (prev.projects ?? []).map((p) =>
        p.id === projectId ? { ...p, updatedAt: now } : p,
      )
      persistProjects(nextProjects, nextSubs)
      return { ...prev, projects: nextProjects, projectSubmissions: nextSubs }
    })

    return { success: true, submission }
  }, [getProjectById, listProjectSubmissions, persistProjects])

  const addProjectSubmissionComment = useCallback(async ({ submissionId, authorId, text }) => {
    const content = String(text ?? '').trim()
    if (!content) return { success: false, error: 'Comment cannot be empty' }
    const now = new Date().toISOString()
    const comment = { id: makeId('c'), authorId, text: content, createdAt: now }

    setData((prev) => {
      const nextSubs = (prev.projectSubmissions ?? []).map((s) => {
        if (s.id !== submissionId) return s
        return { ...s, comments: [...(s.comments ?? []), comment], updatedAt: now }
      })
      persistProjects(prev.projects ?? [], nextSubs)
      return { ...prev, projectSubmissions: nextSubs }
    })

    return { success: true, comment }
  }, [persistProjects])

  const setProjectSubmissionStatus = useCallback(async ({ submissionId, status, reviewerId }) => {
    const nextStatus = Object.values(SubmissionStatus).includes(status) ? status : SubmissionStatus.pending
    const now = new Date().toISOString()

    const prevSub = (data.projectSubmissions ?? []).find((s) => s.id === submissionId) ?? null
    const prevStatus = prevSub?.status
    const project = prevSub ? (data.projects ?? []).find((p) => p.id === prevSub.projectId) ?? null : null
    const studentId = project?.studentId

    setData((prev) => {
      const nextSubs = (prev.projectSubmissions ?? []).map((s) => {
        if (s.id !== submissionId) return s
        const isReviewed = nextStatus !== SubmissionStatus.pending
        return {
          ...s,
          status: nextStatus,
          reviewerId: reviewerId ?? s.reviewerId,
          reviewedAt: isReviewed ? (s.reviewedAt ?? now) : null,
          updatedAt: now,
        }
      })
      persistProjects(prev.projects ?? [], nextSubs)
      return { ...prev, projectSubmissions: nextSubs }
    })

    if (prevSub && studentId && String(prevStatus ?? '') !== String(nextStatus ?? '')) {
      const label =
        nextStatus === SubmissionStatus.approved
          ? 'approved'
          : nextStatus === SubmissionStatus.reviewed
            ? 'reviewed'
            : 'updated'

      try {
        await createNotification({
          userId: studentId,
          type: nextStatus === SubmissionStatus.approved ? 'success' : 'info',
          title: `Submission ${label}`,
          message: `Your ${String(prevSub.type).toUpperCase()} submission was ${label}.`,
          linkUrl: '/student/projects',
          meta: {
            submissionId: prevSub.id,
            projectId: prevSub.projectId,
            status: nextStatus,
            reviewerId: reviewerId ?? prevSub.reviewerId,
          },
          allowLocalFallback: false,
        })
      } catch (e) {
        console.warn('Notification insert failed (submission status):', e)
      }
    }

    return { success: true }
  }, [createNotification, data.projectSubmissions, data.projects, persistProjects])

  const setProjectStage = useCallback(async ({ projectId, stage }) => {
    const nextStage = normalizeStage(stage)
    const now = new Date().toISOString()

    setData((prev) => {
      const nextProjects = (prev.projects ?? []).map((p) =>
        p.id === projectId ? { ...p, stage: nextStage, updatedAt: now } : p,
      )
      persistProjects(nextProjects, prev.projectSubmissions ?? [])
      return { ...prev, projects: nextProjects }
    })

    return { success: true }
  }, [persistProjects])

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

      // Remove undefined keys to avoid overwriting with null
      Object.keys(payload).forEach((k) => {
        if (payload[k] === undefined) delete payload[k]
      })

      const { data: updatedProgram, error } = await supabase
        .from('programs')
        .upsert(payload)
        .select()
        .single()

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

      return mapped
    } catch (error) {
      console.error('Error creating application:', error)
      throw error
    }
  }, [mapApplication])

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
    ]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
