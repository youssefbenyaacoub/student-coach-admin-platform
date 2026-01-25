import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, Send, Search, User, MoreVertical, Phone, Video, Plus, Check, CheckCheck, Trash2, Info, Calendar } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../utils/cn'
import { formatDateTime } from '../../utils/time'
import { supabase } from '../../lib/supabase'
import { playMessageSound, primeAudioOnFirstUserGesture } from '../../utils/sound'
import Modal from '../../components/common/Modal'

export default function CoachMessages() {
  const { currentUser, role } = useAuth()
  const { data, sendMessage, markAsRead, deleteMessageForMe, deleteMessageForEveryone, getUserById, getPresenceForUser } = useData()
  const { showToast } = useToast()
  
  const [activePeerId, setActivePeerId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [showComposeModal, setShowComposeModal] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showInfoPanel, setShowInfoPanel] = useState(true)
  
  const messagesEndRef = useRef(null)
  
  // Typing states
  const [peerTyping, setPeerTyping] = useState(false)
  const typingChannelRef = useRef(null)
  const incomingTypingTimeoutRef = useRef(null)
  const outgoingTypingTimeoutRef = useRef(null)
  const lastTypingBroadcastRef = useRef(0)
  const lastMessageIdRef = useRef(null)
  
  useEffect(() => {
      primeAudioOnFirstUserGesture()
  }, [])

  const myMessages = useMemo(() => {
    if (!currentUser?.id || !data) return []
    return (data.messages ?? [])
      .filter((m) => m.receiverId === currentUser.id || m.senderId === currentUser.id)
      .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
  }, [currentUser, data])

  const conversationMap = useMemo(() => {
    if (!currentUser) return new Map()
    const map = new Map()

    for (const msg of myMessages) {
      const isMe = msg.senderId === currentUser.id
      const peerId = isMe ? msg.receiverId : msg.senderId
      
      if (!map.has(peerId)) {
        const peer = getUserById(peerId)
        map.set(peerId, {
          peerId,
          peer,
          peerName: peer?.name ?? 'Unknown User',
          peerRole: peer?.role ?? '',
          messages: [],
          lastMessage: null,
          unreadCount: 0
        })
      }
      
      const conv = map.get(peerId)
      conv.messages.push(msg)
      conv.lastMessage = msg
      
      if (!isMe && !msg.readAt) {
        conv.unreadCount++
      }
    }
    return map
  }, [myMessages, currentUser, getUserById])

  const conversations = useMemo(() => {
    const list = Array.from(conversationMap.values())
    const filtered = !searchQuery.trim() 
        ? list 
        : list.filter(c => c.peerName.toLowerCase().includes(searchQuery.toLowerCase()))

    return filtered.sort((a, b) => {
        const tA = a.lastMessage ? new Date(a.lastMessage.sentAt) : new Date(0)
        const tB = b.lastMessage ? new Date(b.lastMessage.sentAt) : new Date(0)
        return tB - tA
    })
  }, [conversationMap, searchQuery])

  const activeConversation = useMemo(() => {
    if (!activePeerId) return null
    return conversationMap.get(activePeerId) || {
        peerId: activePeerId,
        peer: getUserById(activePeerId),
        peerName: getUserById(activePeerId)?.name ?? 'User',
        peerRole: getUserById(activePeerId)?.role ?? '',
        messages: [],
        unreadCount: 0
    }
  }, [conversationMap, activePeerId, getUserById])

  const availableRecipients = useMemo(() => {
    if (!data || !role) return []
    if (role === 'coach') {
      const myProgramIds = (data.programs ?? [])
        .filter((p) => p.coachIds.includes(currentUser?.id))
        .map((p) => p.id)
      const myStudentIds = new Set(
        (data.programs ?? [])
          .filter((p) => myProgramIds.includes(p.id))
          .flatMap((p) => p.participantStudentIds)
      )
      return (data.users ?? []).filter((u) => u.role === 'student' && myStudentIds.has(u.id))
    }
    return []
  }, [data, role, currentUser])


  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeConversation?.messages, peerTyping])

  useEffect(() => {
    if (activePeerId && currentUser && activeConversation) {
        const unreadIds = activeConversation.messages
            .filter(m => m.receiverId === currentUser.id && !m.readAt)
            .map(m => m.id)
        if (unreadIds.length > 0) {
            markAsRead({ messageIds: unreadIds })
        }
    }
  }, [activePeerId, activeConversation, currentUser, markAsRead])

  useEffect(() => {
    const msgs = activeConversation?.messages ?? []
    if (msgs.length === 0) return
    const lastMsg = msgs[msgs.length - 1]
    if (lastMessageIdRef.current === null) {
        lastMessageIdRef.current = lastMsg.id
        return
    }
    if (lastMsg.id !== lastMessageIdRef.current) {
        lastMessageIdRef.current = lastMsg.id
        if (lastMsg.senderId === activePeerId) {
            playMessageSound().catch(err => console.warn('Sound play failed', err))
        }
    }
  }, [activeConversation, activePeerId])

  const conversationKey = useMemo(() => {
      if (!currentUser?.id || !activePeerId) return null
      const a = String(currentUser.id)
      const b = String(activePeerId)
      return a < b ? `${a}:${b}` : `${b}:${a}`
  }, [currentUser?.id, activePeerId])

  useEffect(() => {
    // Reset typing state when conversation changes
    setPeerTyping(false)

    // Clean up channel
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
              setPeerTyping(isTyping)
              if (incomingTypingTimeoutRef.current) window.clearTimeout(incomingTypingTimeoutRef.current)
              if (isTyping) {
                  incomingTypingTimeoutRef.current = window.setTimeout(() => setPeerTyping(false), 5000)
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

  const handleSendMessage = async (e) => {
    e?.preventDefault()
    if (!messageInput.trim() || !activePeerId) return
    const content = messageInput
    setMessageInput('')
    try {
        await sendMessage({
            senderId: currentUser.id,
            receiverId: activePeerId,
            content,
            subject: 'Message'
        })
        if (conversationKey && typingChannelRef.current) {
            typingChannelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { from: currentUser.id, isTyping: false },
            })
            lastTypingBroadcastRef.current = 0
        }
    } catch {
        showToast('Failed to send message', 'error')
        setMessageInput(content)
    }
  }

  const handleInputChange = (e) => {
      setMessageInput(e.target.value)
      if (!conversationKey || !typingChannelRef.current) return
      const now = Date.now()
      if (outgoingTypingTimeoutRef.current) clearTimeout(outgoingTypingTimeoutRef.current)
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
  }

  const startNewParams = { recipientId: '', message: '' }
  const [newMsgParams, setNewMsgParams] = useState(startNewParams)

  const handleStartNewConversation = async () => {
      if (!newMsgParams.recipientId) return showToast('Select a recipient', 'error')
      if (!newMsgParams.message.trim()) return showToast('Enter a message', 'error')
      try {
          await sendMessage({
              senderId: currentUser.id,
              receiverId: newMsgParams.recipientId,
              content: newMsgParams.message,
              subject: 'New Conversation'
          })
          setShowComposeModal(false)
          setActivePeerId(newMsgParams.recipientId)
          setNewMsgParams(startNewParams)
      } catch {
          showToast('Failed to start conversation', 'error')
      }
  }

  if (!currentUser) return null

  const presence = activePeerId ? getPresenceForUser(activePeerId) : null
  const openDeleteModal = (msg) => {
      if (!msg?.id) return
      setDeleteTarget({ id: msg.id, isMe: msg.senderId === currentUser?.id })
      setDeleteModalOpen(true)
  }
  
  return (
    <div className="h-[calc(100vh-6rem)] w-full bg-slate-50 flex font-sans overflow-hidden">
      {/* Sidebar - Coach Style: Dark Sidebar for professionals? Or just consistent White */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-white z-10">
        <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-heading font-bold text-slate-900">Inbox</h2>
                <button 
                    onClick={() => setShowComposeModal(true)}
                    className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                </button>
            </div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search students..." 
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 placeholder:text-slate-400"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                    <User className="h-12 w-12 mb-2 opacity-10" />
                    <p className="text-sm">No conversations</p>
                </div>
            ) : (
                conversations.map(conv => (
                    <button
                        key={conv.peerId}
                        onClick={() => setActivePeerId(conv.peerId)}
                        className={cn(
                            "w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors border-l-4 text-left",
                            activePeerId === conv.peerId 
                                ? "bg-emerald-50/50 border-emerald-500" 
                                : "border-transparent"
                        )}
                    >
                        <div className="relative shrink-0">
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center text-white font-heading font-bold text-lg shadow-sm border-2 border-white",
                                conv.peerRole === 'student' ? 'bg-indigo-500' : 'bg-slate-500'
                            )}>
                                {conv.peerName.charAt(0)}
                            </div>
                            {getPresenceForUser(conv.peerId)?.online && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-baseline mb-1">
                                <span className={cn("font-semibold truncate", activePeerId === conv.peerId ? "text-emerald-900" : "text-slate-900")}>
                                    {conv.peerName}
                                </span>
                                {conv.lastMessage && (
                                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                                        {formatDateTime(conv.lastMessage.sentAt).split(',')[0]}
                                    </span>
                                )}
                            </div>
                            <div className="flex justify-between items-center">
                                <p className={cn(
                                    "text-sm truncate max-w-[140px]",
                                    conv.unreadCount > 0 ? "font-semibold text-slate-800" : "text-slate-500"
                                )}>
                                    {conv.lastMessage?.content ?? 'No messages'}
                                </p>
                                {conv.unreadCount > 0 && (
                                    <span className="bg-emerald-500 text-white text-[10px] h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center font-bold shadow-sm">
                                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    </button>
                ))
            )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white relative">
        {activePeerId ? (
            <>
                {/* Header */}
                <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                         <div className="relative">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center text-white font-heading font-bold shadow-sm",
                                activeConversation?.peerRole === 'student' ? 'bg-indigo-500' : 'bg-slate-500'
                            )}>
                                {activeConversation?.peerName.charAt(0)}
                            </div>
                         </div>
                         <div>
                             <h3 className="font-heading font-bold text-slate-900 leading-none">{activeConversation?.peerName}</h3>
                             <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                 {presence?.online ? (
                                     <>
                                         <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                         <span className="font-medium text-emerald-600">Online</span>
                                     </>
                                 ) : presence?.lastSeenAt ? (
                                     <span>Last seen {new Date(presence.lastSeenAt).toLocaleString()}</span>
                                 ) : (
                                     <span className="uppercase tracking-wider text-[10px]">{activeConversation?.peerRole}</span>
                                 )}
                             </div>
                         </div>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                        <button 
                            onClick={() => setShowInfoPanel(!showInfoPanel)}
                            className={cn("p-2 rounded-lg transition-colors", showInfoPanel ? "bg-slate-100 text-slate-800" : "hover:bg-slate-100")}
                            title="Toggle Info"
                        >
                            <Info className="h-5 w-5" />
                        </button>
                        <div className="h-4 w-px bg-slate-200 mx-1"></div>
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><Phone className="h-5 w-5" /></button>
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><Video className="h-5 w-5" /></button>
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><MoreVertical className="h-5 w-5" /></button>
                    </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <div className="flex flex-col gap-4 max-w-3xl mx-auto">
                        {activeConversation.messages.map((msg, idx) => {
                            const isMe = msg.senderId === currentUser.id
                            const showAvatar = !isMe && (idx === 0 || activeConversation.messages[idx - 1].senderId !== msg.senderId)
                            const isSeen = Boolean(msg.readAt)

                            return (
                                <div key={msg.id} className={cn("flex w-full items-end gap-2 group", isMe ? "justify-end" : "justify-start")}>
                                    {!isMe && (
                                        <div className="w-8 h-8 shrink-0 mb-1">
                                            {showAvatar && (
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold",
                                                    activeConversation?.peerRole === 'student' ? 'bg-indigo-500' : 'bg-slate-500'
                                                )}>
                                                    {activeConversation?.peerName.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className={cn(
                                        "max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed relative pr-12 group/bubble transition-all",
                                        isMe 
                                            ? "bg-emerald-600 text-white rounded-br-sm" 
                                            : "bg-white text-slate-800 border border-slate-100 rounded-bl-sm"
                                    )}>
                                        <div className="break-words font-normal whitespace-pre-wrap">{msg.content}</div>
                                        <div className={cn(
                                            "text-[10px] mt-1 text-right flex items-center justify-end gap-1 select-none", 
                                            isMe ? "text-emerald-100/90" : "text-slate-400"
                                        )}>
                                            {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {isMe && (
                                                 isSeen ? (
                                                     <div className="flex items-center gap-0.5" title={`Seen at ${new Date(msg.readAt).toLocaleTimeString()}`}>
                                                         <CheckCheck className="h-3.5 w-3.5 text-emerald-200" />
                                                     </div>
                                                 ) : (
                                                     <Check className="h-3.5 w-3.5 text-emerald-200/70" />
                                                 )
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openDeleteModal(msg);
                                            }}
                                            className={cn(
                                                "absolute top-1 right-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1 rounded-full",
                                                isMe ? "hover:bg-emerald-700 text-emerald-100" : "hover:bg-slate-100 text-slate-400"
                                            )}
                                            title="Options"
                                        >
                                            <MoreVertical className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                        {peerTyping && (
                             <div className="flex w-full items-end gap-2 justify-start">
                                 <div className="w-8 h-8 shrink-0 mb-1">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold",
                                        activeConversation?.peerRole === 'student' ? 'bg-indigo-500' : 'bg-slate-500'
                                    )}>
                                        {activeConversation?.peerName.charAt(0)}
                                    </div>
                                 </div>
                                 <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none shadow-sm border border-slate-100 flex gap-1 items-center">
                                     <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                     <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]"></span>
                                     <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                 </div>
                             </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100">
                    <div className="max-w-3xl mx-auto flex gap-3 items-end">
                        <div className="flex-1 bg-slate-50 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-emerald-100 focus-within:bg-white transition-all border border-slate-200 focus-within:border-emerald-200">
                            <form onSubmit={handleSendMessage}>
                                <input 
                                    type="text"
                                    className="w-full bg-transparent border-none focus:outline-none text-slate-800 placeholder:text-slate-400 text-sm max-h-32"
                                    placeholder={`Message ${activeConversation?.peerName}...`}
                                    value={messageInput}
                                    onChange={handleInputChange}
                                />
                            </form>
                        </div>
                        <button 
                            type="button"  // Changed trigger
                            onClick={handleSendMessage}
                            disabled={!messageInput.trim()}
                            className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm active:scale-95 flex items-center justify-center"
                        >
                            <Send className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8 bg-slate-50/30">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <MessageCircle className="h-10 w-10 text-emerald-200" />
                </div>
                <h3 className="text-xl font-heading font-semibold text-slate-900 mb-1">Coach Messenger</h3>
                <p className="text-slate-500 text-center max-w-sm text-sm">Select a student communication channel from the sidebar to view history or start a new session.</p>
                <button onClick={() => setShowComposeModal(true)} className="mt-8 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200">
                    New Message
                </button>
            </div>
        )}
      </div>

      {/* Info Panel - Context for Coach */}
      {activePeerId && showInfoPanel && (
        <div className="w-72 border-l border-slate-200 bg-white hidden xl:flex flex-col">
            <div className="p-6 border-b border-slate-100 flex flex-col items-center">
                <div className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center text-white font-heading font-bold text-3xl mb-3 shadow-md",
                    activeConversation?.peerRole === 'student' ? 'bg-indigo-500' : 'bg-slate-500'
                )}>
                    {activeConversation?.peerName.charAt(0)}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{activeConversation?.peerName}</h3>
                <span className="text-xs font-semibold text-indigo-600 px-2.5 py-0.5 rounded-full bg-indigo-50 mt-1 uppercase tracking-wide">
                    {activeConversation?.peerRole}
                </span>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
                <div className="space-y-6">
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h4>
                        <div className="grid grid-cols-2 gap-2">
                             <button className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors">
                                 <Calendar className="h-5 w-5 mb-1 text-slate-400" />
                                 <span className="text-xs font-medium">Session</span>
                             </button>
                             <button className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors">
                                 <CheckCheck className="h-5 w-5 mb-1 text-slate-400" />
                                 <span className="text-xs font-medium">Task</span>
                             </button>
                        </div>
                    </div>

                    <div>
                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Student Details</h4>
                         {/* Placeholder details */}
                         <div className="space-y-3">
                             <div className="text-sm">
                                 <p className="text-slate-500 text-xs">Email</p>
                                 <p className="text-slate-900 font-medium">student@example.com</p>
                             </div>
                             <div className="text-sm">
                                 <p className="text-slate-500 text-xs">Program</p>
                                 <p className="text-slate-900 font-medium">Full Stack Web Dev</p>
                             </div>
                             <div className="text-sm">
                                 <p className="text-slate-500 text-xs">Progress</p>
                                 <div className="w-full bg-slate-100 h-2 rounded-full mt-1 overflow-hidden">
                                     <div className="bg-indigo-500 h-full w-[65%]"></div>
                                 </div>
                                 <p className="text-xs text-right mt-0.5 text-slate-400">65%</p>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {showComposeModal && (
          <Modal
            title="New Message"
            onClose={() => setShowComposeModal(false)}
            footer={
                <>
                    <button className="btn-ghost" onClick={() => setShowComposeModal(false)}>Cancel</button>
                    <button className="btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600" onClick={handleStartNewConversation}>Send Message</button>
                </>
            }
          >
              <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Recipient</label>
                      <select 
                        className="w-full rounded-lg border-slate-200 text-sm focus:ring-emerald-500"
                        value={newMsgParams.recipientId}
                        onChange={(e) => setNewMsgParams({...newMsgParams, recipientId: e.target.value})}
                      >
                          <option value="">Select a student...</option>
                          {availableRecipients.map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                      <textarea 
                        className="w-full rounded-lg border-slate-200 text-sm focus:ring-emerald-500"
                        rows={4}
                        placeholder="Type your first message..."
                        value={newMsgParams.message}
                        onChange={(e) => setNewMsgParams({...newMsgParams, message: e.target.value})}
                      />
                  </div>
              </div>
          </Modal>
      )}

    <Modal
        isOpen={deleteModalOpen && !!deleteTarget}
        title="Delete Message"
        onClose={() => {
            setDeleteModalOpen(false)
            setDeleteTarget(null)
        }}
        footer={
            <div className="flex flex-col gap-2 w-full sm:flex-row sm:justify-end">
                <button
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => {
                        setDeleteModalOpen(false)
                        setDeleteTarget(null)
                    }}
                >
                    Cancel
                </button>
                
                <button
                    className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                    onClick={async () => {
                        const res = await deleteMessageForMe?.({ messageId: deleteTarget.id })
                        if (!res?.success) showToast('Failed to delete', 'error')
                        setDeleteModalOpen(false)
                        setDeleteTarget(null)
                    }}
                >
                    Delete for me
                </button>

                {deleteTarget?.isMe && (
                    <button
                        className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium shadow-sm transition-colors"
                        onClick={async () => {
                            const res = await deleteMessageForEveryone?.({ messageId: deleteTarget.id })
                            if (!res?.success) showToast('Failed to delete', 'error')
                            setDeleteModalOpen(false)
                            setDeleteTarget(null)
                        }}
                    >
                        Delete for everyone
                    </button>
                )}
            </div>
        }
    >
        <div className="text-sm text-slate-600 leading-relaxed">
            Are you sure you want to delete this message?
            {deleteTarget?.isMe && (
                <p className="mt-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    "Delete for everyone" will remove the message for all participants. "Delete for me" only removes it from your view.
                </p>
            )}
        </div>
    </Modal>
    </div>
  )
}
