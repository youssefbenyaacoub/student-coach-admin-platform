import { useMemo } from 'react'
import { ClipboardList, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import EmptyState from '../../components/common/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { formatDate } from '../../utils/time'

export default function StudentApplications() {
  const { currentUser } = useAuth()
  const { data } = useData()
  const navigate = useNavigate()

  const myApplications = useMemo(() => {
    if (!currentUser?.id || !data) return []

    return (data.applications ?? [])
      .filter((app) => app.studentId === currentUser.id)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
  }, [currentUser, data])

  const applicationStats = useMemo(() => {
    const pending = myApplications.filter((a) => a.status === 'pending').length
    const approved = myApplications.filter((a) => a.status === 'approved').length
    const rejected = myApplications.filter((a) => a.status === 'rejected').length

    return { total: myApplications.length, pending, approved, rejected }
  }, [myApplications])

  const getProgramName = (programId) => {
    const program = (data?.programs ?? []).find((p) => p.id === programId)
    return program?.name ?? 'Unknown Program'
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5" />
      case 'rejected':
        return <XCircle className="h-5 w-5" />
      default:
        return <Clock className="h-5 w-5" />
    }
  }

  if (myApplications.length === 0) {
    return (
      <div className="space-y-6">
        <div>
           <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white">My Applications</h1>
           <p className="mt-2 text-lg text-slate-500 font-medium">Track the status of your program applications.</p>
        </div>
        <EmptyState
          icon={ClipboardList}
          title="No Applications Found"
          description="You haven't applied to any programs yet. Browse available programs to get started."
          actionLabel="Browse Programs"
          onAction={() => navigate('/student/programs')}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white">My Applications</h1>
        <p className="mt-2 text-lg text-slate-500 font-medium">
            Track the status of your program applications.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 flex items-center gap-4 dark:bg-slate-800 dark:border-slate-700">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-900/20">
               <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</p>
              <h3 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">{applicationStats.total}</h3>
            </div>
        </div>
        
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 flex items-center gap-4 dark:bg-slate-800 dark:border-slate-700">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-900/20">
               <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending</p>
              <h3 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">{applicationStats.pending}</h3>
            </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 flex items-center gap-4 dark:bg-slate-800 dark:border-slate-700">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-900/20">
               <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Approved</p>
              <h3 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">{applicationStats.approved}</h3>
            </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-white">Recent Applications</h2>
        <div className="grid gap-4">
          {myApplications.map((app) => (
            <div key={app.id} className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-200 transition-all hover:shadow-md hover:border-blue-200 dark:bg-slate-800 dark:border-slate-700">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div className="flex items-start gap-4">
                     <div className="hidden md:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 font-bold text-lg dark:bg-slate-700">
                         {getProgramName(app.programId).charAt(0)}
                     </div>
                     <div>
                         <div className="flex items-center gap-3 mb-1">
                             <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">{getProgramName(app.programId)}</h3>
                             <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1 ${
                                 app.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                 app.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                 'bg-amber-50 text-amber-700 border-amber-200'
                             }`}>
                                 {getStatusIcon(app.status)}
                                 {app.status}
                             </div>
                         </div>
                         <p className="text-sm text-slate-500 font-medium">Submitted on {formatDate(app.submittedAt)}</p>
                     </div>
                 </div>

                 <div className="flex items-center gap-4 md:ml-auto">
                     {app.status === 'approved' && (
                         <button onClick={() => navigate('/student/programs')} className="rounded-xl bg-student-primary px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-600 transition-colors">
                             View Program
                         </button>
                     )}
                     <div className="text-right">
                         <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Application ID</div>
                         <div className="text-sm font-mono text-slate-600">{app.id.slice(0, 8)}</div>
                     </div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

