import React, { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2, ShieldCheck } from 'lucide-react'
import { explainMedicalTerm } from '../lib/ai'
import Logo from './Logo'

export default function MedicalChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: "Hello! I am your MedLink Assistant. Ask me about any lab result, biomarker, or clinical term (e.g., 'What is LDL?' or 'Explain Hemoglobin').",
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [isOpen, messages, isLoading])

  const sendQuery = async (queryText) => {
    if (!queryText?.trim() || isLoading) return

    const userText = queryText.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: userText }])
    setIsLoading(true)

    try {
      const answer = await explainMedicalTerm(userText)
      setMessages((prev) => [...prev, { role: 'bot', text: answer }])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: "I couldn't fetch an explanation right now. Please check your connection or ask again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    sendQuery(input)
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 font-sans">
      {/* Floating Trigger Button with MedLink Logo */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white pl-2.5 pr-4 py-2.5 rounded-full shadow-xl shadow-slate-900/25 border border-slate-700/60 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Ask MedLink AI"
        >
          <Logo size={24} showWordmark={false} light={true} />
          <span className="text-xs font-semibold leading-tight tracking-tight">
            Ask MedLink AI
          </span>
        </button>
      )}

      {/* Chat Dialog — Full-bleed responsive on mobile, fixed card on desktop */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl w-[calc(100vw-2rem)] sm:w-[390px] max-w-[390px] h-[480px] sm:h-[520px] max-h-[82vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-200">
          {/* Clinical Header */}
          <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Logo size={26} showWordmark={false} light={true} />
              <div>
                <h3 className="text-xs sm:text-sm font-bold tracking-tight">MedLink AI Assistant</h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400">
                  Ask about lab results or medical terms
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close Assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chat Messages with data-lenis-prevent to preserve internal scroll */}
          <div data-lenis-prevent className="flex-1 overflow-y-auto p-4 bg-[#F8FAFC] space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white rounded-br-xs shadow-sm font-medium'
                      : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-xs shadow-xs'
                  }`}
                >
                  {msg.text}
                </div>
                {msg.role === 'bot' && idx === messages.length - 1 && !isLoading && (
                  <span className="text-[10px] text-slate-400 mt-1 pl-1 flex items-center gap-1">
                    <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" />
                    For understanding only • Not diagnostic advice
                  </span>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs px-3.5 py-2.5 shadow-xs flex items-center gap-2">
                  <Loader2 className="animate-spin text-slate-600" size={14} />
                  <span className="text-xs text-slate-500 font-medium">Looking up clinical term...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-slate-100 bg-white flex gap-2 items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a medical term..."
              className="flex-1 border border-slate-200 bg-slate-50 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:border-slate-900 transition-colors font-medium text-slate-800 placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-all shadow-sm active:scale-95 flex-shrink-0 cursor-pointer"
              title="Send"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
