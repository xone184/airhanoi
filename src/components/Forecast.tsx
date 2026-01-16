import React, { useMemo } from 'react';
import { DistrictData, ForecastData } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { AlertCircle } from 'lucide-react';

interface ForecastProps {
    realtimeData: DistrictData[];
    forecastData: ForecastData[];
}

const Forecast: React.FC<ForecastProps> = ({ realtimeData, forecastData }) => {

    // Process forecast data to show trend for the whole city (Average AQI per day)
    const dailyTrend = useMemo(() => {
        if (!forecastData || forecastData.length === 0) return [];

        // Group by datetime (using string date part)
        const groups: Record<string, { totalAqi: number, count: number, date: string }> = {};

        forecastData.forEach(item => {
            const dateKey = item.datetime.split(' ')[0] || item.datetime; // Simple split for "YYYY-MM-DD HH:MM:SS"
            if (!groups[dateKey]) {
                groups[dateKey] = { totalAqi: 0, count: 0, date: dateKey };
            }
            groups[dateKey].totalAqi += item.aqi_forecast;
            groups[dateKey].count += 1;
        });

        const result = Object.values(groups).map(g => ({
            name: g.date,
            aqi: Math.round(g.totalAqi / g.count)
        })).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

        return result.slice(0, 7); // Take next 7 days
    }, [forecastData]);

    const hasData = forecastData.length > 0;

    return (
        <div className="p-4 lg:p-6 animate-fade-in h-full overflow-y-auto">
            <header className="mb-4">
                <h1 className="text-3xl font-bold text-white mb-2">Phân Tích & Dự Báo</h1>
                <p className="text-slate-400">Dữ liệu từ mô hình AI (Open-Meteo & Tomorrow.io)</p>
            </header>

            {!hasData ? (
                <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 text-center flex flex-col items-center justify-center min-h-[400px]">
                    <AlertCircle size={48} className="text-orange-500 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Chưa có dữ liệu dự báo</h3>
                    <p className="text-slate-400 max-w-md">
                        Vui lòng truy cập trang <b>Quản Trị Hệ Thống</b> (dành cho Admin) và tải lên file <code>fact_forecast.csv</code> để kích hoạt tính năng này.
                    </p>
                </div>
            ) : (
                <>
                    <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow-xl mb-4">
                        <h3 className="text-xl font-bold text-white mb-4">Xu Hướng AQI Trung Bình Toàn Hà Nội (5 Ngày Tới)</h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="name"
                                        stroke="#94a3b8"
                                        tickFormatter={(val) => new Date(val).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                    />
                                    <YAxis stroke="#94a3b8" />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                        labelFormatter={(val) => new Date(val).toLocaleDateString('vi-VN')}
                                    />
                                    <Area type="monotone" dataKey="aqi" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorAqi)" name="AQI Dự báo" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div className="bg-gradient-to-br from-blue-900 to-slate-900 p-4 rounded-2xl border border-blue-800 shadow-lg">
                            <h4 className="text-blue-300 font-bold mb-2 uppercase text-xs tracking-wider">Dữ Liệu Dự Báo</h4>
                            <div className="text-4xl font-black text-white">{forecastData.length}</div>
                            <p className="text-xs text-blue-400 mt-2 font-medium">Bản ghi từ mô hình AI</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-900 to-slate-900 p-4 rounded-2xl border border-purple-800 shadow-lg">
                            <h4 className="text-purple-300 font-bold mb-2 uppercase text-xs tracking-wider">Xu Hướng Chung</h4>
                            <div className="text-4xl font-black text-white">
                                {dailyTrend.length > 0 && dailyTrend[dailyTrend.length - 1].aqi > dailyTrend[0].aqi ? "Tăng" : "Giảm"}
                            </div>
                            <p className="text-xs text-purple-400 mt-2 font-medium">So với ngày hiện tại</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-900 to-slate-900 p-4 rounded-2xl border border-emerald-800 shadow-lg">
                            <h4 className="text-emerald-300 font-bold mb-2 uppercase text-xs tracking-wider">Trạng Thái</h4>
                            <div className="text-xl font-bold text-white">Đã đồng bộ</div>
                            <p className="text-xs text-emerald-400 mt-2 font-medium">Sẵn sàng phân tích</p>
                        </div>
                    </div>

                    {/* AI Analysis Panel */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-1 p-[1px] shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
                        <div className="relative bg-slate-900/95 backdrop-blur-xl rounded-[23px] p-4 lg:p-6 h-full">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg shadow-cyan-500/20">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5 10 10 0 0 0-4 4 4 4 0 0 1-5-5" /><path d="M8.5 8.5v.01" /><path d="M16 15.5v.01" /><path d="M12 12v.01" /><path d="M7 17v.01" /><path d="M17 7v.01" /></svg>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                                        Phân Tích & Dự Báo Từ AI
                                    </h3>
                                    <p className="text-slate-400 text-sm">Hệ thống tự động phân tích dữ liệu và đưa ra nhận định</p>
                                </div>
                            </div>

                            {(() => {
                                if (dailyTrend.length === 0) return null;

                                const currentAQI = dailyTrend[0].aqi;
                                const futureAQIs = dailyTrend.slice(1);
                                const avgFutureAQI = futureAQIs.reduce((acc, curr) => acc + curr.aqi, 0) / (futureAQIs.length || 1);
                                const maxFutureAQI = Math.max(...futureAQIs.map(d => d.aqi));
                                const maxDay = futureAQIs.find(d => d.aqi === maxFutureAQI);

                                const trendDirection = avgFutureAQI > currentAQI ? 'xấu đi' : 'cải thiện';
                                const colorClass = avgFutureAQI > currentAQI ? 'text-red-400' : 'text-emerald-400';

                                return (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* General Insight */}
                                            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                                                <h4 className="text-slate-300 font-bold mb-3 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                                                    Nhận định xu hướng
                                                </h4>
                                                <p className="text-slate-300 leading-relaxed text-sm">
                                                    Dựa trên mô hình dự báo, chất lượng không khí tại Hà Nội có xu hướng <span className={`font-bold ${colorClass}`}>{trendDirection}</span> trong 5 ngày tới.
                                                    AQI trung bình dự kiến khoảng <span className="font-bold text-white">{Math.round(avgFutureAQI)}</span>.
                                                </p>
                                            </div>

                                            {/* Peak Pollution */}
                                            {maxDay && (
                                                <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                                                    <h4 className="text-slate-300 font-bold mb-3 flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                                                        Cảnh báo cao điểm
                                                    </h4>
                                                    <p className="text-slate-300 leading-relaxed text-sm">
                                                        Dự báo ngày <span className="font-bold text-white">{new Date(maxDay.name).toLocaleDateString('vi-VN')}</span> sẽ là thời điểm ô nhiễm nhất trong chu kỳ với AQI có thể đạt ngưỡng <span className="font-bold text-orange-400">{maxDay.aqi}</span>.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Recommendations Grid */}
                                        <div>
                                            <h4 className="text-slate-300 font-bold mb-4 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                                                Khuyến nghị hành động
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/30 hover:border-slate-600 transition-colors">
                                                    <div className="text-2xl mb-2">😷</div>
                                                    <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Sức khỏe</p>
                                                    <p className="text-sm text-slate-200">
                                                        {avgFutureAQI > 150 ? "Bắt buộc đeo khẩu trang chống bụi mịn khi ra đường." : "Nên mang theo khẩu trang phòng ngừa bụi."}
                                                    </p>
                                                </div>
                                                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/30 hover:border-slate-600 transition-colors">
                                                    <div className="text-2xl mb-2">🏃</div>
                                                    <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Vận động</p>
                                                    <p className="text-sm text-slate-200">
                                                        {avgFutureAQI > 150 ? "Hạn chế tối đa các hoạt động thể thao ngoài trời." : "Có thể tập thể dục nhẹ nhàng vào sáng sớm."}
                                                    </p>
                                                </div>
                                                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/30 hover:border-slate-600 transition-colors">
                                                    <div className="text-2xl mb-2">🏠</div>
                                                    <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Tại nhà</p>
                                                    <p className="text-sm text-slate-200">
                                                        {avgFutureAQI > 100 ? "Nên đóng kín cửa sổ và sử dụng máy lọc không khí." : "Thường xuyên vệ sinh nhà cửa, mở cửa khi AQI thấp."}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Forecast;