import { useMemo, useState } from 'react'
import { BookOpen, Calendar, Users, Target, CheckCircle } from 'lucide-react'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast'
import { formatDate } from '../../utils/time'

export default function StudentPrograms() {
  const { currentUser } = useAuth()
  const { data } = useData()
  const { showToast } = useToast()
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [showEnrollModal, setShowEnrollModal] = useState(false)

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

  const handleEnroll = (program) => {
    setSelectedProgram(program)
    setShowEnrollModal(true)
  }

  const confirmEnroll = () => {
    showToast('Application submitted successfully!', 'success')
    setShowEnrollModal(false)
    setSelectedProgram(null)
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white">Programs</h1>
        <p className="mt-2 text-lg text-slate-500 font-medium">
          Browse and enroll in world-class entrepreneurship programs designed to help you scale.
        </p>
      </div>

      {enrolledPrograms.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-heading font-bold text-slate-800 flex items-center gap-2">
             <CheckCircle className="h-5 w-5 text-student-primary" />
             My Programs
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {enrolledPrograms.map((program) => {
              const stats = programStats[program.id] ?? {}
              const progress = getProgramProgress(program.id)

              return (
                <div key={program.id} className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-lg dark:bg-slate-800 dark:border-slate-700">
                   <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                       <Target className="h-32 w-32 rotate-12" />
                   </div>

                  <div className="flex items-start gap-4 relative z-10">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
                       <BookOpen className="h-7 w-7" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-white group-hover:text-student-primary transition-colors">{program.name}</h3>
                          <StatusBadge value={program.status} />
                        </div>
                        <p className="mt-2 text-sm text-slate-500 leading-relaxed line-clamp-2 dark:text-slate-400">
                          {program.description}
                        </p>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="space-y-1">
                           <div className="flex justify-between text-xs font-bold uppercase text-slate-500">
                                <span>Progress</span>
                                <span>{progress}%</span>
                           </div>
                           <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                               <div className="h-full bg-student-primary rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                           </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs font-medium text-slate-500 mt-2">
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {stats.sessions} sessions
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                          <Target className="h-3.5 w-3.5 text-slate-400" />
                          {stats.deliverables} deliverables
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-50 mt-2">
                        <Users className="h-3 w-3" />
                        {stats.coaches && stats.coaches.length > 0 ? (
                           <span>Mapped Coach: <span className="text-slate-700 font-bold">{stats.coaches.map((c) => c.name).join(', ')}</span></span>
                        ) : 'No coach assigned'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-6 pt-4">
        <h2 className="text-xl font-heading font-bold text-slate-800 flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-500" />
            Available Programs <span className="text-sm font-medium text-slate-400 ml-2 bg-slate-100 px-2 py-0.5 rounded-full">{availablePrograms.length}</span>
        </h2>
        
        {availablePrograms.length === 0 ? (
          <Card className="bg-slate-50 border-dashed">
            <div className="py-12 text-center">
               <div className="mx-auto h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                   <BookOpen className="h-8 w-8" />
               </div>
               <h3 className="text-lg font-bold text-slate-900">No programs available</h3>
               <p className="text-slate-500">Check back later for new enrollment opportunities!</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availablePrograms.map((program) => {
              const stats = programStats[program.id] ?? {}

              return (
                <div key={program.id} className="flex flex-col rounded-2xl bg-white p-6 shadow-sm border border-slate-200 transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                           <span className="font-heading font-bold text-xl">{program.name.charAt(0)}</span>
                      </div>
                      <StatusBadge value={program.status} />
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-heading font-bold text-slate-900 mb-2">{program.name}</h3>
                        <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                        {program.description}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-xs font-bold text-slate-600">
                             <Calendar className="h-3.5 w-3.5" />
                             {stats.sessions} Sessions
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-xs font-bold text-slate-600">
                             <Users className="h-3.5 w-3.5" />
                             {stats.students} Enrolled
                        </span>
                    </div>

                    <div className="text-xs font-medium text-slate-400 flex items-center gap-2 pt-2 border-t border-slate-100">
                       <span>{formatDate(program.startDate)}</span>
                       <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
                       <span>{formatDate(program.endDate)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-6 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 hover:shadow-xl active:scale-95"
                    onClick={() => handleEnroll(program)}
                  >
                    Apply Now
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showEnrollModal && selectedProgram && (
        <Modal
          title={`Apply to ${selectedProgram.name}`}
          onClose={() => setShowEnrollModal(false)}
          footer={
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                onClick={() => setShowEnrollModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="flex-1 rounded-xl bg-student-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-blue-600 active:scale-95 transition-all" 
                onClick={confirmEnroll}
              >
                Confirm Application
              </button>
            </div>
          }
        >
          <div className="space-y-6">
            <div className="rounded-xl bg-slate-50 p-6 border border-slate-100">
              <h3 className="font-heading font-bold text-slate-900 text-lg mb-2">{selectedProgram.name}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {selectedProgram.description}
              </p>
            </div>
            
            <div className="space-y-3">
                <div className="flex gap-3 items-start">
                    <CheckCircle className="h-5 w-5 text-student-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-600">I confirm that I can attend the scheduled sessions.</p>
                </div>
                <div className="flex gap-3 items-start">
                    <CheckCircle className="h-5 w-5 text-student-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-600">I am committed to completing all required deliverables.</p>
                </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

