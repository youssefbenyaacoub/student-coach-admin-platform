import { useEffect, useRef, useState, useMemo } from 'react'
import { Send, X, Minus, MessageCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { cn } from '../../utils/cn'

export default function ChatPopup({ isOpen, onClose, peerId }) {
  const { currentUser } = useAuth()
  const { listMessages, sendMessage, getUserById } = useData()
  const [input, setInput] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  
  const bottomRef = useRef(null)

  const peer = useMemo(() => {
     if (!peerId) return null
     return getUserById(peerId)
  }, [peerId, getUserById])

  const messages = useMemo(() => {
    if (!currentUser || !peerId) return []
    // Get all messages involving current user
    const all = listMessages({ userId: currentUser.id })
    // Filter for conversation with peer
    return all.filter(m => 
      (m.senderId === currentUser.id && m.receiverId === peerId) ||
      (m.senderId === peerId && m.receiverId === currentUser.id)
    ).sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
  }, [currentUser, peerId, listMessages])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isMinimized])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || !currentUser || !peerId) return

    await sendMessage({
      senderId: currentUser.id,
      receiverId: peerId,
      content: input
    })
    setInput('')
  }

  if (!isOpen || !currentUser || !peer) return null

  // Determine header color based on peer role or fixed blue
  const headerColor = peer.role === 'student' ? 'bg-student-primary' : 
                      peer.role === 'coach' ? 'bg-coach-primary' : 'bg-blue-600'

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={`fixed bottom-4 right-4 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl hover:opacity-90 transition-all z-50 animate-in zoom-in ${headerColor}`}
      >
        <MessageCircle className="h-7 w-7" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            1
        </span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col overflow-hidden rounded-t-2xl rounded-b-xl border border-slate-200 bg-white shadow-2xl sm:w-96 md:right-8 font-sans animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 text-white shadow-sm ${headerColor}`}>
        <div className="flex items-center gap-3">
          <div className="relative">
             <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-heading font-bold ring-1 ring-white/40">
                {peer.name.charAt(0)}
             </div>
             <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white"></div>
          </div>
          <div>
            <h3 className="text-sm font-heading font-semibold leading-none">{peer.name}</h3>
            <span className="text-[10px] text-white/90 opacity-90 uppercase tracking-wide font-medium">{peer.role}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(true)}
            className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button 
            onClick={onClose}
            className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex h-96 flex-col gap-3 overflow-y-auto bg-slate-50 p-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        <div className="text-center text-xs text-slate-400 py-2 font-medium">
            This is the start of your conversation with {peer.name}
        </div>
        
        {messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id
            return (
                <div
                key={msg.id}
                className={cn(
                    "flex w-max max-w-[85%] flex-col gap-1 rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    isMe
                    ? `self-end text-white rounded-br-none ${headerColor}` // Match the header color for user's bubbles
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
                </div>
            )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-slate-100 bg-white p-3">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-inner">
          <input
            type="text"
            className="flex-1 bg-transparent text-sm placeholder:text-slate-400 focus:outline-none text-slate-700 px-2"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 ${headerColor}`}
          >
            <Send className="h-3.5 w-3.5 ml-0.5" />
          </button>
        </div>
      </form>
    </div>
  )
}
