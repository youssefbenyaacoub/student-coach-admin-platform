import { useMemo, useState } from 'react'
import { Eye, CheckCircle, XCircle } from 'lucide-react'
import Card from '../../components/common/Card'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import StatusBadge from '../../components/common/StatusBadge'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { formatDateTime } from '../../utils/time'
import { cn } from '../../utils/cn'

export default function AdminApplications() {
  const { data, setApplicationStatus, getUserById, getProgramById } = useData()
  const { currentUser } = useAuth()
  const { push } = useToast()

  const [selected, setSelected] = useState(null)
  const [decisionNote, setDecisionNote] = useState('')
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => {
    const apps = data?.applications ?? []
    return apps.map((a) => {
      const student = getUserById(a.studentId)
      const program = getProgramById(a.programId)
      
      // Synthesize a score for demo purposes if not present
      // Deterministic based on ID to be consistent during renders
      const mockScore = a.status === 'pending' ? null : 
        (a.status === 'rejected' ? (40 + (a.id.length * 5)) % 60 : (70 + (a.id.length * 3)) % 30 + 70)

      return {
        ...a,
        studentName: student?.name ?? a.studentId,
        studentEmail: student?.email ?? '',
        programName: program?.name ?? a.programId,
        score: mockScore, 
      }
    })
  }, [data, getUserById, getProgramById])

  const open = (row) => {
    setSelected(row)
    setDecisionNote(row.decisionNote ?? '')
  }

  const decide = async (status) => {
    if (!selected) return
    setBusy(true)
    try {
      await setApplicationStatus({
        applicationId: selected.id,
        status,
        decisionNote,
        actorId: currentUser?.id ?? null,
      })
      push({ type: 'success', title: 'Updated', message: `Application marked ${status}.` })
      setSelected(null)
    } catch (e) {
      push({ type: 'danger', title: 'Error', message: e?.message ?? 'Failed to update' })
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    {
      key: 'student',
      header: 'Student',
      accessor: (r) => r.studentName,
      cell: (r) => (
        <div>
          <div className="font-medium text-foreground">{r.studentName}</div>
          <div className="mt-1 text-xs text-muted-foreground">{r.studentEmail}</div>
        </div>
      ),
    },
    {
      key: 'idea',
      header: 'Project Idea',
      accessor: (r) => r.motivation,
      cell: (r) => (
        <div className="max-w-xs truncate text-sm" title={r.motivation}>
          {r.motivation}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Submitted',
      accessor: (r) => formatDateTime(r.createdAt),
      sortValue: (r) => r.createdAt,
    },
    {
      key: 'score',
      header: 'Score',
      accessor: (r) => r.score,
      cell: (r) => r.score ? (
        <span className={cn(
          "font-semibold",
          r.score >= 70 ? "text-success-700" : "text-danger-700"
        )}>
          {r.score}/100
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} />,
    },
    {
      key: 'actions',
      header: '',
      accessor: () => '',
      searchable: false,
      sortable: false,
      cell: (r) => (
        <div className="flex justify-end">
          <button 
             type="button" 
             className="btn-ghost flex items-center gap-1 text-xs" 
             onClick={() => open(r)}
          >
            <Eye className="h-4 w-4" /> Review
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <Card title="Applications" subtitle="Review and decide student applications" />

      <DataTable
        title="All applications"
        rows={rows}
        columns={columns}
        exportFilename="applications.csv"
        initialSort={{ key: 'createdAt', dir: 'desc' }}
      />

      <Modal
        open={Boolean(selected)}
        title={selected ? `Application • ${selected.studentName}` : 'Application'}
        onClose={busy ? undefined : () => setSelected(null)}
        footer={
          selected ? (
            <>
              <button type="button" className="btn-ghost" onClick={() => setSelected(null)} disabled={busy}>
                Close
              </button>
              <button type="button" className="btn-danger" onClick={() => decide('rejected')} disabled={busy}>
                Reject
              </button>
              <button type="button" className="btn-primary" onClick={() => decide('accepted')} disabled={busy}>
                Accept
              </button>
            </>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Program</div>
                <div className="text-sm font-medium text-foreground">{selected.programName}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Status</div>
                <div className="mt-1">
                  <StatusBadge value={selected.status} />
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Motivation</div>
              <div className="mt-1 text-sm text-foreground">{selected.motivation}</div>
            </div>
            
            {(selected.status === 'accepted' || selected.status === 'rejected') && selected.score && (
                 <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Evaluation Score</div>
                    <div className={cn(
                        "mt-1 text-lg font-bold", 
                        selected.score >= 70 ? "text-success-700" : "text-danger-700"
                    )}>
                        {selected.score}/100
                    </div>
                 </div>
            )}

            <div>
              <label className="label">Decision note (optional)</label>
              <textarea
                className="input min-h-24"
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder="Add a short note…"
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
