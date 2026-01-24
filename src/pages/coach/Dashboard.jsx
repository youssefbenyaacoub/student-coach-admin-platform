import { useMemo, useState, useEffect, useRef } from 'react'
import { 
  Calendar, 
  ClipboardCheck, 
  Users, 
  AlertTriangle, 
  Clock, 
  UserX,
  MessageSquare,
  Search,
  ChevronRight,
  Send,
  MoreVertical,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import Card from '../../components/common/Card'
import StatusBadge from '../../components/common/StatusBadge'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { formatDateTime, formatDate } from '../../utils/time'
import { cn } from '../../utils/cn'

export default function CoachDashboard() {
  const { currentUser } = useAuth()
  const { data, sendMessage, markAsRead } = useData() 
  
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [msgInput, setMsgInput] = useState('')
  const scrollRef = useRef(null)

  // 1. Gather all coach-relevant data
  const context = useMemo(() => {
    if (!currentUser?.id || !data) return null

    // Programs I coach
    const myPrograms = (data.programs ?? []).filter((p) =>
      p.coachIds.includes(currentUser.id)
    )
    const myProgramIds = myPrograms.map((p) => p.id)

    // Students in my programs
    const myStudentIds = new Set()
    myPrograms.forEach((p) => {
      p.participantStudentIds.forEach((id) => myStudentIds.add(id))
    })
    
    // Enrich students with status flags
    const students = (data.users ?? [])
        .filter((u) => myStudentIds.has(u.id))
        .map(student => {
            // Check overdue deliverables
            const overdueCount = (data.deliverables ?? [])
                .filter(d => 
                    myProgramIds.includes(d.programId) && 
                    d.assignedStudentIds.includes(student.id) &&
                    new Date(d.dueDate) < new Date() &&
                    !d.submissions?.some(s => s.studentId === student.id)
                ).length;
            
            // Check unread messages from this student
            const unreadCount = (data.messages ?? [])
                .filter(m => m.senderId === student.id && m.receiverId === currentUser.id && !m.readAt)
                .length

            return {
                ...student,
                overdueCount,
                unreadCount,
                attentionLevel: overdueCount > 0 ? 'high' : (unreadCount > 0 ? 'medium' : 'low')
            }
        })
        .sort((a, b) => {
            // Sort by attention level (High > Medium > Low)
            const score = { high: 3, medium: 2, low: 1 }
            return score[b.attentionLevel] - score[a.attentionLevel]
        })

    return { students, myPrograms }
  }, [currentUser, data])

  // 2. Get Selected Student Data
  const selectedData = useMemo(() => {
    if (!selectedStudentId || !context) return null
    const student = context.students.find(s => s.id === selectedStudentId)
    
    // Messages
    const messages = (data?.messages ?? [])
        .filter(m => (m.senderId === currentUser.id && m.receiverId === selectedStudentId) || (m.senderId === selectedStudentId && m.receiverId === currentUser.id))
        .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))

    // Deliverables
    const deliverables = (data?.deliverables ?? [])
        .filter(d => d.assignedStudentIds.includes(selectedStudentId))
        .map(d => {
            const submission = d.submissions?.find(s => s.studentId === selectedStudentId)
            let status = 'pending'
            if (submission) status = submission.status
            else if (new Date(d.dueDate) < new Date()) status = 'overdue'
            
            return { ...d, submission, status }
        })
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))

    return { student, messages, deliverables }
  }, [selectedStudentId, context, data, currentUser])

  // Scroll logic for chat
  useEffect(() => {
    if (selectedData?.messages && scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [selectedData?.messages])

  // Mark as read when selecting
  useEffect(() => {
      if (selectedStudentId && context) {
           const student = context.students.find(s => s.id === selectedStudentId)
           if (student && student.unreadCount > 0) {
              const unreadIds = (data?.messages ?? [])
                .filter(m => m.senderId === selectedStudentId && m.receiverId === currentUser.id && !m.readAt)
                .map(m => m.id)
              
              if (unreadIds.length > 0) {
                 markAsRead({ messageIds: unreadIds })
              }
           }
      }
  }, [selectedStudentId, context, data, currentUser, markAsRead])


  const handleSend = async (e) => {
      e.preventDefault()
      if (!msgInput.trim() || !selectedStudentId) return
      await sendMessage({
          senderId: currentUser.id,
          receiverId: selectedStudentId,
          content: msgInput
      })
      setMsgInput('')
  }


  if (!currentUser || !context) return <div className="p-8">Loading...</div>

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[600px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm grid grid-cols-12">
      
      {/* LEFT SIDEBAR: Student List */}
      <div className="col-span-12 md:col-span-4 border-r border-border flex flex-col bg-muted/10">
        <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-lg flex items-center gap-2">
                <Users className="h-5 w-5" /> My Students
            </h2>
            <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                    type="text" 
                    placeholder="Search students..." 
                    className="w-full rounded-full border border-input bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {context.students.map(student => (
                <button
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    className={cn(
                        "w-full text-left p-3 rounded-xl transition-all flex items-center gap-3",
                        selectedStudentId === student.id ? "bg-white shadow-sm ring-1 ring-border dark:bg-slate-800" : "hover:bg-white/50 hover:dark:bg-white/5"
                    )}
                >
                    <div className="relative h-10 w-10">
                        <div className="h-full w-full rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                            {student.name.charAt(0)}
                        </div>
                        {student.attentionLevel !== 'low' && (
                            <span className={cn(
                                "absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white",
                                student.attentionLevel === 'high' ? "bg-red-500" : "bg-blue-500"
                            )} />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-foreground truncate">{student.name}</span>
                            <span className="text-xs text-muted-foreground">{student.level ? `Lvl ${student.level}` : ''}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                            {student.overdueCount > 0 ? (
                                <span className="text-red-600 font-medium">{student.overdueCount} overdue tasks</span>
                            ) : (
                                student.university
                            )}
                        </div>
                    </div>
                    <ChevronRight className={cn("h-4 w-4 text-muted-foreground", selectedStudentId === student.id && "text-primary")} />
                </button>
            ))}
        </div>
      </div>

      {/* RIGHT MAIN: Detail View */}
      <div className="col-span-12 md:col-span-8 flex flex-col bg-background">
        {selectedData ? (
            <>
                {/* Header */}
                <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-white/50 backdrop-blur-sm dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div>
                            <h2 className="font-bold text-foreground">{selectedData.student.name}</h2>
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                                {selectedData.student.email} • {selectedData.student.phone}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         <button className="btn-ghost btn-sm h-8 w-8 p-0 rounded-full">
                            <MoreVertical className="h-4 w-4" />
                         </button>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="flex-1 overflow-hidden grid grid-rows-2 md:grid-rows-1 md:grid-cols-2">
                    
                    {/* Chat Section */}
                    <div className="flex flex-col border-r border-border h-full max-h-full">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
                            {selectedData.messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm opacity-60">
                                    <MessageSquare className="h-8 w-8 mb-2" />
                                    No messages yet
                                </div>
                            ) : (
                                selectedData.messages.map(msg => {
                                    const isMe = msg.senderId === currentUser.id
                                    return (
                                        <div key={msg.id} className={cn("flex w-full mb-3", isMe ? "justify-end" : "justify-start")}>
                                            <div className={cn(
                                                "max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                                                isMe ? "bg-primary text-white" : "bg-white border border-border text-foreground dark:bg-card"
                                            )}>
                                                {msg.content}
                                                <div className={cn("text-[10px] mt-1 text-right opacity-70", isMe ? "text-primary-foreground" : "text-muted-foreground")}>
                                                    {formatDateTime(msg.sentAt)}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={scrollRef} />
                        </div>
                        <form onSubmit={handleSend} className="p-3 border-t border-border bg-background">
                            <div className="flex gap-2">
                                <input 
                                    value={msgInput}
                                    onChange={e => setMsgInput(e.target.value)}
                                    className="flex-1 rounded-full border border-input bg-muted/30 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="Type a message..."
                                />
                                <button type="submit" disabled={!msgInput.trim()} className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90 disabled:opacity-50">
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Task & Feedback Section */}
                    <div className="flex flex-col h-full bg-background overflow-hidden">
                        <div className="p-4 border-b border-border bg-muted/5">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <ClipboardCheck className="h-4 w-4" /> 
                                Deliverables Status
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {selectedData.deliverables.map(d => (
                                <div key={d.id} className="group rounded-lg border border-border p-3 hover:border-primary/50 transition-colors bg-card">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-medium text-sm text-foreground line-clamp-1">{d.title}</span>
                                        {d.status === 'graded' ? (
                                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                                {d.submission.grade}%
                                            </span>
                                        ) : d.status === 'submitted' ? (
                                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                To Grade
                                            </span>
                                        ) : d.status === 'overdue' ? (
                                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                                Overdue
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                                Pending
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex justify-between items-center mt-2">
                                        <span>Due: {formatDate(d.dueDate)}</span>
                                        {d.status === 'submitted' && (
                                            <button className="text-primary font-medium hover:underline">Grade Now</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-border bg-indigo-50/50 dark:bg-indigo-900/10">
                            <h3 className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 mb-2">Quick Actions</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <button className="rounded-lg bg-white border border-indigo-100 px-3 py-2 text-xs font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 transition-colors">
                                    Schedule Session
                                </button>
                                <button className="rounded-lg bg-white border border-indigo-100 px-3 py-2 text-xs font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 transition-colors">
                                    Assign Task
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Users className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Select a Student</h3>
                <p className="text-muted-foreground max-w-sm mt-2">
                    Choose a student from the sidebar to view their progress, chat history, and pending deliverables.
                </p>
                
                {context.students.filter(s => s.attentionLevel === 'high').length > 0 && (
                     <div className="mt-8 w-full max-w-md">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Attention Needed</div>
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl overflow-hidden">
                            {context.students.filter(s => s.attentionLevel === 'high').map(s => (
                                <button 
                                    key={s.id}
                                    onClick={() => setSelectedStudentId(s.id)}
                                    className="w-full flex items-center justify-between p-3 hover:bg-red-100/50 transition-colors border-b border-red-100 last:border-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                        <span className="text-sm font-medium text-red-900 dark:text-red-200">{s.name}</span>
                                    </div>
                                    <span className="text-xs text-red-700 font-medium">View</span>
                                </button>
                            ))}
                        </div>
                     </div>
                )}
            </div>
        )}
      </div>
    </div>
  )
}
