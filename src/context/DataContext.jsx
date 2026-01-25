import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { seedData } from '../data/mockData'
import { makeId } from '../utils/ids'
import { storage } from '../utils/storage'
import { sleep } from '../utils/time'
import { DataContext } from './DataContextBase'
import {
  ProjectSubmissionType,
  SubmissionStatus,
  canAddNonIdeaSubmissions,
  normalizeStage,
  validateIdeaPayload,
} from '../models/projects'

const STORAGE_KEY = 'sea_data_v1'

const initialState = {
  hydrated: false,
  data: null,
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'hydrate':
      return { hydrated: true, data: action.payload }
    case 'reset':
      return { hydrated: true, data: action.payload }
    case 'set':
      return { ...state, data: action.payload }
    default:
      return state
  }
}

const deepClone = (obj) => JSON.parse(JSON.stringify(obj))

const ensureSeed = () => {
  const existing = storage.get(STORAGE_KEY, null)
  if (existing && existing.users && existing.programs) {
    if (!Array.isArray(existing.notifications)) {
      const next = { ...existing, notifications: [] }
      storage.set(STORAGE_KEY, next)
      return next
    }
    return existing
  }
  const seeded = deepClone(seedData)
  if (!Array.isArray(seeded.notifications)) seeded.notifications = []
  storage.set(STORAGE_KEY, seeded)
  return seeded
}

