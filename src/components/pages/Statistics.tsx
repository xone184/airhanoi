import React, { useState, useEffect, useRef } from 'react';
import {
    BarChart3, TrendingUp, Download, FileText, Table2,
    Calendar, AlertTriangle, Loader2, RefreshCw,
    PieChart, Brain, History, Sparkles, AlertCircle
} from 'lucide-react';
import { DistrictData } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartPie, Pie, Cell, LineChart, Line, Legend, ReferenceLine } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { aiService } from '../../services/aiService';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost/doan_airhanoi/api';

interface StatisticsProps {
    data: DistrictData[];
}

const AQI_COLORS: Record<string, string> = {
    'Tốt': '#10B981', 'Trung bình': '#F59E0B', 'Kém': '#F97316',
    'Xấu': '#EF4444', 'Rất xấu': '#8B5CF6', 'Nguy hại': '#DC2626',
};

const Statistics: React.FC<StatisticsProps> = ({ data }) => {
    const [overview, setOverview] = useState<any>(null);
    const [ranking, setRanking] = useState<any>(null);
    const [yearlyCompare, setYearlyCompare] = useState<any>(null);
    const [owmHistory, setOwmHistory] = useState<any>(null);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [days, setDays] = useState(30);
    const [exporting, setExporting] = useState(false);
    
    // AI Analysis states
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    
    // Compare Table state
    const [tableData, setTableData] = useState<any[]>([]);
    const [tableMode, setTableMode] = useState<'hour' | 'day' | 'month' | 'year'>('month');

    const reportRef = useRef<HTMLDivElement>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [ovRes, rankRes, yearlyRes, owm2024Res, owm2025Res] = await Promise.all([
                fetch(`${API_BASE}/data/statistics.php?type=overview&days=${days}`).then(r => r.json()),
                fetch(`${API_BASE}/data/statistics.php?type=ranking&days=${days}`).then(r => r.json()),
                fetch(`${API_BASE}/data/statistics.php?type=yearly_compare`).then(r => r.json()),
                fetch(`${API_BASE}/data/statistics.php?type=owm_history&year=2024`).then(r => r.json()),
                fetch(`${API_BASE}/data/statistics.php?type=owm_history&year=2025`).then(r => r.json()),
            ]);

            if (yearlyRes.success) {
                let pivot = yearlyRes.data.pivot || [];
                let years = yearlyRes.data.years || [];
                let summaries = yearlyRes.data.summaries || [];

                const mergeOwmData = (owmResData: any, year: number) => {
                    if (owmResData && owmResData.monthly && owmResData.monthly.length > 0) {
                        if (!years.includes(year)) years.push(year);
                        
                        pivot = pivot.map((p: any) => {
                            const mData = owmResData.monthly.find((m: any) => parseInt(m.month) === parseInt(p.month));
                            if (mData && mData.avg_aqi !== null) {
                                return { ...p, [`${year}_avg_aqi`]: mData.avg_aqi };
                            }
                            return p;
                        });

                        if (!summaries.find((s: any) => s.year === year)) {
                            const validMonths = owmResData.monthly.filter((m: any) => m.avg_aqi !== null);
                            if (validMonths.length > 0) {
                                const sumAqi = validMonths.reduce((sum: number, m: any) => sum + m.avg_aqi, 0);
                                summaries.push({
                                    year,
                                    avg_aqi: Math.round((sumAqi / validMonths.length) * 10) / 10,
                                    months_data: validMonths.length,
                                    source: 'OpenWeatherMap'
                                });
                            }
                        }
                    }
                };

                if (owm2024Res.success) mergeOwmData(owm2024Res.data, 2024);
                if (owm2025Res.success) mergeOwmData(owm2025Res.data, 2025);

                yearlyRes.data.pivot = pivot;
                yearlyRes.data.years = years.sort();
                yearlyRes.data.summaries = summaries.sort((a:any, b:any) => a.year - b.year);
                
                setYearlyCompare(yearlyRes.data);
            }

            if (ovRes.success) setOverview(ovRes.data);
            if (rankRes.success) setRanking(rankRes.data);
            if (owm2025Res.success) setOwmHistory(owm2025Res.data);
        } catch (err: any) {
            setError(err.message || 'Không thể tải dữ liệu thống kê');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [days]);

    useEffect(() => {
        const fetchTableData = async () => {
            try {
                const res = await fetch(`${API_BASE}/data/statistics.php?type=compare_table&mode=${tableMode}&days=${days}`).then(r => r.json());
                if (res.success) setTableData(res.data);
            } catch (e) {
                console.error(e);
            }
        };
        fetchTableData();
    }, [tableMode, days]);

    const handleGenerateAiAnalysis = async () => {
        if (!yearlyCompare || !owmHistory) return;
        setAnalyzing(true);
        try {
            const result = await aiService.analyzeYearlyTrend(yearlyCompare.summaries, owmHistory.monthly);
            setAiAnalysis(result);
        } catch (err) {
            console.error(err);
            setAiAnalysis('Không thể kết nối đến AI. Vui lòng thử lại sau.');
        } finally {
            setAnalyzing(false);
        }
    };

    const exportPDF = async () => {
        if (!reportRef.current) return;
        setExporting(true);
        try {
            const canvas = await html2canvas(reportRef.current, {
                scale: 2, backgroundColor: '#0f172a', useCORS: true,
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`AirHanoi_BaoCao_${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (err) {
            alert('Không thể xuất PDF.');
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="animate-spin text-blue-500 mr-3" size={32} />
                <span className="text-slate-400">Đang tải thống kê & phân tích...</span>
            </div>
        );
    }

    const ov = overview?.overview;
    const pieData = (overview?.aqi_distribution || []).map((d: any) => ({ 
        name: d.level_name, value: parseFloat(d.percentage), color: AQI_COLORS[d.level_name] || '#64748b' 
    }));

    const getAqiColorBg = (aqi: number) => {
        if (aqi <= 50) return 'bg-emerald-500/20 text-emerald-400';
        if (aqi <= 100) return 'bg-yellow-500/20 text-yellow-400';
        if (aqi <= 150) return 'bg-orange-500/20 text-orange-400';
        if (aqi <= 200) return 'bg-red-500/20 text-red-400';
        if (aqi <= 300) return 'bg-purple-500/20 text-purple-400';
        return 'bg-rose-700/20 text-rose-400';
    };

    return (
        <div className="p-6 lg:p-10 animate-fade-in h-full overflow-y-auto pb-20">
            {/* Header */}
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <BarChart3 className="text-blue-400" size={28} /> Thống Kê & Phân Tích AI
                    </h1>
                    <p className="text-slate-400">So sánh chất lượng không khí qua các năm và nhận định từ AI</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <select value={days} onChange={e => setDays(Number(e.target.value))}
                        className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm">
                        <option value={7}>7 ngày</option><option value={30}>30 ngày</option>
                        <option value={90}>90 ngày</option><option value={365}>1 năm</option>
                    </select>
                    <button onClick={fetchData} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700">
                        <RefreshCw size={18} />
                    </button>
                    <button onClick={exportPDF} disabled={exporting} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold">
                        {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                        Xuất Báo Cáo
                    </button>
                </div>
            </header>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-xl mb-6 flex items-center gap-2">
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            <div ref={reportRef}>
                {/* AI Analysis Section */}
                <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-2xl p-6 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Brain size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Sparkles className="text-amber-400" size={24} /> 
                                AI Chuyên Gia Nhận Định
                            </h3>
                            {!aiAnalysis && !analyzing && (
                                <button onClick={handleGenerateAiAnalysis} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                                    <Brain size={16} /> Phân tích ngay
                                </button>
                            )}
                        </div>
                        
                        {analyzing ? (
                            <div className="flex items-center gap-3 text-indigo-300 py-6">
                                <Loader2 className="animate-spin" size={24} />
                                <p className="animate-pulse">AI đang phân tích dữ liệu so sánh các năm và dữ liệu vệ tinh OpenWeatherMap...</p>
                            </div>
                        ) : aiAnalysis ? (
                            <div className="bg-slate-900/60 p-5 rounded-xl border border-indigo-500/20 backdrop-blur-sm">
                                <p className="text-slate-200 leading-relaxed whitespace-pre-line text-lg">{aiAnalysis}</p>
                                <div className="mt-4 flex justify-end">
                                    <button onClick={handleGenerateAiAnalysis} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                        <RefreshCw size={12} /> Phân tích lại
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-400 py-2">Nhấn nút bên trên để AI tổng hợp dữ liệu lịch sử từ trạm đo và OpenWeatherMap, sau đó đưa ra dự báo xu hướng.</p>
                        )}
                    </div>
                </div>

                {/* KPI Cards */}
                {ov && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <KPICard icon={<BarChart3 size={20} />} label={`AQI TB (${days} ngày)`} value={ov.avg_aqi} color="blue" />
                        <KPICard icon={<TrendingUp size={20} />} label="PM2.5 TB" value={`${ov.avg_pm25} µg`} color="orange" />
                        <KPICard icon={<AlertTriangle size={20} />} label="Vượt ngưỡng" value={overview.threshold_violations} color="red" />
                        <KPICard icon={<Calendar size={20} />} label="Dữ liệu" value={`${ov.total_records} mẫu`} color="emerald" />
                    </div>
                )}

                {/* Xu hướng biến động AQI */}
                <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <History className="text-blue-400" size={20} /> 
                                So sánh xu hướng AQI theo thời gian
                            </h3>
                            <p className="text-slate-400 text-sm mt-1">Biểu đồ và bảng dữ liệu thể hiện mức độ ô nhiễm theo từng khoảng thời gian lựa chọn.</p>
                        </div>
                        <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
                            {(['hour', 'day', 'month', 'year'] as const).map(m => (
                                <button 
                                    key={m} 
                                    onClick={() => setTableMode(m)}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                                        tableMode === m 
                                        ? 'bg-blue-600 text-white shadow-lg' 
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                    }`}
                                >
                                    Theo {m === 'hour' ? 'Giờ' : m === 'day' ? 'Ngày' : m === 'month' ? 'Tháng' : 'Năm'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chart Area */}
                    <div className="mb-8">
                        {tableMode === 'month' ? (
                            <ResponsiveContainer width="100%" height={380}>
                                <LineChart data={yearlyCompare?.pivot || []} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="month" tickFormatter={(val) => `Tháng ${val}`} tick={{ fill: '#94a3b8' }} />
                                    <YAxis tick={{ fill: '#94a3b8' }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: 8 }} />
                                    <Legend wrapperStyle={{ paddingTop: 20 }} />
                                    <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Kém (100)', fill: '#f59e0b' }} />
                                    <ReferenceLine y={150} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Xấu (150)', fill: '#ef4444' }} />
                                    
                                    {yearlyCompare?.years?.map((year: number, i: number) => {
                                        const colors = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981', '#ec4899'];
                                        const isCurrentYear = year === new Date().getFullYear();
                                        return (
                                            <Line 
                                                key={year}
                                                type="monotone" 
                                                dataKey={`${year}_avg_aqi`} 
                                                name={`Năm ${year}`} 
                                                stroke={isCurrentYear ? '#3b82f6' : colors[i % colors.length]} 
                                                strokeWidth={isCurrentYear ? 3 : 2}
                                                dot={{ r: 4 }} activeDot={{ r: 7 }}
                                            />
                                        );
                                    })}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <ResponsiveContainer width="100%" height={380}>
                                <LineChart data={[...tableData].reverse()} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="period" tick={{ fill: '#94a3b8' }} />
                                    <YAxis tick={{ fill: '#94a3b8' }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: 8 }} />
                                    <Legend wrapperStyle={{ paddingTop: 20 }} />
                                    <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Kém (100)', fill: '#f59e0b' }} />
                                    <ReferenceLine y={150} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Xấu (150)', fill: '#ef4444' }} />
                                    
                                    <Line 
                                        type="monotone" 
                                        dataKey="avg_aqi" 
                                        name="AQI Trung bình" 
                                        stroke="#3b82f6" 
                                        strokeWidth={3}
                                        dot={{ r: 3 }} activeDot={{ r: 6 }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="avg_pm25" 
                                        name="PM2.5 (µg/m³)" 
                                        stroke="#f59e0b" 
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Table Area */}
                    <div className="overflow-x-auto border border-slate-700 rounded-xl">
                        <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
                            <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase border-b border-slate-700">
                                <tr>
                                    <th className="px-4 py-3">Thời Gian</th>
                                    <th className="px-4 py-3">AQI (TB)</th>
                                    <th className="px-4 py-3">PM2.5 (TB)</th>
                                    <th className="px-4 py-3">AQI Cao nhất</th>
                                    <th className="px-4 py-3">AQI Thấp nhất</th>
                                    <th className="px-4 py-3 text-right">Số Mẫu Đo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {tableData.length > 0 ? tableData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-white">{row.period}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold border border-current border-opacity-20 ${getAqiColorBg(row.avg_aqi)}`}>
                                                {row.avg_aqi}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{row.avg_pm25} µg</td>
                                        <td className="px-4 py-3 text-red-400">{row.max_aqi}</td>
                                        <td className="px-4 py-3 text-emerald-400">{row.min_aqi}</td>
                                        <td className="px-4 py-3 text-slate-500 text-right">{row.total_records}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={6} className="text-center py-6 text-slate-500">Chưa có dữ liệu</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* OpenWeatherMap History */}
                {owmHistory?.monthly && owmHistory.monthly.length > 0 && (
                    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <BarChart3 className="text-cyan-400" size={20} /> 
                                    Dữ liệu đối chiếu vệ tinh OpenWeatherMap ({owmHistory.year})
                                </h3>
                                <p className="text-slate-400 text-sm mt-1">Dữ liệu diện rộng khu vực Hà Nội (Lat: {owmHistory.lat}, Lon: {owmHistory.lon})</p>
                            </div>
                            <div className="bg-slate-900 px-3 py-1 rounded-lg border border-slate-700 text-xs text-slate-400">
                                Nguồn: OpenWeather API
                            </div>
                        </div>

                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={owmHistory.monthly}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="month" tickFormatter={v => `T${v}`} tick={{ fill: '#94a3b8' }} />
                                <YAxis yAxisId="left" tick={{ fill: '#94a3b8' }} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#f59e0b' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: 8 }} />
                                <Legend />
                                <Bar yAxisId="left" dataKey="avg_aqi" name="AQI Ước tính" fill="#3b82f6" radius={[4,4,0,0]} />
                                <Bar yAxisId="right" dataKey="avg_pm25" name="PM2.5 (µg/m³)" fill="#f59e0b" radius={[4,4,0,0]} />
                            </BarChart>
                        </ResponsiveContainer>

                        {owmHistory.monthly.every((m:any) => m.avg_aqi === null) && (
                            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex gap-3 text-yellow-200 text-sm">
                                <AlertCircle size={20} className="shrink-0" />
                                <p>Chưa có dữ liệu từ OpenWeatherMap. Nguyên nhân có thể do API Key chưa kích hoạt gói History, hoặc chưa cấu hình đúng `VITE_OWM_API_KEY` trong file `.env`.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* AQI Distribution Pie & Current Ranking */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <PieChart size={18} className="text-purple-400" /> Phân bố mức AQI ({days} ngày)
                        </h3>
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <RechartPie>
                                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                                        {pieData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip formatter={(v: number) => `${v}%`} />
                                </RechartPie>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-slate-500 text-center py-10">Không có dữ liệu</p>
                        )}
                    </div>

                    {ranking?.most_polluted && (
                        <RankingTable title="🔴 Top 5 Quận Ô Nhiễm Nhất" data={ranking.most_polluted} colorScheme="red" />
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Sub-components ---
function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: any; color: string }) {
    const colors: Record<string, string> = {
        blue: 'from-blue-600/20 to-cyan-600/10 border-blue-500/30 text-blue-400',
        orange: 'from-orange-600/20 to-yellow-600/10 border-orange-500/30 text-orange-400',
        red: 'from-red-600/20 to-pink-600/10 border-red-500/30 text-red-400',
        emerald: 'from-emerald-600/20 to-teal-600/10 border-emerald-500/30 text-emerald-400',
    };
    return (
        <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5 relative overflow-hidden`}>
            <div className="flex items-center gap-2 mb-2 text-slate-400 text-sm">{icon} {label}</div>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    );
}

function RankingTable({ title, data, colorScheme }: { title: string; data: any[]; colorScheme: 'red' | 'green' }) {
    const borderColor = colorScheme === 'red' ? 'border-red-500/30' : 'border-emerald-500/30';
    return (
        <div className={`bg-slate-800 rounded-2xl p-6 border ${borderColor} flex flex-col`}>
            <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                {data.map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl">
                        <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">{i + 1}</span>
                            <div>
                                <p className="text-white font-medium text-sm">{d.district}</p>
                                <p className="text-xs text-slate-500">PM2.5: {d.avg_pm25}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-white">{d.avg_aqi}</p>
                            <p className="text-xs" style={{ color: d.color_code }}>{d.dominant_level}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Statistics;
