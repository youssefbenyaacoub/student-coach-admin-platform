import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, X, ChevronLeft, Send, Search } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { cn } from '../../utils/cn'

export default function ChatWidget() {
  const { currentUser } = useAuth()
  const { listMessages, sendMessage, getUserById, markAsRead } = useData()
  
  const [isOpen, setIsOpen] = useState(false)

  const [activePeerId, setActivePeerId] = useState(null)
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)

  // 1. Get all messages for current user
  const myMessages = useMemo(() => {
    if (!currentUser) return []
    return listMessages({ userId: currentUser.id })
  }, [currentUser, listMessages])

  // 2. Group into conversations
  const conversations = useMemo(() => {
    if (!currentUser) return []
    const map = new Map()

    for (const msg of myMessages) {
      const isMe = msg.senderId === currentUser.id
      const peerId = isMe ? msg.receiverId : msg.senderId
      
      if (!map.has(peerId)) {
        map.set(peerId, {
          peerId,
          messages: [],
          lastMessage: null,
          unreadCount: 0
        })
      }
      
      const conv = map.get(peerId)
      conv.messages.push(msg)
      
      // Update last message
      if (!conv.lastMessage || new Date(msg.sentAt) > new Date(conv.lastMessage.sentAt)) {
        conv.lastMessage = msg
      }
      
      // Count unread (received by me, readAt is null)
      if (!isMe && !msg.readAt) {
        conv.unreadCount++
      }
    }

    // Convert to array and enhance with user details
    return Array.from(map.values()).map(conv => {
      const peer = getUserById(conv.peerId)
      return {
        ...conv,
        peerName: peer?.name ?? 'Unknown User',
        peerRole: peer?.role ?? '',
        // Sort messages in this conversation
        messages: conv.messages.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
      }
    }).sort((a, b) => {
        // Sort conversations by last message time DESC
        const timeA = a.lastMessage ? new Date(a.lastMessage.sentAt) : new Date(0)
        const timeB = b.lastMessage ? new Date(b.lastMessage.sentAt) : new Date(0)
        return timeB - timeA
    })
  }, [myMessages, currentUser, getUserById])

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  const activeConversation = useMemo(() => {
    if (!activePeerId) return null
    return conversations.find(c => c.peerId === activePeerId) || {
        peerId: activePeerId,
        peerName: getUserById(activePeerId)?.name ?? 'User',
        peerRole: getUserById(activePeerId)?.role ?? '',
        messages: [],
        lastMessage: null,
        unreadCount: 0
    }
  }, [conversations, activePeerId, getUserById])

  // Scroll to bottom of chat
  useEffect(() => {
    if (isOpen && activePeerId && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activePeerId, isOpen, activeConversation?.messages])

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (isOpen && activePeerId && currentUser && activeConversation) {
        const unreadIds = activeConversation.messages
            .filter(m => m.receiverId === currentUser.id && !m.readAt)
            .map(m => m.id)
        
        if (unreadIds.length > 0) {
            markAsRead({ messageIds: unreadIds })
        }
    }
  }, [isOpen, activePeerId, activeConversation, currentUser, markAsRead])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || !activePeerId || !currentUser) return

    await sendMessage({
        senderId: currentUser.id,
        receiverId: activePeerId,
        content: input
    })
    setInput('')
  }
  
  if (!currentUser) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {/* Window */}
      {isOpen && (
        <div className="flex h-[500px] w-80 flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:w-96">
            {/* Header */}
            <div className="flex items-center justify-between bg-primary px-4 py-3 text-white shadow-md z-10">
                {activePeerId ? (
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setActivePeerId(null)}
                            className="rounded-full p-1 hover:bg-white/20 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <div className="flex items-center gap-2">
                             <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold ring-1 ring-white/40">
                                {activeConversation?.peerName.charAt(0)}
                             </div>
                             <div>
                                <h3 className="text-sm font-semibold leading-none">{activeConversation?.peerName}</h3>
                                <div className="text-[10px] text-blue-100/80">{activeConversation?.peerRole}</div>
                             </div>
                        </div>
                    </div>
                ) : (
                    <h3 className="text-lg font-bold">Messages</h3>
                )}
                <button 
                    onClick={() => setIsOpen(false)}
                    className="rounded-full p-1 hover:bg-white/20 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50 relative">
                {activePeerId ? (
                    // Thread View
                    <div className="flex min-h-full flex-col gap-3 p-4">
                        <div className="mt-auto flex flex-col gap-3">
                             {activeConversation?.messages.length === 0 && (
                                <div className="text-center text-xs text-muted-foreground py-10">
                                    Start a conversation with {activeConversation.peerName}
                                </div>
                             )}
                             {activeConversation?.messages.map((msg) => {
                                const isMe = msg.senderId === currentUser.id
                                return (
                                    <div
                                    key={msg.id}
                                    className={cn(
                                        "flex w-max max-w-[80%] flex-col gap-1 rounded-2xl px-4 py-2 text-sm shadow-sm",
                                        isMe
                                        ? "self-end bg-primary text-white rounded-br-none"
                                        : "self-start bg-white text-foreground border border-border/50 rounded-bl-none"
                                    )}
                                    >
                                    <p>{msg.content}</p>
                                    <span className={cn(
                                        "text-[10px]",
                                        isMe ? "text-blue-100/70" : "text-muted-foreground/60"
                                    )}>
                                        {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    </div>
                                )
                             })}
                            <div ref={scrollRef} />
                        </div>
                    </div>
                ) : (
                    // List View
                    <div className="divide-y divide-border/50">
                        {conversations.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                <MessageCircle className="h-12 w-12 opacity-20 mb-3" />
                                <p className="text-sm">No messages yet</p>
                            </div>
                        ) : (
                            conversations.map(conv => (
                                <button
                                    key={conv.peerId}
                                    onClick={() => setActivePeerId(conv.peerId)}
                                    className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50"
                                >
                                    <div className="relative">
                                         <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                                            {conv.peerName.charAt(0)}
                                         </div>
                                         {conv.unreadCount > 0 && (
                                             <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
                                                {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                             </div>
                                         )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between">
                                            <span className="font-semibold text-foreground truncate">{conv.peerName}</span>
                                            {conv.lastMessage && (
                                                <span className="text-[10px] text-muted-foreground shrink-0">
                                                    {new Date(conv.lastMessage.sentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                            )}
                                        </div>
                                        <p className={cn(
                                            "truncate text-xs",
                                            conv.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground"
                                        )}>
                                            {conv.lastMessage?.content ?? 'No messages'}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Footer Only in Thread View */}
            {activePeerId && (
                <form onSubmit={handleSend} className="border-t border-border bg-background p-3">
                    <div className="flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1.5 focus-within:border-primary/50 focus-within:bg-background focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                    <input
                        type="text"
                        className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                    </div>
                </form>
            )}
        </div>
      )}

      {/* Trigger Bubble */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all hover:scale-105 active:scale-95",
            isOpen ? "bg-muted text-foreground hover:bg-muted/80" : "bg-primary text-white hover:bg-primary/90"
        )}
      >
        {isOpen ? (
            <X className="h-7 w-7" />
        ) : (
            <div className="relative">
                <MessageCircle className="h-7 w-7" />
                {totalUnread > 0 && (
                     <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-white">
                        {totalUnread > 9 ? '9+' : totalUnread}
                     </span>
                )}
            </div>
        )}
      </button>
    </div>
  )
}
