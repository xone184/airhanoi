import React, { useMemo, useState, useEffect, memo } from 'react';
import { Wind, Droplets, Thermometer, Activity, MapPin, TrendingUp, ShieldCheck, AlertTriangle, Search, X, Sun, CloudRain, FileDown, Layers, ArrowUpRight, Facebook, Mail, Phone, Leaf, Heart } from 'lucide-react';
import { DistrictData, ForecastData } from '../types';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, AreaChart, Area, CartesianGrid, LabelList
} from 'recharts';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';

interface DashboardProps {
    data: DistrictData[];
    forecastData: ForecastData[];
    temperatureUnit?: string; // '°C' | '°F'
}

const Dashboard: React.FC<DashboardProps> = ({ data, forecastData, temperatureUnit = '°C' }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search input to prevent excessive re-renders
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Helper để đảm bảo số hợp lệ, tránh NaN
    const toSafeNumber = (value: any): number => {
        const n = parseFloat(value as any);
        return Number.isFinite(n) ? n : 0;
    };

    const parsedData = useMemo(
        () =>
            data.map(d => ({
                ...d,
                aqi: toSafeNumber(d.aqi as any),
                pm25: toSafeNumber(d.pm25 as any),
                temperature: toSafeNumber(d.temperature as any),
                humidity: toSafeNumber(d.humidity as any),
            })),
        [data]
    );

    // --- 1. Calculated Metrics ---
    const avgAQI = parsedData.length > 0 ? Math.round(parsedData.reduce((acc, curr) => acc + curr.aqi, 0) / parsedData.length) : 0;
    const avgPM25 = parsedData.length > 0 ? Math.round(parsedData.reduce((acc, curr) => acc + curr.pm25, 0) / parsedData.length) : 0;
    const avgTemp = parsedData.length > 0 ? Math.round(parsedData.reduce((acc, curr) => acc + curr.temperature, 0) / parsedData.length) : 0;
    const avgHum = parsedData.length > 0 ? Math.round(parsedData.reduce((acc, curr) => acc + curr.humidity, 0) / parsedData.length) : 0;

    // --- 2. Data Processing for Charts ---
    const sortedData = [...parsedData].sort((a, b) => b.aqi - a.aqi);
    const topPolluted = sortedData.slice(0, 5);
    const topCleanest = [...parsedData].sort((a, b) => a.aqi - b.aqi).slice(0, 5);

    const distributionData = useMemo(() => {
        const counts = { Good: 0, Moderate: 0, Unhealthy: 0, Hazardous: 0 };
        parsedData.forEach(d => {
            if (d.aqi <= 50) counts.Good++;
            else if (d.aqi <= 100) counts.Moderate++;
            else if (d.aqi <= 200) counts.Unhealthy++;
            else counts.Hazardous++;
        });
        return [
            { name: 'Tốt', value: counts.Good, color: '#00e400' },
            { name: 'Trung bình', value: counts.Moderate, color: '#ffff00' },
            { name: 'Kém/Xấu', value: counts.Unhealthy, color: '#ff7e00' },
            { name: 'Nguy hại', value: counts.Hazardous, color: '#7e0023' },
        ].filter(i => i.value > 0);
    }, [parsedData]);

    const forecastSummary = useMemo(() => {
        if (!forecastData || forecastData.length === 0) return [];
        const groups: Record<string, { total: number, count: number, rawDate: string }> = {};
        forecastData.forEach(f => {
            // Handle both ISO format and space-separated format
            const dateStr = f.datetime.includes('T') ? f.datetime.split('T')[0] : f.datetime.split(' ')[0];
            if (!groups[dateStr]) groups[dateStr] = { total: 0, count: 0, rawDate: dateStr };
            groups[dateStr].total += f.aqi_forecast;
            groups[dateStr].count++;
        });
        return Object.entries(groups)
            .map(([dateKey, val]) => ({
                rawDate: val.rawDate, // Keep for sorting
                date: new Date(val.rawDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                aqi: Math.round(val.total / val.count)
            }))
            .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime())
            .slice(0, 7);
    }, [forecastData]);

    // --- 3. Search Logic ---
    const [weatherData, setWeatherData] = useState<{ uvIndex: number; windSpeed: number; windDirection: number; rainProb: number } | null>(null);

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                // Hanoi coordinates: 21.0285, 105.8542
                const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=uv_index,wind_speed_10m,wind_direction_10m,precipitation&timezone=Asia%2FBangkok');
                const data = await res.json();
                if (data.current) {
                    setWeatherData({
                        uvIndex: data.current.uv_index,
                        windSpeed: data.current.wind_speed_10m,
                        windDirection: data.current.wind_direction_10m,
                        rainProb: data.current.precipitation
                    });
                }
            } catch (e) {
                console.error("Failed to fetch weather data", e);
            }
        };
        fetchWeather();
        // Refresh every 30 mins
        const interval = setInterval(fetchWeather, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const openWeatherPage = () => {
        window.open('https://www.accuweather.com/vi/vn/hanoi/353412/current-weather/353412', '_blank');
    };

    // Helper to get wind direction text
    const getWindDirection = (deg: number) => {
        const directions = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
        return directions[Math.round(deg / 45) % 8];
    };

    const searchResults = useMemo(() => {
        if (!debouncedSearch.trim()) return [];
        return parsedData.filter(d => d.district.toLowerCase().includes(debouncedSearch.toLowerCase()));
    }, [parsedData, debouncedSearch]);

    const getStatusColor = (aqi: number) => {
        if (aqi <= 50) return { text: 'text-green-400', bg: 'bg-green-500', border: 'border-green-500', gradient: 'from-green-500/20 to-emerald-500/5' };
        if (aqi <= 100) return { text: 'text-yellow-400', bg: 'bg-yellow-500', border: 'border-yellow-500', gradient: 'from-yellow-500/20 to-orange-500/5' };
        if (aqi <= 150) return { text: 'text-orange-400', bg: 'bg-orange-500', border: 'border-orange-500', gradient: 'from-orange-500/20 to-red-500/5' };
        return { text: 'text-red-500', bg: 'bg-red-500', border: 'border-red-500', gradient: 'from-red-600/20 to-rose-600/5' };
    };

    const status = getStatusColor(avgAQI);

    // Xuất báo cáo Word (.docx) chuyên nghiệp
    const handleDownloadReport = async () => {
        try {
            const today = new Date();
            const formattedDate = today.toLocaleDateString('vi-VN');

            // Lấy tối đa 30 khu vực, ưu tiên ô nhiễm nhất
            const rows = [...sortedData].slice(0, 30);

            // Thống kê nhanh theo mức độ ô nhiễm
            let countGood = 0, countModerate = 0, countUnhealthy = 0, countHazardous = 0;
            parsedData.forEach(d => {
                if (d.aqi <= 50) countGood++;
                else if (d.aqi <= 100) countModerate++;
                else if (d.aqi <= 200) countUnhealthy++;
                else countHazardous++;
            });

            const overallComment =
                avgAQI <= 50
                    ? 'Chất lượng không khí đang ở mức TỐT, phù hợp cho hầu hết các hoạt động ngoài trời.'
                    : avgAQI <= 100
                        ? 'Chất lượng không khí ở mức TRUNG BÌNH. Nhóm nhạy cảm nên hạn chế tiếp xúc kéo dài ngoài trời.'
                        : avgAQI <= 150
                            ? 'Chất lượng không khí ở mức KÉM. Người có bệnh hô hấp, tim mạch, người già và trẻ em nên hạn chế ra ngoài.'
                            : 'Chất lượng không khí ở mức CÓ HẠI. Khuyến cáo hạn chế tối đa các hoạt động ngoài trời, đặc biệt với nhóm nhạy cảm.';

            const doc = new Document({
                sections: [
                    {
                        properties: {},
                        children: [
                            new Paragraph({
                                alignment: 'center',
                                children: [
                                    new TextRun({
                                        text: 'BÁO CÁO CHẤT LƯỢNG KHÔNG KHÍ HÀ NỘI',
                                        bold: true,
                                        size: 28,
                                    }),
                                ],
                                spacing: { after: 200 },
                            }),
                            new Paragraph({
                                alignment: 'center',
                                children: [
                                    new TextRun({
                                        text: 'Hệ thống giám sát AirHanoi Monitor System',
                                        italics: true,
                                        size: 22,
                                    }),
                                ],
                                spacing: { after: 300 },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: `Ngày: ${formattedDate}`, size: 22 }),
                                ],
                                spacing: { after: 100 },
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `Số khu vực: ${parsedData.length} | AQI trung bình: ${avgAQI}`,
                                        size: 22,
                                    }),
                                ],
                                spacing: { after: 300 },
                            }),
                            new Paragraph({
                                spacing: { after: 200 },
                                children: [
                                    new TextRun({
                                        text: '1. TỔNG QUAN CHẤT LƯỢNG KHÔNG KHÍ',
                                        bold: true,
                                        size: 24,
                                    }),
                                ],
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: overallComment,
                                        size: 22,
                                    }),
                                ],
                                spacing: { after: 200 },
                            }),
                            new Paragraph({
                                spacing: { after: 150 },
                                children: [
                                    new TextRun({
                                        text: 'Phân bố số lượng khu vực theo mức độ AQI:',
                                        italics: true,
                                        size: 22,
                                    }),
                                ],
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: `- Tốt (0–50): ${countGood} khu vực`, size: 22 }),
                                ],
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: `- Trung bình (51–100): ${countModerate} khu vực`, size: 22 }),
                                ],
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: `- Kém/Xấu (101–200): ${countUnhealthy} khu vực`, size: 22 }),
                                ],
                            }),
                            new Paragraph({
                                spacing: { after: 300 },
                                children: [
                                    new TextRun({ text: `- Nguy hại (200+): ${countHazardous} khu vực`, size: 22 }),
                                ],
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: '2. BẢNG TỔNG HỢP CÁC KHU VỰC Ô NHIỄM CAO',
                                        italics: true,
                                        bold: true,
                                        size: 22,
                                    }),
                                ],
                                spacing: { after: 200 },
                            }),
                            new Table({
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                rows: [
                                    // Header row
                                    new TableRow({
                                        tableHeader: true,
                                        children: [
                                            new TableCell({
                                                children: [new Paragraph({ children: [new TextRun({ text: 'STT', bold: true })] })],
                                                width: { size: 8, type: WidthType.PERCENTAGE },
                                            }),
                                            new TableCell({
                                                children: [new Paragraph({ children: [new TextRun({ text: 'Quận/Huyện', bold: true })] })],
                                                width: { size: 32, type: WidthType.PERCENTAGE },
                                            }),
                                            new TableCell({
                                                children: [new Paragraph({ children: [new TextRun({ text: 'AQI', bold: true })] })],
                                                width: { size: 12, type: WidthType.PERCENTAGE },
                                            }),
                                            new TableCell({
                                                children: [new Paragraph({ children: [new TextRun({ text: 'PM2.5 (µg/m³)', bold: true })] })],
                                                width: { size: 18, type: WidthType.PERCENTAGE },
                                            }),
                                            new TableCell({
                                                children: [new Paragraph({ children: [new TextRun({ text: 'Trạng thái', bold: true })] })],
                                                width: { size: 30, type: WidthType.PERCENTAGE },
                                            }),
                                        ],
                                    }),
                                    // Data rows
                                    ...rows.map(
                                        (d, index) =>
                                            new TableRow({
                                                children: [
                                                    new TableCell({
                                                        children: [new Paragraph(String(index + 1))],
                                                    }),
                                                    new TableCell({
                                                        children: [new Paragraph(String(d.district))],
                                                    }),
                                                    new TableCell({
                                                        children: [new Paragraph(String(d.aqi))],
                                                    }),
                                                    new TableCell({
                                                        children: [new Paragraph(String(d.pm25))],
                                                    }),
                                                    new TableCell({
                                                        children: [new Paragraph(String(d.pollution_level || ''))],
                                                    }),
                                                ],
                                            })
                                    ),
                                ],
                            }),
                            new Paragraph({
                                spacing: { before: 300, after: 100 },
                                children: [
                                    new TextRun({
                                        text: '3. KHUYẾN NGHỊ',
                                        bold: true,
                                        size: 24,
                                    }),
                                ],
                            }),
                            new Paragraph({
                                bullet: { level: 0 },
                                children: [
                                    new TextRun({
                                        text: 'Theo dõi cảnh báo chất lượng không khí hằng ngày, đặc biệt tại các khu vực ô nhiễm cao.',
                                        size: 22,
                                    }),
                                ],
                            }),
                            new Paragraph({
                                bullet: { level: 0 },
                                children: [
                                    new TextRun({
                                        text: 'Khuyến nghị người dân sử dụng khẩu trang lọc bụi mịn khi ra ngoài trong các khung giờ cao điểm.',
                                        size: 22,
                                    }),
                                ],
                            }),
                            new Paragraph({
                                bullet: { level: 0 },
                                children: [
                                    new TextRun({
                                        text: 'Ưu tiên các hoạt động ngoài trời vào thời điểm AQI ở mức tốt/trung bình; hạn chế hoạt động mạnh khi AQI tăng cao.',
                                        size: 22,
                                    }),
                                ],
                            }),
                        ],
                    },
                ],
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `bao-cao-aqi-ha-noi-${today.toISOString().slice(0, 10)}.docx`);
        } catch (err: any) {
            console.error('Word export error:', err);
            const message = err?.message || err?.toString() || 'Lỗi không xác định';
            alert(`Không thể xuất báo cáo Word: ${message}`);
        }
    };

    return (
        <div id="dashboard-report" className="p-4 lg:p-6 space-y-4 animate-fade-in-up h-full overflow-y-auto">
            {/* --- HEADER --- */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-white text-invariant-white mb-1" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>Tổng Quan Hệ Thống</h1>
                    <p className="text-slate-300 text-sm flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <ClockWidget /> • Dữ liệu Realtime
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
                    {/* Search Bar */}
                    <div className="relative group w-full md:w-64 z-20">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors" size={18} />
                        <input
                            type="text"
                            className="w-full glass-input rounded-xl py-2 pl-10 pr-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder-slate-500"
                            placeholder="Tìm kiếm quận/huyện..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2 w-full md:w-auto justify-end">
                        <span className="glass-panel px-4 py-1.5 rounded-full text-blue-300 text-xs font-bold flex items-center gap-2 whitespace-nowrap">
                            <MapPin size={12} /> Hà Nội
                        </span>
                        <span className={`glass-panel px-4 py-1.5 rounded-full ${status.text} text-xs font-bold border-l-2 ${status.border} whitespace-nowrap`}>
                            {data.length} Trạm
                        </span>
                    </div>
                </div>
            </header>

            {/* --- SEARCH RESULTS SECTION --- */}
            {searchTerm && (
                <div className="animate-fade-in-up">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Search size={20} className="text-blue-400" />
                        Kết quả tìm kiếm ({searchResults.length})
                    </h3>

                    {searchResults.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {searchResults.map((d, index) => (
                                <DistrictCard
                                    key={`search-${(d as any)?.id ?? index}`}
                                    data={d}
                                    temperatureUnit={temperatureUnit}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="glass-panel rounded-xl p-8 text-center">
                            <AlertTriangle className="mx-auto text-slate-500 mb-2" size={32} />
                            <p className="text-slate-400">Không tìm thấy kết quả nào cho "{searchTerm}"</p>
                            <p className="text-xs text-slate-500 mt-1">Vui lòng thử từ khóa khác (VD: Cầu Giấy, Ba Đình...)</p>
                        </div>
                    )}

                    <div className="my-8 border-b border-white/5"></div>
                </div>
            )}

            {/* --- ROW 1: HERO & KEY STATS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Hero Card: Overall Status */}
                <div className={`glass-panel rounded-3xl p-6 relative overflow-hidden group`}>
                    <div className={`absolute inset-0 opacity-30 bg-gradient-to-br ${status.gradient}`}></div>
                    <div className="relative z-10 flex flex-col items-center justify-center h-full">
                        <h2 className="text-slate-300 text-xs font-bold uppercase tracking-[0.2em] mb-6">Chất lượng không khí (AQI)</h2>

                        <div className="relative mb-6">
                            <div className={`w-48 h-48 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.3)] relative z-10 backdrop-blur-sm`}>
                                <svg className="absolute inset-0 w-full h-full -rotate-90">
                                    {/* 1. Base Track (Dark) */}
                                    <circle cx="50%" cy="50%" r="84" stroke="#1e293b" strokeWidth="12" fill="transparent" className="opacity-50" />
                                    {/* 2. Colored Tint Track */}
                                    <circle cx="50%" cy="50%" r="84" stroke="currentColor" strokeWidth="12" fill="transparent" className={`${status.text} opacity-20`} />
                                    {/* 3. Progress Value */}
                                    <circle cx="50%" cy="50%" r="84" stroke="currentColor" strokeWidth="12" fill="transparent" className={`${status.text}`} strokeDasharray="527" strokeDashoffset={527 - (527 * Math.min(avgAQI, 500)) / 500} strokeLinecap="round" />
                                </svg>
                                <div className="text-center">
                                    <span className={`text-6xl font-black ${status.text} drop-shadow-lg block`}>{avgAQI}</span>
                                    <span className="text-xs text-slate-400 uppercase tracking-widest">US AQI</span>
                                </div>
                            </div>
                        </div>

                        <div className={`px-6 py-2 rounded-full bg-invariant-slate-900 ${status.text} border ${status.border} font-bold backdrop-blur-md shadow-lg`}>
                            {avgAQI <= 50 ? "Tốt" : avgAQI <= 100 ? "Trung bình" : avgAQI <= 150 ? "Kém" : "Có hại"}
                        </div>
                        <p className="text-slate-300 text-xs text-center mt-6 max-w-xs leading-relaxed">
                            {avgAQI > 100 ? "Cảnh báo: Nhóm nhạy cảm nên hạn chế hoạt động ngoài trời để bảo vệ sức khỏe." : "Không khí trong lành, rất thích hợp cho các hoạt động thể thao ngoài trời."}
                        </p>
                    </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatBox
                        icon={<Wind size={24} />} title="PM2.5" value={avgPM25} unit="µg/m³"
                        color="text-purple-400" bg="bg-purple-500/20"
                        sub="Bụi mịn" delay={100}
                    />
                    <StatBox
                        icon={<Wind size={24} />} title="PM10" value={Math.round(avgPM25 * 1.5)} unit="µg/m³"
                        color="text-blue-400" bg="bg-blue-500/20"
                        sub="Bụi lơ lửng" delay={200}
                    />
                    <StatBox
                        icon={<Thermometer size={24} />} title={temperatureUnit === '°F' ? 'Temperature' : 'Nhiệt độ'} value={avgTemp} unit={temperatureUnit}
                        color="text-orange-400" bg="bg-orange-500/20"
                        sub={temperatureUnit === '°F' ? 'Average' : 'Trung bình'} delay={300}
                    />
                    <StatBox
                        icon={<Droplets size={24} />} title="Độ ẩm" value={avgHum} unit="%"
                        color="text-cyan-400" bg="bg-cyan-500/20"
                        sub="Tương đối" delay={400}
                    />

                    {/* Forecast Mini-Widget */}
                    <div className="col-span-2 md:col-span-4 glass-panel rounded-xl p-4 flex flex-col justify-between animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-white font-bold flex items-center gap-2 text-sm">
                                <TrendingUp size={16} className="text-emerald-400" />
                                Dự Báo Xu Hướng (7 Ngày)
                            </h3>
                            {forecastSummary.length === 0 && <span className="text-xs text-orange-400 flex items-center gap-1"><AlertTriangle size={12} /> Chưa có dữ liệu</span>}
                        </div>
                        <div className="h-48 w-full">
                            {forecastSummary.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={forecastSummary.slice(0, 7)} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorAqiMini" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#94a3b8"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={10}
                                        />
                                        <YAxis
                                            stroke="#94a3b8"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="aqi"
                                            stroke="#10b981"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorAqiMini)"
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        >
                                            <LabelList
                                                dataKey="aqi"
                                                position="top"
                                                fill="#fff"
                                                fontSize={11}
                                                fontWeight="bold"
                                                offset={8}
                                            />
                                        </Area>
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 text-xs italic bg-white/5 rounded-xl">
                                    Cần upload file fact_forecast.csv để xem biểu đồ này
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- ROW 2: DETAILED CHARTS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Distribution Chart */}
                <div className="glass-panel rounded-xl p-4 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
                    <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                        <MapPin size={16} className="text-blue-400" />
                        Phân Bố Mức Độ Ô Nhiễm
                    </h3>
                    <div className="h-48 flex items-center justify-center">
                        {distributionData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={distributionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {distributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f8fafc' }}
                                    />
                                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-white font-black text-2xl">
                                        {data.length}
                                    </text>
                                    <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-400 text-xs uppercase tracking-wider">
                                        Khu vực
                                    </text>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-slate-500 text-sm italic">Đang tải dữ liệu...</div>
                        )}

                        {/* Custom Legend */}
                        <div className="ml-8 space-y-3">
                            {distributionData.map((d) => (
                                <div key={d.name} className="flex items-center gap-3 text-xs">
                                    <span className="w-3 h-3 rounded-full shadow-[0_0_8px]" style={{ backgroundColor: d.color, boxShadow: `0 0 8px ${d.color}` }}></span>
                                    <span className="text-slate-300 w-20">{d.name}:</span>
                                    <span className="font-bold text-white text-base">{d.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Top 5 Comparison Chart */}
                <div className="glass-panel rounded-xl p-4 animate-fade-in-up" style={{ animationDelay: '700ms' }}>
                    <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                        <Activity size={16} className="text-red-400" />
                        Top 5 Khu Vực Ô Nhiễm Nhất
                    </h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topPolluted} layout="vertical" margin={{ left: 10, right: 10 }}>
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="district"
                                    type="category"
                                    width={110}
                                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc', borderRadius: '8px' }}
                                />
                                <Bar dataKey="aqi" radius={[0, 6, 6, 0]} barSize={24} background={{ fill: 'rgba(255,255,255,0.02)' }}>
                                    {topPolluted.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.aqi_color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* --- ROW 3: LISTS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DistrictList
                    title="Khu Vực Không Khí Sạch"
                    icon={<ShieldCheck size={18} className="text-green-400" />}
                    data={topCleanest}
                    delay={800}
                />
                <DistrictList
                    title="Khu Vực Cần Lưu Ý"
                    icon={<AlertTriangle size={18} className="text-orange-400" />}
                    data={topPolluted}
                    delay={900}
                />
            </div>

            {/* --- ROW 4: EXTENDED MODULES --- */}
            <div>
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2 mt-4 border-t border-slate-700/50 pt-4">
                    <Layers size={22} className="text-blue-400" />
                    Tiện Ích Mở Rộng
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '1000ms' }}>

                    {/* Module 1: UV Index */}
                    <div
                        onClick={openWeatherPage}
                        className="glass-panel rounded-xl p-4 relative group overflow-hidden hover:border-yellow-500/30 transition-all cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-bl-full -mr-5 -mt-5 transition-all group-hover:bg-yellow-500/20"></div>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="text-slate-400 text-sm font-bold uppercase tracking-wider">Chỉ số UV</h4>
                                <span className="text-3xl font-bold text-white mt-1 block">
                                    {weatherData ? weatherData.uvIndex.toFixed(1) : '--'}
                                </span>
                            </div>
                            <div className="p-3 bg-yellow-500/20 text-yellow-500 rounded-xl">
                                <Sun size={24} />
                            </div>
                        </div>
                        {/* Progress Bar for UV */}
                        <div className="w-full bg-slate-700/50 rounded-full h-2 mb-2 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-full rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min(((weatherData?.uvIndex || 0) / 11) * 100, 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-yellow-400 font-medium">
                            {weatherData ? (
                                weatherData.uvIndex <= 2 ? "Thấp - An toàn" :
                                    weatherData.uvIndex <= 5 ? "Trung bình - Cần che chắn" :
                                        weatherData.uvIndex <= 7 ? "Cao - Hạn chế ra ngoài" :
                                            "Rất Cao - Nguy hại!"
                            ) : "Đang tải dữ liệu..."}
                        </p>
                    </div>

                    {/* Module 2: Wind Speed */}
                    <div
                        onClick={openWeatherPage}
                        className="glass-panel rounded-xl p-4 relative group overflow-hidden hover:border-cyan-500/30 transition-all cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-bl-full -mr-5 -mt-5 transition-all group-hover:bg-cyan-500/20"></div>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="text-slate-400 text-sm font-bold uppercase tracking-wider">Tốc độ gió</h4>
                                <span className="text-3xl font-bold text-white mt-1 block">
                                    {weatherData ? weatherData.windSpeed : '--'} <span className="text-lg font-medium text-slate-500">km/h</span>
                                </span>
                            </div>
                            <div className="p-3 bg-cyan-500/20 text-cyan-500 rounded-xl">
                                <Wind size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <CloudRain size={14} /> Lượng mưa: {weatherData ? weatherData.rainProb : 0} mm
                        </div>
                        <p className="text-xs text-cyan-400 font-medium mt-1">
                            Hướng gió: {weatherData ? getWindDirection(weatherData.windDirection) : '--'}
                        </p>
                    </div>

                    {/* Module 3: Export Data */}
                    <div className="glass-panel rounded-xl p-4 flex flex-col justify-center items-center text-center relative group hover:border-blue-500/30 transition-all">
                        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-slate-700 relative z-10">
                            <FileDown size={32} className="text-blue-400" />
                        </div>
                        <h4 className="font-bold text-white text-lg relative z-10">Xuất Báo Cáo</h4>
                        <p className="text-slate-400 text-sm mb-4 relative z-10">Tải xuống dữ liệu phân tích chi tiết dạng PDF</p>
                        <button
                            onClick={handleDownloadReport}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-invariant-white rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-900/30 relative z-10"
                        >
                            <ArrowUpRight size={16} /> Tải Ngay
                        </button>
                    </div>

                </div>
            </div>

            {/* --- FOOTER --- */}
            <footer className="mt-6 pt-4 border-t border-slate-700/50">
                <div className="glass-panel rounded-xl p-5">
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                        {/* Brand */}
                        <div className="text-center lg:text-left">
                            <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                                <div className="w-10 h-10 bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                                    <Leaf className="text-white" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white">AirHanoi</h3>
                                    <p className="text-emerald-400 text-xs font-medium">Vì một thủ đô xanh 🌿</p>
                                </div>
                            </div>
                            <p className="text-slate-400 text-sm max-w-sm">
                                Hệ thống giám sát chất lượng không khí Hà Nội theo thời gian thực.
                            </p>
                        </div>

                        {/* Contact Info */}
                        <div className="flex flex-col items-center lg:items-end gap-4">
                            <p className="text-slate-300 text-sm font-medium flex items-center gap-2">
                                <Heart size={14} className="text-red-400" />
                                Phát triển bởi <span className="text-blue-400 font-bold">Xone</span>
                            </p>

                            <div className="flex flex-wrap justify-center lg:justify-end gap-3">
                                {/* Facebook */}
                                <a
                                    href="https://www.facebook.com/xone.184"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 rounded-lg text-blue-400 hover:text-blue-300 transition-all group"
                                >
                                    <Facebook size={16} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-medium">Facebook</span>
                                </a>

                                {/* Gmail */}
                                <a
                                    href="mailto:adairhanoi@gmail.com"
                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-lg text-red-400 hover:text-red-300 transition-all group"
                                >
                                    <Mail size={16} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-medium">Email</span>
                                </a>

                                {/* Phone */}
                                <a
                                    href="tel:0828239451"
                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 rounded-lg text-emerald-400 hover:text-emerald-300 transition-all group"
                                >
                                    <Phone size={16} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-medium">Hotline</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Copyright */}
                    <div className="mt-4 pt-3 border-t border-slate-700/50 text-center">
                        <p className="text-slate-500 text-xs">
                            © {new Date().getFullYear()} AirHanoi Monitor System. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// --- Sub Components ---

const StatBox = memo(({ icon, title, value, unit, color, bg, sub }: any) => (
    <div className="glass-panel rounded-xl p-5 hover:border-white/20 transition-all duration-300 group">
        <div className="flex justify-between items-start mb-3">
            <div className={`p-2.5 rounded-xl ${bg} ${color} group-hover:scale-110 transition-transform`}>{icon}</div>
        </div>
        <div>
            <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{title}</h4>
            <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-white">{value}</span>
                <span className="text-xs text-slate-500 font-medium">{unit}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">{sub}</p>
        </div>
    </div>
));

const DistrictList = memo(({ title, icon, data }: any) => (
    <div className="glass-panel rounded-xl p-4">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            {icon} {title}
        </h3>
        <div className="space-y-3">
            {data.map((d: DistrictData, index: number) => (
                <div
                    key={`${title}-${(d as any)?.id ?? index}`}
                    className="flex justify-between items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                >
                    <div>
                        <p className="font-bold text-slate-200 text-sm">{d.district}</p>
                        <p className="text-xs text-slate-500">{d.pollution_level}</p>
                    </div>
                    <div className="text-right">
                        <div
                            className="font-bold text-white text-sm"
                            style={{ color: d.aqi_color, textShadow: `0 0 10px ${d.aqi_color}50` }}
                        >
                            {d.aqi} AQI
                        </div>
                        <div className="text-xs text-slate-500">{d.pm25} µg/m³</div>
                    </div>
                </div>
            ))}
        </div>
    </div>
));

const DistrictCard = memo<{ data: DistrictData; temperatureUnit?: string }>(({ data, temperatureUnit = '°C' }) => (
    <div className="glass-panel rounded-xl p-4 border border-slate-700/50 hover:border-blue-500/50 transition-all group relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <MapPin size={60} />
        </div>
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
                <h4 className="font-bold text-lg text-white">{data.district}</h4>
                <span className="text-xs text-slate-400">Cập nhật: {new Date(data.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className={`px-3 py-1 rounded-lg text-xs font-bold bg-invariant-slate-900 shadow-sm`} style={{ color: data.aqi_color, border: `1px solid ${data.aqi_color}40` }}>
                {data.pollution_level}
            </div>
        </div>

        <div className="flex items-end gap-2 mb-4 relative z-10">
            <span className="text-4xl font-black text-white" style={{ textShadow: `0 0 20px ${data.aqi_color}60` }}>{data.aqi}</span>
            <span className="text-sm font-medium text-slate-400 mb-1">US AQI</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs relative z-10">
            <div className="bg-invariant-slate-900 rounded-lg p-2 text-center border border-white/5">
                <span className="block text-slate-500 mb-1">PM2.5</span>
                <span className="font-bold text-white text-invariant-white">{data.pm25}</span>
            </div>
            <div className="bg-invariant-slate-900 rounded-lg p-2 text-center border border-white/5">
                <span className="block text-slate-500 mb-1">{temperatureUnit === '°F' ? 'Temp (°F)' : 'Temp (°C)'}</span>
                <span className="font-bold text-white text-invariant-white">{data.temperature}{temperatureUnit}</span>
            </div>
            <div className="bg-invariant-slate-900 rounded-lg p-2 text-center border border-white/5">
                <span className="block text-slate-500 mb-1">Hum</span>
                <span className="font-bold text-white text-invariant-white">{data.humidity}%</span>
            </div>
        </div>
    </div>
));

const ClockWidget = () => {
    const [time, setTime] = React.useState(new Date());
    React.useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);
    return <span>{time.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>;
}

export default Dashboard;