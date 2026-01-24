import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import Card from '../../components/common/Card'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import StatusBadge from '../../components/common/StatusBadge'
import { useToast } from '../../hooks/useToast'
import { useData } from '../../hooks/useData'
import { validate, rules } from '../../utils/validators'

const schema = {
  name: [rules.required('Name')],
  email: [rules.required('Email'), rules.email('Email')],
  role: [rules.required('Role')],
}

export default function AdminUsers() {
  const { data, upsertUser, deleteUser } = useData()
  const { push } = useToast()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', role: 'student' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState({ open: false, userId: null })

  const users = data?.users ?? []

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', email: '', role: 'student' })
    setErrors({})
    setOpen(true)
  }

  const openEdit = (u) => {
    setEditing(u)
    setForm({ id: u.id, name: u.name ?? '', email: u.email ?? '', role: u.role ?? 'student' })
    setErrors({})
    setOpen(true)
  }

  const onSave = async () => {
    const errs = validate(schema, form)
    setErrors(errs)
    if (Object.keys(errs).length) return

    setBusy(true)
    try {
      await upsertUser(form)
      push({ type: 'success', title: 'Saved', message: 'User updated.' })
      setOpen(false)
    } catch (e) {
      push({ type: 'danger', title: 'Error', message: e?.message ?? 'Failed to save user' })
    } finally {
      setBusy(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'User',
        accessor: (u) => u.name,
        cell: (u) => (
          <div>
            <div className="font-medium text-foreground">{u.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">{u.email}</div>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        accessor: (u) => u.role,
        cell: (u) => <StatusBadge value={u.role} />,
      },
      {
        key: 'actions',
        header: '',
        accessor: () => '',
        searchable: false,
        sortable: false,
        cell: (u) => (
          <div className="flex items-center justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => openEdit(u)}>
              Edit
            </button>
            <button
              type="button"
              className="btn-ghost text-danger-700 hover:bg-danger-50"
              onClick={() => setConfirm({ open: true, userId: u.id })}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-4">
      <Card
        title="Users"
        subtitle="Manage students, coaches, and admins"
        actions={
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New user
          </button>
        }
      />

      <DataTable
        title="All users"
        rows={users}
        columns={columns}
        exportFilename="users.csv"
        initialSort={{ key: 'name', dir: 'asc' }}
      />

      <Modal
        open={open}
        title={editing ? 'Edit user' : 'Create user'}
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
        <div className="grid gap-3">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            {errors.name ? <div className="mt-1 text-xs text-danger-700">{errors.name}</div> : null}
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            {errors.email ? <div className="mt-1 text-xs text-danger-700">{errors.email}</div> : null}
          </div>
          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              <option value="student">student</option>
              <option value="coach">coach</option>
              <option value="admin">admin</option>
            </select>
            {errors.role ? <div className="mt-1 text-xs text-danger-700">{errors.role}</div> : null}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        title="Delete user?"
        message="This removes the user from the prototype data."
        danger
        confirmLabel="Delete"
        onClose={() => setConfirm({ open: false, userId: null })}
        onConfirm={async () => {
          if (!confirm.userId) return
          setBusy(true)
          try {
            await deleteUser(confirm.userId)
            push({ type: 'success', title: 'Deleted', message: 'User removed.' })
            setConfirm({ open: false, userId: null })
          } finally {
            setBusy(false)
          }
        }}
        busy={busy}
      />
    </div>
  )
}
