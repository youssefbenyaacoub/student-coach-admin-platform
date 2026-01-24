import { useMemo, useState } from 'react'
import { Target, MessageSquare } from 'lucide-react'
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
          status,
          feedback,
          programId: d.programId
        }
      })
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
  }, [currentUser, data])

  const columns = [
    {
      header: 'Deliverable',
      accessor: (row) => row.title,
      cell: (row) => (
        <div>
          <div className="font-medium text-foreground">{row.title}</div>
          <div className="line-clamp-1 text-xs text-muted-foreground">{row.description}</div>
        </div>
      ),
    },
    {
      header: 'Deadline',
      accessor: (row) => row.deadline,
      cell: (row) => (
        <div className="flex flex-col">
            <span className="text-sm">{formatDate(row.deadline)}</span>
            <span className="text-xs text-muted-foreground">{formatDateTime(row.deadline).split(',')[1]}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => row.status,
      cell: (row) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
            STATUS_MAP[row.status] === 'success'
              ? 'bg-success-50 text-success-700 border-success-200'
              : STATUS_MAP[row.status] === 'warning'
              ? 'bg-warning-50 text-warning-700 border-warning-200'
              : STATUS_MAP[row.status] === 'info'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-muted text-muted-foreground border-border'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: 'Feedback',
      accessor: (row) => row.feedback || '',
      cell: (row) => (
        row.feedback ? (
          <button 
             onClick={() => setSelectedFeedback(row)}
             className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
             <MessageSquare className="h-3 w-3" />
             View Comment
          </button>
        ) : (
            <span className="text-xs text-muted-foreground">-</span>
        )
      )
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Deliverables</h1>
        <p className="mt-1 text-muted-foreground">Track your assignments and feedback</p>
      </div>

      <Card className="overflow-hidden p-0">
        <DataTable
          rows={deliverables}
          columns={columns}
          getRowId={(row) => row.id}
          searchPlaceholder="Search deliverables..."
          exportFilename="my-deliverables"
        />
      </Card>

      {/* Feedback Modal */}
      {selectedFeedack && (
        <Modal
          isOpen={!!selectedFeedack}
          onClose={() => setSelectedFeedback(null)}
          title={`Feedback: ${selectedFeedack.title}`}
        >
            <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4">
                    <div className="text-sm font-medium text-foreground mb-1">Coach Comment</div>
                    <p className="text-sm text-muted-foreground italic">"{selectedFeedack.feedback}"</p>
                </div>
                <div className="flex justify-end">
                    <button 
                        className="btn-primary"
                        onClick={() => setSelectedFeedback(null)}
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
      )}
    </div>
  )
}