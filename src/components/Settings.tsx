import React, { useState, useEffect } from 'react';
import {
    Bell, Mail, Smartphone, MapPin, Save, ShieldAlert,
    Globe, Thermometer, Info, CheckCircle, AlertTriangle, Sun, Moon
} from 'lucide-react';
import { HANOI_DISTRICTS_RAW } from '../constants';
import { UserSettings } from '../types';
import { db } from '../services/db'; // Import DB

interface SettingsProps {
    onSettingsUpdated?: (s: UserSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ onSettingsUpdated }) => {
    const [settings, setSettings] = useState<UserSettings>({
        email: '',
        phone: '',
        alertDistrict: 'Ba Đình',
        alertThreshold: 150,
        enableEmailAlerts: true,
        enableSmsAlerts: false,
        language: 'vi',
        temperatureUnit: 'c',
        themeMode: 'dark'
    });

    const [isSaved, setIsSaved] = useState(false);
    const [errors, setErrors] = useState<{ email?: string, phone?: string }>({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Load settings from API on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const storedSettings = await db.getSettings();
                if (storedSettings) {
                    setSettings(storedSettings);
                }
                setLoadError(null);
            } catch (error: any) {
                console.error('Failed to load settings:', error);
                setLoadError('Không thể tải cài đặt. Vui lòng đăng nhập và thử lại.');
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleChange = async (field: keyof UserSettings, value: any) => {
        // Confirm on language or temperature unit change
        if (field === 'language') {
            const langName = value === 'vi' ? 'Tiếng Việt' : 'English';
            if (!window.confirm(`Đổi ngôn ngữ sang ${langName}?`)) return;

            // Update state and immediately notify parent
            const newSettings = { ...settings, [field]: value };
            setSettings(newSettings);
            if (onSettingsUpdated) {
                onSettingsUpdated(newSettings);
            }
            // Auto-save
            try { await db.saveSettings(newSettings); } catch (e) { console.error('Auto-save settings failed:', e); }
            return;
        }
        if (field === 'temperatureUnit') {
            const unitName = value === 'c' ? '°C' : '°F';
            if (!window.confirm(`Đổi đơn vị nhiệt độ sang ${unitName}?`)) return;

            // Update state and immediately notify parent
            const newSettings = { ...settings, [field]: value };
            setSettings(newSettings);
            if (onSettingsUpdated) {
                onSettingsUpdated(newSettings);
            }
            // Auto-save
            try { await db.saveSettings(newSettings); } catch (e) { console.error('Auto-save settings failed:', e); }
            return;
        }
        if (field === 'themeMode') {
            const modeName = value === 'light' ? 'Sáng' : 'Tối';
            if (!window.confirm(`Đổi sang chế độ giao diện ${modeName}?`)) return;
            // Update state and immediately notify parent
            const newSettings = { ...settings, [field]: value };
            setSettings(newSettings);
            // Immediately propagate to App for instant theme change
            if (onSettingsUpdated) {
                onSettingsUpdated(newSettings);
            }

            try { await db.saveSettings(newSettings); } catch (e) { console.error('Auto-save settings failed:', e); }

            // Show success notification
            setTimeout(() => {
                alert(`Đã chuyển sang chế độ ${modeName} thành công!`);
            }, 100);
            return; // Early return since we already updated state
        }

        setSettings(prev => ({ ...prev, [field]: value }));
        setIsSaved(false);
        // Clear errors on change
        if (field === 'email' || field === 'phone') {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validate = () => {
        const newErrors: { email?: string, phone?: string } = {};
        let isValid = true;

        // Email validation
        if (settings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
            newErrors.email = 'Định dạng Email không hợp lệ.';
            isValid = false;
        }

        // VN Phone validation: 10 digits, starts with 0 or +84
        if (settings.phone && !/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(settings.phone)) {
            newErrors.phone = 'SĐT không hợp lệ (VN: 10 số, đầu 03/05/07/08/09).';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        setSaveError(null);

        try {
            // Save to API
            await db.saveSettings(settings);
            if (onSettingsUpdated) onSettingsUpdated(settings);

            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
            alert('Đã lưu cài đặt thành công.');
        } catch (error: any) {
            console.error('Failed to save settings:', error);
            setSaveError(error?.message || 'Không thể lưu cài đặt. Vui lòng thử lại.');
        }
    };

    const handleTestEmail = async () => {
        if (!settings.email) {
            alert('Vui lòng nhập Email trước khi gửi thử.');
            return;
        }
        if (!window.confirm(`Gửi email thử tới ${settings.email}?`)) return;
        try {
            await db.sendTestEmail({
                email: settings.email,
                subject: 'AirHanoi - Email thử nghiệm',
                message: 'Đây là email thử nghiệm từ AirHanoi. Nếu bạn nhận được, hệ thống gửi mail đã hoạt động.'
            });
            alert('Đã gửi email thử. Vui lòng kiểm tra hộp thư (và spam).');
        } catch (error: any) {
            console.error('Test email error:', error);
            alert(error?.message || 'Không thể gửi email thử. Kiểm tra cấu hình SMTP.');
        }
    };

    return (
        <div className="p-6 lg:p-10 animate-fade-in h-full overflow-y-auto pb-20">
            <header className="mb-8 border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Cài Đặt & Cảnh Báo</h1>
                <p className="text-slate-400">Đăng ký nhận tin cảnh báo ô nhiễm và cấu hình hệ thống</p>
                {loadError && (
                    <p className="text-red-400 text-sm mt-2">{loadError}</p>
                )}
                {loading && (
                    <p className="text-slate-400 text-sm mt-2">Đang tải cài đặt...</p>
                )}
                {isSaved && !saveError && (
                    <p className="text-emerald-400 text-sm mt-2 flex items-center gap-2">
                        <CheckCircle size={14} /> Đã lưu cài đặt thành công
                    </p>
                )}
                {saveError && (
                    <p className="text-red-400 text-sm mt-2">{saveError}</p>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Section 1: Alert Subscription (Registration) */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSave} className="bg-slate-800 rounded-2xl p-6 lg:p-8 border border-slate-700 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -mr-10 -mt-10 pointer-events-none"></div>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl">
                                <Bell size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Đăng Ký Cảnh Báo Tự Động</h2>
                                <p className="text-sm text-slate-400">Nhận thông báo khi chất lượng không khí vượt ngưỡng an toàn</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Personal Info */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Email nhận tin</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                                        <input
                                            type="email"
                                            className={`w-full bg-slate-900 border ${errors.email ? 'border-red-500' : 'border-slate-700'} rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all`}
                                            placeholder="example@email.com"
                                            value={settings.email}
                                            onChange={(e) => handleChange('email', e.target.value)}
                                        />
                                    </div>
                                    {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Số điện thoại (SMS)</label>
                                    <div className="relative">
                                        <Smartphone className="absolute left-3 top-3 text-slate-500" size={18} />
                                        <input
                                            type="tel"
                                            className={`w-full bg-slate-900 border ${errors.phone ? 'border-red-500' : 'border-slate-700'} rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all`}
                                            placeholder="+84 912 345 678"
                                            value={settings.phone}
                                            onChange={(e) => handleChange('phone', e.target.value)}
                                        />
                                    </div>
                                    {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                                </div>
                            </div>

                            {/* Preferences */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Khu vực theo dõi chính</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 text-slate-500" size={18} />
                                        <select
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none cursor-pointer"
                                            value={settings.alertDistrict}
                                            onChange={(e) => handleChange('alertDistrict', e.target.value)}
                                        >
                                            {HANOI_DISTRICTS_RAW.map(d => (
                                                <option key={d.name} value={d.name}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Gửi email khi AQI đạt mức:
                                    </label>
                                    {/* AQI Threshold Buttons */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleChange('alertThreshold', 100)}
                                            className={`p-3 rounded-lg border-2 text-left transition-all ${settings.alertThreshold === 100
                                                ? 'border-yellow-500 bg-yellow-500/20'
                                                : 'border-slate-700 bg-slate-900 hover:border-yellow-500/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                                <span className="font-bold text-white">AQI ≥ 100</span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">Trung bình - Cảnh báo sớm</p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleChange('alertThreshold', 150)}
                                            className={`p-3 rounded-lg border-2 text-left transition-all ${settings.alertThreshold === 150
                                                ? 'border-orange-500 bg-orange-500/20'
                                                : 'border-slate-700 bg-slate-900 hover:border-orange-500/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                                <span className="font-bold text-white">AQI ≥ 150</span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">Kém - Ảnh hưởng người nhạy cảm</p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleChange('alertThreshold', 200)}
                                            className={`p-3 rounded-lg border-2 text-left transition-all ${settings.alertThreshold === 200
                                                ? 'border-red-500 bg-red-500/20'
                                                : 'border-slate-700 bg-slate-900 hover:border-red-500/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                <span className="font-bold text-white">AQI ≥ 200</span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">Xấu - Hạn chế ra ngoài</p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleChange('alertThreshold', 300)}
                                            className={`p-3 rounded-lg border-2 text-left transition-all ${settings.alertThreshold === 300
                                                ? 'border-purple-500 bg-purple-500/20'
                                                : 'border-slate-700 bg-slate-900 hover:border-purple-500/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                                <span className="font-bold text-white">AQI ≥ 300</span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">Nguy hại - Chỉ cảnh báo khẩn cấp</p>
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                        <AlertTriangle size={12} />
                                        Email sẽ được gửi tự động khi AQI tại {settings.alertDistrict} vượt ngưỡng này
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 mb-6">
                            <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Kênh thông báo</h3>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${settings.enableEmailAlerts ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}`}>
                                        {settings.enableEmailAlerts && <CheckCircle size={14} className="text-white text-invariant-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={settings.enableEmailAlerts} onChange={(e) => handleChange('enableEmailAlerts', e.target.checked)} />
                                    <span className="text-slate-300 group-hover:text-white transition-colors">Email</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group opacity-50" title="Tính năng SMS đang phát triển">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${settings.enableSmsAlerts ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}`}>
                                        {settings.enableSmsAlerts && <CheckCircle size={14} className="text-white text-invariant-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={settings.enableSmsAlerts} onChange={(e) => handleChange('enableSmsAlerts', e.target.checked)} disabled />
                                    <span className="text-slate-300">SMS (sắp có)</span>
                                </label>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={handleTestEmail}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-invariant-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Mail size={16} />
                                    Gửi email thử
                                </button>
                            </div>
                            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                                <p className="text-xs text-emerald-300 flex items-start gap-2">
                                    <CheckCircle size={14} className="flex-shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Cách hoạt động:</strong> Khi AQI tại {settings.alertDistrict} đạt mức {settings.alertThreshold} trở lên,
                                        hệ thống sẽ tự động gửi email cảnh báo đến {settings.email || 'email của bạn'} kèm theo khuyến nghị sức khỏe.
                                    </span>
                                </p>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-invariant-white font-bold rounded-xl shadow-lg shadow-blue-900/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Save size={20} />
                            {loading ? 'Đang tải...' : isSaved ? 'Đã Lưu Thành Công!' : 'Lưu Đăng Ký'}
                        </button>
                    </form>
                </div>

                {/* Section 2: General Settings */}
                <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-600/20 text-purple-400 rounded-lg">
                            <Globe size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-white">Tùy Chỉnh Ứng Dụng</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Globe size={18} className="text-slate-400" />
                                <span className="text-slate-200">Ngôn ngữ</span>
                            </div>
                            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                                <button
                                    onClick={() => handleChange('language', 'vi')}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${settings.language === 'vi' ? 'bg-purple-600 text-white text-invariant-white shadow' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Tiếng Việt
                                </button>
                                <button
                                    onClick={() => handleChange('language', 'en')}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${settings.language === 'en' ? 'bg-purple-600 text-white text-invariant-white shadow' : 'text-slate-400 hover:text-white'}`}
                                >
                                    English
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Thermometer size={18} className="text-slate-400" />
                                <span className="text-slate-200">Đơn vị nhiệt độ</span>
                            </div>
                            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                                <button
                                    onClick={() => handleChange('temperatureUnit', 'c')}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${settings.temperatureUnit === 'c' ? 'bg-orange-600 text-white text-invariant-white shadow' : 'text-slate-400 hover:text-white'}`}
                                >
                                    °C
                                </button>
                                <button
                                    onClick={() => handleChange('temperatureUnit', 'f')}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${settings.temperatureUnit === 'f' ? 'bg-orange-600 text-white text-invariant-white shadow' : 'text-slate-400 hover:text-white'}`}
                                >
                                    °F
                                </button>
                            </div>
                        </div>

                        {/* Theme Mode Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                            <div className="flex items-center gap-3">
                                {settings.themeMode === 'dark' ? (
                                    <Moon size={18} className="text-slate-400" />
                                ) : (
                                    <Sun size={18} className="text-yellow-400" />
                                )}
                                <span className="text-slate-200">Chế độ giao diện</span>
                            </div>
                            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                                <button
                                    onClick={() => handleChange('themeMode', 'light')}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${settings.themeMode === 'light' ? 'bg-yellow-500 text-white text-invariant-white shadow' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <Sun size={12} /> Sáng
                                </button>
                                <button
                                    onClick={() => handleChange('themeMode', 'dark')}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${settings.themeMode === 'dark' ? 'bg-indigo-600 text-white text-invariant-white shadow' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <Moon size={12} /> Tối
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: System Info */}
                <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg">
                            <Info size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-white">Thông Tin Hệ Thống</h2>
                    </div>

                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between border-b border-slate-700/50 pb-3">
                            <span className="text-slate-400">Phiên bản ứng dụng</span>
                            <span className="text-white font-mono">v1.3.0 (DB Connected)</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-700/50 pb-3">
                            <span className="text-slate-400">Nguồn dữ liệu</span>
                            <span className="text-blue-400">Open-Meteo & Tomorrow.io</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-700/50 pb-3">
                            <span className="text-slate-400">Trạng thái API</span>
                            <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle size={12} /> Hoạt động
                            </span>
                        </div>
                        <div className="flex justify-between pt-1">
                            <span className="text-slate-400">Hỗ trợ kỹ thuật</span>
                            <span className="text-slate-200">support@airhanoi.vn</span>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="text-blue-300 flex-shrink-0 mt-0.5" size={16} />
                        <p className="text-xs text-blue-100/80 leading-relaxed">
                            Mọi thắc mắc vui lòng liên hệ: adairhanoi@gmail.com để được giải quyết
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;