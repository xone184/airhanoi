import React, { useState, useEffect, useCallback } from 'react';
import {
    Bell, BellOff, CheckCircle, Trash2, Filter, RefreshCw, Loader2,
    AlertTriangle, Mail, Megaphone, Shield, Newspaper, ChevronLeft, ChevronRight,
    CheckCheck, Eye
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost/doan_airhanoi/api';

const getToken = (): string | null => {
    try {
        const user = localStorage.getItem('user');
        if (user) return JSON.parse(user).token || null;
    } catch { }
    return null;
};

const authHeaders = () => {
    const token = getToken();
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
};

interface Notification {
    id: number;
    type: 'alert' | 'welcome' | 'newsletter' | 'system' | 'report';
    title: string;
    message: string;
    icon: string;
    is_read: boolean;
    link: string | null;
    metadata: any;
    created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    alert: { label: 'Cảnh báo AQI', color: 'text-red-400 bg-red-500/10', icon: <AlertTriangle size={16} /> },
    welcome: { label: 'Chào mừng', color: 'text-emerald-400 bg-emerald-500/10', icon: <Mail size={16} /> },
    newsletter: { label: 'Bản tin', color: 'text-blue-400 bg-blue-500/10', icon: <Newspaper size={16} /> },
    system: { label: 'Hệ thống', color: 'text-purple-400 bg-purple-500/10', icon: <Shield size={16} /> },
    report: { label: 'Báo cáo', color: 'text-orange-400 bg-orange-500/10', icon: <Megaphone size={16} /> },
};

const NotificationCenter: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string>('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let url = `${API_BASE}/notifications.php?page=${page}&limit=15`;
            if (filterType) url += `&type=${filterType}`;

            const res = await fetch(url, { headers: authHeaders() });
            const data = await res.json();

            if (data.success) {
                setNotifications(data.data.notifications);
                setTotalPages(data.data.pagination.total_pages);
                setTotal(data.data.pagination.total);
            } else {
                setError(data.error || 'Không thể tải thông báo');
            }
        } catch (err: any) {
            setError(err.message || 'Lỗi kết nối');
        } finally {
            setLoading(false);
        }
    }, [page, filterType]);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/notifications.php?unread=1`, { headers: authHeaders() });
            const data = await res.json();
            if (data.success) setUnreadCount(data.data.unread_count);
        } catch { }
    }, []);

    useEffect(() => { fetchNotifications(); fetchUnreadCount(); }, [fetchNotifications, fetchUnreadCount]);

    const markAsRead = async (id: number) => {
        setActionLoading(id);
        try {
            await fetch(`${API_BASE}/notifications.php?id=${id}`, {
                method: 'PUT', headers: authHeaders()
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch { }
        finally { setActionLoading(null); }
    };

    const markAllAsRead = async () => {
        setActionLoading(-1);
        try {
            await fetch(`${API_BASE}/notifications.php?action=read_all`, {
                method: 'PUT', headers: authHeaders()
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch { }
        finally { setActionLoading(null); }
    };

    const deleteNotification = async (id: number) => {
        setActionLoading(id);
        try {
            await fetch(`${API_BASE}/notifications.php?id=${id}`, {
                method: 'DELETE', headers: authHeaders()
            });
            setNotifications(prev => prev.filter(n => n.id !== id));
            setTotal(prev => prev - 1);
        } catch { }
        finally { setActionLoading(null); }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} giờ trước`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays} ngày trước`;
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <div className="p-6 lg:p-10 animate-fade-in h-full overflow-y-auto pb-20">
            {/* Header */}
            <header className="mb-8">
                <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <Bell className="text-yellow-400" size={28} />
                            Trung Tâm Thông Báo
                            {unreadCount > 0 && (
                                <span className="text-sm bg-red-500 text-white text-invariant-white px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                                    {unreadCount} mới
                                </span>
                            )}
                        </h1>
                        <p className="text-slate-400">Lịch sử cảnh báo AQI, thông báo hệ thống và bản tin</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Filter */}
                        <div className="flex items-center gap-2">
                            <Filter size={16} className="text-slate-500" />
                            <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
                                className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm">
                                <option value="">Tất cả</option>
                                <option value="alert">Cảnh báo AQI</option>
                                <option value="system">Hệ thống</option>
                                <option value="newsletter">Bản tin</option>
                                <option value="welcome">Chào mừng</option>
                                <option value="report">Báo cáo</option>
                            </select>
                        </div>
                        <button onClick={fetchNotifications} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors" title="Làm mới">
                            <RefreshCw size={18} />
                        </button>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} disabled={actionLoading === -1}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-invariant-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                                {actionLoading === -1 ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={16} />}
                                Đọc tất cả
                            </button>
                        )}
                    </div>
                </div>
                {/* Stats bar */}
                <div className="mt-4 flex gap-4 text-sm">
                    <span className="text-slate-500">Tổng: <span className="text-white font-bold">{total}</span></span>
                    <span className="text-slate-500">Chưa đọc: <span className="text-yellow-400 font-bold">{unreadCount}</span></span>
                </div>
            </header>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-xl mb-6 flex items-center gap-2">
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Notifications List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-blue-500 mr-3" size={32} />
                    <span className="text-slate-400">Đang tải...</span>
                </div>
            ) : notifications.length === 0 ? (
                <div className="text-center py-20">
                    <BellOff size={48} className="text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Chưa có thông báo</h3>
                    <p className="text-slate-400">Thông báo cảnh báo AQI và hệ thống sẽ hiển thị ở đây</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map(n => {
                        const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
                        return (
                            <div key={n.id}
                                className={`bg-slate-800 rounded-xl border transition-all duration-200 hover:border-slate-600 group
                                    ${n.is_read ? 'border-slate-700/50 opacity-75' : 'border-blue-500/30 shadow-lg shadow-blue-500/5'}`}
                            >
                                <div className="p-4 flex items-start gap-4">
                                    {/* Icon */}
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${cfg.color}`}>
                                        {n.icon || '🔔'}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                                            {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                                            <span className="text-xs text-slate-500 ml-auto flex-shrink-0">{formatDate(n.created_at)}</span>
                                        </div>
                                        <h4 className={`font-semibold mb-1 ${n.is_read ? 'text-slate-300' : 'text-white'}`}>{n.title}</h4>
                                        <p className="text-sm text-slate-400 line-clamp-2">{n.message}</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!n.is_read && (
                                            <button onClick={() => markAsRead(n.id)} disabled={actionLoading === n.id}
                                                className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors" title="Đánh dấu đã đọc">
                                                {actionLoading === n.id ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                                            </button>
                                        )}
                                        <button onClick={() => deleteNotification(n.id)} disabled={actionLoading === n.id}
                                            className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors" title="Xóa">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-8">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-lg border border-slate-700 transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-slate-400 text-sm">Trang <span className="text-white font-bold">{page}</span> / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-lg border border-slate-700 transition-colors">
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
