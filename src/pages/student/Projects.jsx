import { useState } from 'react'
import { Plus, FolderKanban } from 'lucide-react'
import Card from '../../components/common/Card'
import Modal from '../../components/common/Modal'
import EmptyState from '../../components/common/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast'
import IdeaSubmissionForm from '../../components/projects/IdeaSubmissionForm'
import AddSubmissionModal from '../../components/projects/AddSubmissionModal'
import ProjectTimeline from '../../components/projects/ProjectTimeline'
import { canAddNonIdeaSubmissions } from '../../models/projects'

export default function StudentProjects() {
  const { currentUser } = useAuth()
  const { push } = useToast()
  const {
    getUserById,
    listProjects,
    listProjectSubmissions,
    listTasks,
    createProjectWithIdea,
    addProjectSubmission,
  } = useData()

  const [createOpen, setCreateOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [errors, setErrors] = useState(null)

  const projects = currentUser?.id ? listProjects({ studentId: currentUser.id }) : []

  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId) ?? null
    : null

  const submissions = selectedProject?.id
    ? listProjectSubmissions({ projectId: selectedProject.id })
    : []

  const tasks = selectedProject?.id ? listTasks?.({ projectId: selectedProject.id }) ?? [] : []

  const ideaSubmitted = canAddNonIdeaSubmissions(submissions)

  const onCreate = async (idea) => {
    setErrors(null)
    const res = await createProjectWithIdea({ studentId: currentUser.id, idea })
    if (!res.success) {
      setErrors(res.errors ?? { form: res.error ?? 'Please fix the errors and try again.' })
      return
    }

    if (res.localFallback) {
      let supabaseHost = ''
      try {
        supabaseHost = new URL(import.meta.env.VITE_SUPABASE_URL).host
      } catch {
        supabaseHost = ''
      }

      push({
        type: 'warning',
        title: 'Saved locally (Supabase not ready)',
        message: `This project was saved in your browser only, so admin will not see it until Supabase tables are installed and your app is connected to that Supabase project.${supabaseHost ? ` Connected Supabase: ${supabaseHost}.` : ''}`,
      })
    }
    setCreateOpen(false)
    setSelectedProjectId(res.project.id)
  }

  const onAddSubmission = async ({ type, payload }) => {
    if (!selectedProject?.id) return
    await addProjectSubmission({ projectId: selectedProject.id, type, payload })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">Submit progressively: Idea → document → demo → video.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Project
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card
            title="My projects"
            subtitle={projects.length ? `${projects.length} total` : 'Start by submitting your IDEA'}
          >
            {projects.length === 0 ? (
              <EmptyState
                title="No projects yet"
                message="Create your first project by submitting the IDEA form."
                icon={FolderKanban}
              />
            ) : (
              <div className="space-y-2">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProjectId(p.id)}
                    className={[
                      'w-full text-left rounded-xl border p-4 transition-colors',
                      selectedProjectId === p.id
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-heading font-bold text-slate-900 truncate">{p.title}</div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{p.stage}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Last updated: {new Date(p.updatedAt).toLocaleString()}</div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-3">
          {!selectedProject ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Select a project to view its submission timeline.
            </div>
          ) : (
            <Card
              title={selectedProject.title}
              subtitle={`Stage: ${selectedProject.stage}`}
              actions={
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAddOpen(true)}
                  disabled={!ideaSubmitted}
                  title={!ideaSubmitted ? 'Submit IDEA first' : 'Add a submission'}
                >
                  <Plus className="h-4 w-4" />
                  Add submission
                </button>
              }
            >
              {!ideaSubmitted ? (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  You must submit the IDEA first before adding documents, demos, or videos.
                </div>
              ) : null}

              <ProjectTimeline
                submissions={submissions}
                tasks={tasks}
                getUserById={getUserById}
                allowComment={false}
                allowReview={false}
                currentUserId={currentUser?.id}
              />
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={createOpen}
        title="Create Project (IDEA submission)"
        onClose={() => {
          setErrors(null)
          setCreateOpen(false)
        }}
      >
        {errors?.form ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errors.form}
          </div>
        ) : null}
        <IdeaSubmissionForm
          onSubmit={onCreate}
          onCancel={() => {
            setErrors(null)
            setCreateOpen(false)
          }}
          submitLabel="Create project"
        />
      </Modal>

      <AddSubmissionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        ideaSubmitted={ideaSubmitted}
        onSubmit={onAddSubmission}
      />
    </div>
  )
}
