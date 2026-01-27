import React, { useState } from 'react';
import { DistrictData } from '../types';
import { Heart, Bike, Wind, Shield, Users, AlertTriangle, X, ChevronRight, Droplets, Thermometer, Activity, Home, Stethoscope, Baby, Brain, Leaf, Clock } from 'lucide-react';

interface HealthAdviceProps {
    data: DistrictData[];
}

interface RecommendationDetail {
    icon: React.ReactNode;
    title: string;
    desc: string;
    details: {
        explanation: string;
        tips: string[];
        symptoms?: string[];
        products?: string[];
    };
    color: string;
    isActive: boolean;
}

const HealthAdvice: React.FC<HealthAdviceProps> = ({ data }) => {
    const [selectedCard, setSelectedCard] = useState<number | null>(null);

    // Calculate average AQI to give general advice
    const avgAQI = data.length > 0 ? Math.round(data.reduce((acc, curr) => acc + curr.aqi, 0) / data.length) : 0;

    // Determine status
    let status = {
        level: 'Tốt',
        color: 'text-green-400',
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        advice: "Không khí trong lành. Tận hưởng các hoạt động ngoài trời!",
        mask: false,
        window: true,
        exercise: true,
        purifier: false
    };

    if (avgAQI > 300) {
        status = { level: 'Nguy hại', color: 'text-red-700', bg: 'bg-[#7e0023]/20', border: 'border-[#7e0023]/50', advice: "Cảnh báo khẩn cấp! Mọi người nên ở trong nhà.", mask: true, window: false, exercise: false, purifier: true };
    } else if (avgAQI > 200) {
        status = { level: 'Rất xấu', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', advice: "Hạn chế tối đa ra ngoài. Người già và trẻ nhỏ cần được bảo vệ đặc biệt.", mask: true, window: false, exercise: false, purifier: true };
    } else if (avgAQI > 150) {
        status = { level: 'Xấu', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', advice: "Nhóm nhạy cảm nên tránh ra ngoài. Đeo khẩu trang chống bụi mịn khi di chuyển.", mask: true, window: false, exercise: false, purifier: true };
    } else if (avgAQI > 100) {
        status = { level: 'Kém', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', advice: "Nhóm nhạy cảm nên hạn chế vận động mạnh ngoài trời.", mask: true, window: false, exercise: true, purifier: false };
    } else if (avgAQI > 50) {
        status = { level: 'Trung bình', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', advice: "Chất lượng không khí chấp nhận được. Một số người rất nhạy cảm có thể bị ảnh hưởng.", mask: false, window: true, exercise: true, purifier: false };
    }

    const recommendations: RecommendationDetail[] = [
        {
            icon: <Shield size={32} />,
            title: "Khẩu trang chuyên dụng",
            desc: status.mask ? "BẮT BUỘC: Sử dụng khẩu trang N95 hoặc tương đương khi ra đường." : "Không cần thiết, trừ khi bạn rất nhạy cảm.",
            color: status.mask ? "text-blue-400" : "text-slate-500",
            isActive: status.mask,
            details: {
                explanation: status.mask
                    ? "Với mức AQI hiện tại, bụi mịn PM2.5 có thể xâm nhập sâu vào phổi và gây ra các vấn đề sức khỏe nghiêm trọng. Khẩu trang thông thường KHÔNG đủ để lọc bụi mịn."
                    : "Chất lượng không khí hiện tại trong ngưỡng an toàn. Tuy nhiên, nếu bạn có tiền sử bệnh hô hấp, nên cân nhắc đeo khẩu trang khi ra ngoài đường đông đúc.",
                tips: status.mask ? [
                    "Sử dụng khẩu trang N95, KN95 hoặc FFP2 có chứng nhận",
                    "Đảm bảo khẩu trang ôm sát mặt, không có khe hở",
                    "Thay khẩu trang sau 8 giờ sử dụng hoặc khi bị ướt",
                    "Không sử dụng lại khẩu trang dùng một lần",
                    "Tránh khẩu trang có van thở khi ở nơi công cộng"
                ] : [
                    "Khẩu trang vải thông thường đủ để phòng bụi đường",
                    "Vệ sinh khẩu trang thường xuyên",
                    "Mang theo khẩu trang dự phòng khi ra ngoài"
                ],
                products: status.mask ? [
                    "3M N95 9501+ / 9502+",
                    "KN95 5 lớp có chứng nhận",
                    "FFP2 CE certified",
                    "Khẩu trang than hoạt tính cao cấp"
                ] : undefined
            }
        },
        {
            icon: <Wind size={32} />,
            title: "Thông gió nhà cửa",
            desc: status.window ? "Nên mở cửa sổ để không khí lưu thông." : "ĐÓNG CỬA SỔ: Tránh bụi xâm nhập vào nhà.",
            color: status.window ? "text-cyan-400" : "text-slate-500",
            isActive: status.window,
            details: {
                explanation: status.window
                    ? "Không khí trong lành bên ngoài sẽ giúp giảm nồng độ CO2 và các chất ô nhiễm trong nhà. Nên mở cửa vào buổi sáng sớm (5-7h) hoặc tối muộn (sau 21h) để tránh giờ cao điểm."
                    : "Việc mở cửa sổ lúc này sẽ khiến bụi mịn PM2.5 xâm nhập vào không gian sống, ảnh hưởng đến sức khỏe gia đình, đặc biệt là trẻ nhỏ và người lớn tuổi.",
                tips: status.window ? [
                    "Mở cửa khoảng 15-30 phút vào buổi sáng sớm",
                    "Tránh mở cửa giờ cao điểm (7-9h, 17-19h)",
                    "Đặt cây xanh trong nhà để lọc không khí tự nhiên",
                    "Kiểm tra hướng gió trước khi mở cửa"
                ] : [
                    "Đóng kín cửa sổ và cửa chính",
                    "Sử dụng máy lọc không khí nếu có",
                    "Bật điều hòa ở chế độ recirculation",
                    "Dùng khăn ướt lau sàn để giảm bụi",
                    "Kiểm tra khe hở cửa và bịt kín nếu cần"
                ],
                symptoms: status.window ? undefined : [
                    "Ho khan, ngứa họng khi ở trong nhà",
                    "Mắt cay, chảy nước mắt",
                    "Khó thở, tức ngực nhẹ"
                ]
            }
        },
        {
            icon: <Bike size={32} />,
            title: "Tập thể dục ngoài trời",
            desc: status.exercise ? "An toàn để chạy bộ hoặc đạp xe." : "TRÁNH VẬN ĐỘNG MẠNH: Nên tập trong nhà.",
            color: status.exercise ? "text-green-400" : "text-slate-500",
            isActive: status.exercise,
            details: {
                explanation: status.exercise
                    ? "Với mức AQI hiện tại, các hoạt động thể chất ngoài trời không gây hại cho sức khỏe. Đây là thời điểm tốt để tập luyện và hít thở không khí trong lành."
                    : "Khi vận động mạnh, bạn hít thở sâu hơn và nhanh hơn, khiến lượng bụi mịn xâm nhập vào phổi tăng lên 10-20 lần so với khi nghỉ ngơi.",
                tips: status.exercise ? [
                    "Thời điểm tốt nhất: 5-7h sáng hoặc sau 19h",
                    "Tránh tập gần đường giao thông lớn",
                    "Uống đủ nước trước và sau khi tập",
                    "Chọn công viên hoặc khu vực nhiều cây xanh",
                    "Khởi động kỹ trước khi tập cường độ cao"
                ] : [
                    "Chuyển sang tập trong nhà: yoga, gym, aerobic",
                    "Nếu phải ra ngoài, chỉ đi bộ nhẹ nhàng",
                    "Tránh các hoạt động cardio cường độ cao",
                    "Theo dõi AQI và chờ thời điểm tốt hơn",
                    "Sử dụng ứng dụng để nhận thông báo khi AQI cải thiện"
                ],
                symptoms: status.exercise ? undefined : [
                    "Khó thở, thở gấp khi gắng sức",
                    "Đau tức ngực hoặc cảm giác nặng ngực",
                    "Chóng mặt, mệt mỏi bất thường"
                ]
            }
        },
        {
            icon: <Users size={32} />,
            title: "Nhóm nhạy cảm",
            desc: avgAQI > 100 ? "Người già, trẻ em, người bệnh phổi/tim cần ở trong nhà." : "Sinh hoạt bình thường.",
            color: "text-purple-400",
            isActive: avgAQI > 100,
            details: {
                explanation: avgAQI > 100
                    ? "Nhóm nhạy cảm bao gồm: trẻ em dưới 12 tuổi, người trên 65 tuổi, phụ nữ mang thai, và người mắc các bệnh mãn tính về hô hấp, tim mạch. Những người này dễ bị ảnh hưởng hơn bởi ô nhiễm không khí."
                    : "Với chất lượng không khí hiện tại, hầu hết mọi người kể cả nhóm nhạy cảm có thể sinh hoạt bình thường. Tuy nhiên, vẫn nên theo dõi tình trạng sức khỏe.",
                tips: avgAQI > 100 ? [
                    "Giữ trẻ em chơi trong nhà với các hoạt động phù hợp",
                    "Người lớn tuổi không nên đi dạo buổi sáng",
                    "Phụ nữ mang thai hạn chế di chuyển không cần thiết",
                    "Người bệnh hen suyễn mang theo thuốc xịt cấp cứu",
                    "Người bệnh tim nên theo dõi nhịp tim thường xuyên"
                ] : [
                    "Vẫn cần theo dõi triệu chứng bất thường",
                    "Mang theo thuốc dự phòng nếu có bệnh nền",
                    "Không nên hoạt động quá sức"
                ],
                symptoms: [
                    "TRẺ EM: Ho nhiều, khò khè, quấy khóc, bỏ bú",
                    "NGƯỜI GIÀ: Khó thở, mệt mỏi, chóng mặt",
                    "BỆNH HÔ HẤP: Cơn hen tái phát, tức ngực",
                    "BỆNH TIM: Tim đập nhanh, đau ngực, khó thở khi gắng sức"
                ]
            }
        },
        {
            icon: <Home size={32} />,
            title: "Không gian sống",
            desc: status.purifier ? "NÊN sử dụng máy lọc không khí trong nhà." : "Không khí trong nhà ổn định.",
            color: status.purifier ? "text-amber-400" : "text-slate-500",
            isActive: status.purifier,
            details: {
                explanation: status.purifier
                    ? "Máy lọc không khí với bộ lọc HEPA có thể loại bỏ tới 99.97% các hạt bụi mịn PM2.5. Đây là giải pháp hiệu quả để bảo vệ sức khỏe gia đình trong những ngày ô nhiễm cao."
                    : "Chất lượng không khí ngoài trời tốt, không cần thiết phải sử dụng máy lọc. Tuy nhiên, nếu gia đình có trẻ nhỏ hoặc người bệnh hô hấp, việc duy trì máy lọc vẫn có lợi.",
                tips: status.purifier ? [
                    "Bật máy lọc 24/7 ở phòng ngủ và phòng khách",
                    "Đặt máy cách tường ít nhất 30cm",
                    "Thay/vệ sinh bộ lọc theo hướng dẫn nhà sản xuất",
                    "Chọn máy có CADR phù hợp diện tích phòng",
                    "Kết hợp với cây xanh trong nhà"
                ] : [
                    "Vệ sinh nhà cửa thường xuyên",
                    "Hạn chế sử dụng nến thơm, hương liệu",
                    "Không hút thuốc trong nhà",
                    "Sử dụng cây xanh tự nhiên để lọc không khí"
                ],
                products: status.purifier ? [
                    "Xiaomi Air Purifier 4 Pro",
                    "Philips AC2889",
                    "Sharp FP-J40E",
                    "Samsung AX60R5080WD",
                    "Coway AP-1512HH"
                ] : undefined
            }
        },
        {
            icon: <Stethoscope size={32} />,
            title: "Theo dõi sức khỏe",
            desc: avgAQI > 150 ? "Chú ý các triệu chứng hô hấp và tim mạch." : "Duy trì lối sống lành mạnh.",
            color: avgAQI > 150 ? "text-red-400" : "text-blue-400",
            isActive: avgAQI > 150,
            details: {
                explanation: avgAQI > 150
                    ? "Ô nhiễm không khí có thể gây ra các triệu chứng cấp tính và làm nặng thêm các bệnh mãn tính. Việc theo dõi sức khỏe giúp phát hiện sớm các dấu hiệu bất thường."
                    : "Mặc dù không khí đang ở mức chấp nhận được, việc duy trì lối sống lành mạnh và theo dõi sức khỏe định kỳ vẫn rất quan trọng.",
                tips: avgAQI > 150 ? [
                    "Ghi chép các triệu chứng hàng ngày",
                    "Đo SpO2 nếu có máy đo oxy",
                    "Liên hệ bác sĩ nếu triệu chứng kéo dài hơn 2 ngày",
                    "Uống đủ nước để giữ ẩm đường hô hấp",
                    "Súc miệng và rửa mũi bằng nước muối sinh lý"
                ] : [
                    "Khám sức khỏe định kỳ 6 tháng/lần",
                    "Tập thể dục đều đặn 30 phút/ngày",
                    "Ăn nhiều rau xanh và trái cây giàu vitamin C",
                    "Ngủ đủ 7-8 tiếng mỗi đêm"
                ],
                symptoms: avgAQI > 150 ? [
                    "Ho kéo dài, khò khè, tức ngực",
                    "Khó thở khi leo cầu thang hoặc gắng sức nhẹ",
                    "Nhức đầu, chóng mặt, buồn nôn",
                    "Kích ứng mắt: đỏ, ngứa, chảy nước mắt",
                    "Mệt mỏi bất thường, khó tập trung"
                ] : undefined
            }
        }
    ];

    const closeModal = () => setSelectedCard(null);

    return (
        <div className="p-4 lg:p-6 animate-fade-in h-full overflow-y-auto">
            <header className="mb-4">
                <h1 className="text-3xl font-bold text-white mb-2">Lời Khuyên Sức Khỏe</h1>
                <p className="text-slate-400">Khuyến nghị dựa trên chỉ số AQI trung bình hiện tại: <span className="font-bold text-white">{avgAQI}</span></p>
            </header>

            {/* Main Status Card */}
            <div className={`rounded-xl p-6 border ${status.bg} ${status.border} mb-4 flex flex-col md:flex-row items-center gap-4 text-center md:text-left shadow-xl`}>
                <div className="w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center border-4 border-slate-700 relative flex-shrink-0">
                    <Heart size={40} className={status.color} />
                    <div className={`absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-slate-900 ${status.color.replace('text-', 'bg-')}`}>
                        {avgAQI}
                    </div>
                </div>
                <div className="flex-1">
                    <h2 className={`text-2xl font-bold ${status.color} mb-2`}>Mức độ: {status.level}</h2>
                    <p className="text-slate-200 text-lg leading-relaxed">{status.advice}</p>
                </div>
            </div>

            {/* Grid Recommendations - Clickable */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((item, index) => (
                    <div
                        key={index}
                        onClick={() => setSelectedCard(index)}
                        className={`bg-slate-900 backdrop-blur-sm rounded-xl p-6 border border-slate-700 shadow-lg 
                                    hover:border-blue-500/50 hover:bg-slate-800 hover:scale-[1.02] hover:shadow-xl
                                    transition-all duration-300 cursor-pointer group relative overflow-hidden`}
                    >
                        {/* Glow effect when active */}
                        {item.isActive && (
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
                        )}

                        <div className="flex items-start gap-4 relative z-10">
                            <div className={`p-3 bg-slate-900 rounded-xl border border-slate-700 ${item.color} 
                                           group-hover:scale-110 transition-transform duration-300`}>
                                {item.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                    {item.title}
                                    <ChevronRight size={16} className="text-slate-500 group-hover:text-blue-400 
                                                                        group-hover:translate-x-1 transition-all" />
                                </h3>
                                <p className="text-sm text-slate-400 line-clamp-2">{item.desc}</p>
                            </div>
                        </div>

                        {/* Click hint */}
                        <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                            <span className="text-xs text-slate-500">Nhấn để xem chi tiết</span>
                            {item.isActive && (
                                <span className="px-2 py-0.5 text-xs font-bold bg-blue-500/20 text-blue-400 rounded-full">
                                    Cần lưu ý
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Note */}
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3">
                <AlertTriangle className="text-blue-400 flex-shrink-0" size={20} />
                <p className="text-sm text-blue-200">
                    Lưu ý: Các khuyến nghị này mang tính chất tham khảo chung. Nếu bạn có bệnh lý hô hấp, hãy tuân theo chỉ dẫn của bác sĩ.
                </p>
            </div>

            {/* Modal for detailed info */}
            {selectedCard !== null && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
                    onClick={closeModal}
                >
                    <div
                        className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl animate-scale-in"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-900">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl bg-slate-800 border border-slate-600 ${recommendations[selectedCard].color}`}>
                                    {recommendations[selectedCard].icon}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{recommendations[selectedCard].title}</h2>
                                    <p className="text-sm text-slate-400">Hướng dẫn chi tiết</p>
                                </div>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-2 rounded-full hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)] space-y-6">
                            {/* Status Badge */}
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${recommendations[selectedCard].isActive ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
                                {recommendations[selectedCard].isActive ? <AlertTriangle size={16} /> : <Activity size={16} />}
                                <span className="font-medium text-sm">
                                    {recommendations[selectedCard].isActive ? 'Cần thực hiện ngay' : 'Tình trạng bình thường'}
                                </span>
                            </div>

                            {/* Explanation */}
                            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                                    <Brain size={18} className="text-purple-400" />
                                    Giải thích
                                </h3>
                                <p className="text-slate-300 leading-relaxed">
                                    {recommendations[selectedCard].details.explanation}
                                </p>
                            </div>

                            {/* Tips */}
                            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                                    <Leaf size={18} className="text-green-400" />
                                    Lời khuyên cụ thể
                                </h3>
                                <ul className="space-y-2">
                                    {recommendations[selectedCard].details.tips.map((tip, i) => (
                                        <li key={i} className="flex items-start gap-3 text-slate-300">
                                            <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                                {i + 1}
                                            </span>
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Symptoms if available */}
                            {recommendations[selectedCard].details.symptoms && (
                                <div className="bg-red-500/10 rounded-xl p-5 border border-red-500/30">
                                    <h3 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                                        <Stethoscope size={18} />
                                        Triệu chứng cần chú ý
                                    </h3>
                                    <ul className="space-y-2">
                                        {recommendations[selectedCard].details.symptoms.map((symptom, i) => (
                                            <li key={i} className="flex items-start gap-2 text-red-200">
                                                <AlertTriangle size={14} className="mt-1 flex-shrink-0" />
                                                {symptom}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Products if available */}
                            {recommendations[selectedCard].details.products && (
                                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                                    <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                                        <Clock size={18} className="text-amber-400" />
                                        Sản phẩm khuyên dùng
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {recommendations[selectedCard].details.products.map((product, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-slate-700 rounded-lg text-sm text-slate-300 border border-slate-600">
                                                {product}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quick Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={closeModal}
                                    className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                                >
                                    Đã hiểu
                                </button>
                                <button
                                    onClick={() => {
                                        // Navigate to next card
                                        setSelectedCard(prev => prev !== null ? (prev + 1) % recommendations.length : 0);
                                    }}
                                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    Xem tiếp
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HealthAdvice;
