import { useMemo, useState } from 'react'
import { 
  Users, 
  BookOpen, 
  Calendar, 
  AlertCircle,
  TrendingDown,
  ShieldAlert,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare
} from 'lucide-react'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import { useData } from '../../hooks/useData'
import { formatDateTime } from '../../utils/time'

export default function AdminDashboard() {
  const { data } = useData()
  const [filter, setFilter] = useState('all') // 'all', 'inactive', 'blocked'
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  
  // 1. Calculate Global stats and Identify Risks
  const systemHealth = useMemo(() => {
    if (!data) return null

    const students = (data.users ?? []).filter(u => u.role === 'student')
    const coaches = (data.users ?? []).filter(u => u.role === 'coach')
    const programs = data.programs ?? []

    // A. Attendance Rate
    const sessions = data.coachingSessions ?? []
    const completedSessions = sessions.filter(s => s.status === 'completed')
    let attendanceEvents = 0
    let presentEvents = 0
    
    completedSessions.forEach(s => {
        attendanceEvents += s.attendeeStudentIds.length
        presentEvents += (s.attendance ?? []).filter(a => a.status === 'present').length
    })
    const avgAttendance = attendanceEvents > 0 ? Math.round((presentEvents / attendanceEvents) * 100) : 0

    // B. Identify "At Risk" Students (Inactive > 7 days OR Missing > 2 deliverables)
    const now = new Date()
    const atRiskStudents = students.filter(student => {
        // Check Last Login (Simulated by updatedAt for now)
        const lastActive = new Date(student.updatedAt)
        const daysInactive = (now - lastActive) / (1000 * 60 * 60 * 24)
        
        // Check Overdue Deliverables
        const overdueCount = (data.deliverables ?? [])
            .filter(d => 
                d.assignedStudentIds.includes(student.id) && 
                new Date(d.dueDate) < now &&
                !d.submissions?.some(s => s.studentId === student.id)
            ).length

        return daysInactive > 7 || overdueCount >= 2
    })

    return {
        totalStudents: students.length,
        totalCoaches: coaches.length,
        totalPrograms: programs.length,
        avgAttendance,
        atRiskCount: atRiskStudents.length,
        students,
        atRiskStudents
    }
  }, [data])

  // 2. Filter Table Data
  const filteredStudents = useMemo(() => {
      if (!systemHealth) return []
      return systemHealth.students.filter(s => {
          if (filter === 'all') return true
          if (filter === 'inactive') {
               // Reuse our risk logic or simple "no badges" logic for mockup
               return systemHealth.atRiskStudents.some(r => r.id === s.id)
          }
          if (filter === 'blocked') return false // Mock: no blocked users yet
          return true
      })
  }, [systemHealth, filter])

  // 3. Conversation Preview (Read-Only)
  const conversationPreview = useMemo(() => {
      if (!selectedStudentId || !data) return []
      return (data.messages ?? [])
        .filter(m => m.senderId === selectedStudentId || m.receiverId === selectedStudentId)
        .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
        .map(m => {
            const sender = data.users.find(u => u.id === m.senderId)
            return {
                ...m,
                senderName: sender?.name || 'Unknown'
            }
        })
  }, [selectedStudentId, data])


  if (!systemHealth) return <div className="p-8">Loading analytics...</div>

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight text-slate-900 dark:text-white">System Overview</h1>
        <p className="mt-2 text-lg text-slate-500 font-medium">
          Monitoring <span className="font-bold text-slate-700 dark:text-slate-300">{systemHealth.totalPrograms} active programs</span> and <span className="font-bold text-slate-700 dark:text-slate-300">{systemHealth.totalStudents} students</span>.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-200 group hover:shadow-md transition-all dark:bg-slate-800 dark:border-slate-700">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 translate-y--8 rounded-full bg-slate-900/5 group-hover:bg-slate-900/10 transition-colors"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="rounded-xl bg-slate-900 text-white p-3 shadow-lg shadow-slate-900/20">
               <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Total Students</p>
              <h3 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">{systemHealth.totalStudents}</h3>
            </div>
          </div>
        </div>
        
        <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-200 group hover:shadow-md transition-all dark:bg-slate-800 dark:border-slate-700">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 translate-y--8 rounded-full bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="rounded-xl bg-indigo-600 text-white p-3 shadow-lg shadow-indigo-600/20">
               <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Active Programs</p>
              <h3 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">{systemHealth.totalPrograms}</h3>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-200 group hover:shadow-md transition-all dark:bg-slate-800 dark:border-slate-700">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 translate-y--8 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="rounded-xl bg-emerald-600 text-white p-3 shadow-lg shadow-emerald-600/20">
               <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Avg. Attendance</p>
              <h3 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">{systemHealth.avgAttendance}%</h3>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-200 group hover:shadow-md transition-all dark:bg-slate-800 dark:border-slate-700">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 translate-y--8 rounded-full bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="rounded-xl bg-amber-500 text-white p-3 shadow-lg shadow-amber-500/20">
               <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Students At Risk</p>
              <h3 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">{systemHealth.atRiskCount}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Section (Only shows if there are risks) */}
      {systemHealth.atRiskStudents.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex items-start gap-4 shadow-sm dark:bg-amber-900/20 dark:border-amber-900">
              <div className="rounded-full bg-amber-100 p-2 text-amber-600 shrink-0">
                  <AlertCircle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                  <h3 className="font-heading font-bold text-amber-900 text-lg mb-1 dark:text-amber-100">Attention Required</h3>
                  <p className="text-sm text-amber-800 leading-relaxed dark:text-amber-200">
                      <span className="font-bold">{systemHealth.atRiskStudents.length} students</span> have been inactive for over 7 days or have multiple overdue deliverables. This may impact program completion rates.
                  </p>
              </div>
              <button 
                onClick={() => setFilter('inactive')}
                className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-bold text-amber-700 shadow-sm border border-amber-200 hover:bg-amber-50 active:scale-95 transition-all"
              >
                  View Reports
              </button>
          </div>
      )}

      {/* Student Monitoring Table */}
      <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-white">Student Monitoring</h2>
              
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                  <button 
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${filter === 'all' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                  >
                      All Students
                  </button>
                  <button 
                    onClick={() => setFilter('inactive')}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${filter === 'inactive' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-500 hover:text-amber-600'}`}
                  >
                      At Risk
                  </button>
                  <button 
                    onClick={() => setFilter('blocked')}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${filter === 'blocked' ? 'bg-red-100 text-red-700 shadow-sm' : 'text-slate-500 hover:text-red-600'}`}
                  >
                      Blocked
                  </button>
              </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:bg-slate-800 dark:border-slate-700">
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold font-heading uppercase tracking-wider text-xs border-b border-slate-200 dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-400">
                        <tr>
                            <th className="px-6 py-4">Student</th>
                            <th className="px-6 py-4">University</th>
                            <th className="px-6 py-4">Health Status</th>
                            <th className="px-6 py-4">Last Active</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                    <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center dark:bg-slate-800">
                                        <Search className="h-6 w-6 text-slate-300" />
                                    </div>
                                    No students found matching this filter.
                                </td>
                            </tr>
                        ) : (
                            filteredStudents.map(student => {
                                const isRisk = systemHealth.atRiskStudents.some(r => r.id === student.id)
                                return (
                                    <tr key={student.id} className="group hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-700/50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-slate-50 group-hover:ring-white transition-all">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white">{student.name}</div>
                                                    <div className="text-xs text-slate-500 font-medium">{student.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-medium dark:text-slate-300">
                                            {student.university}
                                        </td>
                                        <td className="px-6 py-4">
                                            {isRisk ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200 shadow-sm">
                                                    <AlertCircle className="h-3.5 w-3.5" /> At Risk
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 shadow-sm">
                                                    <CheckCircle className="h-3.5 w-3.5" /> Healthy
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 font-medium">
                                            {formatDateTime(student.updatedAt)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => setSelectedStudentId(student.id)}
                                                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all dark:bg-slate-800 dark:ring-slate-700 dark:text-slate-300"
                                            >
                                                <Eye className="h-3.5 w-3.5" /> Monitor
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
             </div>
          </div>
      </div>

      {/* Read-Only Modal for Chat Monitoring */}
      <Modal
        isOpen={!!selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
        title="Communication Log (Read-Only)"
      >
        <div className="h-[400px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-6 scrollbar-thin scrollbar-thumb-slate-200 dark:bg-slate-900/50 dark:border-slate-700">
            {conversationPreview.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-slate-400">
                    <MessageSquare className="mb-3 h-10 w-10 opacity-20" />
                    <p className="text-sm font-medium">No messages recorded for this student.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {conversationPreview.map(msg => (
                        <div key={msg.id} className="flex flex-col gap-1.5 animate-in slide-in-from-bottom-2">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{msg.senderName}</span>
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">{formatDateTime(msg.sentAt)}</span>
                            </div>
                            <div className="rounded-2xl rounded-tl-none border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                                {msg.content}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-amber-50 p-4 text-xs font-bold text-amber-800 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-900/50">
             <ShieldAlert className="h-4 w-4" />
             This view is for monitoring purposes only. You cannot reply from here.
        </div>
      </Modal>

    </div>
  )
}

