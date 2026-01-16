import React, { useState } from 'react';
import { X, ArrowRight, Info, Shield, Activity, CloudFog, Factory, Flame, Car } from 'lucide-react';

interface PollutantInfo {
    code: string;
    name: string;
    desc: string;
    source: string;
    imageUrl: string;
    healthImpact: string;
    prevention: string;
    icon: React.ReactNode;
}

const Education: React.FC = () => {
    const [selectedItem, setSelectedItem] = useState<PollutantInfo | null>(null);

    const pollutants: PollutantInfo[] = [
        {
            code: "PM2.5",
            name: "Bụi mịn (Fine Particles-PM2.5)",
            desc: "Các hạt bụi có đường kính nhỏ hơn 2.5 micromet (nhỏ hơn 1/30 sợi tóc). Chúng lơ lửng trong không khí trong thời gian dài.",
            source: "Khói thải từ phương tiện giao thông, đốt rác thải, cháy rừng, bụi công nghiệp và phản ứng hóa học trong khí quyển.",
            imageUrl: "https://kosmen.vn/upload/images/bui-min-pm-la-gi-1.jpg",
            healthImpact: "Đây là loại bụi nguy hiểm nhất. Do kích thước siêu nhỏ, chúng có thể xâm nhập sâu vào phổi, đi vào mạch máu, gây ra các bệnh tim mạch, đột quỵ, ung thư phổi và các bệnh hô hấp mãn tính.",
            prevention: "Sử dụng khẩu trang N95/N99 khi ra đường. Sử dụng máy lọc không khí có màng HEPA. Đóng kín cửa sổ vào những ngày ô nhiễm cao.",
            icon: <CloudFog size={24} className="text-purple-400" />
        },
        {
            code: "PM10",
            name: "Bụi lơ lửng (Coarse Particles-PM10)",
            desc: "Các hạt bụi có đường kính từ 2.5 đến 10 micromet. Thường là bụi đất, phấn hoa, nấm mốc.",
            source: "Bụi từ các công trình xây dựng, bụi đường phố, hoạt động nông nghiệp, đốt rơm rạ.",
            imageUrl: "https://cdn.tgdd.vn/hoi-dap/1203991/bui-min-pm2-5-pm10-la-gi-cach-xem-chi-so-bui.002-800x600.jpg",
            healthImpact: "Gây kích ứng mắt, mũi, cổ họng. Làm trầm trọng thêm bệnh hen suyễn và viêm phế quản. Ít đi sâu vào máu hơn PM2.5 nhưng vẫn gây hại cho hệ hô hấp trên.",
            prevention: "Đeo khẩu trang y tế hoặc khẩu trang vải dày khi đi qua khu vực xây dựng. Vệ sinh nhà cửa thường xuyên, lau bụi ẩm.",
            icon: <Factory size={24} className="text-orange-400" />
        },
        {
            code: "O3",
            name: "Ozone mặt đất (Ground-level Ozone-O3)",
            desc: "Khác với tầng Ozone bảo vệ trái đất, Ozone mặt đất là một chất khí ô nhiễm được tạo ra do phản ứng hóa học dưới ánh nắng.",
            source: "Phản ứng giữa Oxit Nitơ (NOx) và Hợp chất hữu cơ dễ bay hơi (VOCs) từ xe cộ và nhà máy dưới tác dụng của bức xạ mặt trời.",
            imageUrl: "https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?q=80&w=1974&auto=format&fit=crop",
            healthImpact: "Gây khó thở, đau ngực, ho, ngứa họng. Làm giảm chức năng phổi và gây viêm đường hô hấp. Đặc biệt nguy hại cho người bị hen suyễn.",
            prevention: "Hạn chế ra ngoài vào buổi trưa và chiều nắng gắt (khi nồng độ Ozone cao nhất). Hạn chế chạy xe máy/ô tô không cần thiết.",
            icon: <Activity size={24} className="text-blue-400" />
        },
        {
            code: "CO",
            name: "Carbon Monoxide (CO)",
            desc: "Khí không màu, không mùi, không vị nhưng cực kỳ độc hại. Sinh ra do quá trình đốt cháy không hoàn toàn nhiên liệu.",
            source: "Khí thải xe máy, ô tô, bếp than tổ ong, lò sưởi đốt củi/gas, cháy nổ.",
            imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSACJ9tOspgiaTFq8jUFWbcXy1qYTZZf2Wwmg&s",
            healthImpact: "CO liên kết với Hemoglobin trong máu mạnh gấp 200 lần Oxy, làm giảm khả năng vận chuyển Oxy đến não và tim. Nồng độ cao có thể gây hôn mê và tử vong.",
            prevention: "Không nổ máy xe trong garage đóng kín. Không dùng bếp than/lò sưởi trong phòng kín. Kiểm tra định kỳ thiết bị đốt khí gas.",
            icon: <Flame size={24} className="text-red-400" />
        },
        {
            code: "NO2",
            name: "Nitrogen Dioxide (No2)",
            desc: "Chất khí màu nâu đỏ, mùi gắt đặc trưng, là chỉ báo quan trọng cho ô nhiễm giao thông.",
            source: "Chủ yếu từ khí thải động cơ diesel và xăng (xe tải, xe buýt, ô tô con), nhà máy nhiệt điện.",
            imageUrl: "https://aqicn.org/air/view/faq/images/no2-atmosphere/Simplified-cycle-of-NO-and-NO2.png?1",
            healthImpact: "Gây viêm đường hô hấp, làm tăng nguy cơ nhiễm trùng phổi. Tiếp xúc lâu dài có thể làm chậm phát triển phổi ở trẻ em.",
            prevention: "Tránh tập thể dục gần các trục đường giao thông lớn. Sử dụng phương tiện giao thông công cộng hoặc xe điện.",
            icon: <Car size={24} className="text-yellow-400" />
        },
        {
            code: "SO2",
            name: "Sulfur Dioxide (SO₂)",
            desc: "Khí không màu, mùi hắc mạnh, là sản phẩm từ quá trình đốt cháy nhiên liệu chứa lưu huỳnh.",
            source: "Phát sinh chủ yếu từ nhà máy nhiệt điện than, luyện kim, đốt than – dầu – gỗ, và núi lửa.",
            imageUrl: "https://hoachatdaiviet.com/wp-content/uploads/2020/06/hoa-chatcach-lam-sach-so2-trong-cong-nghiep-nhiet-dien.jpg",
            healthImpact: "Gây kích ứng mạnh ở mắt, mũi và họng; dễ gây khó thở, đặc biệt ở người mắc hen suyễn. Nồng độ cao có thể gây co thắt phế quản.",
            prevention: "Hạn chế vận động mạnh ngoài trời khi chỉ số SO₂ cao. Dùng khẩu trang lọc khí (N95 trở lên). Tránh khu vực gần khu công nghiệp khi gió thổi qua.",
             icon: <Factory size={24} className="text-purple-500" />
        }
    ];

    const aqiScale = [
        { range: "0 - 50", level: "Tốt", color: "bg-[#00e400]", text: "text-slate-900", desc: "Không khí trong lành, không ảnh hưởng sức khỏe." },
        { range: "51 - 100", level: "Trung bình", color: "bg-[#ffff00]", text: "text-slate-900", desc: "Nhóm nhạy cảm nên hạn chế thời gian bên ngoài." },
        { range: "101 - 150", level: "Kém", color: "bg-[#ff7e00]", text: "text-white", desc: "Nhóm nhạy cảm có thể bị ảnh hưởng sức khỏe." },
        { range: "151 - 200", level: "Xấu", color: "bg-[#ff0000]", text: "text-white", desc: "Mọi người bắt đầu cảm thấy ảnh hưởng sức khỏe." },
        { range: "201 - 300", level: "Rất xấu", color: "bg-[#8f3f97]", text: "text-white", desc: "Cảnh báo sức khỏe khẩn cấp. Mọi người bị ảnh hưởng." },
        { range: "301+", level: "Nguy hại", color: "bg-[#7e0023]", text: "text-white", desc: "Báo động: Có thể gây hại nghiêm trọng cho mọi người." },
    ];

    return (
        <div className="p-6 lg:p-10 animate-fade-in h-full overflow-y-auto relative">
             <header className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Kiến Thức Môi Trường</h1>
                <p className="text-slate-400">Khám phá nguyên nhân, tác động và cách phòng tránh ô nhiễm không khí.</p>
            </header>

            {/* Pollutants Grid */}
            <h2 className="text-xl font-bold text-white mb-6 border-l-4 border-blue-500 pl-3 flex items-center gap-2">
                <Info size={20} className="text-blue-500"/> 
                Các chất ô nhiễm chính
                <span className="text-xs font-normal text-slate-500 ml-2">(Nhấn vào từng mục để xem chi tiết)</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
                {pollutants.map((p, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => setSelectedItem(p)}
                        className="glass-panel rounded-2xl overflow-hidden cursor-pointer group hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 shadow-lg"
                    >
                        {/* Image Header */}
                        <div className="h-40 relative overflow-hidden">
                            <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-transparent transition-colors z-10"></div>
                            <img 
                                src={p.imageUrl} 
                                alt={p.name} 
                                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute top-3 right-3 z-20 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1 border border-white/10">
                                {p.icon} {p.code}
                            </div>
                        </div>
                        
                        {/* Content Body */}
                        <div className="p-5">
                            <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors mb-2">{p.name}</h3>
                            <p className="text-sm text-slate-400 line-clamp-2 mb-4 h-10">{p.desc}</p>
                            
                            <div className="flex items-center text-blue-400 text-xs font-bold uppercase tracking-wider group-hover:gap-2 transition-all">
                                Xem chi tiết <ArrowRight size={14} className="ml-1" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* AQI Scale Table */}
            <h2 className="text-xl font-bold text-white mb-6 border-l-4 border-purple-500 pl-3">Thang đo AQI (VN Air Quality Index)</h2>
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl mb-20">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900 border-b border-slate-700">
                                <th className="p-4 text-sm font-semibold text-slate-400 w-32">Chỉ số AQI</th>
                                <th className="p-4 text-sm font-semibold text-slate-400 w-32">Mức độ</th>
                                <th className="p-4 text-sm font-semibold text-slate-400 w-32">Màu sắc</th>
                                <th className="p-4 text-sm font-semibold text-slate-400">Khuyến nghị sức khỏe</th>
                            </tr>
                        </thead>
                        <tbody>
                            {aqiScale.map((row, idx) => (
                                <tr key={idx} className="border-b border-slate-700/50 last:border-none hover:bg-slate-700/20 transition-colors">
                                    <td className="p-4 text-slate-200 font-mono font-bold">{row.range}</td>
                                    <td className="p-4 text-slate-200 font-bold">{row.level}</td>
                                    <td className="p-4">
                                        <div className={`w-8 h-8 rounded-full shadow-md ${row.color}`}></div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-300">{row.desc}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- DETAILED MODAL --- */}
            {selectedItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
                        onClick={() => setSelectedItem(null)}
                    ></div>

                    {/* Modal Content */}
                    <div className="bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-10 border border-slate-700 shadow-2xl flex flex-col md:flex-row animate-fade-in-up">
                        <button 
                            onClick={() => setSelectedItem(null)}
                            className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors backdrop-blur-md"
                        >
                            <X size={20} />
                        </button>

                        {/* Left Side: Image */}
                        <div className="w-full md:w-2/5 h-64 md:h-auto relative">
                            <img 
                                src={selectedItem.imageUrl} 
                                alt={selectedItem.name} 
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-slate-900"></div>
                            <div className="absolute bottom-4 left-4">
                                <span className="bg-blue-600 px-3 py-1 rounded-lg text-white font-bold text-sm shadow-lg">
                                    {selectedItem.code}
                                </span>
                            </div>
                        </div>

                        {/* Right Side: Content */}
                        <div className="w-full md:w-3/5 p-6 md:p-10 space-y-6">
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-2">{selectedItem.name}</h2>
                                <p className="text-slate-400 text-lg leading-relaxed">{selectedItem.desc}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                    <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
                                        <Factory size={18} /> Nguồn gốc phát sinh
                                    </h4>
                                    <p className="text-sm text-slate-300">{selectedItem.source}</p>
                                </div>

                                <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                                    <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                                        <Activity size={18} /> Tác hại sức khỏe
                                    </h4>
                                    <p className="text-sm text-slate-300">{selectedItem.healthImpact}</p>
                                </div>

                                <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                                    <h4 className="text-green-400 font-bold mb-2 flex items-center gap-2">
                                        <Shield size={18} /> Biện pháp phòng tránh
                                    </h4>
                                    <p className="text-sm text-slate-300">{selectedItem.prevention}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Education;