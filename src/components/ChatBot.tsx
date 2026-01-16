
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Zap, ExternalLink } from 'lucide-react';
import { DistrictData, ChatMessage } from '../types';
import { generateAIResponse } from '../services/groqService';

interface ChatBotProps {
    data: DistrictData[];
}

const ChatBot: React.FC<ChatBotProps> = ({ data }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            role: 'model',
            text: '⚡ Xin chào! Tôi là **AirHanoi AI** - trợ lý phân tích chất lượng không khí siêu nhanh.\n\n🔍 Tôi có thể:\n• Phân tích AQI theo quận/huyện\n• So sánh mức độ ô nhiễm\n• Đưa ra lời khuyên sức khỏe\n• Giải thích các chỉ số môi trường\n\nHãy hỏi tôi bất cứ điều gì!',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Log cấu hình Groq khi component mount
    useEffect(() => {
        console.log('⚡ ChatBot sử dụng Groq API - Llama 3.3 70B (Ultra Fast)');
    }, []);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: input,
            timestamp: new Date()
        };

        // Create placeholder for AI message that will be updated during streaming
        const aiMsgId = (Date.now() + 1).toString();
        const aiMsg: ChatMessage = {
            id: aiMsgId,
            role: 'model',
            text: '',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg, aiMsg]);
        setInput('');
        setIsLoading(true);
        setIsStreaming(true);

        try {
            // Callback to update message text in real-time during streaming
            const onChunk = (text: string) => {
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === aiMsgId
                            ? { ...msg, text }
                            : msg
                    )
                );
            };

            const { text, sources } = await generateAIResponse(input, data, onChunk);

            // Final update with complete text and sources
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === aiMsgId
                        ? { ...msg, text, sources, timestamp: new Date() }
                        : msg
                )
            );
        } catch (error: any) {
            console.error("ChatBot error:", error);
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === aiMsgId
                        ? { ...msg, text: `Đã xảy ra lỗi: ${error?.message || 'Unknown error'}. Vui lòng kiểm tra console để biết thêm chi tiết.` }
                        : msg
                )
            );
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

    return (
        <div className="p-4 lg:p-8 h-screen flex flex-col animate-fade-in">
            <header className="mb-4 flex-shrink-0">
                <h1 className="text-3xl font-bold text-white">Trợ Lý AI Thông Minh</h1>
                <p className="text-slate-400">Hỏi đáp với dữ liệu Realtime</p>
            </header>

            <div className="flex-1 bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden flex flex-col">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] lg:max-w-[75%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                                    {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-line shadow-md
                                        ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-tr-none'
                                            : 'bg-slate-700 text-slate-100 rounded-tl-none'
                                        }`}
                                    >
                                        {msg.text || (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="animate-spin" size={16} />
                                                <span className="text-slate-400">Đang suy nghĩ...</span>
                                            </span>
                                        )}
                                        {/* Streaming cursor */}
                                        {msg.role === 'model' && isStreaming && msg.id === messages[messages.length - 1]?.id && msg.text && (
                                            <span className="inline-block w-2 h-4 bg-emerald-400 ml-1 animate-pulse" />
                                        )}
                                    </div>

                                    {/* Display Sources if available */}
                                    {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            <div className="w-full text-xs text-slate-400 flex items-center gap-1 mb-1">
                                                <Zap size={12} /> Nguồn tham khảo:
                                            </div>
                                            {msg.sources.map((source, idx) => (
                                                <a
                                                    key={idx}
                                                    href={source.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/50 hover:bg-slate-900 border border-slate-600 hover:border-blue-400 rounded-lg text-xs text-blue-300 hover:text-blue-200 transition-all max-w-[200px] truncate"
                                                    title={source.title}
                                                >
                                                    <ExternalLink size={10} className="flex-shrink-0" />
                                                    <span className="truncate">{source.title}</span>
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    {msg.text && (
                                        <div className={`text-[10px] opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left text-slate-400'}`}>
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-slate-900/50 border-t border-slate-700">
                    <div className="relative">
                        <input
                            type="text"
                            className="w-full bg-slate-800 text-white pl-4 pr-12 py-4 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-500"
                            placeholder="Hỏi về tin tức môi trường, so sánh với Tokyo, hoặc dự báo..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="absolute right-2 top-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                    <div className="mt-2 text-center">
                        <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                            <Zap size={10} className="text-yellow-500" /> Powered by Groq (Llama 3.3 70B) • Ultra Fast AI
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatBot;
