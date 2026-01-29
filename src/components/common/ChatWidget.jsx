import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, X, ChevronLeft, Send, Search } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../utils/cn'
import { supabase } from '../../lib/supabase'
import { playMessageSound, primeAudioOnFirstUserGesture } from '../../utils/sound'

export default function ChatWidget() {
    const { currentUser } = useAuth()
    const { listMessages, sendMessage, getUserById, markAsRead, getPresenceForUser } = useData()
    const { push } = useToast()

    const [isOpen, setIsOpen] = useState(false)

    const [activePeerId, setActivePeerId] = useState(null)
    const [input, setInput] = useState('')
    const scrollRef = useRef(null)

    // Prime audio once so message sounds are more likely to play (browser autoplay rules).
    useEffect(() => {
        primeAudioOnFirstUserGesture()
    }, [])

    // Toast + sound on incoming messages (even when chat is closed)
    useEffect(() => {
        const handler = async (evt) => {
            const msg = evt?.detail?.message
            if (!msg || !currentUser?.id) return

            // Only notify for messages addressed to me
            if (msg.receiverId !== currentUser.id) return

            // If I'm already reading this conversation, don't interrupt
            if (isOpen && activePeerId && msg.senderId === activePeerId) return

            const sender = getUserById?.(msg.senderId)
            const senderName = sender?.name ?? 'New message'
            const preview = (msg.content ?? '').trim()
            const message = preview.length > 80 ? `${preview.slice(0, 77)}...` : preview

            push({
                type: 'info',
                title: `Message from ${senderName}`,
                message,
                durationMs: 5000,
                onClick: () => {
                    setIsOpen(true)
                    setActivePeerId(msg.senderId)
                },
            })

            // Best effort: play a short sound (may be blocked until a user gesture)
            playMessageSound().catch(e => console.warn('Widget sound failed:', e))
        }

        window.addEventListener('sea:new-message', handler)
        return () => window.removeEventListener('sea:new-message', handler)
    }, [activePeerId, currentUser?.id, getUserById, isOpen, push])

    // External Trigger: open specific chat
    useEffect(() => {
        const handler = (evt) => {
            const peerId = evt?.detail?.peerId
            if (peerId) {
                setIsOpen(true)
                setActivePeerId(peerId)
            }
        }
        window.addEventListener('sea:open-chat', handler)
        return () => window.removeEventListener('sea:open-chat', handler)
    }, [])

    const [peerTyping, setPeerTyping] = useState(false)
    const [peerTypingFrom, setPeerTypingFrom] = useState(null)
    const typingChannelRef = useRef(null)
    const incomingTypingTimeoutRef = useRef(null)
    const outgoingTypingTimeoutRef = useRef(null)
    const lastTypingBroadcastRef = useRef(0)

    const conversationKey = useMemo(() => {
        if (!currentUser?.id || !activePeerId) return null
        const a = String(currentUser.id)
        const b = String(activePeerId)
        return a < b ? `${a}:${b}` : `${b}:${a}`
    }, [currentUser?.id, activePeerId])

    useEffect(() => {
        if (typingChannelRef.current) {
            supabase.removeChannel(typingChannelRef.current)
            typingChannelRef.current = null
        }

        if (!conversationKey || !activePeerId) return

        const channel = supabase
            .channel(`typing:${conversationKey}`)
            .on('broadcast', { event: 'typing' }, (evt) => {
                const from = evt?.payload?.from
                const isTyping = Boolean(evt?.payload?.isTyping)
                if (!from || from !== activePeerId) return

                setPeerTypingFrom(from)
                setPeerTyping(isTyping)

                if (incomingTypingTimeoutRef.current) window.clearTimeout(incomingTypingTimeoutRef.current)
                if (isTyping) {
                    incomingTypingTimeoutRef.current = window.setTimeout(() => setPeerTyping(false), 2500)
                }
            })
            .subscribe()

        typingChannelRef.current = channel
        return () => {
            supabase.removeChannel(channel)
            if (incomingTypingTimeoutRef.current) window.clearTimeout(incomingTypingTimeoutRef.current)
            if (outgoingTypingTimeoutRef.current) window.clearTimeout(outgoingTypingTimeoutRef.current)
        }
    }, [conversationKey, activePeerId])

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

        if (conversationKey) {
            supabase.channel(`typing:${conversationKey}`).send({
                type: 'broadcast',
                event: 'typing',
                payload: { from: currentUser.id, isTyping: false },
            })
        }
    }

    const roleColors = {
        student: 'bg-student-primary text-white',
        coach: 'bg-coach-primary text-white',
        admin: 'bg-admin-primary text-white'
    }
    const myRoleColor = roleColors[currentUser?.role] || 'bg-blue-600 text-white'

    if (!currentUser) return null

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 font-sans">
            {/* Window */}
            {isOpen && (
                <div className="flex h-[500px] w-80 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-96 animate-in slide-in-from-bottom-10 fade-in duration-200">
                    {/* Header */}
                    <div className={`flex items-center justify-between px-5 py-4 shadow-sm z-10 ${myRoleColor}`}>
                        {activePeerId ? (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setActivePeerId(null)}
                                    className="rounded-full p-1 hover:bg-white/20 transition-colors"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-heading font-bold ring-1 ring-white/40 shadow-sm">
                                        {activeConversation?.peerName.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-heading font-semibold leading-none">{activeConversation?.peerName}</h3>
                                        <div className="text-[10px] opacity-80 mt-0.5 uppercase tracking-wider font-medium">
                                            {(() => {
                                                const p = getPresenceForUser ? getPresenceForUser(activePeerId) : null
                                                if (p?.online) return 'ONLINE'
                                                if (p?.lastSeenAt) return `LAST SEEN ${new Date(p.lastSeenAt).toLocaleString()}`
                                                return String(activeConversation?.peerRole ?? '').toUpperCase()
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <h3 className="text-lg font-heading font-bold tracking-tight">Messages</h3>
                        )}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="rounded-full p-1 hover:bg-white/20 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto bg-slate-50 relative scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        {activePeerId ? (
                            // Thread View
                            <div className="flex min-h-full flex-col gap-3 p-4">
                                <div className="mt-auto flex flex-col gap-3">
                                    {activeConversation?.messages.length === 0 && (
                                        <div className="text-center text-xs text-slate-400 py-10 font-medium">
                                            Start a conversation with {activeConversation.peerName}
                                        </div>
                                    )}
                                    {activeConversation?.messages.map((msg) => {
                                        const isMe = msg.senderId === currentUser.id
                                        return (
                                            <div
                                                key={msg.id}
                                                className={cn(
                                                    "flex w-max max-w-[85%] flex-col gap-1 rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                                                    isMe
                                                        ? `self-end rounded-br-none ${myRoleColor}`
                                                        : "self-start bg-white text-slate-700 border border-slate-100 rounded-bl-none"
                                                )}
                                            >
                                                <p className="leading-relaxed">{msg.content}</p>
                                                <span className={cn(
                                                    "text-[10px]",
                                                    isMe ? "opacity-70" : "text-slate-400"
                                                )}>
                                                    {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {isMe ? (
                                                    <span className={cn("text-[10px]", "opacity-70")}>
                                                        {msg.readAt
                                                            ? `Seen ${new Date(msg.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                                            : 'Sent'}
                                                    </span>
                                                ) : null}
                                            </div>
                                        )
                                    })}

                                    {peerTyping && peerTypingFrom === activePeerId ? (
                                        <div className="text-xs text-slate-500 px-2">{activeConversation?.peerName} is typing...</div>
                                    ) : null}
                                    <div ref={scrollRef} />
                                </div>
                            </div>
                        ) : (
                            // List View
                            <div className="divide-y divide-slate-100">
                                {conversations.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-400">
                                        <MessageCircle className="h-12 w-12 opacity-20 mb-3" />
                                        <p className="text-sm font-medium">No messages yet</p>
                                    </div>
                                ) : (
                                    conversations.map(conv => (
                                        <button
                                            key={conv.peerId}
                                            onClick={() => setActivePeerId(conv.peerId)}
                                            className="flex w-full items-center gap-4 p-4 text-left transition-all hover:bg-slate-100/80 group"
                                        >
                                            <div className="relative">
                                                <div className={`flex h-12 w-12 items-center justify-center rounded-full text-white font-heading font-bold shadow-sm transition-transform group-hover:scale-105 ${conv.peerRole === 'student' ? 'bg-student-primary' :
                                                        conv.peerRole === 'coach' ? 'bg-coach-primary' : 'bg-slate-500'
                                                    }`}>
                                                    {conv.peerName.charAt(0)}
                                                </div>
                                                {conv.unreadCount > 0 && (
                                                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white shadow-sm">
                                                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-baseline justify-between mb-0.5">
                                                    <span className="font-heading font-semibold text-slate-800 truncate">{conv.peerName}</span>
                                                    {conv.lastMessage && (
                                                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                                                            {new Date(conv.lastMessage.sentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={cn(
                                                    "truncate text-xs",
                                                    conv.unreadCount > 0 ? "font-semibold text-slate-800" : "text-slate-500"
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
                        <form onSubmit={handleSend} className="border-t border-slate-100 bg-white p-4">
                            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-inner">
                                <input
                                    type="text"
                                    className="flex-1 bg-transparent text-sm placeholder:text-slate-400 focus:outline-none text-slate-700"
                                    placeholder="Type a message..."
                                    value={input}
                                    onChange={(e) => {
                                        const next = e.target.value
                                        setInput(next)

                                        if (!conversationKey || !typingChannelRef.current) return

                                        if (outgoingTypingTimeoutRef.current) {
                                            clearTimeout(outgoingTypingTimeoutRef.current)
                                        }

                                        const now = Date.now()
                                        if (now - lastTypingBroadcastRef.current > 2000) {
                                            typingChannelRef.current.send({
                                                type: 'broadcast',
                                                event: 'typing',
                                                payload: { from: currentUser.id, isTyping: true },
                                            })
                                            lastTypingBroadcastRef.current = now
                                        }

                                        outgoingTypingTimeoutRef.current = setTimeout(() => {
                                            typingChannelRef.current?.send({
                                                type: 'broadcast',
                                                event: 'typing',
                                                payload: { from: currentUser.id, isTyping: false },
                                            })
                                            lastTypingBroadcastRef.current = 0
                                        }, 1500)
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim()}
                                    className={`flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 ${currentUser.role === 'student' ? 'bg-student-primary' :
                                            currentUser.role === 'coach' ? 'bg-coach-primary' : 'bg-admin-primary'
                                        }`}
                                >
                                    <Send className="h-3.5 w-3.5 ml-0.5" />
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
                    "flex h-16 w-16 items-center justify-center rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 z-50",
                    isOpen ? "bg-slate-100 text-slate-600 rotate-90" : `${myRoleColor}`
                )}
            >
                {isOpen ? (
                    <X className="h-8 w-8" />
                ) : (
                    <div className="relative">
                        <MessageCircle className="h-8 w-8" />
                        {totalUnread > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-white animate-bounce">
                                {totalUnread > 9 ? '9+' : totalUnread}
                            </span>
                        )}
                    </div>
                )}
            </button>
        </div>
    )
}
