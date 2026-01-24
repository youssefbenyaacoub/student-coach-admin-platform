import { Plus, Trash2, Edit, Search, User, Shield, Mail } from 'lucide-react'
import { useMemo, useState } from 'react'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import Modal from '../../components/common/Modal'
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
  const [searchTerm, setSearchTerm] = useState('')

  const users = useMemo(() => data?.users ?? [], [data?.users])

  const filteredUsers = useMemo(() => {
     if (!searchTerm) return users
     const lower = searchTerm.toLowerCase()
     return users.filter(u => 
        u.name.toLowerCase().includes(lower) || 
        u.email.toLowerCase().includes(lower) ||
        u.role.toLowerCase().includes(lower)
     )
  }, [users, searchTerm])

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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white">Users</h1>
          <p className="mt-2 text-lg text-slate-500 font-medium">Manage students, alumni, coaches, and administrators.</p>
        </div>
        <button 
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 shadow-md shadow-slate-900/10 transition-colors dark:bg-white dark:text-slate-900"
        >
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {['student', 'coach', 'admin', 'alumni'].map(role => (
             <div key={role} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                 <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{role}s</div>
                 <div className="text-2xl font-heading font-bold text-slate-900 capitalize dark:text-white">
                     {users.filter(u => u.role === role).length}
                 </div>
             </div>
         ))}
      </div>

      {/* Search & Filter */}
      <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search users by name, email, or role..." 
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
                        <th className="px-6 py-4">User Details</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredUsers.map((u) => (
                        <tr key={u.id} className="group hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-700/50">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm ring-2 ring-white shadow-sm dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-800">
                                        {u.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                                        <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5"><Mail className="h-3 w-3"/> {u.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                                    u.role === 'admin' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                    u.role === 'coach' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                    'bg-blue-50 text-blue-700 border-blue-100'
                                }`}>
                                   {u.role === 'admin' ? <Shield className="h-3 w-3" /> : u.role === 'coach' ? <User className="h-3 w-3"/> : <User className="h-3 w-3"/>}
                                   <span className="capitalize">{u.role}</span>
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => openEdit(u)}
                                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors dark:hover:bg-slate-700 dark:hover:text-slate-300"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setConfirm({ open: true, userId: u.id })}
                                        className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                        <tr>
                            <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                                No users found matching "{searchTerm}".
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      <Modal
        isOpen={open}
        onClose={busy ? undefined : () => setOpen(false)}
        title={editing ? 'Edit User' : 'New User'}
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
              {busy ? 'Saving...' : 'Save User'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 dark:text-slate-300">Full Name</label>
            <input
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 transition-all ${
                errors.name ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-slate-400 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800'
              }`}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. John Doe"
            />
            {errors.name && <p className="mt-1 text-xs font-bold text-red-500">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 dark:text-slate-300">Email Address</label>
            <input
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 transition-all ${
                errors.email ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-slate-400 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800'
              }`}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="name@example.com"
            />
            {errors.email && <p className="mt-1 text-xs font-bold text-red-500">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 dark:text-slate-300">Role</label>
            <div className="relative">
                <select
                className={`w-full appearance-none rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 transition-all bg-white dark:bg-slate-800 ${
                    errors.role ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-slate-400 focus:ring-slate-100 dark:border-slate-700'
                }`}
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                >
                <option value="student">Student</option>
                <option value="coach">Coach</option>
                <option value="admin">Administrator</option>
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            {errors.role && <p className="mt-1 text-xs font-bold text-red-500">{errors.role}</p>}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirm.open}
        title="Delete User?"
        description="This will permanently remove the user and their associated data from the system."
        confirmLabel="Delete User"
        isDanger
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
        isLoading={busy}
      />
    </div>
  )
}
