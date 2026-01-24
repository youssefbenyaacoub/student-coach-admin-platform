import { useMemo, useState } from 'react'
import { Target, FileText, Clock, CheckCircle, Star, ThumbsUp, AlertTriangle } from 'lucide-react'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import DataTable from '../../components/common/DataTable'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast'
import { formatDateTime } from '../../utils/time'

export default function CoachDeliverables() {
  const { currentUser } = useAuth()
  const { data } = useData()
  const { showToast } = useToast()
  const [filter, setFilter] = useState('pending') // all, pending, graded
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [showGradeModal, setShowGradeModal] = useState(false)
  const [actionType, setActionType] = useState('approve') // approve, revision
  const [grade, setGrade] = useState('')
  const [feedback, setFeedback] = useState('')

  const myDeliverables = useMemo(() => {
    if (!currentUser?.id || !data) return []

    const myProgramIds = (data.programs ?? [])
      .filter((p) => p.coachIds.includes(currentUser.id))
      .map((p) => p.id)

    return (data.deliverables ?? [])
      .filter((d) => myProgramIds.includes(d.programId))
      .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))
  }, [currentUser, data])

  const submissions = useMemo(() => {
    const allSubmissions = myDeliverables.flatMap((deliverable) =>
      (deliverable.submissions ?? []).map((sub) => ({
        ...sub,
        id: `${deliverable.id}-${sub.studentId}`, // Synthesize an ID for the table
        deliverable,
      }))
    )

    return allSubmissions
      .filter((sub) => {
        if (filter === 'pending') return sub.status === 'submitted'
        if (filter === 'graded') return sub.status === 'graded'
        return true
      })
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
  }, [myDeliverables, filter])

  const stats = useMemo(() => {
    const allSubmissions = myDeliverables.flatMap((d) => d.submissions ?? [])
    const pending = allSubmissions.filter((s) => s.status === 'submitted').length
    const graded = allSubmissions.filter((s) => s.status === 'graded').length

    const grades = allSubmissions
      .filter((s) => s.grade !== null && s.grade !== undefined)
      .map((s) => s.grade)
    const avgGrade =
      grades.length > 0
        ? Math.round(grades.reduce((sum, g) => sum + g, 0) / grades.length)
        : null

    return {
      total: allSubmissions.length,
      pending,
      graded,
      avgGrade,
      deliverableCount: myDeliverables.length,
    }
  }, [myDeliverables])

  const getStudentName = (studentId) => {
    const user = (data?.users ?? []).find((u) => u.id === studentId)
    return user?.name ?? 'Unknown Student'
  }

  const handleAction = (submission, type) => {
    setSelectedSubmission(submission)
    setActionType(type)
    setGrade(submission.grade?.toString() ?? (type === 'approve' ? '100' : ''))
    setFeedback(submission.feedback ?? (type === 'revision' ? 'Please revise...' : ''))
    setShowGradeModal(true)
  }

  const confirmAction = () => {
    if (actionType === 'approve') {
        const gradeNum = parseInt(grade, 10)
        if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
        showToast('Please enter a valid grade between 0 and 100', 'error')
        return
        }
    }
    
    showToast(`${actionType === 'approve' ? 'Approved' : 'Revision requested'} successfully!`, 'success')
    setShowGradeModal(false)
    setSelectedSubmission(null)
    setGrade('')
    setFeedback('')
  }

  const columns = [
    {
        key: 'student',
        header: 'Student',
        searchable: true,
        accessor: (row) => getStudentName(row.studentId),
        render: (row) => {
            const name = getStudentName(row.studentId)
            return (
                <div className="flex items-center gap-2">
                     <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {name.charAt(0)}
                    </div>
                    <span className="font-medium">{name}</span>
                </div>
            )
        }
    },
    {
        key: 'deliverable',
        header: 'Deliverable Title',
        searchable: true,
        accessor: (row) => row.deliverable.title,
    },
    {
        key: 'submitted',
        header: 'Submission Date',
        accessor: (row) => row.submittedAt,
        render: (row) => <span className="text-sm">{formatDateTime(row.submittedAt)}</span>
    },
    {
        key: 'status',
        header: 'Status',
        accessor: (row) => row.status,
        render: (row) => <StatusBadge value={row.status} />
    },
    {
        key: 'actions',
        header: 'Actions',
        accessor: () => '',
        render: (row) => row.status === 'graded' ? (
             <div className="text-sm">
                <span className="font-bold text-success-700">{row.grade}%</span>
             </div>
        ) : (
             <div className="flex gap-2">
                 <button 
                    onClick={() => handleAction(row, 'approve')}
                    className="flex items-center gap-1 rounded bg-success-600 px-2 py-1 text-xs font-medium text-white hover:bg-success-700"
                 >
                    <ThumbsUp className="h-3 w-3" /> Approve
                 </button>
                 <button 
                    onClick={() => handleAction(row, 'revision')}
                    className="flex items-center gap-1 rounded bg-warning-500 px-2 py-1 text-xs font-medium text-white hover:bg-warning-600"
                 >
                    <AlertTriangle className="h-3 w-3" /> Request Revision
                 </button>
             </div>
        )
    }
  ]

  if (myDeliverables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Target className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          No Deliverables Yet
        </h2>
        <p className="mt-2 text-muted-foreground">
          You haven't created any deliverables for your programs yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Deliverables & Reviews</h1>
        <p className="mt-1 text-muted-foreground">
          Review and grade student submissions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Deliverables</div>
              <div className="text-2xl font-bold text-foreground">
                {stats.deliverableCount}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/10 text-secondary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-warning-500/10 text-warning-700">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Pending</div>
              <div className="text-2xl font-bold text-foreground">{stats.pending}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-success-500/10 text-success-700">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Graded</div>
              <div className="text-2xl font-bold text-foreground">{stats.graded}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Avg Grade</div>
              <div className="text-2xl font-bold text-foreground">
                {stats.avgGrade !== null ? `${stats.avgGrade}%` : 'N/A'}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
          <div className="flex gap-2">
             {['all', 'pending', 'graded'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <DataTable 
             columns={columns}
             rows={submissions}
             getRowId={(row) => row.id}
             initialSort={{ key: 'submitted', dir: 'desc' }}
             exportFilename="deliverables-review.csv"
          />
      </div>

      {showGradeModal && selectedSubmission && (
        <Modal
          title={actionType === 'approve' ? "Approve Submission" : "Request Revision"}
          onClose={() => setShowGradeModal(false)}
          footer={
            <>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowGradeModal(false)}
              >
                Cancel
              </button>
              <button type="button" className={`btn-${actionType === 'approve' ? 'primary' : 'danger'}`} onClick={confirmAction}>
                {actionType === 'approve' ? 'Approve & Grade' : 'Send Request'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">
                {selectedSubmission.deliverable.title}
              </h3>
              <div className="mt-1 text-sm text-muted-foreground">
                Student: {getStudentName(selectedSubmission.studentId)}
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xs font-medium text-muted-foreground">
                Submission:
              </div>
              <p className="mt-1 text-sm text-foreground">
                {selectedSubmission.content}
              </p>
            </div>

            {actionType === 'approve' && (
                <div>
                <label className="block text-sm font-medium text-foreground">
                    Grade (0-100)
                </label>
                <input
                    type="number"
                    min="0"
                    max="100"
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Enter grade..."
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                />
                </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground">
                {actionType === 'approve' ? 'Feedback (optional)' : 'Reason for Revision'}
              </label>
              <textarea
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                rows={4}
                placeholder={actionType === 'approve' ? "Great job..." : "Please clarify..."}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
