import { useMemo, useState } from 'react'
import { MessageSquare, Search, FileText, Calendar, CheckCircle, Clock, Upload, X, FileUp } from 'lucide-react'
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
    const [selectedFeedback, setSelectedFeedback] = useState(null)
    const [depositingDeliverable, setDepositingDeliverable] = useState(null)
    const [submissionNote, setSubmissionNote] = useState('')
    const [submissionFile, setSubmissionFile] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

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

    const handleDepositSubmit = async (e) => {
        e.preventDefault()
        if (!depositingDeliverable) return

        setIsSubmitting(true)
        try {
            // Simulate API call/Supabase insert
            console.log('Submitting deliverable:', {
                deliverableId: depositingDeliverable.id,
                note: submissionNote,
                file: submissionFile?.name
            })

            // In a real app, we would use a hook like useDeliverables and call submitDeliverable
            // For this implementation, we simulate success
            await new Promise(resolve => setTimeout(resolve, 1500))

            setDepositingDeliverable(null)
            setSubmissionNote('')
            setSubmissionFile(null)
            alert('Deliverable submitted successfully!')
            // In a real app, refetch data here
        } catch (err) {
            alert('Failed to submit deliverable.')
        } finally {
            setIsSubmitting(false)
        }
    }

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
                                                onClick={() => {
                                                    if (d.status === 'Pending' || d.status === 'Needs Revision') {
                                                        setDepositingDeliverable(d)
                                                    }
                                                }}
                                                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-colors dark:bg-white dark:text-slate-900"
                                            >
                                                {d.status === 'Pending' || d.status === 'Needs Revision' ? 'Deposit' : 'View'}
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

            {selectedFeedback && (
                <Modal
                    isOpen={!!selectedFeedback}
                    onClose={() => setSelectedFeedback(null)}
                    title="Coach Corrections & Feedback"
                    footer={
                        <button className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm" onClick={() => setSelectedFeedback(null)}>
                            Close
                        </button>
                    }
                >
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <FileText className="h-6 w-6" />
                            </div>
                            <div>
                                <h4 className="font-heading font-bold text-slate-900 dark:text-white text-lg">{selectedFeedback.title}</h4>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Corrections du Référent</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-6 border border-slate-100 dark:border-slate-800 relative">
                                <div className="absolute -top-3 left-6 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    General Comments
                                </div>
                                <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {selectedFeedback.feedback || "No specific comments provided by the coach."}
                                </div>
                            </div>

                            {selectedFeedback.score && (
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 font-heading">
                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Performance Score</span>
                                    <span className={`text-2xl font-bold ${selectedFeedback.score >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {selectedFeedback.score}/100
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Deposit Modal */}
            {depositingDeliverable && (
                <Modal
                    isOpen={!!depositingDeliverable}
                    onClose={() => !isSubmitting && setDepositingDeliverable(null)}
                    title={`Deposit: ${depositingDeliverable.title}`}
                >
                    <form onSubmit={handleDepositSubmit} className="space-y-6">
                        <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 dark:bg-blue-900/10 dark:border-blue-800">
                            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-1">Project Phase Requirement</h4>
                            <p className="text-xs text-blue-700 dark:text-blue-400 opacity-80">Please ensure your document follows the curriculum guidelines for {depositingDeliverable.programName}.</p>
                        </div>

                        <div className="space-y-4">
                            <label className="block">
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">Upload Document</span>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        onChange={(e) => setSubmissionFile(e.target.files[0])}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        accept=".pdf,.doc,.docx"
                                    />
                                    <div className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${submissionFile ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200 group-hover:border-student-primary bg-slate-50'}`}>
                                        <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-3 ${submissionFile ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400'}`}>
                                            {submissionFile ? <CheckCircle size={24} /> : <FileUp size={24} />}
                                        </div>
                                        <div className="text-sm font-bold text-slate-700">
                                            {submissionFile ? submissionFile.name : 'Click or drag file to upload'}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">PDF, DOCX (Max 50MB)</div>
                                    </div>
                                </div>
                            </label>

                            <label className="block">
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">Notes to Coach</span>
                                <textarea
                                    value={submissionNote}
                                    onChange={(e) => setSubmissionNote(e.target.value)}
                                    placeholder="Tell your referent about this submission..."
                                    rows={4}
                                    className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-student-primary/20 focus:border-student-primary outline-none text-sm transition-all"
                                />
                            </label>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => setDepositingDeliverable(null)}
                                className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !submissionFile}
                                className="flex-1 py-3 rounded-xl bg-student-primary text-white font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Clock className="h-4 w-4 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={18} />
                                        Confirm Deposit
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    )
}