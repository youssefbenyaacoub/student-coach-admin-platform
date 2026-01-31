import { useMemo } from 'react'
import { BookOpen, Calendar, MapPin, Video, Download, ExternalLink, Users } from 'lucide-react'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { formatDate } from '../../utils/time'
import { useNavigate } from 'react-router-dom'

export default function StudentPrograms() {
  const { currentUser } = useAuth()
  const { data } = useData()
  const navigate = useNavigate()

  const { enrolledPrograms, availablePrograms } = useMemo(() => {
    if (!currentUser?.id || !data) return { enrolledPrograms: [], availablePrograms: [] }

    const enrolled = (data.programs ?? []).filter((p) =>
      (p.participantStudentIds ?? []).includes(currentUser.id)
    )
    const available = (data.programs ?? []).filter(
      (p) =>
        !(p.participantStudentIds ?? []).includes(currentUser.id) &&
        p.status === 'open'
    )

    return { enrolledPrograms: enrolled, availablePrograms: available }
  }, [currentUser, data])

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-heading font-bold text-slate-900 dark:text-white">Programs & Resources</h1>
          <p className="mt-2 text-lg text-slate-500 font-medium max-w-2xl">
            Access your learning materials, check delivery details, and manage your journey.
          </p>
        </div>
        <button
          onClick={() => navigate('/student/calendar')}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-student-primary text-white font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95"
        >
          <Calendar className="h-5 w-5" />
          View Program Calendar
        </button>
      </header>

      {/* SECTION: ENROLLED PROGRAMS */}
      <section className="space-y-6">
        <h2 className="text-xl font-heading font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-student-primary" />
          Your Active Paths
        </h2>

        {enrolledPrograms.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center bg-slate-50/50">
            <div className="mx-auto h-16 w-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 mb-4">
              <BookOpen className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Not enrolled yet</h3>
            <p className="text-slate-500 mt-1">Explore available programs below to get started.</p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {enrolledPrograms.map((program) => (
              <Card key={program.id} className="group relative overflow-hidden !p-0 rounded-3xl border-none shadow-xl shadow-slate-200/50">
                {/* Header Decoration */}
                <div className="h-2 w-full bg-gradient-to-r from-student-primary to-indigo-500" />

                <div className="p-8 space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <StatusBadge value={program.status} />
                      <h3 className="mt-3 text-2xl font-bold text-slate-900">{program.name}</h3>
                    </div>
                  </div>

                  {/* Delivery Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-2xl border ${program.deliveryMode === 'online' ? 'bg-blue-50 border-blue-100' : 'bg-emerald-50 border-emerald-100'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {program.deliveryMode === 'online' ? <Video className="h-4 w-4 text-blue-600" /> : <MapPin className="h-4 w-4 text-emerald-600" />}
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mode</span>
                      </div>
                      <div className="font-bold text-slate-800 capitalize">{program.deliveryMode}</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-slate-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Capacity</span>
                      </div>
                      <div className="font-bold text-slate-800">{program.participantStudentIds?.length || 0} / {program.capacity}</div>
                    </div>
                  </div>

                  {/* Dynamic Location/Link */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Location Details</label>
                    {program.deliveryMode === 'online' ? (
                      <a
                        href={program.meetLink || '#'}
                        target="_blank"
                        className="flex items-center justify-between p-4 rounded-2xl bg-white border border-blue-100 text-blue-600 hover:bg-blue-50 transition-colors group/link"
                      >
                        <span className="font-bold truncate">{program.meetLink || 'Link not set yet'}</span>
                        <ExternalLink className="h-4 w-4 shrink-0" />
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-100 text-slate-700">
                        <MapPin className="h-5 w-5 text-student-primary" />
                        <span className="font-bold">{program.location || 'Building A, Room 302'}</span>
                      </div>
                    )}
                  </div>

                  {/* Resources Section */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Program Resources</label>
                    <div className="grid gap-2">
                      {(program.resources || []).length > 0 ? (
                        program.resources.map((res, idx) => (
                          <a
                            key={idx}
                            href={res.url}
                            target="_blank"
                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100 hover:text-student-primary transition-all text-sm font-bold"
                          >
                            <Download className="h-4 w-4" />
                            {res.title}
                          </a>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 italic">No resources uploaded yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* SECTION: DISCOVERY */}
      <section className="space-y-6 pt-10">
        <h2 className="text-xl font-heading font-bold text-slate-800 dark:text-white">Explore Programs</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {availablePrograms.map(program => (
            <Card key={program.id} className="flex flex-col h-full rounded-3xl border-slate-100 hover:shadow-lg transition-all">
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">Open</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg mb-1">{program.name}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2">{program.description}</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 capitalize">
                  {program.deliveryMode === 'online' ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                  {program.deliveryMode} • {program.durationWeeks} Weeks
                </div>
              </div>
              <button
                onClick={() => navigate('/student/applications')}
                className="mt-6 w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all"
              >
                Apply Now
              </button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
