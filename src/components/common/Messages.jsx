import { useMemo, useState } from 'react'
import { MessageSquare, Send, Search, User } from 'lucide-react'
import Card from '../../components/common/Card'
import Modal from '../../components/common/Modal'
import EmptyState from '../../components/common/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast'
import { formatDateTime } from '../../utils/time'

export default function Messages() {
  const { currentUser, role } = useAuth()
  const { data } = useData()
  const { showToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [showComposeModal, setShowComposeModal] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState('')
  const [messageSubject, setMessageSubject] = useState('')
  const [messageContent, setMessageContent] = useState('')

  const myMessages = useMemo(() => {
    if (!currentUser?.id || !data) return []

    return (data.messages ?? [])
      .filter((m) => m.receiverId === currentUser.id || m.senderId === currentUser.id)
      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
  }, [currentUser, data])

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return myMessages

    const query = searchQuery.toLowerCase()
    return myMessages.filter((msg) => {
      const sender = (data?.users ?? []).find((u) => u.id === msg.senderId)
      const receiver = (data?.users ?? []).find((u) => u.id === msg.receiverId)
      const senderName = sender?.name?.toLowerCase() ?? ''
      const receiverName = receiver?.name?.toLowerCase() ?? ''
      const subject = msg.subject?.toLowerCase() ?? ''
      const content = msg.content?.toLowerCase() ?? ''

      return (
        senderName.includes(query) ||
        receiverName.includes(query) ||
        subject.includes(query) ||
        content.includes(query)
      )
    })
  }, [myMessages, searchQuery, data])

  const stats = useMemo(() => {
    const received = myMessages.filter((m) => m.receiverId === currentUser?.id)
    const sent = myMessages.filter((m) => m.senderId === currentUser?.id)
    const unread = received.filter((m) => !m.readAt).length

    return {
      total: myMessages.length,
      received: received.length,
      sent: sent.length,
      unread,
    }
  }, [myMessages, currentUser])

  const availableRecipients = useMemo(() => {
    if (!data || !role) return []

    if (role === 'student') {
      // Students can message coaches
      return (data.users ?? []).filter((u) => u.role === 'coach')
    } else if (role === 'coach') {
      // Coaches can message their students
      const myProgramIds = (data.programs ?? [])
        .filter((p) => p.coachIds.includes(currentUser?.id))
        .map((p) => p.id)

      const myStudentIds = new Set(
        (data.programs ?? [])
          .filter((p) => myProgramIds.includes(p.id))
          .flatMap((p) => p.participantStudentIds)
      )

      return (data.users ?? []).filter(
        (u) => u.role === 'student' && myStudentIds.has(u.id)
      )
    }

    return []
  }, [data, role, currentUser])

  const getUserName = (userId) => {
    const user = (data?.users ?? []).find((u) => u.id === userId)
    return user?.name ?? 'Unknown User'
  }

  const handleCompose = () => {
    setSelectedRecipient('')
    setMessageSubject('')
    setMessageContent('')
    setShowComposeModal(true)
  }

  const handleSend = () => {
    if (!selectedRecipient) {
      showToast('Please select a recipient', 'error')
      return
    }
    if (!messageContent.trim()) {
      showToast('Please enter a message', 'error')
      return
    }

    showToast('Message sent successfully!', 'success')
    setShowComposeModal(false)
    setSelectedRecipient('')
    setMessageSubject('')
    setMessageContent('')
  }

  if (myMessages.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Messages</h1>
            <p className="mt-1 text-muted-foreground">Communicate with your network</p>
          </div>
          <button type="button" className="btn-primary" onClick={handleCompose}>
            Compose
          </button>
        </div>
        <EmptyState
          icon={MessageSquare}
          title="No Messages Yet"
          description="Start a conversation by composing a new message."
          action={
            <button type="button" className="btn-primary" onClick={handleCompose}>
              Compose Message
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Messages</h1>
          <p className="mt-1 text-slate-500 font-medium">
            {stats.unread > 0 && <span className="text-red-500 font-bold">{stats.unread} unread • </span>}
            {stats.total} total messages
          </p>
        </div>
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-95" onClick={handleCompose}>
          <Send className="h-4 w-4" />
          Compose
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4 transition-all hover:shadow-md">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total</div>
              <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4 transition-all hover:shadow-md">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-indigo-50 text-indigo-600">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wide">Received</div>
              <div className="text-2xl font-bold text-slate-900">{stats.received}</div>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4 transition-all hover:shadow-md">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-purple-50 text-purple-600">
              <Send className="h-6 w-6 ml-0.5" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wide">Sent</div>
              <div className="text-2xl font-bold text-slate-900">{stats.sent}</div>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4 transition-all hover:shadow-md">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wide">Unread</div>
              <div className="text-2xl font-bold text-slate-900">{stats.unread}</div>
            </div>
        </div>
      </div>

      <Card className="min-h-[500px] flex flex-col">
        <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search messages..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1">
          {filteredMessages.length === 0 ? (
           <EmptyState 
             icon={MessageSquare}
             title="No messages found" 
             message={searchQuery ? "Try adjusting your search filters." : "Your inbox is empty."}
           />
          ) : (
            <div className="space-y-3">
              {filteredMessages.map((message) => {
                const isFromMe = message.senderId === currentUser?.id
                const otherUserId = isFromMe ? message.receiverId : message.senderId
                const otherUserName = getUserName(otherUserId)
                const isUnread = !isFromMe && !message.readAt

                return (
                  <div
                    key={message.id}
                    className={`flex items-start gap-4 rounded-xl border p-5 transition-all cursor-pointer group ${
                      isUnread
                        ? 'border-blue-200 bg-blue-50/50 hover:bg-blue-50'
                        : 'border-transparent bg-white hover:bg-slate-50 hover:border-slate-200 hover:shadow-sm'
                    }`}
                  >
                    <div
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold shadow-sm ${
                        isUnread ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {otherUserName.charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`font-semibold font-heading text-base ${
                                isUnread ? 'text-blue-900' : 'text-slate-700'
                              }`}
                            >
                              {isFromMe ? `To: ${otherUserName}` : otherUserName}
                            </span>
                            {isUnread && (
                              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] uppercase font-bold text-white tracking-wide shadow-sm">
                                New
                              </span>
                            )}
                          </div>
                          {message.subject && (
                            <div
                              className={`font-medium mb-1 ${
                                isUnread ? 'text-slate-800' : 'text-slate-600'
                              }`}
                            >
                              {message.subject}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-xs text-slate-400 font-medium">
                          {formatDateTime(message.sentAt)}
                        </div>
                      </div>

                      <p className="line-clamp-2 text-sm text-slate-500 leading-relaxed group-hover:text-slate-600">
                        {message.content}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>

      {showComposeModal && (
        <Modal
          title="Compose Message"
          onClose={() => setShowComposeModal(false)}
          footer={
            <>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowComposeModal(false)}
              >
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleSend}>
                <Send className="h-4 w-4" />
                Send
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground">To</label>
              <select
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value)}
              >
                <option value="">Select recipient...</option>
                {availableRecipients.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Subject (optional)
              </label>
              <input
                type="text"
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Enter subject..."
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">Message</label>
              <textarea
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                rows={6}
                placeholder="Type your message..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
