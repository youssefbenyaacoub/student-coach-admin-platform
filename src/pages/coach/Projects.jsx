import { useState } from 'react'
import { FolderKanban } from 'lucide-react'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import ProjectTimeline from '../../components/projects/ProjectTimeline'
import { SubmissionStatus } from '../../models/projects'

export default function CoachProjects() {
  const { currentUser } = useAuth()
  const {
    getUserById,
    listProjects,
    listProjectSubmissions,
    listTasks,
    addProjectSubmissionComment,
    setProjectSubmissionStatus,
  } = useData()

  const [selectedProjectId, setSelectedProjectId] = useState(null)

  const projects = currentUser?.id ? listProjects({ coachId: currentUser.id }) : []

  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId) ?? null
    : projects[0] ?? null

  const submissions = selectedProject?.id
    ? listProjectSubmissions({ projectId: selectedProject.id })
    : []
  const tasks = selectedProject?.id ? listTasks({ projectId: selectedProject.id }) ?? [] : []

  const onComment = async ({ submissionId, text }) => {
    await addProjectSubmissionComment({ submissionId, authorId: currentUser.id, text })
  }

  const onSetStatus = async ({ submissionId, status, reviewerId }) => {
    await setProjectSubmissionStatus({ submissionId, status, reviewerId })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-900">Project Reviews</h1>
        <p className="text-sm text-slate-500 mt-1">Review IDEA clearly and give feedback per submission.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card title="Projects" subtitle={projects.length ? `${projects.length} available` : 'No projects yet'}>
            {projects.length === 0 ? (
              <EmptyState
                title="No projects"
                message="Students will appear here once they submit an IDEA."
                icon={FolderKanban}
              />
            ) : (
              <div className="space-y-2">
                {projects.map((p) => {
                  const student = getUserById?.(p.studentId)
                  const active = selectedProject?.id === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProjectId(p.id)}
                      className={[
                        'w-full text-left rounded-xl border p-4 transition-colors',
                        active ? 'border-coach-primary/30 bg-white' : 'border-slate-200 bg-white hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-heading font-bold text-slate-900 truncate">{p.title}</div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{p.stage}</div>
                      </div>
                      <div className="mt-1 text-xs text-slate-500 truncate">Student: {student?.name ?? 'Student'}</div>
                    </button>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-3">
          {!selectedProject ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Select a project to review submissions.
            </div>
          ) : (
            <Card
              title={selectedProject.title}
              subtitle={`Student: ${getUserById?.(selectedProject.studentId)?.name ?? 'Student'} • Stage: ${selectedProject.stage}`}
            >
              <ProjectTimeline
                submissions={submissions}
                getUserById={getUserById}
                allowComment
                allowReview
                currentUserId={currentUser?.id}
                onComment={onComment}
                onSetStatus={onSetStatus}
                tasks={tasks}
              />

              <div className="mt-4 text-xs text-slate-500">
                Review flow: {SubmissionStatus.pending} → {SubmissionStatus.reviewed} → {SubmissionStatus.approved}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
