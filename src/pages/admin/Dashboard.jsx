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
    <div className="space-y-8 animate-in fade-in">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">System Overview</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Monitoring {systemHealth.totalPrograms} active programs and {systemHealth.totalStudents} students.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
               <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Students</p>
              <h3 className="text-2xl font-bold">{systemHealth.totalStudents}</h3>
            </div>
          </div>
        </Card>
        
        <Card className="border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-900/20">
               <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Programs</p>
              <h3 className="text-2xl font-bold">{systemHealth.totalPrograms}</h3>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-900/20">
               <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg. Attendance</p>
              <h3 className="text-2xl font-bold">{systemHealth.avgAttendance}%</h3>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-amber-50 p-3 text-amber-600 dark:bg-amber-900/20">
               <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Students At Risk</p>
              <h3 className="text-2xl font-bold">{systemHealth.atRiskCount}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Alerts Section (Only shows if there are risks) */}
      {systemHealth.atRiskStudents.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/10">
              <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                      <h3 className="font-semibold text-amber-900 dark:text-amber-200">Attention Required</h3>
                      <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                          {systemHealth.atRiskStudents.length} students have been inactive for over 7 days or have multiple overdue deliverables.
                      </p>
                  </div>
                  <button 
                    onClick={() => setFilter('inactive')}
                    className="ml-auto text-sm font-medium text-amber-700 underline hover:text-amber-800"
                  >
                      View Reports
                  </button>
              </div>
          </div>
      )}

      {/* Student Monitoring Table */}
      <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Student Monitoring</h2>
              
              <div className="flex items-center gap-2 rounded-lg bg-card border border-border p-1">
                  <button 
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'all' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                      All Students
                  </button>
                  <button 
                    onClick={() => setFilter('inactive')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'inactive' ? 'bg-amber-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                      At Risk
                  </button>
                  <button 
                    onClick={() => setFilter('blocked')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'blocked' ? 'bg-red-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                      Blocked
                  </button>
              </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground font-medium uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Student</th>
                            <th className="px-6 py-4">University</th>
                            <th className="px-6 py-4">Health Status</th>
                            <th className="px-6 py-4">Last Active</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                    No students found matching this filter.
                                </td>
                            </tr>
                        ) : (
                            filteredStudents.map(student => {
                                const isRisk = systemHealth.atRiskStudents.some(r => r.id === student.id)
                                return (
                                    <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-foreground">{student.name}</div>
                                                    <div className="text-xs text-muted-foreground">{student.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {student.university}
                                        </td>
                                        <td className="px-6 py-4">
                                            {isRisk ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                                                    <AlertCircle className="h-3.5 w-3.5" /> At Risk
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                                                    <CheckCircle className="h-3.5 w-3.5" /> Healthy
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {formatDateTime(student.updatedAt)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => setSelectedStudentId(student.id)}
                                                className="btn-ghost btn-xs gap-1.5"
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
        <div className="h-[400px] overflow-y-auto rounded-lg border border-border bg-slate-50 p-4 dark:bg-slate-900/50">
            {conversationPreview.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                    <MessageSquare className="mb-2 h-8 w-8 opacity-20" />
                    <p>No messages recorded for this student.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {conversationPreview.map(msg => (
                        <div key={msg.id} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="font-semibold">{msg.senderName}</span>
                                <span>{formatDateTime(msg.sentAt)}</span>
                            </div>
                            <div className="rounded-lg border border-border bg-white p-3 text-sm shadow-sm dark:bg-card">
                                {msg.content}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        <div className="mt-4 flex justify-end gap-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
             <ShieldAlert className="h-4 w-4" />
             This view is for monitoring purposes only. You cannot reply from here.
        </div>
      </Modal>

    </div>
  )
}
