import React, { useState, useEffect } from 'react';
import { NewsItem } from '../types';
import { Calendar, User, ArrowRight, ExternalLink, X, Loader2, RefreshCw, Globe, Rss, AlertTriangle } from 'lucide-react';
import { api } from '../services/apiService';

const NewsFeed: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
    const [email, setEmail] = useState('');
    const [subStatus, setSubStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchNews = async (silent = false) => {
        if (!silent) {
            setLoading(true);
        } else {
            setIsRefreshing(true);
        }
        setError(null);
        try {
            // Khi người dùng nhấn nút Làm mới (silent = false), 
            // fetch tin tức mới từ nguồn ngoài (Reddit, Google News) trước
            if (!silent) {
                try {
                    const refreshResult = await api.refreshNews();
                    if (refreshResult.success && refreshResult.data) {
                        console.log(`Fetched ${refreshResult.data.inserted} new articles from external sources`);
                    }
                } catch (refreshErr) {
                    // Không block lỗi refresh, vẫn tiếp tục load từ DB
                    console.warn('Could not fetch external news:', refreshErr);
                }
            }

            // Sau đó load tin tức từ database
            const result = await api.getNews();
            if (result.success && result.data) {
                setNews(result.data);
                setLastUpdate(new Date());
                if (result.data.length === 0) {
                    setError("Không có tin tức nào. Vui lòng thử cập nhật từ trang Admin.");
                }
            } else {
                throw new Error(result.error || "Failed to fetch news");
            }
        } catch (err: any) {
            setError(err.message || "Could not fetch news.");
            console.error(err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNews();

        // Tự động cập nhật mỗi 5 phút (300000ms)
        const intervalId = setInterval(() => {
            fetchNews(true); // Silent refresh - không hiện loading spinner
        }, 300000); // 5 phút

        return () => {
            clearInterval(intervalId);
        };
    }, []);

    const [isSubscribing, setIsSubscribing] = useState(false);
    const [subMessage, setSubMessage] = useState('');

    const handleSubscribe = async () => {
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setSubStatus('error');
            setSubMessage('Email không hợp lệ');
            return;
        }

        setIsSubscribing(true);
        setSubStatus('idle');
        setSubMessage('');

        try {
            const result = await api.subscribeNewsletter(email.trim());

            if (result.success) {
                setSubStatus('success');
                setSubMessage(result.data?.message || 'Đăng ký thành công!');
                setEmail('');

                // Reset message after 5 seconds
                setTimeout(() => {
                    setSubStatus('idle');
                    setSubMessage('');
                }, 5000);
            } else {
                setSubStatus('error');
                setSubMessage(result.error || 'Không thể đăng ký. Vui lòng thử lại.');
            }
        } catch (err: any) {
            setSubStatus('error');
            setSubMessage(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
        } finally {
            setIsSubscribing(false);
        }
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="animate-spin text-blue-500" size={40} />
                    <span className="ml-3 text-slate-400">Đang cập nhật tin tức mới nhất...</span>
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-center p-8 bg-slate-800/50 rounded-xl">
                    <AlertTriangle className="mx-auto text-red-500 mb-4" size={40} />
                    <h3 className="text-xl font-bold text-white mb-2">Lỗi khi tải tin tức</h3>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button
                        onClick={() => fetchNews()}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                    >
                        <RefreshCw size={16} />
                        Thử lại
                    </button>
                </div>
            );
        }

        if (news.length === 0) {
            return (
                <div className="text-center p-8 bg-slate-800/50 rounded-xl">
                    <Rss className="mx-auto text-slate-500 mb-4" size={40} />
                    <h3 className="text-xl font-bold text-white mb-2">Chưa có tin tức</h3>
                    <p className="text-slate-400 mb-6">Hiện không có bài viết nào. Admin có thể cần phải cập nhật tin tức từ nguồn ngoài.</p>
                </div>
            );
        }

        return (
            <>
                {/* Hero Article (First item) */}
                <div
                    onClick={() => setSelectedArticle(news[0])}
                    className="mb-10 relative rounded-3xl overflow-hidden group cursor-pointer shadow-2xl h-[400px] border border-slate-700/50"
                >
                    <img
                        src={news[0].imageUrl}
                        alt={news[0].title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-8 lg:p-10 max-w-3xl">
                        <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full uppercase tracking-wider mb-4 inline-block shadow-lg text-invariant-white">
                            Mới nhất
                        </span>
                        <h2 className="text-2xl lg:text-4xl font-bold text-white mb-4 leading-tight group-hover:text-blue-400 transition-colors text-invariant-white shadow-sm">
                            {news[0].title}
                        </h2>
                        <p className="text-slate-200 text-base lg:text-lg mb-4 line-clamp-2 text-invariant-white">{news[0].summary}</p>
                        <div className="flex items-center gap-6 text-sm text-slate-300 text-invariant-white">
                            <span className="flex items-center gap-2"><User size={16} /> {news[0].author}</span>
                            <span className="flex items-center gap-2"><Calendar size={16} /> {news[0].date}</span>
                        </div>
                    </div>
                </div>

                {/* News Grid */}
                <h3 className="text-xl font-bold text-white mb-6 border-l-4 border-blue-500 pl-3 flex items-center gap-2">
                    <Rss size={20} className="text-blue-500" /> Tin Nổi Bật Khác
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {news.slice(1).map(item => (
                        <div
                            key={item.id}
                            onClick={() => setSelectedArticle(item)}
                            className="glass-panel rounded-2xl overflow-hidden hover:-translate-y-2 transition-transform duration-300 group shadow-lg flex flex-col cursor-pointer"
                        >
                            <div className="h-48 overflow-hidden relative">
                                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute top-4 left-4">
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase shadow-md text-invariant-white
                                        ${item.category === 'event' ? 'bg-purple-600 text-white' :
                                            item.category === 'tips' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
                                        {item.category === 'event' ? 'Sự kiện' : item.category === 'tips' ? 'Mẹo vặt' : 'Tin tức'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <h4 className="text-lg font-bold text-white mb-3 group-hover:text-blue-400 transition-colors line-clamp-2">
                                    {item.title}
                                </h4>
                                <p className="text-slate-400 text-sm mb-4 line-clamp-3 flex-1 break-words">
                                    {item.summary}
                                </p>
                                <div className="flex items-center justify-between border-t border-slate-700 pt-4 mt-auto">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-500 flex items-center gap-1"><Calendar size={14} /> {item.date}</span>
                                        <span className="text-[10px] text-slate-600 mt-0.5">{item.author}</span>
                                    </div>
                                    <button className="text-blue-400 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                                        Đọc tiếp <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        );
    };

    return (
        <div className="p-6 lg:p-10 animate-fade-in h-full overflow-y-auto pb-20 relative">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Tin Tức & Sự Kiện</h1>
                    <p className="text-slate-400 flex items-center gap-2">
                        <Globe size={14} /> Tổng hợp từ các nguồn uy tín
                        {lastUpdate && (
                            <span className="text-xs text-slate-500 ml-2">
                                • Cập nhật lúc {lastUpdate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={() => fetchNews(false)}
                    disabled={loading || isRefreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-invariant-white rounded-lg font-semibold transition-colors shadow-lg"
                    title="Cập nhật tin tức mới"
                >
                    <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                    <span>{isRefreshing ? 'Đang cập nhật...' : 'Làm mới'}</span>
                </button>
            </header>

            {renderContent()}

            {/* Subscription Box */}
            <div className="mt-12 bg-gradient-to-r from-blue-900 to-slate-900 rounded-2xl p-8 border border-blue-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                <div>
                    <h3 className="text-2xl font-bold text-white mb-2 text-invariant-white flex items-center gap-2">
                        <Rss className="text-blue-400" size={24} />
                        Đăng ký nhận bản tin môi trường
                    </h3>
                    <p className="text-blue-200">Nhận thông tin cập nhật hàng tuần về chất lượng không khí và sự kiện xanh.</p>
                </div>
                <div className="flex flex-col w-full md:w-auto gap-2">
                    <div className="flex gap-2">
                        <input
                            type="email"
                            placeholder="Email của bạn..."
                            className={`bg-slate-950/50 border ${subStatus === 'error' ? 'border-red-500' : subStatus === 'success' ? 'border-green-500' : 'border-slate-700'} text-white px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 w-full md:w-64 transition-colors`}
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setSubStatus('idle'); setSubMessage(''); }}
                            disabled={isSubscribing}
                        />
                        <button
                            onClick={handleSubscribe}
                            disabled={isSubscribing || !email.trim()}
                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-invariant-white px-6 py-3 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center gap-2"
                        >
                            {isSubscribing ? (
                                <>
                                    <Loader2 className="animate-spin" size={16} />
                                    Đang xử lý...
                                </>
                            ) : (
                                'Đăng ký'
                            )}
                        </button>
                    </div>
                    {subStatus === 'error' && <span className="text-red-400 text-xs ml-1 flex items-center gap-1"><AlertTriangle size={12} /> {subMessage || 'Email không hợp lệ'}</span>}
                    {subStatus === 'success' && <span className="text-green-400 text-xs ml-1">✓ {subMessage || 'Đăng ký thành công!'}</span>}
                </div>
            </div>

            {/* --- ARTICLE DETAIL MODAL --- */}
            {selectedArticle && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md animate-fade-in"
                        onClick={() => setSelectedArticle(null)}
                    ></div>

                    {/* Modal Content */}
                    <div className="bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-10 border border-slate-700 shadow-2xl flex flex-col animate-fade-in-up">
                        <button
                            onClick={() => setSelectedArticle(null)}
                            className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors backdrop-blur-md"
                        >
                            <X size={20} />
                        </button>

                        {/* Image Header */}
                        <div className="w-full h-64 md:h-80 relative flex-shrink-0">
                            <img
                                src={selectedArticle.imageUrl}
                                alt={selectedArticle.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                            <div className="absolute bottom-6 left-6 right-6">
                                <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full uppercase tracking-wider mb-3 inline-block shadow-lg">
                                    {selectedArticle.category === 'event' ? 'Sự kiện' : 'Tin tức'}
                                </span>
                                <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight shadow-sm text-shadow-md">
                                    {selectedArticle.title}
                                </h2>
                            </div>
                        </div>

                        {/* Body Content */}
                        <div className="p-6 md:p-10 space-y-6 bg-slate-900">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                                <div className="flex items-center gap-6 text-sm text-slate-400">
                                    <span className="flex items-center gap-2 text-blue-400 font-medium"><User size={16} /> {selectedArticle.author}</span>
                                    <span className="flex items-center gap-2"><Calendar size={16} /> {selectedArticle.date}</span>
                                </div>
                                {selectedArticle.url && (
                                    <a
                                        href={selectedArticle.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                                    >
                                        Xem nguồn <ExternalLink size={14} />
                                    </a>
                                )}
                            </div>

                            <div className="prose prose-invert prose-lg max-w-none">
                                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {selectedArticle.summary || "Nội dung bài viết này không có văn bản hoặc chỉ chứa hình ảnh/video. Vui lòng truy cập nguồn gốc để xem chi tiết."}
                                </p>
                            </div>

                            <div className="pt-8 flex justify-center">
                                {selectedArticle.url ? (
                                    <a
                                        href={selectedArticle.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white text-invariant-white font-bold rounded-xl transition-all shadow-lg flex items-center gap-2"
                                    >
                                        Đọc bài gốc tại nguồn <ExternalLink size={18} />
                                    </a>
                                ) : (
                                    <button
                                        onClick={() => setSelectedArticle(null)}
                                        className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
                                    >
                                        Đóng
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default NewsFeed;