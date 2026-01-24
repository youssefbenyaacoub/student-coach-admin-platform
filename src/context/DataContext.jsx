import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { seedData } from '../data/mockData'
import { makeId } from '../utils/ids'
import { storage } from '../utils/storage'
import { sleep } from '../utils/time'
import { DataContext } from './DataContextBase'

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
  if (existing && existing.users && existing.programs) return existing
  const seeded = deepClone(seedData)
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
      upsertProgram,
      deleteProgram,
      upsertUser,
      deleteUser,
      setApplicationStatus,
      assignCoachToProgram,
      assignStudentToProgram,
    }
  }, [state.hydrated, state.data, setData, reset])

  return <DataContext.Provider value={api}>{children}</DataContext.Provider>
}
