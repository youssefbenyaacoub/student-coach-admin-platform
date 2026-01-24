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

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-all z-50"
      >
        <MessageCircle className="h-8 w-8" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            1
        </span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col overflow-hidden rounded-t-xl rounded-b-lg border border-border bg-background shadow-2xl sm:w-96 md:right-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <div className="relative">
             <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold ring-2 ring-white/30">
                {peer.name.charAt(0)}
             </div>
             <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-primary"></div>
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-none">{peer.name}</h3>
            <span className="text-xs text-blue-100 opacity-80">{peer.role}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(true)}
            className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button 
            onClick={onClose}
            className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex h-96 flex-col gap-3 overflow-y-auto bg-slate-50 p-4 scrollbar-thin scrollbar-thumb-gray-200">
        <div className="text-center text-xs text-muted-foreground/50 py-2">
            This is the start of your conversation with {peer.name}
        </div>
        
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id
          return (
            <div
              key={msg.id}
              className={cn(
                "flex w-max max-w-[80%] flex-col gap-1 rounded-2xl px-4 py-2 text-sm",
                isMe
                  ? "self-end bg-primary text-white rounded-br-none"
                  : "self-start bg-white text-foreground border border-border/50 rounded-bl-none shadow-sm"
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
        <div ref={bottomRef} />
      </div>

      {/* Input */}
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
    </div>
  )
}
