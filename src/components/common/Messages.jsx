import { useMemo, useState } from 'react'
import { MessageSquare, Send, Search, User } from 'lucide-react'
import Card from '../../components/common/Card'
import Modal from '../../components/common/Modal'
import EmptyState from '../../components/common/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast'
import { formatDate, formatDateTime } from '../../utils/time'

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="mt-1 text-muted-foreground">
            {stats.unread > 0 && `${stats.unread} unread • `}
            {stats.total} total messages
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={handleCompose}>
          <Send className="h-4 w-4" />
          Compose
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/10 text-secondary">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Received</div>
              <div className="text-2xl font-bold text-foreground">{stats.received}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Sent</div>
              <div className="text-2xl font-bold text-foreground">{stats.sent}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-warning-500/10 text-warning-700">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Unread</div>
              <div className="text-2xl font-bold text-foreground">{stats.unread}</div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search messages..."
              className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredMessages.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No messages found
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMessages.map((message) => {
              const isFromMe = message.senderId === currentUser?.id
              const otherUserId = isFromMe ? message.receiverId : message.senderId
              const otherUserName = getUserName(otherUserId)
              const isUnread = !isFromMe && !message.readAt

              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/20 ${
                    isUnread
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border/50 bg-muted/30'
                  }`}
                >
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                      isUnread ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <User className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium ${
                              isUnread ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {isFromMe ? `To: ${otherUserName}` : `From: ${otherUserName}`}
                          </span>
                          {isUnread && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                              New
                            </span>
                          )}
                        </div>
                        {message.subject && (
                          <div
                            className={`mt-1 font-medium ${
                              isUnread ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {message.subject}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(message.sentAt)}
                      </div>
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {message.content}
                    </p>

                    <div className="mt-2 text-xs text-muted-foreground">
                      {formatDateTime(message.sentAt)}
                      {message.readAt && isFromMe && (
                        <span className="ml-2">• Read {formatDate(message.readAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
