import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { explainMedicalTerm } from '../lib/ai';

export default function MedicalChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'bot', text: 'Hi! I can explain medical terms for you. Ask me "What is LDL?" or similar.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userText = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setIsLoading(true);

        try {
            const answer = await explainMedicalTerm(userText);
            setMessages(prev => [...prev, { role: 'bot', text: answer }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I couldn't understand that." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 font-sans">
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-xl shadow-blue-500/30 transition-all hover:scale-110 active:scale-95 flex items-center justify-center animate-bounce-subtle"
                    title="Medical Term Assistant"
                >
                    <MessageCircle size={28} />
                </button>
            )}

            {isOpen && (
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-80 sm:w-96 flex flex-col border border-white/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-300 h-[500px] max-h-[80vh] ring-1 ring-black/5">
                    {/* Header */}
                    <div className="bg-slate-900/95 backdrop-blur-sm text-white p-4 flex justify-between items-center border-b border-white/10">
                        <div className="font-bold flex items-center gap-2.5">
                            <div className="bg-blue-500 p-1.5 rounded-lg">
                                <MessageCircle size={16} className="text-white" />
                            </div>
                            <span className="tracking-tight">AI Assistant</span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-white/10 p-1.5 rounded-lg transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 flex flex-col gap-3 custom-scrollbar">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
                                    <Loader2 className="animate-spin text-blue-500" size={16} />
                                    <span className="text-xs text-slate-400 font-medium">Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white/50 backdrop-blur-sm flex gap-2 items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about a medical term..."
                            className="flex-1 border border-slate-200 bg-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex-shrink-0"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
