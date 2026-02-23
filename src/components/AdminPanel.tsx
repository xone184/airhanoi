import React, { useState, useMemo, useEffect } from 'react';
import {
    Upload, FileText, CheckCircle, AlertCircle, Database,
    Lock, Activity, Server, Users, Clock, RefreshCw,
    Trash2, Download, Terminal, ChevronRight, BarChart2,
    ShieldAlert, Search, Filter, CheckSquare, Square, X, Check, Eye, MapPin,
    Image as ImageIcon, UserCog, Cpu, HardDrive, Wifi, Zap, Settings, Power, Code
} from 'lucide-react';
import { DistrictData, ForecastData, PollutionReport } from '../types';
import { db } from '../services/db';
import {
    PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, AreaChart, Area, CartesianGrid, LineChart, Line
} from 'recharts';

interface AdminPanelProps {
    onRealtimeDataLoaded: (data: DistrictData[]) => void;
    onForecastDataLoaded: (data: ForecastData[]) => void;
    reports: PollutionReport[];
    onUpdateReportStatus: (ids: number[], newStatus: 'verified' | 'rejected') => void;
    systemSettings: { maintenanceMode: boolean; refreshInterval: string };
    onSystemSettingsChange: (s: { maintenanceMode: boolean; refreshInterval: string }) => void;
}

interface FileInfo {
    type: string;
    label: string;
    status: string;
    lastUpdate: string;
}

type AdminUserRow = {
    id: number;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'banned';
    joined: string;
    auth_provider?: string; // 'system' | 'google' | 'facebook'
};