export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    const seeded = ensureSeed()
    dispatch({ type: 'hydrate', payload: seeded })
  }, [])

  useEffect(() => {
    if (!state.hydrated || !state.data) return
    storage.set(STORAGE_KEY, state.data)
  }, [state.hydrated, state.data])

  const setData = useCallback((next) => dispatch({ type: 'set', payload: next }), [])

  const reset = useCallback(() => {
    const seeded = deepClone(seedData)
    storage.set(STORAGE_KEY, seeded)
    dispatch({ type: 'reset', payload: seeded })
  }, [])

  const api = useMemo(() => {
    const data = state.data

    const getUserById = (id) => data?.users?.find((u) => u.id === id) ?? null
    const getProgramById = (id) => data?.programs?.find((p) => p.id === id) ?? null

    const listUsers = ({ role } = {}) => {
      const users = data?.users ?? []
      return role ? users.filter((u) => u.role === role) : users
    }

    const listPrograms = ({ status } = {}) => {
      const programs = data?.programs ?? []
      return status ? programs.filter((p) => p.status === status) : programs
    }

    const listApplications = ({ status, programId, studentId } = {}) => {
      let apps = data?.applications ?? []
      if (status) apps = apps.filter((a) => a.status === status)
      if (programId) apps = apps.filter((a) => a.programId === programId)
      if (studentId) apps = apps.filter((a) => a.studentId === studentId)
      return apps
    }

    const listSessions = ({ programId, coachId } = {}) => {
      let sessions = data?.coachingSessions ?? []
      if (programId) sessions = sessions.filter((s) => s.programId === programId)
      if (coachId) sessions = sessions.filter((s) => s.coachId === coachId)
      return sessions
    }

    const listDeliverables = ({ programId } = {}) => {
      let deliverables = data?.deliverables ?? []
      if (programId) deliverables = deliverables.filter((d) => d.programId === programId)
      return deliverables
    }

    const listMessages = ({ userId } = {}) => {
      let messages = data?.messages ?? []
      if (userId) {
        messages = messages.filter((m) => m.senderId === userId || m.receiverId === userId)
      }
      return messages
    }

    // ===================
    // NOTIFICATIONS (LOCAL)
    // ===================

    const listNotifications = ({ userId, unreadOnly, limit } = {}) => {
      const all = data?.notifications ?? []
      let filtered = userId ? all.filter((n) => n.userId === userId) : all
      if (unreadOnly) filtered = filtered.filter((n) => !n.readAt)
      filtered = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      if (limit && Number.isFinite(limit)) filtered = filtered.slice(0, Math.max(0, limit))
      return filtered
    }

    const createNotification = async ({ userId, title, message, type, linkUrl, meta } = {}) => {
      await sleep(10)
      if (!userId) throw new Error('Missing userId')
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
      setData({
        ...data,
        notifications: [notification, ...(data?.notifications ?? [])],
      })
      return notification
    }

    const markNotificationRead = async ({ notificationId } = {}) => {
      await sleep(10)
      if (!notificationId) throw new Error('Missing notificationId')
      const now = new Date().toISOString()
      setData({
        ...data,
        notifications: (data?.notifications ?? []).map((n) =>
          n.id === notificationId ? { ...n, readAt: n.readAt ?? now } : n,
        ),
      })
      return { success: true }
    }

    const markAllNotificationsRead = async ({ userId } = {}) => {
      await sleep(10)
      if (!userId) throw new Error('Missing userId')
      const now = new Date().toISOString()
      setData({
        ...data,
        notifications: (data?.notifications ?? []).map((n) =>
          n.userId === userId ? { ...n, readAt: n.readAt ?? now } : n,
        ),
      })
      return { success: true }
    }

    // ===================
    // PROJECTS (LOCAL)
    // ===================

    const getProjectById = (id) => (data?.projects ?? []).find((p) => p.id === id) ?? null

    const listProjectSubmissions = ({ projectId } = {}) => {
      const all = data?.projectSubmissions ?? []
      const filtered = projectId ? all.filter((s) => s.projectId === projectId) : all
      return [...filtered].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    }

    const listProjects = ({ studentId, coachId } = {}) => {
      let projects = data?.projects ?? []

      if (studentId) {
        projects = projects.filter((p) => p.studentId === studentId)
      }

      if (coachId) {
        const coachedPrograms = (data?.programs ?? []).filter((p) => (p.coachIds ?? []).includes(coachId))
        const coachedStudentIds = new Set()
        coachedPrograms.forEach((p) => (p.participantStudentIds ?? []).forEach((sid) => coachedStudentIds.add(sid)))
        if (coachedStudentIds.size > 0) {
          projects = projects.filter((p) => coachedStudentIds.has(p.studentId))
        }
      }

      return [...projects].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    }

    const createProjectWithIdea = async ({ studentId, idea }) => {
      await sleep(100)
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

      const next = {
        ...data,
        projects: [project, ...(data?.projects ?? [])],
        projectSubmissions: [...(data?.projectSubmissions ?? []), ideaSubmission],
      }
      setData(next)
      log({ type: 'project_created', actorId: studentId, meta: { projectId } })
      return { success: true, project, submission: ideaSubmission }
    }

    const addProjectSubmission = async ({ projectId, type, payload }) => {
      await sleep(100)
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

      const next = {
        ...data,
        projects: (data?.projects ?? []).map((p) => (p.id === projectId ? { ...p, updatedAt: now } : p)),
        projectSubmissions: [...(data?.projectSubmissions ?? []), submission],
      }
      setData(next)
      log({ type: 'project_submission_added', actorId: null, meta: { projectId, submissionId: submission.id, submissionType: type } })
      return { success: true, submission }
    }

    const addProjectSubmissionComment = async ({ submissionId, authorId, text }) => {
      await sleep(50)
      const content = String(text ?? '').trim()
      if (!content) return { success: false, error: 'Comment cannot be empty' }
      const now = new Date().toISOString()
      const comment = { id: makeId('c'), authorId, text: content, createdAt: now }

      const next = {
        ...data,
        projectSubmissions: (data?.projectSubmissions ?? []).map((s) =>
          s.id === submissionId
            ? { ...s, comments: [...(s.comments ?? []), comment], updatedAt: now }
            : s,
        ),
      }
      setData(next)
      return { success: true, comment }
    }

    const setProjectSubmissionStatus = async ({ submissionId, status, reviewerId }) => {
      await sleep(50)
      const nextStatus = Object.values(SubmissionStatus).includes(status) ? status : SubmissionStatus.pending
      const now = new Date().toISOString()

      const prevSub = (data?.projectSubmissions ?? []).find((s) => s.id === submissionId) ?? null

      const next = {
        ...data,
        projectSubmissions: (data?.projectSubmissions ?? []).map((s) => {
          if (s.id !== submissionId) return s
          const isReviewed = nextStatus !== SubmissionStatus.pending
          return {
            ...s,
            status: nextStatus,
            reviewerId: reviewerId ?? s.reviewerId,
            reviewedAt: isReviewed ? (s.reviewedAt ?? now) : null,
            updatedAt: now,
          }
        }),
      }

      if (prevSub && String(prevSub.status ?? '') !== String(nextStatus ?? '')) {
        const project = (data?.projects ?? []).find((p) => p.id === prevSub.projectId) ?? null
        const studentId = project?.studentId
        if (studentId) {
          const label = nextStatus === SubmissionStatus.approved ? 'approved' : nextStatus === SubmissionStatus.reviewed ? 'reviewed' : 'updated'
          const notification = {
            id: makeId('ntf'),
            userId: studentId,
            type: nextStatus === SubmissionStatus.approved ? 'success' : 'info',
            title: `Submission ${label}`,
            message: `Your ${String(prevSub.type).toUpperCase()} submission was ${label}.`,
            linkUrl: '/student/projects',
            meta: { submissionId: prevSub.id, projectId: prevSub.projectId, status: nextStatus, reviewerId: reviewerId ?? prevSub.reviewerId },
            createdAt: now,
            readAt: null,
          }
          next.notifications = [notification, ...(data?.notifications ?? [])]
        }
      }
      setData(next)
      return { success: true }
    }

    const setProjectStage = async ({ projectId, stage }) => {
      await sleep(50)
      const nextStage = normalizeStage(stage)
      const now = new Date().toISOString()

      const next = {
        ...data,
        projects: (data?.projects ?? []).map((p) => (p.id === projectId ? { ...p, stage: nextStage, updatedAt: now } : p)),
      }
      setData(next)
      return { success: true }
    }

    const sendMessage = async ({ senderId, receiverId, content }) => {
      // No sleep for immediate feedback in UI, or short sleep
      // await sleep(50)
      const now = new Date().toISOString()
      const newMessage = {
        id: makeId('m'),
        senderId,
        receiverId,
        content,
        sentAt: now,
        readAt: null,
      }
      
      const next = {
        ...data,
        messages: [...(data?.messages ?? []), newMessage],
      }
      setData(next)
      // log({ type: 'message_sent', actorId: senderId, meta: { messageId: newMessage.id } })
      return newMessage
    }

    const markAsRead = async ({ messageIds }) => {
      // await sleep(50)
      if (!messageIds || messageIds.length === 0) return
      
      const now = new Date().toISOString()
      const nextMessages = (data?.messages ?? []).map(m => 
        messageIds.includes(m.id) ? { ...m, readAt: now } : m
      )
      
      setData({ ...data, messages: nextMessages })
    }

    const log = (entry) => {
      const next = {
        ...data,
        activityLog: [
          {
            id: makeId('log'),
            at: new Date().toISOString(),
            ...entry,
          },
          ...(data?.activityLog ?? []),
        ].slice(0, 50),
      }
      setData(next)
    }

    const upsertProgram = async (program) => {
      await sleep(250)
      const now = new Date().toISOString()
      const programs = data?.programs ?? []
      const existingIdx = programs.findIndex((p) => p.id === program.id)

      const ensuredId = program.id ?? makeId('p')

      const nextProgram = {
        ...program,
        id: ensuredId,
        updatedAt: now,
        createdAt: program.createdAt ?? now,
        participantStudentIds: program.participantStudentIds ?? [],
        coachIds: program.coachIds ?? [],
      }

      const nextPrograms =
        existingIdx >= 0
          ? programs.map((p) => (p.id === program.id ? nextProgram : p))
          : [nextProgram, ...programs]

      setData({ ...data, programs: nextPrograms })
      log({ type: existingIdx >= 0 ? 'program_updated' : 'program_created', actorId: null, meta: { programId: nextProgram.id } })
      return nextProgram
    }

    const deleteProgram = async (programId) => {
      await sleep(250)
      const next = {
        ...data,
        programs: (data?.programs ?? []).filter((p) => p.id !== programId),
      }
      setData(next)
      log({ type: 'program_deleted', actorId: null, meta: { programId } })
    }

    const upsertUser = async (user) => {
      await sleep(250)
      const now = new Date().toISOString()
      const users = data?.users ?? []
      const existingIdx = users.findIndex((u) => u.id === user.id)

      const ensuredId = user.id ?? makeId('u')

      const nextUser = {
        ...user,
        id: ensuredId,
        updatedAt: now,
        createdAt: user.createdAt ?? now,
      }

      const nextUsers =
        existingIdx >= 0
          ? users.map((u) => (u.id === user.id ? nextUser : u))
          : [nextUser, ...users]

      setData({ ...data, users: nextUsers })
      log({ type: existingIdx >= 0 ? 'user_updated' : 'user_created', actorId: null, meta: { userId: nextUser.id } })
      return nextUser
    }

    const deleteUser = async (userId) => {
      await sleep(250)
      const next = {
        ...data,
        users: (data?.users ?? []).filter((u) => u.id !== userId),
      }
      setData(next)
      log({ type: 'user_deleted', actorId: null, meta: { userId } })
    }

    const createApplication = async ({ programId, studentId, motivation } = {}) => {
      await sleep(250)

      if (!programId || !studentId) throw new Error('Missing programId or studentId')
      const program = getProgramById(programId)
      if (!program) throw new Error('Program not found')

      const apps = data?.applications ?? []
      const existing = apps.find((a) => a.programId === programId && a.studentId === studentId)
      if (existing) throw new Error('You already applied to this program.')

      const now = new Date().toISOString()
      const application = {
        id: makeId('app'),
        programId,
        studentId,
        status: 'pending',
        motivation: motivation ?? null,
        decisionNote: null,
        reviewedBy: null,
        createdAt: now,
        updatedAt: now,
      }

      const next = {
        ...data,
        applications: [application, ...apps],
      }
      setData(next)
      log({ type: 'application_created', actorId: studentId, meta: { applicationId: application.id, programId } })
      return application
    }

    const setApplicationStatus = async ({ applicationId, status, decisionNote, actorId }) => {
      await sleep(250)
      const apps = data?.applications ?? []
      const now = new Date().toISOString()
      const app = apps.find((a) => a.id === applicationId)
      if (!app) throw new Error('Application not found')

      const updated = {
        ...app,
        status,
        decisionNote: decisionNote ?? app.decisionNote,
        updatedAt: now,
      }

      let nextPrograms = data?.programs ?? []
      if (status === 'accepted') {
        const program = getProgramById(app.programId)
        if (program) {
          const enrolled = new Set(program.participantStudentIds ?? [])
          enrolled.add(app.studentId)
          nextPrograms = nextPrograms.map((p) =>
            p.id === program.id
              ? { ...p, participantStudentIds: Array.from(enrolled), updatedAt: now }
              : p,
          )
        }
      }

      const next = {
        ...data,
        applications: apps.map((a) => (a.id === applicationId ? updated : a)),
        programs: nextPrograms,
      }

      if (app.studentId) {
        const normalized = String(status ?? '').toLowerCase()
        const label = normalized === 'accepted' ? 'accepted' : normalized === 'rejected' ? 'rejected' : normalized || 'updated'
        const notification = {
          id: makeId('ntf'),
          userId: app.studentId,
          type: label === 'accepted' ? 'success' : label === 'rejected' ? 'danger' : 'info',
          title: 'Application update',
          message: `Your program application was ${label}.`,
          linkUrl: '/student/applications',
          meta: { applicationId, programId: app.programId, status },
          createdAt: now,
          readAt: null,
        }
        next.notifications = [notification, ...(data?.notifications ?? [])]
      }

      setData(next)
      log({ type: 'application_status_updated', actorId: actorId ?? null, meta: { applicationId, status } })
      return updated
    }

    const assignCoachToProgram = async ({ programId, coachId }) => {
      await sleep(250)
      const now = new Date().toISOString()
      const programs = data?.programs ?? []
      const program = programs.find((p) => p.id === programId)
      if (!program) throw new Error('Program not found')

      const nextCoachIds = Array.from(new Set([...(program.coachIds ?? []), coachId]))
      const nextPrograms = programs.map((p) =>
        p.id === programId ? { ...p, coachIds: nextCoachIds, updatedAt: now } : p,
      )
      setData({ ...data, programs: nextPrograms })
      log({ type: 'coach_assigned', actorId: null, meta: { programId, coachId } })
    }

    const assignStudentToProgram = async ({ programId, studentId }) => {
      await sleep(250)
      const now = new Date().toISOString()
      const programs = data?.programs ?? []
      const program = programs.find((p) => p.id === programId)
      if (!program) throw new Error('Program not found')

      const nextStudentIds = Array.from(
        new Set([...(program.participantStudentIds ?? []), studentId]),
      )
      const nextPrograms = programs.map((p) =>
        p.id === programId
          ? { ...p, participantStudentIds: nextStudentIds, updatedAt: now }
          : p,
      )
      setData({ ...data, programs: nextPrograms })
      log({ type: 'student_assigned', actorId: null, meta: { programId, studentId } })
    }

    return {
      hydrated: state.hydrated,
      data,
      reset,
      // Notifications
      listNotifications,
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
      sendMessage,
      markAsRead,
      // Projects
      getProjectById,
      listProjects,
      listProjectSubmissions,
      createProjectWithIdea,
      addProjectSubmission,
      addProjectSubmissionComment,
      setProjectSubmissionStatus,
      setProjectStage,
      upsertProgram,
      deleteProgram,
      upsertUser,
      deleteUser,
      setApplicationStatus,
      createApplication,
      assignCoachToProgram,
      assignStudentToProgram,
    }
  }, [state.hydrated, state.data, setData, reset])

  return <DataContext.Provider value={api}>{children}</DataContext.Provider>
}
