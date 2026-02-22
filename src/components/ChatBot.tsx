import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Send, Bot, User as UserIcon, Loader2, ExternalLink, Plus,
    Globe, GlobeLock, MessageSquare, Sparkles, Clock, Trash2, ChevronRight
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
    text: '⚡ Xin chào! Tôi là **AirHanoi AI** - trợ lý phân tích chất lượng không khí.\n\n🔍 Tôi có thể:\n• Phân tích AQI theo quận/huyện\n• So sánh mức độ ô nhiễm\n• Tìm kiếm tin tức môi trường\n• Đưa ra lời khuyên sức khỏe\n\nHãy hỏi tôi bất cứ điều gì!',
    timestamp: new Date()
};

function getDomain(url: string): string {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return url; }
}

function getFavicon(url: string): string {
    const domain = getDomain(url);
    return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
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

        // Auto-title session from first real user message
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

        try {
            const onChunk = (text: string) => {
                updateMessages(sessionId, msgs => msgs.map(m => m.id === aiMsgId ? { ...m, text } : m));
            };

            const { text, sources } = await generateAIResponse(question, data, onChunk, webSearchEnabled);
            updateMessages(sessionId, msgs => msgs.map(m => m.id === aiMsgId ? { ...m, text, sources, timestamp: new Date() } : m));
        } catch (error: any) {
            updateMessages(sessionId, msgs => msgs.map(m => m.id === aiMsgId
                ? { ...m, text: `❌ Đã xảy ra lỗi: ${error?.message || 'Unknown error'}. Vui lòng thử lại.` }
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
        const now = new Date();
        const diff = now.getDate() - d.getDate();
        if (diff === 0) return 'Hôm nay';
        if (diff === 1) return 'Hôm qua';
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    };

    return (
        <div className="flex h-screen overflow-hidden bg-slate-950">
            {/* ── LEFT SIDEBAR: Chat History ── */}
            <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
                <div className="p-3 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-widest px-1 mb-2">
                        <MessageSquare size={12} />
                        Lịch sử trò chuyện
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
                            onClick={() => setActiveSessionId(session.id)}
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
                                title="Xóa cuộc trò chuyện"
                            >
                                <Trash2 size={11} />
                            </button>
                        </button>
                    ))}
                </div>
            </aside>

            {/* ── MAIN CHAT AREA ── */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                            <Sparkles size={16} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-base flex items-center gap-2">
                                Trợ Lý AI Thông Minh
                            </h1>
                            <p className="text-slate-500 text-[11px]">
                                Groq Llama 3.3 70B
                                {webSearchEnabled && <span> • <span className="text-emerald-400">Web Search</span></span>}
                                {' • '}Đa lượt
                            </p>
                        </div>
                    </div>

                    {/* Web Search Toggle */}
                    <button
                        onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${webSearchEnabled
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                            }`}
                        title={webSearchEnabled ? 'Tắt Web Search' : 'Bật Web Search'}
                    >
                        {webSearchEnabled ? <Globe size={13} /> : <GlobeLock size={13} />}
                        Web Search {webSearchEnabled ? 'BẬT' : 'TẮT'}
                    </button>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                                    {msg.role === 'user' ? <UserIcon size={15} /> : <Sparkles size={15} />}
                                </div>

                                <div className="flex flex-col gap-2 min-w-0">
                                    {/* Message bubble */}
                                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-sm'
                                        : 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700'
                                        }`}
                                    >
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

                                    {/* Web search used badge */}
                                    {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                                                <Globe size={10} />
                                                Có dùng Web Search
                                            </span>
                                            <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800 border border-slate-700 px-2 py-1 rounded-full cursor-pointer hover:bg-slate-700 transition-colors">
                                                <ChevronRight size={10} />
                                                Nguồn tham khảo ({msg.sources.length})
                                            </span>
                                        </div>
                                    )}

                                    {/* Source cards */}
                                    {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {msg.sources.map((source, idx) => (
                                                <a
                                                    key={idx}
                                                    href={source.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl text-xs text-slate-300 hover:text-white transition-all max-w-[200px] group"
                                                    title={source.title}
                                                >
                                                    <img
                                                        src={getFavicon(source.url)}
                                                        alt=""
                                                        className="w-4 h-4 rounded-sm flex-shrink-0"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                    <span className="truncate">{getDomain(source.url)}</span>
                                                    <ExternalLink size={9} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                <div className="flex-shrink-0 px-4 pb-4 pt-2 bg-slate-900 border-t border-slate-800">
                    <div className="relative bg-slate-800 border border-slate-700 rounded-2xl focus-within:border-slate-500 transition-all">
                        <textarea
                            ref={textareaRef}
                            rows={1}
                            className="w-full bg-transparent text-white text-sm pl-4 pr-12 py-3.5 resize-none focus:outline-none placeholder-slate-500 max-h-36 overflow-y-auto"
                            placeholder="Hỏi về AQI, sức khỏe, dự báo Hà Nội..."
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 144) + 'px';
                            }}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="absolute right-2.5 bottom-2.5 w-8 h-8 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-xl flex items-center justify-center transition-all disabled:cursor-not-allowed"
                        >
                            {isLoading
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Send size={14} />
                            }
                        </button>
                    </div>
                    <p className="text-center text-[10px] text-slate-600 mt-2">
                        ⚡ Groq (Llama 3.3 70B) • Ultra Fast · Enter để gửi, Shift+Enter để xuống dòng
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ChatBot;
