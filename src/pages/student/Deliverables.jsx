import { useMemo, useState } from 'react'
import { MessageSquare, Search, FileText, Calendar, CheckCircle, Clock } from 'lucide-react'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { formatDate, formatDateTime } from '../../utils/time'

const STATUS_MAP = {
  Approved: 'success',
  'Needs Revision': 'warning',
  Submitted: 'info',
  Pending: 'default',
}

export default function StudentDeliverables() {
  const { currentUser } = useAuth()
  const { data } = useData()
  const [selectedFeedack, setSelectedFeedback] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')

  const deliverables = useMemo(() => {
    if (!currentUser?.id || !data) return []

    const userDeliverables = (data.deliverables ?? []).filter((d) =>
      d.assignedStudentIds.includes(currentUser.id)
    )

    return userDeliverables
      .map((d) => {
        const mySubmission = d.submissions?.find((s) => s.studentId === currentUser.id)
        
        let status = 'Pending'
        let feedback = null

        if (mySubmission) {
          if (mySubmission.status === 'graded') {
            status = mySubmission.grade >= 80 ? 'Approved' : 'Needs Revision'
            feedback = mySubmission.feedback
          } else if (mySubmission.status === 'submitted') {
            status = 'Submitted'
          }
        }

        return {
          id: d.id,
          title: d.title,
          description: d.description,
          deadline: d.dueDate,
          programName: (data.programs ?? []).find(p => p.id === d.programId)?.name || 'Unknown Program',
          status,
          score: mySubmission?.status === 'graded' ? mySubmission.grade : null,
          feedback,
          submittedAt: mySubmission?.submittedAt
        }
      })
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
  }, [currentUser, data])

  const filteredDeliverables = useMemo(() => {
     if (!searchTerm) return deliverables
     const lower = searchTerm.toLowerCase()
     return deliverables.filter(d => 
         d.title.toLowerCase().includes(lower) || 
         d.programName.toLowerCase().includes(lower)
     )
  }, [deliverables, searchTerm])

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white">Deliverables</h1>
          <p className="mt-2 text-lg text-slate-500 font-medium">Manage your assignments and project submissions.</p>
        </div>
        <div className="hidden md:flex gap-4">
             <div className="rounded-2xl bg-white px-5 py-3 shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                 <div className="flex items-center gap-2 mb-1">
                     <FileText className="h-4 w-4 text-slate-400" />
                     <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</span>
                 </div>
                 <div className="text-2xl font-heading font-bold text-slate-900 dark:text-white">{deliverables.length}</div>
             </div>
             <div className="rounded-2xl bg-white px-5 py-3 shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                 <div className="flex items-center gap-2 mb-1">
                     <Clock className="h-4 w-4 text-amber-500" />
                     <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending</span>
                 </div>
                 <div className="text-2xl font-heading font-bold text-amber-600">
                     {deliverables.filter(d => d.status === 'Pending' || d.status === 'Needs Revision').length}
                 </div>
             </div>
             <div className="rounded-2xl bg-white px-5 py-3 shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                 <div className="flex items-center gap-2 mb-1">
                     <CheckCircle className="h-4 w-4 text-emerald-500" />
                     <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Approved</span>
                 </div>
                 <div className="text-2xl font-heading font-bold text-emerald-600">
                     {deliverables.filter(d => d.status === 'Approved').length}
                 </div>
             </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search deliverables..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-300 transition-all dark:bg-slate-800 dark:border-slate-700"
          />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
         <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 text-slate-500 font-bold font-heading uppercase tracking-wider text-xs border-b border-slate-200 dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-400">
                     <tr>
                         <th className="px-6 py-4">Deliverable</th>
                         <th className="px-6 py-4">Due Date</th>
                         <th className="px-6 py-4">Status</th>
                         <th className="px-6 py-4">Score</th>
                         <th className="px-6 py-4 text-right">Actions</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                     {filteredDeliverables.map((d) => (
                         <tr key={d.id} className="group hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-700/50">
                             <td className="px-6 py-4">
                                 <div>
                                     <div className="font-bold text-slate-900 text-base dark:text-white">{d.title}</div>
                                     <div className="text-xs text-slate-500 mt-1 max-w-md truncate">{d.description}</div>
                                     <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wide mt-1">{d.programName}</div>
                                 </div>
                             </td>
                             <td className="px-6 py-4">
                                 <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                     <Calendar className="h-4 w-4 text-slate-400" />
                                     <div className="flex flex-col">
                                         <span className="font-medium text-sm">{formatDate(d.deadline)}</span>
                                         <span className="text-xs text-slate-400">{formatDateTime(d.deadline).split(',')[1]}</span>
                                     </div>
                                 </div>
                             </td>
                             <td className="px-6 py-4">
                                 <StatusBadge value={d.status} />
                             </td>
                             <td className="px-6 py-4">
                                 {d.score !== null ? (
                                     <div className={`font-bold ${d.score >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                         {d.score}/100
                                     </div>
                                 ) : (
                                     <span className="text-slate-300">-</span>
                                 )}
                             </td>
                             <td className="px-6 py-4 text-right">
                                 <div className="flex items-center justify-end gap-2">
                                     {d.feedback && (
                                         <button 
                                             onClick={() => setSelectedFeedback(d)}
                                             className="p-2 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                             title="View Feedback"
                                         >
                                             <MessageSquare className="h-4 w-4" />
                                         </button>
                                     )}
                                     <button 
                                         className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-colors dark:bg-white dark:text-slate-900"
                                     >
                                         {d.status === 'Pending' || d.status === 'Needs Revision' ? 'Submit' : 'View'}
                                     </button>
                                 </div>
                             </td>
                         </tr>
                     ))}
                     {filteredDeliverables.length === 0 && (
                         <tr>
                             <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                 No deliverables found.
                             </td>
                         </tr>
                     )}
                 </tbody>
             </table>
         </div>
      </div>

      {selectedFeedack && (
        <Modal
          isOpen={!!selectedFeedack}
          onClose={() => setSelectedFeedback(null)}
          title="Coach Feedback"
          footer={
            <button className="btn-primary w-full" onClick={() => setSelectedFeedback(null)}>
                Close
            </button>
          }
        >
          <div className="space-y-4">
              <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                      <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                      <h4 className="font-bold text-slate-900">{selectedFeedack.title}</h4>
                      <p className="text-xs text-slate-500">Feedback from Coach</p>
                  </div>
              </div>
              <div className="rounded-xl bg-blue-50 p-5 text-sm text-blue-900 leading-relaxed border border-blue-100">
                  {selectedFeedack.feedback}
              </div>
              {selectedFeedack.score && (
                  <div className="flex justify-end">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 mt-1">Grade</span>
                      <span className={`text-xl font-bold ${selectedFeedack.score >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {selectedFeedack.score}/100
                      </span>
                  </div>
              )}
          </div>
        </Modal>
      )}
    </div>
  )
}