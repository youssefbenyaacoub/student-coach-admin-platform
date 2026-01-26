import { useState, useEffect, useRef } from 'react'
import { useRealtimeChannel } from '../../hooks/useRealtimeChannel'
import { usePresence } from '../../hooks/usePresence'
import Card from './Card'
import Button from './Button'
import { Send, Paperclip, Smile, MoreVertical } from 'lucide-react'

export default function ChatPanel({ channelId, onClose }) {
    const { messages, loading, typing, sendMessage, broadcastTyping, markAsRead } = useRealtimeChannel(channelId)
    const { onlineUsers } = usePresence(channelId)
    const [newMessage, setNewMessage] = useState('')
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef(null)

    useEffect(() => {
        scrollToBottom()
        markAsRead()
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const handleSend = async () => {
        if (!newMessage.trim() || sending) return

        setSending(true)
        const success = await sendMessage(newMessage.trim())
        if (success) {
            setNewMessage('')
            broadcastTyping(false)
        }
        setSending(false)
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleTyping = (e) => {
        setNewMessage(e.target.value)
        broadcastTyping(e.target.value.length > 0)
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Chat</h3>
                    <div className="text-xs text-slate-500">
                        {onlineUsers.length} online
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                    <MoreVertical size={20} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="text-center text-slate-500">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-slate-500">No messages yet. Start the conversation!</div>
                ) : (
                    messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                    ))
                )}

                {typing.length > 0 && (
                    <div className="text-sm text-slate-500 italic">
                        {typing.length === 1 ? 'Someone is' : `${typing.length} people are`} typing...
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t dark:border-slate-700">
                <div className="flex gap-2">
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                        <Paperclip size={20} className="text-slate-500" />
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={handleTyping}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                        <Smile size={20} className="text-slate-500" />
                    </button>
                    <Button onClick={handleSend} disabled={!newMessage.trim() || sending}>
                        <Send size={16} />
                    </Button>
                </div>
            </div>
        </div>
    )
}

function MessageBubble({ message }) {
    const isOwn = message.user_id === message.users?.id // Simplified check

    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                {!isOwn && (
                    <div className="text-xs text-slate-500 mb-1">
                        {message.users?.full_name || 'Unknown'}
                    </div>
                )}
                <div
                    className={`px-4 py-2 rounded-lg ${isOwn
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                        }`}
                >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {message.attachments.map((attachment, i) => (
                                <a
                                    key={i}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-sm underline"
                                >
                                    {attachment.name}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    )
}
