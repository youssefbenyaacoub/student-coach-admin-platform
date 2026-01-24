import { Plus, RefreshCcw, Trash2, Eye, Edit } from 'lucide-react'
import { useMemo, useState } from 'react'
import Card from '../../components/common/Card'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import StatusBadge from '../../components/common/StatusBadge'
import { useToast } from '../../hooks/useToast'
import { useData } from '../../hooks/useData'
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

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const [confirm, setConfirm] = useState({ open: false, programId: null })

  const programs = data?.programs ?? []

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

  const columns = [
    {
      key: 'name',
      header: 'Program Name',
      accessor: (p) => p.name,
      sortValue: (p) => p.name,
      cell: (p) => (
        <div>
          <div className="font-medium text-foreground">{p.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">{p.description}</div>
        </div>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      accessor: (p) => `${formatDate(p.startDate)} - ${formatDate(p.endDate)}`,
      cell: (p) => (
        <div className="text-sm">
            <div>{p.durationWeeks} weeks</div>
            <div className="text-xs text-muted-foreground">{formatDate(p.startDate)} - {formatDate(p.endDate)}</div>
        </div>
      )
    },
    {
      key: 'students',
      header: 'Students',
      accessor: (p) => p.participantStudentIds?.length ?? 0,
    },
    {
      key: 'coaches',
      header: 'Coaches',
      accessor: (p) => p.coachIds?.length ?? 0,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (p) => getComputedStatus(p),
      cell: (p) => <StatusBadge value={getComputedStatus(p)} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: () => '',
      searchable: false,
      sortable: false,
      cell: (p) => (
        <div className="flex items-center justify-end gap-2">
          <button 
             type="button" 
             className="btn-ghost flex items-center gap-1 text-xs"
             onClick={() => push({ type: 'info', title: 'Details', message: `Viewing details for ${p.name}` })}
           >
            <Eye className="h-4 w-4" /> View
          </button>
          <button type="button" className="btn-ghost flex items-center gap-1 text-xs" onClick={() => openEdit(p)}>
            <Edit className="h-4 w-4" /> Edit
          </button>
           <button
            type="button"
            className="btn-ghost text-danger-700 hover:bg-danger-50"
            onClick={() => setConfirm({ open: true, programId: p.id })}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <Card
        title="Programs"
        subtitle="Create, edit, archive, and manage cohorts"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost" onClick={() => reset()}>
              <RefreshCcw className="h-4 w-4" /> Reset seed
            </button>
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> New program
            </button>
          </div>
        }
      />

      <DataTable
        title="All programs"
        rows={programs}
        columns={columns}
        exportFilename="programs.csv"
        initialSort={{ key: 'name', dir: 'asc' }}
      />

      <Modal
        open={open}
        title={editing ? 'Edit program' : 'Create program'}
        onClose={busy ? undefined : () => setOpen(false)}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={onSave} disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="label">Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            {errors.name ? <div className="mt-1 text-xs text-danger-700">{errors.name}</div> : null}
          </div>
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea
              className="input min-h-24"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            {errors.description ? (
              <div className="mt-1 text-xs text-danger-700">{errors.description}</div>
            ) : null}
          </div>
          <div>
            <label className="label">Start date</label>
            <input
              type="date"
              className="input"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
            {errors.startDate ? (
              <div className="mt-1 text-xs text-danger-700">{errors.startDate}</div>
            ) : null}
          </div>
          <div>
            <label className="label">End date</label>
            <input
              type="date"
              className="input"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
            {errors.endDate ? <div className="mt-1 text-xs text-danger-700">{errors.endDate}</div> : null}
          </div>
          <div>
            <label className="label">Duration (weeks)</label>
            <input
              type="number"
              className="input"
              value={form.durationWeeks}
              onChange={(e) => setForm((f) => ({ ...f, durationWeeks: e.target.value }))}
              min={1}
            />
            {errors.durationWeeks ? (
              <div className="mt-1 text-xs text-danger-700">{errors.durationWeeks}</div>
            ) : null}
          </div>
          <div>
            <label className="label">Capacity</label>
            <input
              type="number"
              className="input"
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              min={1}
            />
            {errors.capacity ? (
              <div className="mt-1 text-xs text-danger-700">{errors.capacity}</div>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <label className="label">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="active">active</option>
              <option value="archived">archived</option>
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        title="Delete program?"
        message="This removes the program from the prototype data. This cannot be undone (unless you reset seed)."
        danger
        confirmLabel="Delete"
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
        busy={busy}
      />
    </div>
  )
}
