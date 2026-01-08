import { useState, useEffect, useRef } from 'react'
import { X, Send, FileText, Download, Clock } from 'lucide-react'

export default function ChatModal({
    isOpen,
    onClose,
    prescription,
    doctorName,
    patientName,
    messages = [],
    currentUserId,
    onSendMessage,
    onDownloadAttachment,
    role = 'patient', // 'patient' or 'doctor'
    error = null
}) {
    const [newMessage, setNewMessage] = useState('')
    const messagesEndRef = useRef(null)

    // Auto-scroll to bottom
    useEffect(() => {
        if (isOpen) {
            scrollToBottom()
        }
    }, [isOpen, messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    const handleSend = () => {
        if (!newMessage.trim()) return
        onSendMessage(newMessage)
        setNewMessage('')
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#E5DDD5] w-full max-w-2xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
                {/* Header - WhatsApp style */}
                <div className="bg-[#008069] text-white p-4 flex items-center justify-between shadow-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-white text-lg">
                            {role === 'patient' ? (doctorName?.[0] || 'D') : (patientName?.[0] || 'P')}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{role === 'patient' ? `Dr. ${doctorName}` : patientName}</h3>
                            <p className="text-xs text-white/80 flex items-center gap-1">
                                {prescription ? (
                                    <><Clock className="h-3 w-3" /> {new Date(prescription.created_at).toLocaleDateString()}</>
                                ) : (
                                    <span className="opacity-80">Direct Message</span>
                                )}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 text-xs font-semibold text-center border-b border-red-100 flex items-center justify-center animate-in slide-in-from-top-2">
                        <span className="mr-2">⚠️</span> {error}
                    </div>
                )}

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/287119144-86dc0f70-73b1-4148-8161-eb12d60699d2.png')] bg-repeat bg-opacity-10">

                    {/* Prescription Card (Pinned at top of chat) */}
                    {prescription && (
                        <div className="flex justify-center mb-6">
                            <div className="bg-[#FFF8C5] shadow-sm rounded-lg p-3 max-w-sm text-xs text-slate-800 border-l-4 border-[#008069] w-full">
                                <p className="font-bold text-[#008069] mb-1 uppercase tracking-wider text-[10px]">Prescription Details</p>
                                <p className="whitespace-pre-wrap leading-relaxed mb-2 font-mono">{prescription.medication_text}</p>

                                {/* Attachments within the card */}
                                {prescription.documents && prescription.documents.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-slate-300/50 space-y-1">
                                        {prescription.documents.map((doc, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white/50 p-1.5 rounded border border-slate-200">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <FileText className="h-3 w-3 text-slate-500" />
                                                    <span className="truncate max-w-[150px]">{doc.filename}</span>
                                                </div>
                                                {onDownloadAttachment && (
                                                    <button
                                                        onClick={() => onDownloadAttachment(doc)}
                                                        className="text-[#008069] hover:bg-white rounded p-1"
                                                    >
                                                        <Download className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    {messages.length === 0 && (
                        <div className="text-center my-8">
                            <span className="bg-[#FFF8C5] text-slate-600 text-xs px-3 py-1 rounded-lg shadow-sm">
                                Start the conversation here. Messages are end-to-end encrypted.
                            </span>
                        </div>
                    )}

                    {messages.map((msg, idx) => {
                        const isMe = msg.sender_id === currentUserId
                        return (
                            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[80%] rounded-lg p-3 relative shadow-sm text-sm ${isMe ? 'bg-[#E7FFDB] text-slate-900 rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none'
                                        }`}
                                >
                                    <p className="leading-relaxed whitespace-pre-wrap">{msg.message_text}</p>
                                    <p className={`text-[10px] text-right mt-1 ${isMe ? 'text-green-800/60' : 'text-slate-400'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="bg-[#F0F2F5] p-3 flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="Type a message..."
                        className="flex-1 py-3 px-4 rounded-lg border-none focus:ring-0 outline-none bg-white font-medium text-slate-700 placeholder:text-slate-400"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button
                        onClick={handleSend}
                        className={`p-3 rounded-full transition-all duration-200 ${newMessage.trim()
                            ? 'bg-[#008069] text-white hover:scale-105 active:scale-95 shadow-md'
                            : 'bg-slate-200 text-slate-400'
                            }`}
                        disabled={!newMessage.trim()}
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