const AdminPanel: React.FC<AdminPanelProps> = ({
    onRealtimeDataLoaded,
    onForecastDataLoaded,
    reports,
    onUpdateReportStatus,
    systemSettings,
    onSystemSettingsChange
}) => {
    // Navigation State
    const [activeSection, setActiveSection] = useState<'dashboard' | 'users' | 'moderation' | 'data' | 'system'>('dashboard');

    // --- STATE: FILES ---
    const [files, setFiles] = useState<Record<string, FileInfo>>({
        "dim_aqi_level.csv": { type: 'dim', label: 'Cấu hình chỉ số AQI', status: 'missing', lastUpdate: '-' },
        "dim_district.csv": { type: 'dim', label: 'Danh mục Quận/Huyện', status: 'missing', lastUpdate: '-' },
        "fact_forecast.csv": { type: 'fact', label: 'Dữ liệu Dự báo (7 ngày)', status: 'missing', lastUpdate: '-' },
        "fact_realtime.csv": { type: 'fact', label: 'Dữ liệu Thời gian thực', status: 'missing', lastUpdate: '-' },
    });
    const [logs, setLogs] = useState([
        { id: 1, time: '10:42 AM', type: 'info', msg: 'System initialized successfully.' },
        { id: 2, time: '10:45 AM', type: 'success', msg: 'Connected to Open-Meteo API (Latency: 45ms).' },
        { id: 3, time: '10:46 AM', type: 'info', msg: 'Database integrity check passed.' },
        { id: 4, time: '11:00 AM', type: 'warning', msg: 'High traffic detected on map module.' },
    ]);

    // --- STATE: MODERATION ---
    const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]);
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
    const [filterDate, setFilterDate] = useState<string>('');
    const [viewingReport, setViewingReport] = useState<PollutionReport | null>(null);

    // --- STATE: USERS ---
    const [users, setUsers] = useState<AdminUserRow[]>([]);
    const [userLoadError, setUserLoadError] = useState<string | null>(null);
    const [userSearch, setUserSearch] = useState('');
    const [userFilterStatus, setUserFilterStatus] = useState<'all' | 'active' | 'banned'>('all');
    const [userFilterProvider, setUserFilterProvider] = useState<string>('all');
    const [userDateFrom, setUserDateFrom] = useState<string>('');
    const [userDateTo, setUserDateTo] = useState<string>('');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
    const [newUserForm, setNewUserForm] = useState<{ username: string; email: string; password: string; role: 'admin' | 'user' }>({
        username: '',
        email: '',
        password: '',
        role: 'user',
    });
    const [editUserForm, setEditUserForm] = useState<{ id: number; username: string; email: string; role: 'admin' | 'user' }>({
        id: 0,
        username: '',
        email: '',
        role: 'user',
    });
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; type: 'danger' | 'warning' | 'info' }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'info'
    });

    // Fetch users from backend (with filters)
    const loadUsers = React.useCallback(async (filters?: { auth_provider?: string; date_from?: string; date_to?: string }) => {
        try {
            const mapped = await db.getUsers(filters);
            setUsers(mapped);
            setUserLoadError(null);
        } catch (error: any) {
            console.error('Load users error:', error);
            setUserLoadError('Không thể tải danh sách người dùng từ CSDL');
        }
    }, []);

    React.useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // --- HANDLERS: FILES ---
    const addLog = (type: 'info' | 'success' | 'warning' | 'error', msg: string) => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLogs(prev => [{ id: Date.now(), time, type, msg }, ...prev]);
    };

    // --- STATE: SYSTEM SETTINGS (Maintenance & Refresh Interval) ---
    const [maintenanceMode, setMaintenanceMode] = useState<boolean>(systemSettings.maintenanceMode);
    const [refreshInterval, setRefreshInterval] = useState<string>(systemSettings.refreshInterval);

    useEffect(() => {
        setMaintenanceMode(systemSettings.maintenanceMode);
        setRefreshInterval(systemSettings.refreshInterval);
    }, [systemSettings]);

    const handleFileUpload = async (fileName: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            addLog('error', `File ${file.name} không đúng định dạng .csv`);
            return;
        }

        addLog('info', `Đang upload file ${fileName} lên server...`);

        try {
            // Xác định loại upload
            let uploadType = '';
            if (fileName === 'fact_realtime.csv') {
                uploadType = 'realtime';
            } else if (fileName === 'fact_forecast.csv') {
                uploadType = 'forecast';
            } else {
                addLog('info', `File ${fileName} không cần upload (dimension table)`);
                return;
            }

            // Upload file qua API
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost/hanoi-air-quality-monitor/api';
            const token = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).token : null;
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_BASE}/upload.php?type=${uploadType}`, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: formData
            });

            // Đọc thô response trước để tránh lỗi "Unexpected end of JSON input"
            const rawText = await response.text();
            if (!rawText || !rawText.trim()) {
                throw new Error('Server không trả dữ liệu JSON (response rỗng). Kiểm tra lại cấu hình PHP/XAMPP hoặc file CSV.');
            }

            let result: any;
            try {
                result = JSON.parse(rawText);
            } catch (parseErr) {
                console.error('Upload response không phải JSON hợp lệ:', rawText);
                throw new Error('Server trả dữ liệu không phải JSON hợp lệ. Chi tiết: ' + rawText.substring(0, 120));
            }

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            // Cập nhật UI
            setFiles(prev => ({
                ...prev,
                [fileName]: { ...prev[fileName], status: 'uploaded', lastUpdate: new Date().toLocaleString() }
            }));

            addLog('success', `Đã upload ${result.data.inserted || 0} dòng dữ liệu ${uploadType === 'realtime' ? 'Realtime' : 'Forecast'} vào database.`);

            if (result.data.errors && result.data.errors.length > 0) {
                addLog('warning', `${result.data.errors_count || 0} dòng có lỗi. Chi tiết: ${result.data.errors.join(', ')}`);
            }

            // Reload data từ API (sử dụng lại API_BASE đã khai báo ở trên)
            if (uploadType === 'realtime') {
                try {
                    const dataResponse = await fetch(`${API_BASE}/air_quality.php?type=realtime`);
                    const dataResult = await dataResponse.json();
                    if (dataResult.success && dataResult.data) {
                        onRealtimeDataLoaded(dataResult.data);
                    }
                } catch (err) {
                    console.error('Failed to reload realtime data:', err);
                }
            } else if (uploadType === 'forecast') {
                try {
                    const dataResponse = await fetch(`${API_BASE}/air_quality.php?type=forecast`);
                    const dataResult = await dataResponse.json();
                    if (dataResult.success && dataResult.data) {
                        onForecastDataLoaded(dataResult.data);
                    }
                } catch (err) {
                    console.error('Failed to reload forecast data:', err);
                }
            }

        } catch (err: any) {
            addLog('error', `Lỗi upload file ${fileName}: ${err.message || err}`);
            console.error('Upload error:', err);
        }
    };



    // --- HANDLERS: MODERATION ---
    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            const matchStatus = filterStatus === 'all' || r.status === filterStatus;
            const matchDate = !filterDate || r.created_at.startsWith(filterDate);
            return matchStatus && matchDate;
        }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [reports, filterStatus, filterDate]);

    const toggleSelectAll = () => {
        if (selectedReportIds.length === filteredReports.length) {
            setSelectedReportIds([]);
        } else {
            setSelectedReportIds(filteredReports.map(r => r.report_id!).filter(id => id));
        }
    };

    const toggleSelectOne = (id: number) => {
        if (selectedReportIds.includes(id)) {
            setSelectedReportIds(prev => prev.filter(item => item !== id));
        } else {
            setSelectedReportIds(prev => [...prev, id]);
        }
    };

    const handleBulkAction = (action: 'verified' | 'rejected') => {
        if (selectedReportIds.length === 0) return;

        const actionText = action === 'verified' ? 'DUYỆT' : 'TỪ CHỐI';
        if (confirm(`Xác nhận ${actionText} ${selectedReportIds.length} báo cáo?`)) {
            onUpdateReportStatus(selectedReportIds, action);
            setSelectedReportIds([]);
            addLog('success', `Đã ${action === 'verified' ? 'duyệt' : 'từ chối'} ${selectedReportIds.length} báo cáo.`);
        }
    };

    const handleModalAction = (status: 'verified' | 'rejected') => {
        if (viewingReport && viewingReport.report_id) {
            const actionText = status === 'verified' ? 'DUYỆT' : 'TỪ CHỐI';
            if (!confirm(`Bạn có chắc chắn muốn ${actionText} báo cáo này không?`)) {
                return;
            }

            onUpdateReportStatus([viewingReport.report_id], status);
            addLog('success', `Đã ${status === 'verified' ? 'duyệt' : 'từ chối'} báo cáo #${viewingReport.report_id}.`);
            setViewingReport(null);
        }
    }

    // --- HANDLERS: USERS ---
    const openEditUserModal = (user: AdminUserRow) => {
        setEditUserForm({
            id: user.id,
            username: user.name,
            email: user.email,
            role: user.role as 'admin' | 'user',
        });
        setIsEditUserModalOpen(true);
    };

    const handleUpdateUser = async () => {
        if (!editUserForm.username || !editUserForm.email) {
            addLog('error', 'Vui lòng nhập đầy đủ thông tin');
            return;
        }

        try {
            // Update Info
            const updatedInfo = await db.updateUserInfo(editUserForm.id, editUserForm.username, editUserForm.email, editUserForm.role);

            // If role changed, we rely on updateUserInfo handling it, or we might need separate call if API splits it. 
            // Assuming updateUserInfo handles role as per db.ts definition.

            setUsers(prev => prev.map(u => (u.id === editUserForm.id ? updatedInfo : u)));
            setIsEditUserModalOpen(false);
            addLog('success', `Đã cập nhật thông tin user ID ${editUserForm.id}`);
        } catch (error: any) {
            console.error('Update user error:', error);
            addLog('error', `Lỗi cập nhật: ${error.message}`);
        }
    };

    const handleUserAction = async (id: number, action: 'ban' | 'activate') => {
        let actionMsg = action === 'ban' ? "KHÓA" : "MỞ KHÓA";

        setConfirmModal({
            isOpen: true,
            title: `Xác nhận ${actionMsg}`,
            message: `Bạn có chắc chắn muốn ${actionMsg} tài khoản này không?`,
            type: action === 'ban' ? 'warning' : 'info',
            onConfirm: async () => {
                try {
                    const updated = await db.updateUser(id, action);
                    setUsers(prev => prev.map(u => (u.id === id ? updated : u)));
                    addLog('success', `Đã ${action === 'ban' ? 'khóa' : 'mở khóa'} user ID ${id}`);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error: any) {
                    console.error('Update user error:', error);
                    addLog('error', 'Không thể cập nhật trạng thái người dùng');
                }
            }
        });
    };

    const handleCreateUser = async () => {
        const { username, email, password, role } = newUserForm;
        if (!username.trim() || !email.trim() || !password.trim()) {
            alert('Vui lòng nhập đầy đủ Username, Email và Mật khẩu.');
            return;
        }
        try {
            const created = await db.createUser({ username: username.trim(), email: email.trim(), password, role });
            setUsers(prev => [created, ...prev]);
            setIsUserModalOpen(false);
            setNewUserForm({ username: '', email: '', password: '', role: 'user' });
            addLog('success', `Đã tạo người dùng mới: ${created.name}`);
        } catch (error: any) {
            console.error('Create user error:', error);
            alert(error?.message || 'Không thể tạo người dùng mới.');
        }
    };

    const handleDeleteUser = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: "Xác nhận XÓA",
            message: "Bạn có chắc chắn muốn XÓA hoàn toàn người dùng này? Hành động này không thể hoàn tác.",
            type: 'danger',
            onConfirm: async () => {
                try {
                    await db.deleteUser(id);
                    setUsers(prev => prev.filter(u => u.id !== id));
                    addLog('warning', `Đã xóa người dùng ID ${id}`);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error: any) {
                    console.error('Delete user error:', error);
                    addLog('error', `Lỗi xóa người dùng: ${error.message}`);
                }
            }
        });
    };

    // --- COMPUTED ---
    const statusStats = useMemo(() => {
        const stats = { pending: 0, verified: 0, rejected: 0 };
        reports.forEach(r => {
            if (r.status === 'pending') stats.pending++;
            else if (r.status === 'verified') stats.verified++;
            else if (r.status === 'rejected') stats.rejected++;
        });
        return [
            { name: 'Chờ duyệt', value: stats.pending, color: '#facc15' },
            { name: 'Đã duyệt', value: stats.verified, color: '#22c55e' },
            { name: 'Từ chối', value: stats.rejected, color: '#ef4444' },
        ];
    }, [reports]);

    // Mock Traffic Data
    const trafficData = [
        { time: '00:00', users: 120, apiCalls: 450 },
        { time: '04:00', users: 80, apiCalls: 300 },
        { time: '08:00', users: 450, apiCalls: 1200 },
        { time: '12:00', users: 900, apiCalls: 2500 },
        { time: '16:00', users: 750, apiCalls: 2100 },
        { time: '20:00', users: 500, apiCalls: 1500 },
        { time: '23:59', users: 200, apiCalls: 600 },
    ];

    // --- HELPERS ---
    const parseRealtimeCSV = (csvText: string): DistrictData[] => {
        const lines = csvText.trim().split('\n');
        const data: DistrictData[] = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const cols = line.split(',');
            if (cols.length < 10) continue;
            data.push({
                datetime: cols[0],
                district: cols[1],
                latitude: parseFloat(cols[2]),
                longitude: parseFloat(cols[3]),
                pm25: parseFloat(cols[4]) || 0,
                pm10: parseFloat(cols[5]) || 0,
                temperature: parseFloat(cols[6]) || 0,
                humidity: parseFloat(cols[7]) || 0,
                aqi: parseInt(cols[8]) || 0,
                pollution_level: cols[9],
                aqi_color: cols[10]
            });
        }
        return data;
    };

    const parseForecastCSV = (csvText: string): ForecastData[] => {
        const lines = csvText.trim().split('\n');
        const data: ForecastData[] = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const cols = line.split(',');
            if (cols.length < 8) continue;
            data.push({
                datetime: cols[0],
                district: cols[1],
                latitude: parseFloat(cols[2]),
                longitude: parseFloat(cols[3]),
                pm25_forecast: parseFloat(cols[4]) || 0,
                aqi_forecast: parseInt(cols[5]) || 0,
                pollution_level_forecast: cols[6],
                aqi_color_forecast: cols[7],
                data_type: cols[8] || 'Dự báo'
            });
        }
        return data;
    };

    return (
        <div className="flex h-full animate-fade-in relative bg-slate-950">
            {/* --- ADMIN SIDEBAR --- */}
            <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col p-4 space-y-2 flex-shrink-0">
                <div className="mb-6 px-2">
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Lock className="text-blue-500" size={20} />
                        Admin Center
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">Trung tâm quản trị hệ thống</p>
                </div>

                <div className="space-y-1">
                    <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4">Tổng quan</p>
                    <NavButton id="dashboard" icon={<Activity size={18} />} label="Dashboard" active={activeSection} onClick={setActiveSection} />
                    <NavButton id="system" icon={<Server size={18} />} label="Hệ thống" active={activeSection} onClick={setActiveSection} />

                    <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4">Quản lý</p>
                    <NavButton id="users" icon={<Users size={18} />} label="Người dùng" active={activeSection} onClick={setActiveSection} />
                    <NavButton id="moderation" icon={<ShieldAlert size={18} />} label="Kiểm duyệt tin" active={activeSection} onClick={setActiveSection} badge={statusStats[0].value} />

                    <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4">Dữ liệu</p>
                    <NavButton id="data" icon={<Database size={18} />} label="Kho dữ liệu" active={activeSection} onClick={setActiveSection} />
                </div>
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex-1 p-4 lg:p-6 overflow-y-auto custom-scrollbar">

                {/* 1. DASHBOARD VIEW */}
                {activeSection === 'dashboard' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-2xl font-bold text-white">Tổng Quan Hệ Thống</h2>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-bold flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    System Online
                                </span>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard title="Tổng Báo Cáo" value={reports.length} icon={<FileText size={24} />} color="text-blue-400" bg="bg-blue-500/10" trend="+12% tuần này" />
                            <StatCard title="Chờ Duyệt" value={statusStats[0].value} icon={<Clock size={24} />} color="text-yellow-400" bg="bg-yellow-500/10" />
                            <StatCard title="Người Dùng" value={users.length} icon={<Users size={24} />} color="text-purple-400" bg="bg-purple-500/10" trend="+5 mới hôm nay" />
                            <StatCard title="API Requests" value="24.5k" icon={<Zap size={24} />} color="text-emerald-400" bg="bg-emerald-500/10" trend="99.9% Success" />
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Main Traffic Chart */}
                            <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <Activity size={18} className="text-blue-500" /> Traffic & Tải Hệ Thống
                                </h3>
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={trafficData}>
                                            <defs>
                                                <linearGradient id="colorApi" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                                            <Area type="monotone" dataKey="apiCalls" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorApi)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Server Health Mini-Widgets */}
                            <div className="space-y-4">
                                <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Server size={16} /> Server Resources
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-300 flex items-center gap-1"><Cpu size={12} /> CPU Usage</span>
                                                <span className="text-green-400 font-bold">12%</span>
                                            </div>
                                            <div className="w-full bg-slate-800 rounded-full h-1.5">
                                                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '12%' }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-300 flex items-center gap-1"><HardDrive size={12} /> RAM Usage</span>
                                                <span className="text-blue-400 font-bold">45%</span>
                                            </div>
                                            <div className="w-full bg-slate-800 rounded-full h-1.5">
                                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-300 flex items-center gap-1"><Database size={12} /> Disk Space</span>
                                                <span className="text-purple-400 font-bold">28%</span>
                                            </div>
                                            <div className="w-full bg-slate-800 rounded-full h-1.5">
                                                <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '28%' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg flex-1">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Tỷ lệ duyệt báo cáo</h3>
                                    <div className="h-40">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={statusStats} dataKey="value" innerRadius={40} outerRadius={60} paddingAngle={5}>
                                                    {statusStats.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex justify-center gap-4 text-xs">
                                        {statusStats.map((s, i) => (
                                            <div key={i} className="flex items-center gap-1">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                                                <span className="text-slate-300">{s.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. USER MANAGEMENT VIEW */}
                {activeSection === 'users' && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap justify-between items-start gap-3">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Quản Lý Người Dùng</h2>
                                <p className="text-slate-400 text-sm mt-1">
                                    {userLoadError ? userLoadError : `Đang hiển thị ${users.length} người dùng từ CSDL`}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Filter: Status */}
                                <div className="relative">
                                    <Filter className="absolute left-3 top-2.5 text-slate-500" size={14} />
                                    <select
                                        className="bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-7 text-white text-sm focus:border-blue-500 outline-none appearance-none cursor-pointer hover:bg-slate-800 transition-colors"
                                        value={userFilterStatus}
                                        onChange={(e) => setUserFilterStatus(e.target.value as any)}
                                    >
                                        <option value="all">Tất cả trạng thái</option>
                                        <option value="active">Hoạt động</option>
                                        <option value="banned">Đã khóa</option>
                                    </select>
                                </div>

                                {/* Filter: Login Type */}
                                <div className="relative">
                                    <Users className="absolute left-3 top-2.5 text-slate-500" size={14} />
                                    <select
                                        className="bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-7 text-white text-sm focus:border-blue-500 outline-none appearance-none cursor-pointer hover:bg-slate-800 transition-colors"
                                        value={userFilterProvider}
                                        onChange={(e) => {
                                            setUserFilterProvider(e.target.value);
                                            loadUsers({
                                                auth_provider: e.target.value,
                                                date_from: userDateFrom,
                                                date_to: userDateTo
                                            });
                                        }}
                                    >
                                        <option value="all">Tất cả loại TK</option>
                                        <option value="system">🏠 Tài khoản hệ thống</option>
                                        <option value="google">🔵 Tài khoản Google</option>
                                        <option value="facebook">📘 Tài khoản Facebook</option>
                                    </select>
                                </div>

                                {/* Filter: Date From */}
                                <div className="flex items-center gap-1">
                                    <span className="text-slate-500 text-xs">Từ:</span>
                                    <input
                                        type="date"
                                        className="bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-white text-sm focus:border-blue-500 outline-none cursor-pointer hover:bg-slate-800 transition-colors"
                                        value={userDateFrom}
                                        onChange={(e) => {
                                            setUserDateFrom(e.target.value);
                                            loadUsers({ auth_provider: userFilterProvider, date_from: e.target.value, date_to: userDateTo });
                                        }}
                                    />
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-slate-500 text-xs">Đến:</span>
                                    <input
                                        type="date"
                                        className="bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-white text-sm focus:border-blue-500 outline-none cursor-pointer hover:bg-slate-800 transition-colors"
                                        value={userDateTo}
                                        onChange={(e) => {
                                            setUserDateTo(e.target.value);
                                            loadUsers({ auth_provider: userFilterProvider, date_from: userDateFrom, date_to: e.target.value });
                                        }}
                                    />
                                </div>

                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
                                    <input
                                        type="text"
                                        className="bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-white text-sm focus:border-blue-500 outline-none w-52 transition-all"
                                        placeholder="Tìm theo tên hoặc email..."
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                    />
                                </div>

                                <button
                                    onClick={() => setIsUserModalOpen(true)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-invariant-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
                                >
                                    <Users size={16} /> Thêm người dùng
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
                            <table className="w-full text-left">
                                <thead className="bg-slate-950 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4">User Info</th>
                                        <th className="p-4">Loại đăng nhập</th>
                                        <th className="p-4">Role</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Joined Date</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {users
                                        .filter(u => {
                                            const matchSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
                                            const matchStatus = userFilterStatus === 'all' || u.status === userFilterStatus;
                                            return matchSearch && matchStatus;
                                        })
                                        .map(user => (
                                            <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                                                <td className="p-4 flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white text-sm">{user.name}</p>
                                                        <p className="text-xs text-slate-500">{user.email}</p>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {user.auth_provider === 'google' ? (
                                                        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 w-fit">
                                                            <svg width="12" height="12" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 8 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-4z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3 0 5.8 1.1 8 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C40.9 35.2 44 30 44 24c0-1.3-.1-2.7-.4-4z" /></svg>
                                                            Google
                                                        </span>
                                                    ) : user.auth_provider === 'facebook' ? (
                                                        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 w-fit">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                                            Facebook
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold bg-slate-700 text-slate-400 border border-slate-600 w-fit">
                                                            🏠 Hệ thống
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit ${user.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`}></span>
                                                        {user.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm text-slate-400">{user.joined}</td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {user.role !== 'admin' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleUserAction(user.id, user.status === 'active' ? 'ban' : 'activate')}
                                                                    className={`p-2 rounded-lg transition-colors ${user.status === 'active' ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-green-500/20 text-green-400'}`}
                                                                    title={user.status === 'active' ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                                                                >
                                                                    {user.status === 'active' ? <Lock size={16} /> : <CheckCircle size={16} />}
                                                                </button>
                                                                <button
                                                                    onClick={() => openEditUserModal(user)}
                                                                    className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                                                                    title="Chỉnh sửa thông tin"
                                                                >
                                                                    <UserCog size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteUser(user.id)}
                                                                    className="p-2 hover:bg-red-600/20 text-red-400 rounded-lg transition-colors"
                                                                    title="Xóa người dùng"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={user.role === 'admin' ? () => openEditUserModal(user) : undefined}
                                                            className={`p-2 rounded-lg transition-colors ${user.role === 'admin' ? 'hover:bg-purple-500/20 text-purple-400' : 'hover:bg-slate-700 text-slate-400 cursor-default'}`}
                                                            title="Thông tin chi tiết"
                                                        >
                                                            {user.role === 'admin' ? <UserCog size={16} /> : <Eye size={16} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td className="p-4 text-center text-slate-500 text-sm" colSpan={5}>
                                                {userLoadError ? userLoadError : 'Không có người dùng nào trong hệ thống.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. MODERATION VIEW */}
                {activeSection === 'moderation' && (
                    <div className="space-y-4 h-full flex flex-col">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Kiểm Duyệt Báo Cáo</h2>
                                <p className="text-slate-400 text-sm mt-1">Quản lý các tin báo từ người dùng</p>
                            </div>
                            <div className="flex gap-2">
                                {selectedReportIds.length > 0 && (
                                    <>
                                        <button
                                            onClick={() => handleBulkAction('verified')}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold flex items-center gap-2 text-sm transition-all animate-fade-in text-invariant-white"
                                        >
                                            <CheckCircle size={16} /> Duyệt ({selectedReportIds.length})
                                        </button>
                                        <button
                                            onClick={() => handleBulkAction('rejected')}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold flex items-center gap-2 text-sm transition-all animate-fade-in text-invariant-white"
                                        >
                                            <Trash2 size={16} /> Từ chối ({selectedReportIds.length})
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-wrap gap-4 items-center">
                            <div className="flex items-center gap-2 text-slate-300 text-sm">
                                <Filter size={16} /> <span className="font-bold">Bộ lọc:</span>
                            </div>
                            <select
                                className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                            >
                                <option value="all">Tất cả trạng thái</option>
                                <option value="pending">Chờ duyệt</option>
                                <option value="verified">Đã duyệt</option>
                                <option value="rejected">Đã từ chối</option>
                            </select>
                            <input
                                type="date"
                                className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                            {selectedReportIds.length > 0 && (
                                <span className="ml-auto text-sm text-blue-400 font-medium">
                                    Đang chọn {selectedReportIds.length} dòng
                                </span>
                            )}
                        </div>

                        {/* Table */}
                        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex-1 flex flex-col shadow-lg">
                            <div className="overflow-auto flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-950 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-4 border-b border-slate-800 w-12">
                                                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-white">
                                                    {selectedReportIds.length === filteredReports.length && filteredReports.length > 0
                                                        ? <CheckSquare size={20} className="text-blue-500" />
                                                        : <Square size={20} />}
                                                </button>
                                            </th>
                                            <th className="p-4 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase">Thời gian</th>
                                            <th className="p-4 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase">Khu vực</th>
                                            <th className="p-4 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase">Nội dung</th>
                                            <th className="p-4 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase">Trạng thái</th>
                                            <th className="p-4 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase text-right">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {filteredReports.length === 0 ? (
                                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">Không tìm thấy báo cáo nào.</td></tr>
                                        ) : filteredReports.map((r) => (
                                            <tr key={r.report_id} className={`hover:bg-slate-800/80 transition-colors ${selectedReportIds.includes(r.report_id!) ? 'bg-blue-900/10' : ''}`}>
                                                <td className="p-4">
                                                    <button onClick={() => toggleSelectOne(r.report_id!)} className="text-slate-400">
                                                        {selectedReportIds.includes(r.report_id!)
                                                            ? <CheckSquare size={20} className="text-blue-500" />
                                                            : <Square size={20} />}
                                                    </button>
                                                </td>
                                                <td className="p-4 text-sm text-slate-300 font-mono">
                                                    {new Date(r.created_at).toLocaleDateString('vi-VN')}<br />
                                                    {new Date(r.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="p-4 text-sm text-white font-medium">
                                                    {r.district}
                                                    <div className="text-xs text-slate-500 font-normal mt-0.5">{r.address}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded border mb-1 inline-block
                                                        ${r.type === 'burning' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                                                            r.type === 'construction' ? 'border-orange-500/30 text-orange-400 bg-orange-500/10' :
                                                                'border-blue-500/30 text-blue-400 bg-blue-500/10'}`}>
                                                        {r.type === 'other' ? (r.customType || 'Khác').toUpperCase() : r.type.toUpperCase()}
                                                    </span>
                                                    <p className="text-sm text-slate-300 line-clamp-2">{r.description}</p>
                                                </td>
                                                <td className="p-4">
                                                    {r.status === 'pending' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-bold"><Clock size={12} /> Chờ duyệt</span>}
                                                    {r.status === 'verified' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold"><CheckCircle size={12} /> Đã duyệt</span>}
                                                    {r.status === 'rejected' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold"><AlertCircle size={12} /> Từ chối</span>}
                                                </td>
                                                <td className="p-4 text-right space-x-2">
                                                    <button
                                                        onClick={() => setViewingReport(r)}
                                                        className="p-1.5 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors" title="Xem chi tiết"
                                                    >
                                                        <Eye size={16} />
                                                    </button>

                                                    {r.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => onUpdateReportStatus([r.report_id!], 'verified')}
                                                                className="p-1.5 rounded bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white transition-colors" title="Duyệt"
                                                            >
                                                                <Check size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => onUpdateReportStatus([r.report_id!], 'rejected')}
                                                                className="p-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition-colors" title="Từ chối"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-slate-900 p-3 text-xs text-slate-500 text-center border-t border-slate-800">
                                Hiển thị {filteredReports.length} kết quả
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. FILES & SYSTEM VIEW */}
                {activeSection === 'data' && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">Quản Lý Dữ Liệu Nguồn</h2>



                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-300">File CSV (Import)</h3>
                                {(Object.entries(files) as [string, FileInfo][]).map(([name, info]) => (
                                    <div key={name} className="bg-slate-900 rounded-xl p-4 border border-slate-800 hover:border-blue-500/30 transition-all flex justify-between items-center group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-blue-400 transition-colors">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-200 text-sm">{info.label}</p>
                                                <p className="text-xs text-slate-500 font-mono mt-1">{name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {info.status === 'uploaded' && <span className="text-xs text-green-500 font-bold flex items-center gap-1"><Check size={12} /> Updated</span>}
                                            <label className="cursor-pointer px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-invariant-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2">
                                                <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(name, e)} />
                                                <Upload size={14} /> Upload
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-slate-900 rounded-xl p-0 border border-slate-800 h-fit overflow-hidden flex flex-col">
                                <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-300 flex items-center gap-2">
                                        <Terminal size={16} /> System Logs
                                    </h3>
                                    <span className="text-xs text-slate-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Live</span>
                                </div>
                                <div className="space-y-0 max-h-[400px] overflow-y-auto custom-scrollbar p-0 bg-slate-950 font-mono text-xs">
                                    {logs.map(log => (
                                        <div key={log.id} className="p-3 border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors flex gap-3">
                                            <span className="text-slate-500 shrink-0 opacity-70">[{log.time}]</span>
                                            <span className={log.type === 'success' ? 'text-green-400' : log.type === 'error' ? 'text-red-400' : log.type === 'warning' ? 'text-yellow-400' : 'text-blue-300'}>
                                                {log.msg}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. SYSTEM SETTINGS */}
                {activeSection === 'system' && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">Cấu Hình Hệ Thống</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
                                        <Power size={20} />
                                    </div>
                                    <h3 className="font-bold text-white">Chế độ bảo trì</h3>
                                </div>
                                <p className="text-slate-400 text-sm mb-4">
                                    Khi bật, chỉ Admin mới có thể truy cập hệ thống. Người dùng sẽ thấy trang thông báo bảo trì.
                                </p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={async () => {
                                            const next = !maintenanceMode;
                                            if (!confirm(next ? 'Bật chế độ bảo trì?' : 'Tắt chế độ bảo trì?')) return;
                                            try {
                                                await db.updateSystemSettings({ maintenanceMode: next });
                                                setMaintenanceMode(next);
                                                onSystemSettingsChange({ maintenanceMode: next, refreshInterval });
                                                addLog(next ? 'warning' : 'success', next ? 'Đã bật chế độ bảo trì' : 'Đã tắt chế độ bảo trì');
                                                alert(next ? 'Đã bật chế độ bảo trì' : 'Đã tắt chế độ bảo trì');
                                            } catch (error: any) {
                                                console.error('Update maintenance error:', error);
                                                alert('Không thể cập nhật chế độ bảo trì');
                                            }
                                        }}
                                        className={`relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer ${maintenanceMode ? 'bg-red-500/70' : 'bg-slate-700'}`}
                                    >
                                        <span className={`inline-block w-6 h-6 transform bg-white rounded-full shadow transition duration-200 ease-in-out ${maintenanceMode ? 'translate-x-6' : 'translate-x-0'}`}></span>
                                    </button>
                                    <span className={`text-sm font-bold ${maintenanceMode ? 'text-red-400' : 'text-slate-500'}`}>
                                        {maintenanceMode ? 'Đang Bật' : 'Đang Tắt'}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                                        <RefreshCw size={20} />
                                    </div>
                                    <h3 className="font-bold text-white">Tần suất làm mới dữ liệu</h3>
                                </div>
                                <p className="text-slate-400 text-sm mb-4">
                                    Cấu hình khoảng thời gian tự động cập nhật dữ liệu từ các trạm quan trắc.
                                </p>
                                <select
                                    className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 w-full outline-none focus:border-blue-500"
                                    value={refreshInterval}
                                    onChange={async (e) => {
                                        const val = e.target.value;
                                        try {
                                            await db.updateSystemSettings({ refreshInterval: val });
                                            setRefreshInterval(val);
                                            onSystemSettingsChange({ maintenanceMode, refreshInterval: val });
                                            addLog('info', `Đã đổi tần suất làm mới: ${val}`);
                                            alert(`Đã đổi tần suất làm mới: ${val}`);
                                        } catch (error: any) {
                                            console.error('Update refresh interval error:', error);
                                            alert('Không thể cập nhật tần suất làm mới');
                                        }
                                    }}
                                >
                                    <option value="15m">Mỗi 15 phút (Mặc định)</option>
                                    <option value="30m">Mỗi 30 phút</option>
                                    <option value="60m">Mỗi 1 giờ</option>
                                    <option value="off">Tắt tự động cập nhật</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODAL: CREATE USER --- */}
            {isUserModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Thêm người dùng mới</h3>
                            <button
                                onClick={() => setIsUserModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Username</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                    value={newUserForm.username}
                                    onChange={(e) => setNewUserForm(f => ({ ...f, username: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                    value={newUserForm.email}
                                    onChange={(e) => setNewUserForm(f => ({ ...f, email: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Mật khẩu tạm</label>
                                <input
                                    type="password"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                    value={newUserForm.password}
                                    onChange={(e) => setNewUserForm(f => ({ ...f, password: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Quyền</label>
                                <select
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                    value={newUserForm.role}
                                    onChange={(e) => setNewUserForm(f => ({ ...f, role: e.target.value as 'admin' | 'user' }))}
                                >
                                    <option value="user">USER</option>
                                    <option value="admin">ADMIN</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsUserModalOpen(false)}
                                className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 text-sm font-semibold"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCreateUser}
                                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
                            >
                                Tạo người dùng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: REPORT DETAILS --- */}
            {viewingReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <FileText size={20} className="text-blue-400" /> Chi Tiết Báo Cáo #{viewingReport.report_id}
                                </h3>
                                <p className="text-slate-400 text-sm mt-1">{new Date(viewingReport.created_at).toLocaleString('vi-VN')}</p>
                            </div>
                            <button onClick={() => setViewingReport(null)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-full hover:bg-slate-700">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body - Scrollable */}
                        <div className="p-6 space-y-6 overflow-y-auto">
                            {/* Section 1: Reporter & Location */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                        <Users size={14} /> Người báo cáo
                                    </h4>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300">
                                            #{viewingReport.user_id}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">User ID: {viewingReport.user_id}</p>
                                            <p className="text-xs text-slate-500">Thành viên cộng đồng</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                        <MapPin size={14} /> Địa điểm
                                    </h4>
                                    <p className="text-blue-400 font-bold text-lg mb-1">{viewingReport.district}</p>
                                    <p className="text-slate-300 text-sm">{viewingReport.address}</p>
                                </div>
                            </div>

                            {/* Section 2: Report Content */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Nội dung phản ánh</h4>
                                <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className={`px-3 py-1 rounded-lg text-sm font-bold border
                                            ${viewingReport.type === 'burning' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                                                viewingReport.type === 'construction' ? 'border-orange-500/30 text-orange-400 bg-orange-500/10' :
                                                    'border-blue-500/30 text-blue-400 bg-blue-500/10'}`}>
                                            {viewingReport.type === 'other' ? (viewingReport.customType || 'Khác').toUpperCase() : viewingReport.type.toUpperCase()}
                                        </span>
                                        <span className={`px-3 py-1 rounded-lg text-sm font-bold border flex items-center gap-1
                                             ${viewingReport.status === 'verified' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                                                viewingReport.status === 'rejected' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                                                    'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'}`}>
                                            {viewingReport.status === 'pending' && <Clock size={14} />}
                                            {viewingReport.status === 'verified' && <CheckCircle size={14} />}
                                            {viewingReport.status === 'rejected' && <AlertCircle size={14} />}
                                            {viewingReport.status === 'pending' ? 'Chờ duyệt' : viewingReport.status === 'verified' ? 'Đã duyệt' : 'Đã từ chối'}
                                        </span>
                                    </div>
                                    <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                                        {viewingReport.description}
                                    </p>
                                </div>
                            </div>

                            {/* Section 3: Evidence (Mock) */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                    <ImageIcon size={14} /> Hình ảnh bằng chứng
                                </h4>
                                <div className="w-full h-48 bg-slate-800 rounded-xl border border-slate-700 border-dashed flex items-center justify-center flex-col gap-2">
                                    {viewingReport.image_url ? (
                                        <img
                                            src={(viewingReport.image_url.startsWith('http') ? viewingReport.image_url : (import.meta.env.VITE_API_BASE_URL || 'http://localhost/hanoi-air-quality-monitor/api').replace(/\/api\/?$/, '') + '/' + viewingReport.image_url)}
                                            alt="Evidence"
                                            className="h-full w-full object-contain rounded-xl"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Image+Not+Found';
                                            }}
                                        />
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-slate-500">
                                                <ImageIcon size={24} />
                                            </div>
                                            <p className="text-slate-500 text-sm">Người dùng không tải lên hình ảnh</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3 mt-auto">
                            {viewingReport.status === 'pending' ? (
                                <>
                                    <button
                                        onClick={() => handleModalAction('rejected')}
                                        className="px-5 py-2.5 rounded-xl bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white border border-red-600/20 font-bold transition-all flex items-center gap-2"
                                    >
                                        <X size={18} /> Từ chối
                                    </button>
                                    <button
                                        onClick={() => handleModalAction('verified')}
                                        className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-invariant-white shadow-lg shadow-green-900/20 font-bold transition-all flex items-center gap-2"
                                    >
                                        <Check size={18} /> Duyệt báo cáo
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setViewingReport(null)}
                                    className="px-5 py-2.5 rounded-xl bg-slate-700 text-white text-invariant-white hover:bg-slate-600 font-bold transition-all"
                                >
                                    Đóng cửa sổ
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* --- MODAL: EDIT USER --- */}
            {isEditUserModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Chỉnh sửa thông tin</h3>
                            <button
                                onClick={() => setIsEditUserModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Username</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                    value={editUserForm.username}
                                    onChange={(e) => setEditUserForm(f => ({ ...f, username: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                    value={editUserForm.email}
                                    onChange={(e) => setEditUserForm(f => ({ ...f, email: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Quyền hạn</label>
                                <select
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                    value={editUserForm.role}
                                    onChange={(e) => setEditUserForm(f => ({ ...f, role: e.target.value as 'admin' | 'user' }))}
                                >
                                    <option value="user">USER (Người dùng thường)</option>
                                    <option value="admin">ADMIN (Quản trị viên)</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsEditUserModalOpen(false)}
                                className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 text-sm font-semibold transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleUpdateUser}
                                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-900/20"
                            >
                                Lưu thay đổi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL: CONFIRMATION --- */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-scale-in">
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`p-3 rounded-full ${confirmModal.type === 'danger' ? 'bg-red-500/10 text-red-500' : confirmModal.type === 'warning' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                {confirmModal.type === 'danger' ? <ShieldAlert size={24} /> : confirmModal.type === 'warning' ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
                            </div>
                            <h3 className="text-lg font-bold text-white">{confirmModal.title}</h3>
                        </div>
                        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                            {confirmModal.message}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-bold transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className={`px-4 py-2 rounded-lg text-white text-sm font-bold transition-colors shadow-lg ${confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' : confirmModal.type === 'warning' ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'}`}
                            >
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const NavButton = ({ id, icon, label, active, onClick, badge }: any) => (
    <button
        onClick={() => onClick(id)}
        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all mb-1 group
            ${active === id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
    >
        <div className="flex items-center gap-3">
            <span className={active === id ? 'text-white' : 'text-slate-500 group-hover:text-white'}>{icon}</span>
            <span className="font-medium text-sm">{label}</span>
        </div>
        {badge && badge > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                {badge}
            </span>
        )}
    </button>
);

const StatCard = ({ title, value, icon, color, bg, trend }: any) => (
    <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-black text-white">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${bg} ${color}`}>
                {icon}
            </div>
        </div>
        {trend && (
            <p className={`text-xs font-medium ${trend.includes('+') || trend.includes('Success') ? 'text-green-400' : 'text-slate-500'}`}>
                {trend}
            </p>
        )}
    </div>
);

export default AdminPanel;