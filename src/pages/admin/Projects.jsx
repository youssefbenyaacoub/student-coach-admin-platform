import { useMemo, useState } from 'react'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import ProjectTimeline from '../../components/projects/ProjectTimeline'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'

export default function AdminProjects() {
  const { currentUser } = useAuth()
  const {
    listProjects,
    listProjectSubmissions,
    listTasks,
    getUserById,
    addProjectSubmissionComment,
    setProjectSubmissionStatus,
  } = useData()

  const [selectedProjectId, setSelectedProjectId] = useState(null)

  const rows = useMemo(() => {
    const projects = listProjects()
    return projects.map((p) => {
      const subs = listProjectSubmissions({ projectId: p.id })
      const pending = subs.filter((s) => String(s.status).toLowerCase() === 'pending').length
      const student = getUserById?.(p.studentId)
      return {
        ...p,
        studentName: student?.name ?? 'Student',
        submissionsCount: subs.length,
        pendingCount: pending,
      }
    })
  }, [getUserById, listProjectSubmissions, listProjects])

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null
    return listProjects().find((p) => p.id === selectedProjectId) ?? null
  }, [listProjects, selectedProjectId])

  const selectedSubmissions = useMemo(() => {
    if (!selectedProject?.id) return []
    return listProjectSubmissions({ projectId: selectedProject.id })
  }, [listProjectSubmissions, selectedProject])

  const selectedTasks = useMemo(() => {
    if (!selectedProject?.id) return []
    return listTasks?.({ projectId: selectedProject.id }) ?? []
  }, [listTasks, selectedProject])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-900">Projects</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor progress and stages across all students.</p>
      </div>

      <DataTable
        title="All projects"
        rows={rows}
        exportFilename="projects.csv"
        getRowId={(r) => r.id}
        initialSort={{ key: 'updatedAt', dir: 'desc' }}
        columns={[
          {
            key: 'title',
            header: 'Title',
            accessor: (r) => r.title,
          },
          {
            key: 'student',
            header: 'Student',
            accessor: (r) => r.studentName,
          },
          {
            key: 'stage',
            header: 'Stage',
            accessor: (r) => r.stage,
          },
          {
            key: 'submissions',
            header: 'Submissions',
            accessor: (r) => r.submissionsCount,
            align: 'right',
          },
          {
            key: 'pending',
            header: 'Pending',
            accessor: (r) => r.pendingCount,
            align: 'right',
            cell: (r) => (
              <div className="flex items-center justify-end gap-2">
                <StatusBadge value={r.pendingCount > 0 ? 'pending' : 'active'} />
                <span className="tabular-nums">{r.pendingCount}</span>
              </div>
            ),
          },
          {
            key: 'updatedAt',
            header: 'Last updated',
            accessor: (r) => new Date(r.updatedAt).toLocaleString(),
            sortValue: (r) => r.updatedAt,
          },
          {
            key: 'actions',
            header: '',
            accessor: () => '',
            searchable: false,
            sortable: false,
            align: 'right',
            cell: (r) => (
              <div className="flex justify-end">
                <button type="button" className="btn-secondary" onClick={() => setSelectedProjectId(r.id)}>
                  Review
                </button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={Boolean(selectedProject)}
        title={selectedProject ? `Project • ${selectedProject.title}` : 'Project'}
        onClose={() => setSelectedProjectId(null)}
        footer={
          <button type="button" className="btn-ghost" onClick={() => setSelectedProjectId(null)}>
            Close
          </button>
        }
      >
        {selectedProject ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Student</div>
              <div className="mt-1 text-sm font-semibold text-slate-800">
                {getUserById?.(selectedProject.studentId)?.name ?? selectedProject.studentId}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Use this view to approve IDEA submissions and review progress.
              </div>
            </div>

            <ProjectTimeline
              submissions={selectedSubmissions}
              tasks={selectedTasks}
              getUserById={getUserById}
              allowComment
              allowReview
              currentUserId={currentUser?.id ?? 'admin'}
              onComment={async ({ submissionId, text }) => {
                await addProjectSubmissionComment?.({ submissionId, authorId: currentUser?.id ?? 'admin', text })
              }}
              onSetStatus={async ({ submissionId, status }) => {
                await setProjectSubmissionStatus?.({ submissionId, status, reviewerId: currentUser?.id ?? 'admin' })
              }}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
