import { Plus, RefreshCcw, Trash2, Eye, Edit, Search, Calendar, Users, Briefcase } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Card from '../../components/common/Card'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import StatusBadge from '../../components/common/StatusBadge'
import { useToast } from '../../hooks/useToast'
import { useData } from '../../hooks/useData'
import { useProgramManagement } from '../../hooks/useProgramManagement'
import { formatDate } from '../../utils/time'
import { validate, rules } from '../../utils/validators'

const schema = {
  name: [rules.required('Name')],
  description: [rules.required('Description')],
  durationWeeks: [rules.required('Duration')],
  startDate: [rules.required('Start date')],
  endDate: [rules.required('End date')],
  capacity: [rules.required('Capacity')],
  status: [rules.required('Status')],
}

const toDateInput = (iso) => {
  if (!iso) return ''
  try {
    return new Date(iso).toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

const fromDateInput = (value) => {
  if (!value) return ''
  return new Date(`${value}T00:00:00.000Z`).toISOString()
}

export default function AdminPrograms() {
  const { data, upsertProgram, deleteProgram, reset } = useData()
  const { push } = useToast()
  const {
    templates,
    templateDetailsById,
    fetchTemplateDetails,
    upsertTemplate,
    deleteTemplate: deleteTemplateById,
    addStage,
    addContentItem,
    addTaskTemplate,
    deleteStage,
    deleteContentItem,
    deleteTaskTemplate,
  } = useProgramManagement()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [confirm, setConfirm] = useState({ open: false, programId: null })

  const [templateEditorOpen, setTemplateEditorOpen] = useState(false)
  const [activeTemplateId, setActiveTemplateId] = useState(null)

  const [templateMode, setTemplateMode] = useState('edit')
  const [templateBusy, setTemplateBusy] = useState(false)
  const [templateForm, setTemplateForm] = useState({ name: '', description: '', isActive: true })
  const [templateFormErrors, setTemplateFormErrors] = useState({})
  const [selectedStageId, setSelectedStageId] = useState(null)
  const [stageForm, setStageForm] = useState({ name: '', description: '' })
  const [contentForm, setContentForm] = useState({
    contentType: 'video',
    title: '',
    url: '',
    provider: '',
    durationMinutes: '',
    description: '',
  })
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueOffsetDays: '',
    requiresApproval: true,
  })

  const programs = useMemo(() => data?.programs ?? [], [data?.programs])
  const coaches = useMemo(() => (data?.users ?? []).filter((u) => u.role === 'coach'), [data?.users])
  const students = useMemo(() => (data?.users ?? []).filter((u) => u.role === 'student'), [data?.users])

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeTemplateId) ?? null,
    [activeTemplateId, templates],
  )
  const activeTemplateDetails = useMemo(
    () => (activeTemplateId ? templateDetailsById[activeTemplateId] ?? null : null),
    [activeTemplateId, templateDetailsById],
  )

  const openCreateTemplate = () => {
    setTemplateMode('create')
    setActiveTemplateId(null)
    setSelectedStageId(null)
    setTemplateForm({ name: '', description: '', isActive: true })
    setTemplateFormErrors({})
    setStageForm({ name: '', description: '' })
    setContentForm({ contentType: 'video', title: '', url: '', provider: '', durationMinutes: '', description: '' })
    setTaskForm({ title: '', description: '', dueOffsetDays: '', requiresApproval: true })
    setTemplateEditorOpen(true)
  }

  const openTemplateEditor = async (templateId) => {
    setTemplateMode('edit')
    setActiveTemplateId(templateId)
    setTemplateEditorOpen(true)
    try {
      const nextTemplate = templates.find((t) => t.id === templateId) ?? null
      if (nextTemplate) {
        setTemplateForm({
          name: nextTemplate.name ?? '',
          description: nextTemplate.description ?? '',
          isActive: Boolean(nextTemplate.isActive),
        })
      }

      const details = await fetchTemplateDetails(templateId)
      const firstStageId = details?.stages?.[0]?.id ?? null
      setSelectedStageId(firstStageId)
    } catch (e) {
      push({ type: 'danger', title: 'Error', message: e?.message ?? 'Failed to load template details' })
    }
  }

  const closeTemplateEditor = () => {
    if (templateBusy) return
    setTemplateEditorOpen(false)
    setTemplateFormErrors({})
  }

  const saveTemplateMeta = async () => {
    const errs = {}
    if (!String(templateForm.name ?? '').trim()) errs.name = 'Name is required'
    setTemplateFormErrors(errs)
    if (Object.keys(errs).length) return

    setTemplateBusy(true)
    try {
      const saved = await upsertTemplate({
        id: templateMode === 'edit' ? activeTemplateId : undefined,
        name: String(templateForm.name ?? '').trim(),
        description: String(templateForm.description ?? '').trim(),
        isActive: Boolean(templateForm.isActive),
      })

      setTemplateMode('edit')
      setActiveTemplateId(saved.id)
      push({
        type: 'success',
        title: templateMode === 'create' ? 'Template created' : 'Template updated',
        message: 'Now build stages, then add videos/courses and tasks.',
      })

      const details = await fetchTemplateDetails(saved.id)
      const firstStageId = details?.stages?.[0]?.id ?? null
      setSelectedStageId((prev) => prev ?? firstStageId)
    } catch (e) {
      push({ type: 'danger', title: 'Error', message: e?.message ?? 'Failed to save template' })
    } finally {
      setTemplateBusy(false)
    }
  }

  useEffect(() => {
    if (!templateEditorOpen) return
    if (templateMode !== 'edit') return
    if (!activeTemplate) return

    setTemplateForm({
      name: activeTemplate.name ?? '',
      description: activeTemplate.description ?? '',
      isActive: Boolean(activeTemplate.isActive),
    })
  }, [activeTemplate, templateEditorOpen, templateMode])

  useEffect(() => {
    if (!activeTemplateId) return
    if (!activeTemplateDetails) return
    const stageIds = new Set((activeTemplateDetails.stages ?? []).map((s) => s.id))
    if (selectedStageId && stageIds.has(selectedStageId)) return
    setSelectedStageId(activeTemplateDetails.stages?.[0]?.id ?? null)
  }, [activeTemplateDetails, activeTemplateId, selectedStageId])

  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Delete this template? This will delete its stages/content/task templates.')) return
    try {
      await deleteTemplateById(templateId)
      push({ type: 'success', title: 'Deleted', message: 'Template removed.' })
      if (activeTemplateId === templateId) {
        setTemplateEditorOpen(false)
        setActiveTemplateId(null)
      }
    } catch (e) {
      push({ type: 'danger', title: 'Error', message: e?.message ?? 'Failed to delete template' })
    }
  }

  const ensureValidUrl = (value) => {
    const v = String(value ?? '').trim()
    if (!v) return 'URL is required'
    if (!/^https?:\/\//i.test(v)) return 'URL must start with http:// or https://'
    return null
  }

  const handleAddStage = async () => {
    if (!activeTemplateId) {
      push({ type: 'warning', title: 'Save template first', message: 'Create the template before adding stages.' })
      return
    }

    const name = String(stageForm.name ?? '').trim()
    if (!name) {
      push({ type: 'warning', title: 'Stage name required', message: 'Give the stage a name (e.g. IDEA).' })
      return
    }

    setTemplateBusy(true)
    try {
      const orderIndex = (activeTemplateDetails?.stages?.length ?? 0)
      const stage = await addStage({
        templateId: activeTemplateId,
        name,
        description: String(stageForm.description ?? '').trim(),
        orderIndex,
      })
      setStageForm({ name: '', description: '' })
      setSelectedStageId(stage?.id ?? null)
      push({ type: 'success', title: 'Stage added', message: 'Now add videos/courses and tasks for this stage.' })
    } catch (e) {
      push({ type: 'danger', title: 'Error', message: e?.message ?? 'Failed to add stage' })
    } finally {
      setTemplateBusy(false)
    }
  }

  const handleAddContent = async () => {
    if (!selectedStageId) {
      push({ type: 'warning', title: 'Pick a stage', message: 'Select a stage before adding content.' })
      return
    }

    const title = String(contentForm.title ?? '').trim()
    if (!title) {
      push({ type: 'warning', title: 'Title required', message: 'Give your content a title.' })
      return
    }
    const urlError = ensureValidUrl(contentForm.url)
    if (urlError) {
      push({ type: 'warning', title: 'Invalid URL', message: urlError })
      return
    }

    const rawDuration = String(contentForm.durationMinutes ?? '').trim()
    const durationMinutes = rawDuration ? Number(rawDuration) : null
    const safeDuration = Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : null
    const orderIndex = (activeTemplateDetails?.contents ?? []).filter((c) => c.stageId === selectedStageId).length

    setTemplateBusy(true)
    try {
      await addContentItem({
        stageId: selectedStageId,
        contentType: contentForm.contentType,
        title,
        description: String(contentForm.description ?? '').trim(),
        url: String(contentForm.url ?? '').trim(),
        provider: String(contentForm.provider ?? '').trim(),
        durationMinutes: safeDuration,
        orderIndex,
      })
      setContentForm((prev) => ({ ...prev, title: '', url: '', provider: '', durationMinutes: '', description: '' }))
      push({ type: 'success', title: 'Added', message: 'Content item added.' })
    } catch (e) {
      push({ type: 'danger', title: 'Error', message: e?.message ?? 'Failed to add content' })
    } finally {
      setTemplateBusy(false)
    }
  }

  const handleAddTaskTemplate = async () => {
    if (!selectedStageId) {
      push({ type: 'warning', title: 'Pick a stage', message: 'Select a stage before adding tasks.' })
      return
    }

    const title = String(taskForm.title ?? '').trim()
    if (!title) {
      push({ type: 'warning', title: 'Title required', message: 'Give your task a title.' })
      return
    }

    const rawDue = String(taskForm.dueOffsetDays ?? '').trim()
    const dueOffsetDays = rawDue ? Number(rawDue) : null
    const safeDueOffsetDays = Number.isFinite(dueOffsetDays) ? dueOffsetDays : null
    const orderIndex = (activeTemplateDetails?.taskTemplates ?? []).filter((t) => t.stageId === selectedStageId).length

    setTemplateBusy(true)
    try {
      await addTaskTemplate({
        stageId: selectedStageId,
        title,
        description: String(taskForm.description ?? '').trim(),
        dueOffsetDays: safeDueOffsetDays,
        orderIndex,
        requiresApproval: Boolean(taskForm.requiresApproval),
      })
      setTaskForm((prev) => ({ ...prev, title: '', description: '', dueOffsetDays: '' }))
      push({ type: 'success', title: 'Added', message: 'Task template added.' })
    } catch (e) {
      push({ type: 'danger', title: 'Error', message: e?.message ?? 'Failed to add task template' })
    } finally {
      setTemplateBusy(false)
    }
  }

  const handleDeleteStage = async (stageId) => {
    if (!activeTemplateId) return
    if (!window.confirm('Delete this stage? This will remove its content and task templates.')) return
    setTemplateBusy(true)
    try {
      await deleteStage({ templateId: activeTemplateId, stageId })
      if (selectedStageId === stageId) {
        const remaining = (activeTemplateDetails?.stages ?? []).filter((s) => s.id !== stageId)
        setSelectedStageId(remaining?.[0]?.id ?? null)
      }
      push({ type: 'success', title: 'Deleted', message: 'Stage removed.' })
    } catch (e) {
      push({ type: 'danger', title: 'Error', message: e?.message ?? 'Failed to delete stage' })
    } finally {
      setTemplateBusy(false)
    }
  }

  const handleDeleteContent = async (contentId) => {
    if (!window.confirm('Delete this content item?')) return
    setTemplateBusy(true)
    try {
      await deleteContentItem({ contentId })
      push({ type: 'success', title: 'Deleted', message: 'Content removed.' })
    } catch (e) {
      push({ type: 'danger', title: 'Error', message: e?.message ?? 'Failed to delete content' })
    } finally {
      setTemplateBusy(false)
    }
  }

  const handleDeleteTaskTemplate = async (taskTemplateId) => {
    if (!window.confirm('Delete this task template?')) return
    setTemplateBusy(true)
    try {
      await deleteTaskTemplate({ taskTemplateId })
      push({ type: 'success', title: 'Deleted', message: 'Task template removed.' })
    } catch (e) {
      push({ type: 'danger', title: 'Error', message: e?.message ?? 'Failed to delete task template' })
    } finally {
      setTemplateBusy(false)
    }
  }

  const filteredPrograms = useMemo(() => {
    if (!searchTerm) return programs
    const lower = searchTerm.toLowerCase()
    return programs.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower)
    )
  }, [programs, searchTerm])

  const defaultValues = useMemo(
    () => ({
      id: editing?.id ?? null,
      name: editing?.name ?? '',
      description: editing?.description ?? '',
      durationWeeks: editing?.durationWeeks ?? 6,
      startDate: toDateInput(editing?.startDate) ?? '',
      endDate: toDateInput(editing?.endDate) ?? '',
      capacity: editing?.capacity ?? 20,
      status: editing?.status ?? 'active',
      coachIds: editing?.coachIds ?? [],
      participantStudentIds: editing?.participantStudentIds ?? [],
      deliveryMode: editing?.deliveryMode ?? 'presence',
      meetLink: editing?.meetLink ?? '',
      location: editing?.location ?? '',
      scheduleInfo: editing?.scheduleInfo ?? '',
      resources: editing?.resources ?? [],
      registrationType: editing?.registrationType ?? 'application',
    }),
    [editing],
  )

  const [form, setForm] = useState(defaultValues)

  const openCreate = () => {
    setEditing(null)
    setForm({
      id: null,
      name: '',
      description: '',
      durationWeeks: 6,
      startDate: '',
      endDate: '',
      capacity: 20,
      status: 'active',
      coachIds: [],
      participantStudentIds: [],
      deliveryMode: 'presence',
      meetLink: '',
      location: '',
      scheduleInfo: '',
      resources: [],
      registrationType: 'application',
    })
    setErrors({})
    setOpen(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({
      id: p.id,
      name: p.name,
      description: p.description,
      durationWeeks: p.durationWeeks,
      startDate: toDateInput(p.startDate),
      endDate: toDateInput(p.endDate),
      capacity: p.capacity,
      status: p.status,
      coachIds: p.coachIds ?? [],
      participantStudentIds: p.participantStudentIds ?? [],
      deliveryMode: p.deliveryMode ?? 'presence',
      meetLink: p.meetLink ?? '',
      location: p.location ?? '',
      scheduleInfo: p.scheduleInfo ?? '',
      resources: p.resources ?? [],
      registrationType: p.registrationType ?? 'application',
    })
    setErrors({})
    setOpen(true)
  }

  const onSave = async () => {
    const next = {
      ...form,
      durationWeeks: Number(form.durationWeeks),
      capacity: Number(form.capacity),
    }

    const errs = validate(schema, next)
    setErrors(errs)
    if (Object.keys(errs).length) return

    setBusy(true)
    try {
      await upsertProgram({
        id: next.id,
        name: next.name,
        description: next.description,
        durationWeeks: next.durationWeeks,
        startDate: fromDateInput(next.startDate),
        endDate: fromDateInput(next.endDate),
        capacity: next.capacity,
        status: next.status,
        coachIds: next.coachIds ?? [],
        participantStudentIds: next.participantStudentIds ?? [],
        deliveryMode: next.deliveryMode,
        meetLink: next.meetLink,
        location: next.location,
        scheduleInfo: next.scheduleInfo,
        resources: next.resources,
      })
      push({ type: 'success', title: 'Saved', message: 'Program updated.' })
      setOpen(false)
    } catch (e) {
      push({ type: 'danger', title: 'Error', message: e?.message ?? 'Failed to save program' })
    } finally {
      setBusy(false)
    }
  }

  const getComputedStatus = (p) => {
    const now = new Date()
    const start = new Date(p.startDate)
    const end = new Date(p.endDate)

    if (now < start) return 'upcoming'
    if (now > end) return 'completed'
    return 'ongoing'
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white">Programs</h1>
          <p className="mt-2 text-lg text-slate-500 font-medium">Create, edit, archive, and manage cohorts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => reset()}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
            title="Reset Data"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 shadow-md shadow-slate-900/10 transition-colors dark:bg-white dark:text-slate-900"
          >
            <Plus className="h-4 w-4" /> New Program
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Briefcase className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Programs</span>
          </div>
          <div className="text-2xl font-heading font-bold text-slate-900 dark:text-white">{programs.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Students</span>
          </div>
          <div className="text-2xl font-heading font-bold text-slate-900 dark:text-white">
            {programs.reduce((acc, p) => acc + (p.participantStudentIds?.length || 0), 0)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ongoing</span>
          </div>
          <div className="text-2xl font-heading font-bold text-slate-900 dark:text-white">
            {programs.filter(p => getComputedStatus(p) === 'ongoing').length}
          </div>
        </div>
      </div>

      {/* Program Templates (Roadmaps) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 dark:bg-slate-800 dark:border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-white">Program Templates</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Templates define stages + courses/videos + task templates. Students start a template to generate a real, editable Program Instance.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateTemplate}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors dark:bg-white dark:text-slate-900"
          >
            New Template
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">No templates yet.</div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow dark:border-slate-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white truncate">{tpl.name}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{tpl.description}</div>
                  </div>
                  <StatusBadge value={tpl.isActive ? 'active' : 'archived'} />
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openTemplateEditor(tpl.id)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors dark:border-slate-700 dark:text-slate-200"
                  >
                    Edit Structure
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTemplate(tpl.id)}
                    className="px-4 py-2 rounded-xl text-red-600 font-bold text-xs hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search programs..."
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
                <th className="px-6 py-4">Program Details</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Capacity</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredPrograms.map((p) => {
                const status = getComputedStatus(p)
                return (
                  <tr key={p.id} className="group hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-slate-900 text-base dark:text-white">{p.name}</div>
                        <div className="text-xs text-slate-500 mt-1 max-w-md truncate">{p.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-900 font-bold text-sm dark:text-white">{p.durationWeeks} Weeks</span>
                        <span className="text-xs text-slate-500">{formatDate(p.startDate)} - {formatDate(p.endDate)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-900 rounded-full"
                            style={{ width: `${Math.min(((p.participantStudentIds?.length || 0) / p.capacity) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-600">
                          {p.participantStudentIds?.length || 0} / {p.capacity}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge value={status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirm({ open: true, programId: p.id })}
                          className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={open}
        onClose={busy ? undefined : () => setOpen(false)}
        title={editing ? 'Edit Program' : 'New Program'}
        footer={
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setOpen(false)}
              disabled={busy}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={busy}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 dark:bg-white dark:text-slate-900"
            >
              {busy ? 'Saving...' : 'Save Program'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 dark:text-slate-300">Name</label>
            <input
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 transition-all ${errors.name ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-slate-400 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800'
                }`}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Summer Cohort 2024"
            />
            {errors.name && <p className="mt-1 text-xs font-bold text-red-500">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 dark:text-slate-300">Description</label>
            <textarea
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 transition-all min-h-[100px] ${errors.description ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-slate-400 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800'
                }`}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Program goals, requirements..."
            />
            {errors.description && <p className="mt-1 text-xs font-bold text-red-500">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 dark:text-slate-300">Start Date</label>
              <input
                type="date"
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 transition-all ${errors.startDate ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-slate-400 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800'
                  }`}
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
              {errors.startDate && <p className="mt-1 text-xs font-bold text-red-500">{errors.startDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 dark:text-slate-300">End Date</label>
              <input
                type="date"
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 transition-all ${errors.endDate ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-slate-400 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800'
                  }`}
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
              {errors.endDate && <p className="mt-1 text-xs font-bold text-red-500">{errors.endDate}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 dark:text-slate-300">Duration (Weeks)</label>
              <input
                type="number"
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 transition-all ${errors.durationWeeks ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-slate-400 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800'
                  }`}
                value={form.durationWeeks}
                onChange={(e) => setForm((f) => ({ ...f, durationWeeks: e.target.value }))}
                min={1}
              />
              {errors.durationWeeks && <p className="mt-1 text-xs font-bold text-red-500">{errors.durationWeeks}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 dark:text-slate-300">Capacity</label>
              <input
                type="number"
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 transition-all ${errors.capacity ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-slate-400 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800'
                  }`}
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                min={1}
              />
              {errors.capacity && <p className="mt-1 text-xs font-bold text-red-500">{errors.capacity}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 dark:text-slate-300">Status</label>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-xl border-slate-200 border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 bg-white dark:bg-slate-800 dark:border-slate-700"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 dark:text-slate-300">Registration Type</label>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-xl border-slate-200 border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 bg-white dark:bg-slate-800 dark:border-slate-700"
                value={form.registrationType}
                onChange={(e) => setForm((f) => ({ ...f, registrationType: e.target.value }))}
              >
                <option value="application">Application based (Wait for approval)</option>
                <option value="instant">Instant Join (No approval needed)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 dark:text-slate-300">Delivery Mode</label>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-xl border-slate-200 border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 bg-white dark:bg-slate-800 dark:border-slate-700"
                  value={form.deliveryMode}
                  onChange={(e) => setForm((f) => ({ ...f, deliveryMode: e.target.value }))}
                >
                  <option value="online">Online (Zoom/Meet)</option>
                  <option value="presence">In-Person (Sur place)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 dark:text-slate-300">Schedule Info</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 bg-white dark:bg-slate-800 dark:border-slate-700"
                value={form.scheduleInfo}
                onChange={(e) => setForm((f) => ({ ...f, scheduleInfo: e.target.value }))}
                placeholder="e.g. Every Monday at 10 AM"
              />
            </div>
          </div>

          {form.deliveryMode === 'online' ? (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 dark:text-slate-300">Meeting Link</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 bg-white dark:bg-slate-800 dark:border-slate-700"
                value={form.meetLink}
                onChange={(e) => setForm((f) => ({ ...f, meetLink: e.target.value }))}
                placeholder="https://zoom.us/j/..."
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 dark:text-slate-300">Location</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 bg-white dark:bg-slate-800 dark:border-slate-700"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Room 101, Science Building"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 dark:text-slate-300">Resources (JSON format for now)</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 bg-white dark:bg-slate-800 dark:border-slate-700 min-h-[60px]"
              value={JSON.stringify(form.resources)}
              onChange={(e) => {
                try {
                  const val = JSON.parse(e.target.value)
                  if (Array.isArray(val)) setForm((f) => ({ ...f, resources: val }))
                } catch (err) { }
              }}
              placeholder='[{"title":"BMC Template","url":"..."}]'
            />
            <p className="mt-1 text-[10px] text-slate-400 font-medium">Tip: Use an array of objects with title and url.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Assign coaches</div>
              <div className="mt-1 text-xs text-slate-500">Coaches can manage sessions and review submissions for this cohort.</div>
              <div className="mt-3 space-y-2 max-h-48 overflow-auto pr-1">
                {coaches.length === 0 ? (
                  <div className="text-sm text-slate-500">No coaches found.</div>
                ) : (
                  coaches.map((c) => {
                    const checked = (form.coachIds ?? []).includes(c.id)
                    return (
                      <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const nextIds = new Set(form.coachIds ?? [])
                            if (e.target.checked) nextIds.add(c.id)
                            else nextIds.delete(c.id)
                            setForm((f) => ({ ...f, coachIds: Array.from(nextIds) }))
                          }}
                        />
                        <span className="font-medium">{c.name}</span>
                        <span className="text-xs text-slate-400 truncate">{c.email}</span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Enroll students</div>
              <div className="mt-1 text-xs text-slate-500">Students enrolled here will see the program in their dashboard.</div>
              <div className="mt-3 space-y-2 max-h-48 overflow-auto pr-1">
                {students.length === 0 ? (
                  <div className="text-sm text-slate-500">No students found.</div>
                ) : (
                  students.map((s) => {
                    const checked = (form.participantStudentIds ?? []).includes(s.id)
                    return (
                      <label key={s.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const nextIds = new Set(form.participantStudentIds ?? [])
                            if (e.target.checked) nextIds.add(s.id)
                            else nextIds.delete(s.id)
                            setForm((f) => ({ ...f, participantStudentIds: Array.from(nextIds) }))
                          }}
                        />
                        <span className="font-medium">{s.name}</span>
                        <span className="text-xs text-slate-400 truncate">{s.email}</span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={templateEditorOpen}
        onClose={closeTemplateEditor}
        title={
          templateMode === 'create'
            ? 'Create Template'
            : activeTemplate
              ? `Edit Template: ${activeTemplate.name}`
              : 'Edit Template'
        }
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={closeTemplateEditor}
              disabled={templateBusy}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Close
            </button>
            <button
              type="button"
              onClick={saveTemplateMeta}
              disabled={templateBusy}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {templateBusy ? 'Saving…' : templateMode === 'create' ? 'Create Template' : 'Save Template'}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Step 1 — Template info</div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1.5 dark:text-slate-300">Name</label>
                <input
                  value={templateForm.name}
                  onChange={(e) => {
                    setTemplateForm((f) => ({ ...f, name: e.target.value }))
                    if (templateFormErrors.name) setTemplateFormErrors((prev) => ({ ...prev, name: null }))
                  }}
                  placeholder="e.g. Startup Incubation: IDEA → MVP"
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 transition-all ${templateFormErrors.name
                    ? 'border-red-300 focus:ring-red-100'
                    : 'border-slate-200 focus:border-slate-400 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800'
                    }`}
                  disabled={templateBusy}
                />
                {templateFormErrors.name ? (
                  <p className="mt-1 text-xs font-bold text-red-500">{templateFormErrors.name}</p>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1.5 dark:text-slate-300">Description</label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What is this program template about?"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 min-h-[90px] dark:border-slate-700 dark:bg-slate-800"
                  disabled={templateBusy}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                <div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Active</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Only active templates can be started by students.</div>
                </div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={Boolean(templateForm.isActive)}
                    onChange={(e) => setTemplateForm((f) => ({ ...f, isActive: e.target.checked }))}
                    disabled={templateBusy}
                  />
                  {templateForm.isActive ? 'Active' : 'Archived'}
                </label>
              </div>

              {templateMode === 'edit' && activeTemplateId ? (
                <button
                  type="button"
                  onClick={() => deleteTemplate(activeTemplateId)}
                  className="rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                  disabled={templateBusy}
                >
                  Delete template
                </button>
              ) : (
                <div className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Create the template first, then you can add stages.
                </div>
              )}
            </div>
          </div>

          {!activeTemplateId ? null : !activeTemplateDetails ? (
            <div className="text-sm text-slate-500">Loading template structure…</div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Step 2 — Build stages</div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">Stages</div>
                    <div className="text-xs text-slate-400">{(activeTemplateDetails.stages ?? []).length}</div>
                  </div>

                  {(activeTemplateDetails.stages ?? []).length === 0 ? (
                    <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                      Add your first stage (IDEA, PROTOTYPE, MVP…).
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {(activeTemplateDetails.stages ?? []).map((s) => {
                        const isSelected = s.id === selectedStageId
                        const countContent = (activeTemplateDetails.contents ?? []).filter((c) => c.stageId === s.id).length
                        const countTasks = (activeTemplateDetails.taskTemplates ?? []).filter((t) => t.stageId === s.id).length
                        return (
                          <div
                            key={s.id}
                            className={`rounded-xl border p-3 transition-colors ${isSelected
                              ? 'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-900/30'
                              : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900/20'
                              }`}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedStageId(s.id)}
                              className="w-full text-left"
                              disabled={templateBusy}
                            >
                              <div className="font-bold text-slate-900 dark:text-white truncate">{s.name}</div>
                              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {countContent} content • {countTasks} tasks
                              </div>
                            </button>

                            <div className="mt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleDeleteStage(s.id)}
                                className="px-2 py-1 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50"
                                disabled={templateBusy}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">Add stage</div>
                    <div className="mt-2 space-y-2">
                      <input
                        value={stageForm.name}
                        onChange={(e) => setStageForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Stage name (e.g. IDEA)"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
                        disabled={templateBusy}
                      />
                      <input
                        value={stageForm.description}
                        onChange={(e) => setStageForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="Short description (optional)"
                        className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
                        disabled={templateBusy}
                      />
                      <button
                        type="button"
                        onClick={handleAddStage}
                        disabled={templateBusy}
                        className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 dark:bg-white dark:text-slate-900"
                      >
                        Add stage
                      </button>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  {!selectedStageId ? (
                    <div className="text-sm text-slate-500">Select a stage to add content and tasks.</div>
                  ) : (
                    (() => {
                      const stage = (activeTemplateDetails.stages ?? []).find((s) => s.id === selectedStageId)
                      const stageContents = (activeTemplateDetails.contents ?? []).filter((c) => c.stageId === selectedStageId)
                      const stageTasks = (activeTemplateDetails.taskTemplates ?? []).filter((t) => t.stageId === selectedStageId)
                      if (!stage) return <div className="text-sm text-slate-500">Stage not found.</div>

                      return (
                        <div className="space-y-6">
                          <div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">Selected stage</div>
                            <div className="mt-1 text-lg font-heading font-bold text-slate-900 dark:text-white">{stage.name}</div>
                            {stage.description ? (
                              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{stage.description}</div>
                            ) : null}
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-bold text-slate-900 dark:text-white">Content (videos/courses)</div>
                              <div className="text-xs text-slate-400">{stageContents.length}</div>
                            </div>

                            {stageContents.length === 0 ? (
                              <div className="text-sm text-slate-500 dark:text-slate-400">No content yet.</div>
                            ) : (
                              <div className="space-y-2">
                                {stageContents.map((item) => (
                                  <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-900 dark:text-white truncate">{item.title}</div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        {String(item.contentType ?? '').toUpperCase()} • {item.url}
                                      </div>
                                      {(item.provider || item.durationMinutes) ? (
                                        <div className="mt-1 text-xs text-slate-400">
                                          {item.provider ? item.provider : null}
                                          {item.provider && item.durationMinutes ? ' • ' : null}
                                          {item.durationMinutes ? `${item.durationMinutes} min` : null}
                                        </div>
                                      ) : null}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteContent(item.id)}
                                      className="px-2 py-1 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50"
                                      disabled={templateBusy}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                              <div className="text-sm font-bold text-slate-900 dark:text-white">Add content</div>
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                                  <select
                                    value={contentForm.contentType}
                                    onChange={(e) => setContentForm((f) => ({ ...f, contentType: e.target.value }))}
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 bg-white dark:bg-slate-800 dark:border-slate-700"
                                    disabled={templateBusy}
                                  >
                                    <option value="video">Video</option>
                                    <option value="course">Course</option>
                                    <option value="article">Article</option>
                                    <option value="link">Link</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-1">Duration (min)</label>
                                  <input
                                    value={contentForm.durationMinutes}
                                    onChange={(e) => setContentForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                                    placeholder="optional"
                                    type="number"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
                                    disabled={templateBusy}
                                    min={0}
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-500 mb-1">Title</label>
                                  <input
                                    value={contentForm.title}
                                    onChange={(e) => setContentForm((f) => ({ ...f, title: e.target.value }))}
                                    placeholder="e.g. Customer discovery basics"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
                                    disabled={templateBusy}
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-500 mb-1">URL</label>
                                  <input
                                    value={contentForm.url}
                                    onChange={(e) => setContentForm((f) => ({ ...f, url: e.target.value }))}
                                    placeholder="https://..."
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
                                    disabled={templateBusy}
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-1">Provider</label>
                                  <input
                                    value={contentForm.provider}
                                    onChange={(e) => setContentForm((f) => ({ ...f, provider: e.target.value }))}
                                    placeholder="YouTube, Coursera… (optional)"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
                                    disabled={templateBusy}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                                  <input
                                    value={contentForm.description}
                                    onChange={(e) => setContentForm((f) => ({ ...f, description: e.target.value }))}
                                    placeholder="optional"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
                                    disabled={templateBusy}
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <button
                                    type="button"
                                    onClick={handleAddContent}
                                    disabled={templateBusy}
                                    className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 dark:bg-white dark:text-slate-900"
                                  >
                                    Add content
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-bold text-slate-900 dark:text-white">Tasks</div>
                              <div className="text-xs text-slate-400">{stageTasks.length}</div>
                            </div>

                            {stageTasks.length === 0 ? (
                              <div className="text-sm text-slate-500 dark:text-slate-400">No tasks yet.</div>
                            ) : (
                              <div className="space-y-2">
                                {stageTasks.map((t) => (
                                  <div key={t.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-900 dark:text-white truncate">{t.title}</div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {t.dueOffsetDays !== null ? `Due +${t.dueOffsetDays}d` : 'No default deadline'}
                                        {t.requiresApproval ? ' • Approval required' : ' • No approval'}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTaskTemplate(t.id)}
                                      className="px-2 py-1 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50"
                                      disabled={templateBusy}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                              <div className="text-sm font-bold text-slate-900 dark:text-white">Add task</div>
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-500 mb-1">Title</label>
                                  <input
                                    value={taskForm.title}
                                    onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                                    placeholder="e.g. Submit problem statement"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
                                    disabled={templateBusy}
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                                  <input
                                    value={taskForm.description}
                                    onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                                    placeholder="optional"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
                                    disabled={templateBusy}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-1">Due offset (days)</label>
                                  <input
                                    value={taskForm.dueOffsetDays}
                                    onChange={(e) => setTaskForm((f) => ({ ...f, dueOffsetDays: e.target.value }))}
                                    placeholder="optional"
                                    type="number"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
                                    disabled={templateBusy}
                                  />
                                </div>
                                <div className="flex items-end">
                                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(taskForm.requiresApproval)}
                                      onChange={(e) => setTaskForm((f) => ({ ...f, requiresApproval: e.target.checked }))}
                                      disabled={templateBusy}
                                    />
                                    Requires approval
                                  </label>
                                </div>
                                <div className="md:col-span-2">
                                  <button
                                    type="button"
                                    onClick={handleAddTaskTemplate}
                                    disabled={templateBusy}
                                    className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 dark:bg-white dark:text-slate-900"
                                  >
                                    Add task
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirm.open}
        title="Delete Program?"
        description="This will permanently remove the program and its associated data."
        confirmLabel="Delete Program"
        isDanger
        onClose={() => setConfirm({ open: false, programId: null })}
        onConfirm={async () => {
          if (!confirm.programId) return
          setBusy(true)
          try {
            await deleteProgram(confirm.programId)
            push({ type: 'success', title: 'Deleted', message: 'Program removed.' })
            setConfirm({ open: false, programId: null })
          } finally {
            setBusy(false)
          }
        }}
        isLoading={busy}
      />
    </div >
  )
}
