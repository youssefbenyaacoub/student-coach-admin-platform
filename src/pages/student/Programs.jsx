import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Calendar, Users, Target, CheckCircle } from 'lucide-react'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast'
import { useProgramManagement } from '../../hooks/useProgramManagement'
import { formatDate } from '../../utils/time'

export default function StudentPrograms() {
  const { currentUser } = useAuth()
  const { data, createApplication } = useData()
  const { showToast } = useToast()
  const {
    templates,
    instances,
    templateDetailsById,
    instanceDetailsById,
    fetchTemplateDetails,
    fetchInstanceDetails,
    createInstanceFromTemplate,
    submitInstanceTask,
    subscribeToInstanceTasks,
  } = useProgramManagement()

  const [selectedProgram, setSelectedProgram] = useState(null)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [roadmapOpen, setRoadmapOpen] = useState(false)
  const [selectedInstanceId, setSelectedInstanceId] = useState(null)

  const { enrolledPrograms, availablePrograms } = useMemo(() => {
    if (!currentUser?.id || !data) return { enrolledPrograms: [], availablePrograms: [] }

    const enrolled = (data.programs ?? []).filter((p) =>
      p.participantStudentIds.includes(currentUser.id)
    )
    const available = (data.programs ?? []).filter(
      (p) =>
        !p.participantStudentIds.includes(currentUser.id) &&
        p.status === 'active'
    )

    return { enrolledPrograms: enrolled, availablePrograms: available }
  }, [currentUser, data])

  const programStats = useMemo(() => {
    if (!data) return {}

    const stats = {}
    const allPrograms = [...enrolledPrograms, ...availablePrograms]

    allPrograms.forEach((program) => {
      const sessions = (data.coachingSessions ?? []).filter(
        (s) => s.programId === program.id
      ).length
      const deliverables = (data.deliverables ?? []).filter(
        (d) => d.programId === program.id
      ).length
      const coaches = (data.users ?? []).filter((u) => program.coachIds.includes(u.id))

      stats[program.id] = {
        sessions,
        deliverables,
        students: program.participantStudentIds.length,
        coaches,
      }
    })
    return stats
  }, [enrolledPrograms, availablePrograms, data])

  const activeTemplates = useMemo(() => templates.filter((t) => t.isActive), [templates])
  const myInstances = useMemo(() => {
    if (!currentUser?.id) return []
    return (instances ?? []).filter((i) => i.studentId === currentUser.id)
  }, [currentUser?.id, instances])

  const selectedInstanceDetails = useMemo(() => {
    if (!selectedInstanceId) return null
    return instanceDetailsById[selectedInstanceId] ?? null
  }, [instanceDetailsById, selectedInstanceId])

  const selectedInstance = selectedInstanceDetails?.instance ?? null
  const selectedTasks = selectedInstanceDetails?.tasks ?? []
  const selectedTemplateDetails = selectedInstance
    ? templateDetailsById[selectedInstance.templateId] ?? null
    : null

  useEffect(() => {
    if (!roadmapOpen || !selectedInstanceId) return
    let cancelled = false
      ; (async () => {
        try {
          const details = await fetchInstanceDetails(selectedInstanceId)
          if (cancelled) return
          if (details?.instance?.templateId) {
            await fetchTemplateDetails(details.instance.templateId)
          }
          await subscribeToInstanceTasks(selectedInstanceId)
        } catch (e) {
          showToast(e?.message ?? 'Failed to load roadmap', 'error')
        }
      })()
    return () => {
      cancelled = true
    }
  }, [fetchInstanceDetails, fetchTemplateDetails, roadmapOpen, selectedInstanceId, showToast, subscribeToInstanceTasks])

  const openRoadmap = (instanceId) => {
    setSelectedInstanceId(instanceId)
    setRoadmapOpen(true)
  }

  const closeRoadmap = () => {
    setRoadmapOpen(false)
    setSelectedInstanceId(null)
  }

  const handleStartTemplate = async (templateId) => {
    try {
      const instanceId = await createInstanceFromTemplate({ templateId })
      showToast('Program started! Your roadmap is ready.', 'success')
      if (instanceId) openRoadmap(instanceId)
    } catch (e) {
      showToast(e?.message ?? 'Failed to start program', 'error')
    }
  }

  const handleSubmitTask = async (taskId) => {
    const note = window.prompt('Paste a submission link or note for your coach:', '')
    if (note === null) return
    try {
      await submitInstanceTask({ taskId, submission: { note } })
      showToast('Submitted for review.', 'success')
    } catch (e) {
      showToast(e?.message ?? 'Failed to submit task', 'error')
    }
  }

  const handleEnroll = (program) => {
    setSelectedProgram(program)
    setShowEnrollModal(true)
  }

  const confirmEnroll = async () => {
    if (!currentUser?.id || !selectedProgram?.id) return

    try {
      await createApplication({
        programId: selectedProgram.id,
        studentId: currentUser.id,
      })
      showToast('Application submitted successfully!', 'success')
    } catch (error) {
      const msg = error?.message || 'Failed to submit application.'
      showToast(msg, 'error')
    } finally {
      setShowEnrollModal(false)
      setSelectedProgram(null)
    }
  }

  const getProgramProgress = (programId) => {
    if (!currentUser?.id) return 0

    const deliverables = (data?.deliverables ?? []).filter(
      (d) => d.programId === programId && d.assignedStudentIds.includes(currentUser.id)
    )

    if (deliverables.length === 0) return 0

    const completed = deliverables.filter((d) => {
      const submission = d.submissions?.find((s) => s.studentId === currentUser.id)
      return submission?.status === 'graded'
    }).length

    return Math.round((completed / deliverables.length) * 100)
  }

  const [expandedProgramId, setExpandedProgramId] = useState(null)

  const toggleExpand = (id) => {
    setExpandedProgramId(expandedProgramId === id ? null : id)
  }

  // Helper to get sessions for a program
  const getProgramSessions = (programId) => {
    return (data.coachingSessions ?? []).filter(
      (s) => s.programId === programId && (s.attendeeStudentIds ?? []).includes(currentUser?.id)
    ).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
  }

  // Helper to get deliverables for a program
  const getProgramDeliverables = (programId) => {
    return (data.deliverables ?? []).filter(
      (d) => d.programId === programId && (d.assignedStudentIds ?? []).includes(currentUser?.id)
    ).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white">Programs & Roadmaps</h1>
        <p className="mt-2 text-lg text-slate-500 font-medium">
          Manage your active learning paths and explore new opportunities.
        </p>
      </header>

      {/* SECTION 1: ACTIVE LEARNING */}
      <div className="space-y-6">
        <h2 className="text-xl font-heading font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-student-primary" />
          Active Learning
        </h2>

        {myInstances.length === 0 && enrolledPrograms.length === 0 ? (
          <Card className="bg-slate-50 border-dashed dark:bg-slate-900/30">
            <div className="py-12 text-center">
              <div className="mx-auto h-16 w-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4 shadow-sm">
                <Target className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Start your journey</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2">
                You haven't enrolled in any programs or started any roadmaps yet. Browse the discovery section below to get started.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Template-based Roadmaps */}
            {myInstances.map((inst) => {
              const tpl = templates.find((t) => t.id === inst.templateId)
              return (
                <Card key={inst.id} className="overflow-hidden">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">
                        <Target className="h-3 w-3" />
                        Dynamic Roadmap
                      </div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">{tpl?.name ?? 'Program'}</div>
                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{tpl?.description ?? ''}</div>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 px-4 py-2 rounded-xl bg-student-primary text-white text-sm font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                      onClick={() => openRoadmap(inst.id)}
                    >
                      Open Roadmap
                    </button>
                  </div>
                </Card>
              )
            })}

            {/* Classical Programs */}
            {enrolledPrograms.map((program) => {
              const stats = programStats[program.id] ?? {}
              const progress = getProgramProgress(program.id)
              const isExpanded = expandedProgramId === program.id
              const progSessions = getProgramSessions(program.id).slice(0, 2)
              const progDeliverables = getProgramDeliverables(program.id).slice(0, 2)

              return (
                <Card key={program.id} className={`transition-all duration-300 ${isExpanded ? 'md:col-span-2 shadow-lg' : ''}`}>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">
                          <Users className="h-3 w-3" />
                          Classroom Program
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{program.name}</h3>
                      </div>
                      <StatusBadge value={program.status} />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold uppercase text-slate-500">
                        <span>Completion</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-student-primary transition-all duration-1000"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-2">
                      <div className="flex -space-x-2">
                        {stats.coaches?.slice(0, 3).map((c, i) => (
                          <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-slate-200 dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600" title={c.name}>
                            {c.name.charAt(0)}
                          </div>
                        ))}
                        {stats.coaches?.length > 3 && (
                          <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-100 dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                            +{stats.coaches.length - 3}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleExpand(program.id)}
                        className="text-xs font-bold text-student-primary hover:underline flex items-center gap-1"
                      >
                        {isExpanded ? 'Show Less' : 'View Details'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid gap-6 sm:grid-cols-2">
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                              <Calendar className="h-3 w-3" /> Upcoming Sessions
                            </h4>
                            {progSessions.length > 0 ? (
                              progSessions.map(s => (
                                <div key={s.id} className="text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 group hover:border-student-primary transition-colors">
                                  <div className="font-bold text-slate-700 dark:text-slate-200 truncate">{s.title}</div>
                                  <div className="text-slate-500 mt-1">{formatDate(s.startsAt)}</div>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-slate-400 italic py-2">No upcoming sessions.</div>
                            )}
                          </div>
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                              <Target className="h-3 w-3" /> Pending Tasks
                            </h4>
                            {progDeliverables.length > 0 ? (
                              progDeliverables.map(d => (
                                <div key={d.id} className="text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 group hover:border-student-primary transition-colors">
                                  <div className="font-bold text-slate-700 dark:text-slate-200 truncate">{d.title}</div>
                                  <div className="text-slate-500 mt-1">Due: {formatDate(d.dueDate)}</div>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-slate-400 italic py-2">No pending tasks.</div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => navigate('/student/deliverables')}
                          className="mt-6 w-full py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors dark:bg-white dark:text-slate-900"
                        >
                          Go to full program view
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: DISCOVERY */}
      <div className="space-y-6 pt-6">
        <h2 className="text-xl font-heading font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Target className="h-5 w-5 text-indigo-500" />
          Discover New Opportunities
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Template Discovery */}
          {activeTemplates.map((tpl) => (
            <Card key={tpl.id} className="flex flex-col">
              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-lg transform -rotate-3">
                    <BookOpen size={20} />
                  </div>
                  <StatusBadge value="open" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">{tpl.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3">{tpl.description}</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <Users size={12} />
                  Dynamic Learning
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors dark:bg-white dark:text-slate-900 shadow-md shadow-slate-900/10"
                  onClick={() => handleStartTemplate(tpl.id)}
                >
                  Start Now
                </button>
                <button
                  type="button"
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors dark:border-slate-700 dark:text-slate-200"
                  onClick={async () => {
                    try {
                      await fetchTemplateDetails(tpl.id)
                      showToast('Preview loaded. Close and press "Start Now" to begin.', 'info')
                    } catch (e) {
                      showToast('Failed to load preview', 'error')
                    }
                  }}
                >
                  Preview
                </button>
              </div>
            </Card>
          ))}

          {/* Classic Program Discovery */}
          {availablePrograms.map((program) => {
            const stats = programStats[program.id] ?? {}
            const existingApp = (data?.applications ?? []).find(
              (a) => a.programId === program.id && a.studentId === currentUser?.id,
            )
            const alreadyApplied = Boolean(existingApp)

            return (
              <Card key={program.id} className="flex flex-col">
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-lg transform rotate-3">
                      <Users size={20} />
                    </div>
                    <StatusBadge value={program.status} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">{program.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3">{program.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      <Calendar size={10} /> {stats.sessions} Sessions
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      <Target size={10} /> {stats.deliverables} Tasks
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={alreadyApplied}
                  onClick={() => handleEnroll(program)}
                  className={`mt-6 w-full rounded-xl py-2.5 text-sm font-bold text-white shadow-lg transition-all ${alreadyApplied
                      ? 'bg-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 hover:shadow-xl active:scale-95'
                    }`}
                >
                  {alreadyApplied ? 'Already Applied' : 'Enroll Now'}
                </button>
              </Card>
            ))}
        </div>

        {activeTemplates.length === 0 && availablePrograms.length === 0 && (
          <Card className="bg-slate-50 border-dashed py-12 text-center text-slate-500">
            No new programs available at the moment.
          </Card>
        )}
      </div>

      {/* MODALS */}
      {roadmapOpen && (
        <Modal
          isOpen={roadmapOpen}
          onClose={closeRoadmap}
          title={templates.find((t) => t.id === selectedInstance?.templateId)?.name ?? 'Program Roadmap'}
        >
          {!selectedInstance ? (
            <div className="text-sm text-slate-500">Loading instance…</div>
          ) : (
            <div className="space-y-6">
              {/* Progress Summary */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">Overall Progress</div>
                    <div className="text-xs text-slate-500">Tasks approved drive your milestones</div>
                  </div>
                  <div className="text-sm font-bold text-student-primary">
                    {selectedTasks.filter((t) => t.status === 'approved').length} / {selectedTasks.length} approved
                  </div>
                </div>
              </div>

              {selectedTemplateDetails?.stages?.length ? (
                <div className="space-y-8">
                  {selectedTemplateDetails.stages.map((stage) => {
                    const stageContents = (selectedTemplateDetails.contents ?? []).filter((c) => c.stageId === stage.id)
                    const stageTasks = selectedTasks.filter((t) => t.stageId === stage.id)
                    const stageApproved = stageTasks.filter((t) => t.status === 'approved').length

                    return (
                      <div key={stage.id} className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{stage.name}</h3>
                          <span className="text-xs font-bold text-slate-400">
                            {stageApproved}/{stageTasks.length} Complete
                          </span>
                        </div>

                        {stageContents.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Resources</label>
                            <div className="grid gap-2">
                              {stageContents.map((item) => (
                                <a
                                  key={item.id}
                                  href={item.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-student-primary hover:bg-blue-50/30 transition-all dark:border-slate-800 dark:hover:border-student-primary"
                                >
                                  <div className="min-w-0">
                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{item.title}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5 uppercase">{item.contentType}</div>
                                  </div>
                                  <ArrowRight size={14} className="text-student-primary" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Tasks</label>
                          {stageTasks.length === 0 ? (
                            <div className="text-xs text-slate-400 italic">No tasks.</div>
                          ) : (
                            <div className="grid gap-2">
                              {stageTasks.map((task) => (
                                <div key={task.id} className="p-4 rounded-xl border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900/20">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{task.title}</div>
                                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                                    </div>
                                    <StatusBadge value={task.status} />
                                  </div>
                                  {task.status !== 'approved' && (
                                    <button
                                      onClick={() => handleSubmitTask(task.id)}
                                      className="mt-3 w-full py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors dark:bg-white dark:text-slate-900"
                                    >
                                      Submit Work
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500">Loading syllabus…</div>
              )}
            </div>
          )}
        </Modal>
      )}

      {showEnrollModal && selectedProgram && (
        <Modal
          title={`Enroll in ${selectedProgram.name}`}
          onClose={() => setShowEnrollModal(false)}
          footer={
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                className="flex-1 rounded-xl px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                onClick={() => setShowEnrollModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-indigo-700 active:scale-95 transition-all shadow-indigo-600/20"
                onClick={confirmEnroll}
              >
                Confirm Enrollment
              </button>
            </div>
          }
        >
          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-50 p-6 border border-slate-100 dark:bg-slate-900/50 dark:border-slate-800">
              <h3 className="font-heading font-bold text-slate-900 text-lg mb-2 dark:text-white">{selectedProgram.name}</h3>
              <p className="text-sm text-slate-600 leading-relaxed dark:text-slate-400">
                {selectedProgram.description}
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-widest border-b border-slate-100 pb-2">Terms of Participation</h4>
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <CheckCircle className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Regular attendance at all scheduled coaching sessions.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <CheckCircle className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Active engagement and timely submission of all deliverables.</p>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

