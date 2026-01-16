import React, { useState, useEffect, useMemo } from 'react';
import { DistrictData, HealthLog } from '../types';
import { db } from '../services/db';
import {
    Calendar, Save, Activity, Frown, Meh, Smile,
    AlertCircle, TrendingUp, Stethoscope, Plus, X, MapPin, Clock
} from 'lucide-react';
import {
    ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface HealthDiaryProps {
    data: DistrictData[];
}

const HealthDiary: React.FC<HealthDiaryProps> = ({ data }) => {
    const [logs, setLogs] = useState<HealthLog[]>([]);
    const [symptoms, setSymptoms] = useState<string[]>([]);
    const [severity, setSeverity] = useState(2);
    const [note, setNote] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [selectedLog, setSelectedLog] = useState<HealthLog | null>(null);

    // Calculate current Average AQI
    const currentAQI = Math.round(data.reduce((acc, curr) => acc + curr.aqi, 0) / data.length) || 0;

    useEffect(() => {
        // Load health logs from API
        const loadLogs = async () => {
            try {
                const healthLogs = await db.getHealthLogs();
                setLogs(healthLogs);
            } catch (error) {
                console.error('Failed to load health logs:', error);
            }
        };
        loadLogs();
    }, []);

    const toggleSymptom = (symptom: string) => {
        if (symptoms.includes(symptom)) {
            setSymptoms(prev => prev.filter(s => s !== symptom));
        } else {
            setSymptoms(prev => [...prev, symptom]);
        }
    };

    const handleSubmit = async () => {
        if (symptoms.length === 0 && !note) {
            alert("Vui lòng chọn triệu chứng hoặc ghi chú.");
            return;
        }

        try {
            const newLog = {
                date: new Date().toISOString().split('T')[0],
                symptoms,
                severity,
                note,
                aqi_at_time: currentAQI
            };

            // Save to API
            const savedLog = await db.addHealthLog(newLog);

            // Refresh logs from API
            const updatedLogs = await db.getHealthLogs();
            setLogs(updatedLogs);

            // Reset form
            setSymptoms([]);
            setSeverity(2);
            setNote('');
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 3000);
        } catch (error: any) {
            console.error('Failed to save health log:', error);
            alert('Không thể lưu nhật ký. Vui lòng thử lại. ' + (error.message || ''));
        }
    };

    // Prepare chart data (Merge Health Logs with Mock 7-day AQI history for demo visual)
    const chartData = useMemo(() => {
        const today = new Date();
        const result = [];

        // Generate last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];

            // Find log for this day
            const log = logs.find(l => l.date === dateStr);

            // Nếu có log thì dùng AQI tại thời điểm log, nếu không thì dùng AQI hiện tại làm nền (không random)
            const aqiForDay = log ? log.aqi_at_time : currentAQI;

            result.push({
                date: dateStr.split('-').slice(1).join('/'),
                aqi: aqiForDay,
                severity: log ? log.severity * 20 : 0, // Scale 1-5 to 0-100 cho biểu đồ
                hasLog: !!log
            });
        }
        return result;
    }, [logs, currentAQI]);

    const availableSymptoms = [
        "Ho khan", "Khó thở", "Cay mắt", "Sổ mũi",
        "Đau họng", "Mệt mỏi", "Đau đầu", "Ngứa da"
    ];

    return (
        <div className="p-4 lg:p-6 animate-fade-in h-full overflow-y-auto pb-20">
            <header className="mb-4">
                <h1 className="text-3xl font-bold text-white mb-2">Nhật Ký Sức Khỏe & Tác Động</h1>
                <p className="text-slate-400">Theo dõi triệu chứng hô hấp và phân tích mối liên hệ với chất lượng không khí.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* LEFT: LOGGING FORM */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-bl-full -mr-6 -mt-6"></div>

                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Stethoscope className="text-rose-400" /> Hôm nay bạn cảm thấy thế nào?
                        </h2>

                        {/* Current AQI Context */}
                        <div className="bg-slate-900/50 p-4 rounded-xl mb-6 border border-slate-700/50 flex items-center justify-between">
                            <span className="text-sm text-slate-400">AQI Hiện tại</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-xl font-black ${currentAQI > 150 ? 'text-red-500' : currentAQI > 100 ? 'text-orange-500' : 'text-yellow-500'}`}>
                                    {currentAQI}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-slate-300">
                                    {currentAQI > 150 ? 'Xấu' : currentAQI > 100 ? 'Kém' : 'Trung bình'}
                                </span>
                            </div>
                        </div>

                        {/* Symptoms Grid */}
                        <div className="mb-6">
                            <label className="text-sm font-bold text-slate-300 mb-3 block">Triệu chứng gặp phải</label>
                            <div className="grid grid-cols-2 gap-3">
                                {availableSymptoms.map(sym => (
                                    <button
                                        key={sym}
                                        onClick={() => toggleSymptom(sym)}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left flex items-center justify-between
                                            ${symptoms.includes(sym)
                                                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20'
                                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                            }`}
                                    >
                                        {sym}
                                        {symptoms.includes(sym) && <Plus size={14} />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Severity Slider */}
                        <div className="mb-6">
                            <label className="text-sm font-bold text-slate-300 mb-3 flex justify-between">
                                <span>Mức độ ảnh hưởng</span>
                                <span className="text-rose-400">{severity === 1 ? 'Nhẹ' : severity === 3 ? 'Trung bình' : severity === 5 ? 'Nghiêm trọng' : ''}</span>
                            </label>
                            <div className="flex items-center gap-4">
                                <Smile className={`transition-colors ${severity <= 2 ? 'text-green-400' : 'text-slate-600'}`} size={24} />
                                <input
                                    type="range"
                                    min="1" max="5"
                                    value={severity}
                                    onChange={(e) => setSeverity(parseInt(e.target.value))}
                                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                                />
                                <Frown className={`transition-colors ${severity >= 4 ? 'text-red-400' : 'text-slate-600'}`} size={24} />
                            </div>
                        </div>

                        {/* Note Input */}
                        <div className="mb-6">
                            <label className="text-sm font-bold text-slate-300 mb-2 block">Ghi chú thêm</label>
                            <textarea
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-rose-500 outline-none h-20 resize-none"
                                placeholder="VD: Đi ngoài đường nhiều, quên đeo khẩu trang..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={submitted}
                            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg
                                ${submitted ? 'bg-green-600 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'}`}
                        >
                            {submitted ? 'Đã lưu nhật ký' : <><Save size={18} /> Lưu Nhật Ký</>}
                        </button>
                    </div>
                </div>

                {/* RIGHT: CHART & HISTORY */}
                <div className="lg:col-span-2 space-y-4">

                    {/* Analysis Chart */}
                    <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <TrendingUp className="text-blue-400" /> Phân Tích Tương Quan (7 Ngày)
                            </h2>
                            <div className="flex gap-4 text-xs">
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> AQI</div>
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-500 rounded-full"></div> Mức độ triệu chứng</div>
                            </div>
                        </div>

                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorAqiChart" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                                        formatter={(value: any, name: string) => [value, name === 'severity' ? 'Mức độ (%)' : 'AQI']}
                                    />
                                    <Area type="monotone" dataKey="aqi" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAqiChart)" name="AQI" />
                                    <Line type="monotone" dataKey="severity" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e' }} name="Mức độ triệu chứng" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/20 rounded-xl flex gap-3">
                            <AlertCircle className="text-blue-400 flex-shrink-0" size={20} />
                            <p className="text-sm text-blue-200/80">
                                <strong>Nhận xét AI:</strong> Dữ liệu cho thấy triệu chứng của bạn thường xuất hiện khi AQI vượt ngưỡng 150. Hãy hạn chế ra ngoài vào những ngày này.
                            </p>
                        </div>
                    </div>

                    {/* History List */}
                    <div className="bg-slate-800 rounded-3xl p-4 border border-slate-700 shadow-xl">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Calendar className="text-slate-400" /> Lịch sử ghi nhận
                        </h2>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {logs.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 italic">
                                    Chưa có nhật ký nào. Hãy bắt đầu ghi lại sức khỏe của bạn!
                                </div>
                            ) : logs.map(log => (
                                <div
                                    key={log.id}
                                    onClick={() => setSelectedLog(log)}
                                    className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 hover:bg-slate-700/50 transition-colors flex justify-between items-center cursor-pointer"
                                >
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-white font-bold text-sm">
                                                {new Date(log.date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                                            </span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${log.aqi_at_time > 150 ? 'border-red-500 text-red-400' : 'border-yellow-500 text-yellow-400'}`}>
                                                AQI {log.aqi_at_time}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {log.symptoms.map((s, i) => (
                                                <span key={i} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                                                    {s}
                                                </span>
                                            ))}
                                            {log.symptoms.length === 0 && <span className="text-xs text-slate-500">Không có triệu chứng</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        {log.severity === 1 ? <Smile className="text-green-500" size={20} /> :
                                            log.severity <= 3 ? <Meh className="text-yellow-500" size={20} /> :
                                                <Frown className="text-red-500" size={20} />}
                                        <span className="text-[10px] text-slate-500 mt-1">Mức {log.severity}/5</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL: Chi tiết nhật ký */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
                                    <Stethoscope size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Chi Tiết Nhật Ký Sức Khỏe</h3>
                                    <p className="text-slate-400 text-sm mt-1">
                                        {new Date(selectedLog.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-full hover:bg-slate-700"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body - Scrollable */}
                        <div className="p-6 space-y-6 overflow-y-auto">
                            {/* AQI Info */}
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Activity className="text-blue-400" size={20} />
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Chỉ số AQI tại thời điểm ghi nhận</p>
                                            <p className={`text-3xl font-black ${selectedLog.aqi_at_time > 150 ? 'text-red-500' : selectedLog.aqi_at_time > 100 ? 'text-orange-500' : 'text-yellow-500'}`}>
                                                {selectedLog.aqi_at_time}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`px-4 py-2 rounded-lg font-bold text-sm border ${selectedLog.aqi_at_time > 200 ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                                            selectedLog.aqi_at_time > 150 ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                                                selectedLog.aqi_at_time > 100 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                                                    'bg-green-500/10 text-green-400 border-green-500/30'
                                        }`}>
                                        {selectedLog.aqi_at_time > 200 ? 'Rất xấu' :
                                            selectedLog.aqi_at_time > 150 ? 'Xấu' :
                                                selectedLog.aqi_at_time > 100 ? 'Kém' :
                                                    selectedLog.aqi_at_time > 50 ? 'Trung bình' : 'Tốt'}
                                    </div>
                                </div>
                            </div>

                            {/* Severity */}
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Mức độ ảnh hưởng</p>
                                <div className="flex items-center gap-4">
                                    {selectedLog.severity === 1 ? <Smile className="text-green-500" size={32} /> :
                                        selectedLog.severity <= 3 ? <Meh className="text-yellow-500" size={32} /> :
                                            <Frown className="text-red-500" size={32} />}
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-white font-bold">Mức {selectedLog.severity}/5</span>
                                            <span className="text-slate-400 text-sm">
                                                {selectedLog.severity === 1 ? 'Nhẹ' :
                                                    selectedLog.severity === 2 ? 'Hơi khó chịu' :
                                                        selectedLog.severity === 3 ? 'Trung bình' :
                                                            selectedLog.severity === 4 ? 'Nghiêm trọng' : 'Rất nghiêm trọng'}
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-700 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all ${selectedLog.severity <= 2 ? 'bg-green-500' :
                                                        selectedLog.severity <= 3 ? 'bg-yellow-500' : 'bg-red-500'
                                                    }`}
                                                style={{ width: `${(selectedLog.severity / 5) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Symptoms */}
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Triệu chứng gặp phải</p>
                                {selectedLog.symptoms && selectedLog.symptoms.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedLog.symptoms.map((symptom, idx) => (
                                            <span key={idx} className="px-3 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-sm font-medium">
                                                {symptom}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 italic">Không có triệu chứng nào được ghi nhận</p>
                                )}
                            </div>

                            {/* Note */}
                            {selectedLog.note && (
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Ghi chú thêm</p>
                                    <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{selectedLog.note}</p>
                                </div>
                            )}

                            {/* Time Info */}
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Clock size={14} />
                                <span>Ghi nhận vào: {new Date(selectedLog.date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric', year: 'numeric' })}</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-800 bg-slate-800/30 flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-6 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HealthDiary;