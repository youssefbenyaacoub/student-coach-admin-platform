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
        return <CheckCircle className="h-5 w-5 text-success-700" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-danger-700" />
      default:
        return <Clock className="h-5 w-5 text-warning-700" />
    }
  }

  if (myApplications.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Applications</h1>
          <p className="mt-1 text-muted-foreground">
            Track your program application status
          </p>
        </div>
        <EmptyState
          icon={ClipboardList}
          title="No Applications Yet"
          description="You haven't applied to any programs. Browse available programs and submit your first application!"
          action={
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/student/programs')}
            >
              Browse Programs
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Applications</h1>
        <p className="mt-1 text-muted-foreground">
          Track your program application status
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-2xl font-bold text-foreground">
                {applicationStats.total}
              </div>
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
              <div className="text-2xl font-bold text-foreground">
                {applicationStats.pending}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-success-500/10 text-success-700">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Approved</div>
              <div className="text-2xl font-bold text-foreground">
                {applicationStats.approved}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-danger-500/10 text-danger-700">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Rejected</div>
              <div className="text-2xl font-bold text-foreground">
                {applicationStats.rejected}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="space-y-3">
          {myApplications.map((application) => (
            <div
              key={application.id}
              className="flex items-start gap-4 rounded-lg border border-border/50 bg-muted/30 p-4"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10">
                {getStatusIcon(application.status)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {getProgramName(application.programId)}
                    </h3>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Applied on {formatDate(application.submittedAt)}
                    </div>
                  </div>
                  <StatusBadge value={application.status} />
                </div>

                {application.motivation && (
                  <div className="mt-3 rounded-lg bg-muted/50 p-3">
                    <div className="text-xs font-medium text-muted-foreground">
                      Motivation:
                    </div>
                    <p className="mt-1 text-sm text-foreground">
                      {application.motivation}
                    </p>
                  </div>
                )}

                {application.reviewedAt && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    Reviewed on {formatDate(application.reviewedAt)}
                  </div>
                )}

                {application.status === 'approved' && (
                  <div className="mt-3">
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      onClick={() => navigate('/student/programs')}
                    >
                      View Program
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
