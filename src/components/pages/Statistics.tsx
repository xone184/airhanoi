import React, { useState, useEffect, useRef } from 'react';
import {
    BarChart3, TrendingUp, TrendingDown, Download, FileText, Table2,
    Calendar, MapPin, AlertTriangle, CheckCircle, Loader2, RefreshCw,
    ArrowUpRight, ArrowDownRight, Minus, PieChart
} from 'lucide-react';
import { DistrictData } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartPie, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost/doan_airhanoi/api';

interface StatisticsProps {
    data: DistrictData[];
}

// AQI color palette
const AQI_COLORS: Record<string, string> = {
    'Tốt': '#10B981',
    'Trung bình': '#F59E0B',
    'Kém': '#F97316',
    'Xấu': '#EF4444',
    'Rất xấu': '#8B5CF6',
    'Nguy hại': '#DC2626',
};

const Statistics: React.FC<StatisticsProps> = ({ data }) => {
    const [overview, setOverview] = useState<any>(null);
    const [ranking, setRanking] = useState<any>(null);
    const [monthly, setMonthly] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [days, setDays] = useState(30);
    const [exporting, setExporting] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [ovRes, rankRes, monthRes] = await Promise.all([
                fetch(`${API_BASE}/data/statistics.php?type=overview&days=${days}`).then(r => r.json()),
                fetch(`${API_BASE}/data/statistics.php?type=ranking&days=${days}`).then(r => r.json()),
                fetch(`${API_BASE}/data/statistics.php?type=monthly`).then(r => r.json()),
            ]);

            if (ovRes.success) setOverview(ovRes.data);
            if (rankRes.success) setRanking(rankRes.data);
            if (monthRes.success) setMonthly(monthRes.data);
        } catch (err: any) {
            setError(err.message || 'Không thể tải dữ liệu thống kê');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [days]);

    // --- EXPORT PDF ---
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
            pdf.save(`AirHanoi_ThongKe_${days}ngay_${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (err) {
            console.error('Export PDF error:', err);
            alert('Không thể xuất PDF. Vui lòng thử lại.');
        } finally {
            setExporting(false);
        }
    };

    // --- EXPORT CSV ---
    const exportCSV = () => {
        if (!ranking?.all_districts) return;
        const headers = 'Quận/Huyện,AQI TB,PM2.5 TB,AQI Max,AQI Min,Mức độ\n';
        const rows = ranking.all_districts.map((d: any) =>
            `"${d.district}",${d.avg_aqi},${d.avg_pm25},${d.max_aqi},${d.min_aqi},"${d.dominant_level}"`
        ).join('\n');
        const blob = new Blob(['\ufeff' + headers + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AirHanoi_XepHang_${days}ngay.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="animate-spin text-blue-500 mr-3" size={32} />
                <span className="text-slate-400">Đang tải thống kê...</span>
            </div>
        );
    }

    const ov = overview?.overview;
    const dist = overview?.aqi_distribution || [];
    const pieData = dist.map((d: any) => ({ name: d.level_name, value: parseFloat(d.percentage), color: AQI_COLORS[d.level_name] || '#64748b' }));

    return (
        <div className="p-6 lg:p-10 animate-fade-in h-full overflow-y-auto pb-20">
            {/* Header */}
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <BarChart3 className="text-blue-400" size={28} /> Thống Kê & Báo Cáo
                    </h1>
                    <p className="text-slate-400">Phân tích tổng hợp chất lượng không khí Hà Nội</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Period selector */}
                    <select value={days} onChange={e => setDays(Number(e.target.value))}
                        className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm">
                        <option value={7}>7 ngày</option>
                        <option value={30}>30 ngày</option>
                        <option value={90}>90 ngày</option>
                        <option value={180}>6 tháng</option>
                        <option value={365}>1 năm</option>
                    </select>
                    <button onClick={fetchData} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors" title="Làm mới">
                        <RefreshCw size={18} />
                    </button>
                    <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-invariant-white rounded-lg text-sm font-bold transition-colors">
                        <Table2 size={16} /> Xuất CSV
                    </button>
                    <button onClick={exportPDF} disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 text-white text-invariant-white rounded-lg text-sm font-bold transition-colors">
                        {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                        {exporting ? 'Đang xuất...' : 'Xuất PDF'}
                    </button>
                </div>
            </header>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-xl mb-6 flex items-center gap-2">
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Printable report area */}
            <div ref={reportRef}>
                {/* KPI Cards */}
                {ov && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <KPICard icon={<BarChart3 size={20} />} label="AQI Trung bình" value={ov.avg_aqi} color="blue"
                            sub={`Min: ${ov.min_aqi} / Max: ${ov.max_aqi}`} />
                        <KPICard icon={<TrendingUp size={20} />} label="PM2.5 TB" value={`${ov.avg_pm25} µg/m³`} color="orange" sub={`PM10 TB: ${ov.avg_pm10}`} />
                        <KPICard icon={<AlertTriangle size={20} />} label="Lần vượt ngưỡng" value={overview.threshold_violations} color="red"
                            sub={`AQI ≥ 150 trong ${days} ngày`} />
                        <KPICard icon={<Calendar size={20} />} label="Dữ liệu" value={`${ov.total_days} ngày`} color="emerald"
                            sub={`${ov.total_records} bản ghi`} />
                    </div>
                )}

                {/* Charts row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* AQI Distribution Pie */}
                    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <PieChart size={18} className="text-purple-400" /> Phân bố mức AQI
                        </h3>
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <RechartPie>
                                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                                        {pieData.map((entry: any, i: number) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: number) => `${v}%`} />
                                </RechartPie>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-slate-500 text-center py-10">Không có dữ liệu</p>
                        )}
                    </div>

                    {/* Monthly trend */}
                    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <TrendingUp size={18} className="text-cyan-400" /> Xu hướng AQI theo tháng
                        </h3>
                        {monthly.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={[...monthly].reverse()}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="avg_aqi" stroke="#3b82f6" strokeWidth={2} name="AQI TB" dot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="avg_pm25" stroke="#f59e0b" strokeWidth={2} name="PM2.5 TB" dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-slate-500 text-center py-10">Không có dữ liệu</p>
                        )}
                    </div>
                </div>

                {/* Ranking Tables */}
                {ranking && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <RankingTable title="🔴 Top 5 Quận Ô Nhiễm Nhất" data={ranking.most_polluted} colorScheme="red" />
                        <RankingTable title="🟢 Top 5 Quận Sạch Nhất" data={ranking.cleanest} colorScheme="green" />
                    </div>
                )}

                {/* Full ranking bar chart */}
                {ranking?.all_districts && (
                    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-8">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <BarChart3 size={18} className="text-blue-400" /> AQI Trung bình theo Quận ({days} ngày)
                        </h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={ranking.all_districts} layout="vertical" margin={{ left: 80 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <YAxis dataKey="district" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={90} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }} />
                                <Bar dataKey="avg_aqi" name="AQI TB" radius={[0, 4, 4, 0]}>
                                    {ranking.all_districts.map((entry: any, i: number) => (
                                        <Cell key={i} fill={AQI_COLORS[entry.dominant_level] || '#64748b'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Sub-components ---

function KPICard({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: any; color: string; sub?: string }) {
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
            {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
    );
}

function RankingTable({ title, data, colorScheme }: { title: string; data: any[]; colorScheme: 'red' | 'green' }) {
    const borderColor = colorScheme === 'red' ? 'border-red-500/30' : 'border-emerald-500/30';
    return (
        <div className={`bg-slate-800 rounded-2xl p-6 border ${borderColor}`}>
            <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
            <div className="space-y-3">
                {data.map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl">
                        <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">{i + 1}</span>
                            <div>
                                <p className="text-white font-medium text-sm">{d.district}</p>
                                <p className="text-xs text-slate-500">PM2.5: {d.avg_pm25} µg/m³</p>
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
