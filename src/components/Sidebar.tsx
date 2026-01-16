import React from 'react';
import { LayoutDashboard, LineChart, Map, MessageSquare, Database, Settings, HeartPulse, BookOpen, Megaphone, LogOut, ArrowRightLeft, Newspaper, Menu, X, ClipboardList, Navigation, Leaf } from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    userRole: UserRole;
    onLogout: () => void;
    isOpen: boolean;
    toggleSidebar: () => void;
    language?: 'vi' | 'en';
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userRole, onLogout, isOpen, toggleSidebar, language = 'vi' }) => {
    const t = (vi: string, en: string) => (language === 'en' ? en : vi);
    const menuItems = [
        { id: 'dashboard', label: t('Tổng Quan', 'Overview'), icon: <LayoutDashboard size={20} />, roles: ['admin', 'user'] },
        { id: 'map', label: t('Bản Đồ', 'Map'), icon: <Map size={20} />, roles: ['admin', 'user'] },
        { id: 'analytics', label: t('Phân Tích & Dự Báo', 'Analytics & Forecast'), icon: <LineChart size={20} />, roles: ['admin', 'user'] },
        { id: 'comparison', label: t('So Sánh Khu Vực', 'Compare Areas'), icon: <ArrowRightLeft size={20} />, roles: ['admin', 'user'] },
        { id: 'clean-route', label: t('Lộ Trình Sạch', 'Clean Route'), icon: <Navigation size={20} />, roles: ['admin', 'user'] }, // NEW MODULE
        { id: 'health', label: t('Sức Khỏe', 'Health'), icon: <HeartPulse size={20} />, roles: ['admin', 'user'] },
        { id: 'health-diary', label: t('Nhật Ký & Tác Động', 'Diary & Impact'), icon: <ClipboardList size={20} />, roles: ['admin', 'user'] },
        { id: 'news', label: t('Tin Tức & Sự Kiện', 'News & Events'), icon: <Newspaper size={20} />, roles: ['admin', 'user'] },
        { id: 'education', label: t('Kiến Thức', 'Knowledge'), icon: <BookOpen size={20} />, roles: ['admin', 'user'] },
        { id: 'report', label: t('Báo Cáo Ô Nhiễm', 'Report Pollution'), icon: <Megaphone size={20} />, roles: ['user'] },
        { id: 'chat', label: t('Trợ Lý AI', 'AI Assistant'), icon: <MessageSquare size={20} />, roles: ['admin', 'user'] },
        { id: 'admin', label: t('Quản Trị Hệ Thống', 'System Admin'), icon: <Database size={20} />, roles: ['admin'] },
    ];

    const visibleItems = menuItems.filter(item => item.roles.includes(userRole));

    return (
        <>
            {/* 1. Toggle Button - Only show when sidebar is closed */}
            {!isOpen && (
                <button
                    onClick={toggleSidebar}
                    className="fixed top-3 left-3 z-[60] p-2 bg-slate-800/80 hover:bg-blue-600 text-white text-invariant-white rounded-lg backdrop-blur-md border border-slate-700 shadow-lg transition-colors"
                    title="Mở Menu"
                >
                    <Menu size={24} />
                </button>
            )}

            {/* 2. Mobile Overlay Backdrop (Closes sidebar when clicked) */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
                    onClick={toggleSidebar}
                ></div>
            )}

            {/* 3. The Sidebar Container */}
            <div
                className={`fixed left-0 top-0 h-screen w-64 border-r border-white/5 flex flex-col z-50 transition-transform duration-300 ease-in-out bg-slate-900/95 backdrop-blur-xl shadow-[4px_0_24px_rgba(0,0,0,0.5)]
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Header */}
                <div className="h-16 flex items-center px-4 border-b border-white/5 gap-3">
                    {/* Toggle button inside header */}
                    <button
                        onClick={toggleSidebar}
                        className="p-2 bg-slate-800/80 hover:bg-blue-600 text-white text-invariant-white rounded-lg border border-slate-700 transition-colors flex-shrink-0"
                        title="Đóng Menu"
                    >
                        <X size={20} />
                    </button>

                    {/* Logo */}
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 animate-float flex-shrink-0">
                        <Leaf className="text-white" size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="font-bold text-lg text-white text-invariant-white block leading-tight">AirHanoi</span>
                        <span className="text-[10px] text-emerald-400 font-medium tracking-wider uppercase">Monitor System</span>
                    </div>
                </div>

                {/* Menu Items */}
                <nav className="flex-1 py-4 flex flex-col gap-1.5 px-3 overflow-y-auto custom-scrollbar">
                    {visibleItems.map((item, index) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                // On mobile, close sidebar after clicking an item
                                if (window.innerWidth < 1024) toggleSidebar();
                            }}
                            className={`flex items-center p-2.5 rounded-xl transition-all duration-300 group relative overflow-hidden
                                ${activeTab === item.id
                                    ? 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-white text-invariant-white shadow-inner border border-blue-500/30'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-white hover:text-invariant-white'
                                }`}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            {activeTab === item.id && (
                                <div className="absolute left-0 top-0 w-1 h-full bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]"></div>
                            )}
                            <span className={`flex-shrink-0 transition-transform duration-300 ${activeTab === item.id ? 'scale-110 text-blue-400' : ''}`}>{item.icon}</span>
                            <span className="ml-3 font-medium whitespace-nowrap">{item.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Footer Actions */}
                <div className="p-3 border-t border-white/5 space-y-1.5">
                    <button
                        onClick={() => {
                            setActiveTab('settings');
                            if (window.innerWidth < 1024) toggleSidebar();
                        }}
                        className={`flex items-center p-2.5 w-full rounded-xl transition-all duration-200 group
                            ${activeTab === 'settings'
                                ? 'bg-white/10 text-white text-invariant-white'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white hover:text-invariant-white'
                            }`}
                    >
                        <Settings size={20} />
                        <span className="ml-3 font-medium">{language === 'en' ? 'Settings' : 'Cài đặt'}</span>
                    </button>

                    <button
                        onClick={onLogout}
                        className="flex items-center p-2.5 w-full rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all group"
                    >
                        <LogOut size={20} />
                        <span className="ml-3 font-medium">{language === 'en' ? 'Logout' : 'Đăng Xuất'}</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;