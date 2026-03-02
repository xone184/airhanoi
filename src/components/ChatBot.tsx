import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Send, Bot, User as UserIcon, Loader2, ExternalLink, Plus,
    Globe, GlobeLock, MessageSquare, Sparkles, Clock, Trash2, ChevronRight, Menu, X
} from 'lucide-react';
import { DistrictData, ChatMessage } from '../types';
import { generateAIResponse } from '../services/groqService';

interface ChatBotProps {
    data: DistrictData[];
}

interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: Date;
}

const WELCOME_MSG: ChatMessage = {
    id: 'welcome',
    role: 'model',
    text: '⚡ Xin chào! Tôi là AirHanoi AI - trợ lý phân tích chất lượng không khí.\n\n🔍 Tôi có thể:\n• Phân tích AQI theo quận/huyện\n• So sánh mức độ ô nhiễm\n• Tìm kiếm tin tức môi trường\n• Đưa ra lời khuyên sức khỏe\n\nHãy hỏi tôi bất cứ điều gì!',
    timestamp: new Date()
};

function getDomain(url: string): string {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return url; }
}

function getFavicon(url: string): string {
    return `https://www.google.com/s2/favicons?sz=32&domain=${getDomain(url)}`;
}

const ChatBot: React.FC<ChatBotProps> = ({ data }) => {
    const [sessions, setSessions] = useState<ChatSession[]>([
        { id: '1', title: 'Cuộc trò chuyện mới', messages: [{ ...WELCOME_MSG, timestamp: new Date() }], createdAt: new Date() }
    ]);
    const [activeSessionId, setActiveSessionId] = useState('1');
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [webSearchEnabled, setWebSearchEnabled] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false); // hidden by default on mobile
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const activeSession = sessions.find(s => s.id === activeSessionId)!;
    const messages = activeSession?.messages || [];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const updateMessages = useCallback((sessionId: string, updater: (msgs: ChatMessage[]) => ChatMessage[]) => {
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: updater(s.messages) } : s));
    }, []);

    const createNewSession = () => {
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title: 'Cuộc trò chuyện mới',
            messages: [{ ...WELCOME_MSG, id: `welcome-${Date.now()}`, timestamp: new Date() }],
            createdAt: new Date()
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        setInput('');
        setSidebarOpen(false); // close sidebar on mobile after selecting
    };

    const deleteSession = (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSessions(prev => {
            const remaining = prev.filter(s => s.id !== sessionId);
            if (remaining.length === 0) {
                const fallback: ChatSession = {
                    id: Date.now().toString(),
                    title: 'Cuộc trò chuyện mới',
                    messages: [{ ...WELCOME_MSG, id: `welcome-${Date.now()}`, timestamp: new Date() }],
                    createdAt: new Date()
                };
                setActiveSessionId(fallback.id);
                return [fallback];
            }
            if (sessionId === activeSessionId) setActiveSessionId(remaining[0].id);
            return remaining;
        });
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const question = input.trim();
        const sessionId = activeSessionId;

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: question, timestamp: new Date() };
        const aiMsgId = (Date.now() + 1).toString();
        const aiMsg: ChatMessage = { id: aiMsgId, role: 'model', text: '', timestamp: new Date() };

        setSessions(prev => prev.map(s => {
            if (s.id !== sessionId) return s;
            const isFirst = s.messages.filter(m => m.role === 'user').length === 0;
            return {
                ...s,
                title: isFirst ? question.substring(0, 40) + (question.length > 40 ? '...' : '') : s.title,
                messages: [...s.messages, userMsg, aiMsg]
            };
        }));
        setInput('');
        setIsLoading(true);
        setIsStreaming(true);

        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        try {
            const onChunk = (text: string) => {
                updateMessages(sessionId, msgs => msgs.map(m => m.id === aiMsgId ? { ...m, text } : m));
            };
            const { text, sources } = await generateAIResponse(question, data, onChunk, webSearchEnabled);
            updateMessages(sessionId, msgs => msgs.map(m => m.id === aiMsgId ? { ...m, text, sources, timestamp: new Date() } : m));
        } catch (error: any) {
            updateMessages(sessionId, msgs => msgs.map(m => m.id === aiMsgId
                ? { ...m, text: `❌ Lỗi: ${error?.message || 'Unknown error'}. Vui lòng thử lại.` }
                : m));
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (d: Date) => d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const formatDate = (d: Date) => {
        const diff = new Date().getDate() - d.getDate();
        if (diff === 0) return 'Hôm nay';
        if (diff === 1) return 'Hôm qua';
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    };

    return (
        <div className="flex h-screen overflow-hidden bg-slate-950 relative">

            {/* ── MOBILE SIDEBAR OVERLAY ── */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-20 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── SIDEBAR ── */}
            <aside className={`
                fixed lg:relative inset-y-0 left-0 z-30 lg:z-auto
                w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col
                transition-transform duration-300
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-3 border-b border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-widest px-1">
                            <MessageSquare size={12} />
                            Lịch sử
                        </div>
                        {/* Close button on mobile */}
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-1 text-slate-500 hover:text-white"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <button
                        onClick={createNewSession}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors border border-slate-700"
                    >
                        <Plus size={14} />
                        Cuộc trò chuyện mới
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {sessions.map(session => (
                        <button
                            key={session.id}
                            onClick={() => { setActiveSessionId(session.id); setSidebarOpen(false); }}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all group flex items-start gap-2 ${session.id === activeSessionId
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                }`}
                        >
                            <MessageSquare size={13} className="mt-0.5 flex-shrink-0 opacity-60" />
                            <div className="flex-1 min-w-0">
                                <div className="truncate text-xs font-medium leading-tight">{session.title}</div>
                                <div className="flex items-center gap-1 mt-0.5 text-slate-500 text-[10px]">
                                    <Clock size={9} />
                                    {formatDate(session.createdAt)} · {formatTime(session.createdAt)}
                                </div>
                            </div>
                            <button
                                onClick={(e) => deleteSession(session.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition-all flex-shrink-0"
                            >
                                <Trash2 size={11} />
                            </button>
                        </button>
                    ))}
                </div>
            </aside>

            {/* ── MAIN CHAT AREA ── */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">

                {/* Header */}
                <header className="flex-shrink-0 flex items-center justify-between px-3 md:px-5 py-2.5 border-b border-slate-800 bg-slate-900 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        {/* Hamburger on mobile */}
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden flex-shrink-0 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <Menu size={18} />
                        </button>

                        <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                            <Sparkles size={14} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-white font-bold text-sm leading-tight truncate">Trợ Lý AI Thông Minh</h1>
                            <p className="text-slate-500 text-[10px] leading-tight truncate">
                                Groq 3.3 70B{webSearchEnabled && <span className="text-emerald-400"> • Web Search</span>} • Đa lượt
                            </p>
                        </div>
                    </div>

                    {/* Web Search Toggle - compact */}
                    <button
                        onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${webSearchEnabled
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                            : 'bg-slate-800 border-slate-700 text-slate-500'
                            }`}
                    >
                        {webSearchEnabled ? <Globe size={12} /> : <GlobeLock size={12} />}
                        <span className="hidden sm:inline">Web Search </span>
                        {webSearchEnabled ? 'BẬT' : 'TẮT'}
                    </button>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex gap-2 md:gap-3 max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row w-full'}`}>
                                {/* Avatar */}
                                <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                                    {msg.role === 'user' ? <UserIcon size={13} /> : <Sparkles size={13} />}
                                </div>

                                <div className={`flex flex-col gap-1.5 min-w-0 ${msg.role === 'user' ? '' : 'flex-1'}`}>
                                    {/* Message bubble */}
                                    <div className={`px-3 py-2.5 md:px-4 md:py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line break-words ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-sm'
                                        : 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700'
                                        }`}>
                                        {msg.text || (
                                            <span className="flex items-center gap-2 text-slate-400">
                                                <Loader2 className="animate-spin" size={14} />
                                                Đang suy nghĩ...
                                            </span>
                                        )}
                                        {msg.role === 'model' && isStreaming && msg.id === messages[messages.length - 1]?.id && msg.text && (
                                            <span className="inline-block w-1.5 h-4 bg-emerald-400 ml-1 animate-pulse rounded-sm" />
                                        )}
                                    </div>

                                    {/* Web search badge + source count */}
                                    {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                                <Globe size={9} />
                                                Có dùng Web Search
                                            </span>
                                            <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
                                                <ChevronRight size={9} />
                                                Nguồn tham khảo ({msg.sources.length})
                                            </span>
                                        </div>
                                    )}

                                    {/* Source cards */}
                                    {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {msg.sources.map((source, idx) => (
                                                <a
                                                    key={idx}
                                                    href={source.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-[11px] text-slate-300 hover:text-white transition-all max-w-[160px] md:max-w-[200px]"
                                                    title={source.title}
                                                >
                                                    <img
                                                        src={getFavicon(source.url)}
                                                        alt=""
                                                        className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                    <span className="truncate">{getDomain(source.url)}</span>
                                                    <ExternalLink size={8} className="flex-shrink-0 opacity-60" />
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    {/* Timestamp */}
                                    {msg.text && (
                                        <div className={`text-[10px] text-slate-600 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                            {formatTime(msg.timestamp)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="flex-shrink-0 px-3 md:px-4 pb-3 pt-2 bg-slate-900 border-t border-slate-800">
                    <div className="relative bg-slate-800 border border-slate-700 rounded-2xl focus-within:border-slate-500 transition-all">
                        <textarea
                            ref={textareaRef}
                            rows={1}
                            className="w-full bg-transparent text-white text-sm pl-4 pr-12 py-3 resize-none focus:outline-none placeholder-slate-500 max-h-28 overflow-y-auto"
                            placeholder="Hỏi về AQI, sức khỏe, dự báo Hà Nội..."
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 112) + 'px';
                            }}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="absolute right-2 bottom-2 w-8 h-8 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-xl flex items-center justify-center transition-all disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        </button>
                    </div>
                    <p className="text-center text-[10px] text-slate-600 mt-1.5 hidden sm:block">
                        ⚡ Groq (Llama 3.3 70B) • Enter để gửi, Shift+Enter để xuống dòng
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ChatBot;
