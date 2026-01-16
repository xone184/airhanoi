import React, { useState, useMemo } from 'react';
import { DistrictData } from '../types';
import { ArrowRightLeft, Trophy, Wind, Thermometer, Droplets, MapPin, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend } from 'recharts';

interface ComparisonProps {
    data: DistrictData[];
}

const Comparison: React.FC<ComparisonProps> = ({ data }) => {
    const [districtA, setDistrictA] = useState<string>(data[0]?.district || '');
    const [districtB, setDistrictB] = useState<string>(data[1]?.district || '');

    const dataA = useMemo(() => data.find(d => d.district === districtA), [data, districtA]);
    const dataB = useMemo(() => data.find(d => d.district === districtB), [data, districtB]);

    if (!dataA || !dataB) return <div>Đang tải dữ liệu...</div>;

    const winner = dataA.aqi < dataB.aqi ? dataA : dataB;
    const diff = Math.abs(dataA.aqi - dataB.aqi);

    const chartData = [
        { name: 'AQI', [dataA.district]: dataA.aqi, [dataB.district]: dataB.aqi },
        { name: 'PM2.5', [dataA.district]: dataA.pm25, [dataB.district]: dataB.pm25 },
        { name: 'PM10', [dataA.district]: dataA.pm10, [dataB.district]: dataB.pm10 },
    ];

    const getComparisonColor = (val1: number, val2: number, inverse: boolean = false) => {
        if (val1 === val2) return 'text-slate-400';
        const isBetter = inverse ? val1 > val2 : val1 < val2; // AQI lower is better, Temp usually neutral but let's assume lower is better for heat
        return isBetter ? 'text-green-400' : 'text-red-400';
    };

    return (
        <div className="p-4 lg:p-6 animate-fade-in h-full overflow-y-auto pb-20">
            <header className="mb-4">
                <h1 className="text-3xl font-bold text-white mb-2">So Sánh Khu Vực</h1>
                <p className="text-slate-400">Đối chiếu chất lượng không khí giữa hai địa điểm</p>
            </header>

            {/* Selectors */}
            <div className="glass-panel p-4 rounded-2xl mb-4 flex flex-col md:flex-row items-center justify-between gap-4 relative">
                <div className="w-full md:w-1/3">
                    <label className="block text-slate-400 text-sm font-bold mb-2">Khu vực A</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 text-blue-500" size={18} />
                        <select
                            className="w-full bg-slate-900 border border-blue-500/50 rounded-xl py-3 pl-10 pr-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={districtA}
                            onChange={(e) => setDistrictA(e.target.value)}
                        >
                            {data.map(d => <option key={d.district} value={d.district}>{d.district}</option>)}
                        </select>
                    </div>
                </div>

                <div className="bg-slate-800 p-3 rounded-full border border-slate-600 shadow-xl z-10">
                    <ArrowRightLeft className="text-slate-300" size={24} />
                </div>

                <div className="w-full md:w-1/3">
                    <label className="block text-slate-400 text-sm font-bold mb-2">Khu vực B</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 text-purple-500" size={18} />
                        <select
                            className="w-full bg-slate-900 border border-purple-500/50 rounded-xl py-3 pl-10 pr-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={districtB}
                            onChange={(e) => setDistrictB(e.target.value)}
                        >
                            {data.map(d => <option key={d.district} value={d.district}>{d.district}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {districtA === districtB ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-700 rounded-2xl">
                    <AlertTriangle className="mx-auto text-yellow-500 mb-2" size={32} />
                    <p className="text-slate-400">Vui lòng chọn hai khu vực khác nhau để so sánh.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left Card: District A */}
                    <div className="glass-panel rounded-2xl p-6 border-t-4 border-t-blue-500">
                        <h2 className="text-2xl font-bold text-white mb-1">{dataA.district}</h2>
                        <p className="text-blue-400 text-sm font-bold mb-6">Khu vực A</p>

                        <div className="space-y-4">
                            <div className="text-center p-4 bg-invariant-slate-900 rounded-xl">
                                <span className="text-sm text-slate-400 uppercase tracking-wider">AQI Index</span>
                                <div className="text-5xl font-black text-white text-invariant-white my-2" style={{ color: dataA.aqi_color }}>{dataA.aqi}</div>
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 border border-slate-700">{dataA.pollution_level}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800 p-3 rounded-xl">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1"><Wind size={14} /> PM2.5</div>
                                    <div className="font-bold text-lg text-white">{dataA.pm25}</div>
                                </div>
                                <div className="bg-slate-800 p-3 rounded-xl">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1"><Thermometer size={14} /> Temp</div>
                                    <div className="font-bold text-lg text-white">{dataA.temperature}°C</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle: Stats & Verdict */}
                    <div className="flex flex-col gap-4">
                        {/* Winner Card */}
                        <div className="bg-gradient-to-br from-emerald-900 to-slate-900 p-6 rounded-2xl border border-emerald-500/30 text-center shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy size={80} /></div>
                            <h3 className="text-emerald-300 font-bold uppercase text-xs tracking-widest mb-2">Không khí sạch hơn tại</h3>
                            <h2 className="text-2xl font-bold text-white mb-2 text-invariant-white">{winner.district}</h2>
                            <p className="text-emerald-200/70 text-sm text-invariant-white">
                                AQI thấp hơn <span className="font-bold text-white">{diff}</span> đơn vị so với đối thủ.
                            </p>
                        </div>

                        {/* Chart */}
                        <div className="glass-panel rounded-2xl p-4">
                            <h4 className="text-center text-slate-300 font-bold text-sm mb-4">Biểu đồ so sánh chỉ số</h4>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                        <Legend />
                                        <Bar dataKey={dataA.district} fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                        <Bar dataKey={dataB.district} fill="#a855f7" radius={[4, 4, 0, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Right Card: District B */}
                    <div className="glass-panel rounded-2xl p-6 border-t-4 border-t-purple-500">
                        <h2 className="text-2xl font-bold text-white mb-1">{dataB.district}</h2>
                        <p className="text-purple-400 text-sm font-bold mb-6">Khu vực B</p>

                        <div className="space-y-4">
                            <div className="text-center p-4 bg-invariant-slate-900 rounded-xl">
                                <span className="text-sm text-slate-400 uppercase tracking-wider">AQI Index</span>
                                <div className="text-5xl font-black text-white text-invariant-white my-2" style={{ color: dataB.aqi_color }}>{dataB.aqi}</div>
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 border border-slate-700">{dataB.pollution_level}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800 p-3 rounded-xl">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1"><Wind size={14} /> PM2.5</div>
                                    <div className="font-bold text-lg text-white">{dataB.pm25}</div>
                                </div>
                                <div className="bg-slate-800 p-3 rounded-xl">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1"><Thermometer size={14} /> Temp</div>
                                    <div className="font-bold text-lg text-white">{dataB.temperature}°C</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Metric Breakdown Table */}
            {districtA !== districtB && (
                <div className="mt-4 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                    <table className="w-full text-center">
                        <thead className="bg-slate-900 text-slate-400 text-xs font-bold uppercase tracking-wider">
                            <tr>
                                <th className="p-4 w-1/3 text-left pl-8">Chỉ số</th>
                                <th className="p-4 w-1/3 text-blue-400">{dataA.district}</th>
                                <th className="p-4 w-1/3 text-purple-400">{dataB.district}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            <tr>
                                <td className="p-4 text-left pl-8 font-medium text-slate-300">AQI (Chất lượng không khí)</td>
                                <td className={`p-4 font-bold ${getComparisonColor(dataA.aqi, dataB.aqi)}`}>{dataA.aqi}</td>
                                <td className={`p-4 font-bold ${getComparisonColor(dataB.aqi, dataA.aqi)}`}>{dataB.aqi}</td>
                            </tr>
                            <tr>
                                <td className="p-4 text-left pl-8 font-medium text-slate-300">Nồng độ PM2.5 (µg/m³)</td>
                                <td className={`p-4 font-bold ${getComparisonColor(dataA.pm25, dataB.pm25)}`}>{dataA.pm25}</td>
                                <td className={`p-4 font-bold ${getComparisonColor(dataB.pm25, dataA.pm25)}`}>{dataB.pm25}</td>
                            </tr>
                            <tr>
                                <td className="p-4 text-left pl-8 font-medium text-slate-300">Nồng độ PM10 (µg/m³)</td>
                                <td className={`p-4 font-bold ${getComparisonColor(dataA.pm10, dataB.pm10)}`}>{dataA.pm10}</td>
                                <td className={`p-4 font-bold ${getComparisonColor(dataB.pm10, dataA.pm10)}`}>{dataB.pm10}</td>
                            </tr>
                            <tr>
                                <td className="p-4 text-left pl-8 font-medium text-slate-300">Nhiệt độ (°C)</td>
                                <td className="p-4 font-bold text-slate-200">{dataA.temperature}</td>
                                <td className="p-4 font-bold text-slate-200">{dataB.temperature}</td>
                            </tr>
                            <tr>
                                <td className="p-4 text-left pl-8 font-medium text-slate-300">Độ ẩm (%)</td>
                                <td className="p-4 font-bold text-slate-200">{dataA.humidity}</td>
                                <td className="p-4 font-bold text-slate-200">{dataB.humidity}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Comparison;