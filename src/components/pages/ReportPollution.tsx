import React, { useState, useRef } from 'react';
import { HANOI_DISTRICTS_RAW } from '../../constants';
import { Camera, MapPin, Send, AlertTriangle, CheckCircle, Clock, HelpCircle, FileText, ArrowRight, X, Paperclip, Loader } from 'lucide-react';
import { PollutionReport, PollutionType } from '../../types';

interface ReportPollutionProps {
    onSubmitReport?: (report: PollutionReport) => void;
}

const ReportPollution: React.FC<ReportPollutionProps> = ({ onSubmitReport }) => {
    const [form, setForm] = useState({
        district: 'Ba Đình',
        address: '',
        type: 'burning' as PollutionType,
        customType: '',
        description: ''
    });
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type and size
            const allowedTypes = [
                'image/jpeg', 'image/png', 'image/webp', 'image/gif',
                'video/mp4', 'video/quicktime', 'video/webm',
                'video/x-matroska', 'video/avi', 'video/mpeg', 'video/3gpp'
            ];

            // Check based on type or extension as fallback
            const isTypeValid = allowedTypes.includes(file.type);
            const isExtensionValid = /\.(jpg|jpeg|png|webp|gif|mp4|mov|webm|mkv|avi|mpeg|3gp)$/i.test(file.name);

            if (!isTypeValid && !isExtensionValid) {
                setError('Định dạng file không hợp lệ. Hỗ trợ ảnh (JPG, PNG, GIF) và video (MP4, MOV, AVI, MKV...).');
                return;
            }
            if (file.size > 50 * 1024 * 1024) { // 50MB
                setError('Kích thước file quá lớn. Tối đa 50MB.');
                return;
            }
            setEvidenceFile(file);
            setError(''); // Clear previous errors
        }
    };

    const handlePreSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.address.trim()) {
            setError('Vui lòng nhập địa chỉ cụ thể.');
            return;
        }
        if (form.type === 'other' && !form.customType.trim()) {
            setError('Vui lòng nhập chi tiết loại hình ô nhiễm.');
            return;
        }
        if (form.description.trim().length < 10) {
            setError('Mô tả cần chi tiết hơn (tối thiểu 10 ký tự).');
            return;
        }
        if (!evidenceFile) {
            setError('Vui lòng tải lên hình ảnh hoặc video bằng chứng.');
            return;
        }

        setShowConfirmModal(true);
    };

    const handleConfirmSubmit = async () => {
        setShowConfirmModal(false);
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('district', form.district);
        formData.append('address', form.address);
        formData.append('type', form.type);
        formData.append('customType', form.customType);
        formData.append('description', form.description);
        formData.append('evidence', evidenceFile as File);

        // TODO: This is a temporary fix. In a real application, the user_id should be retrieved
        // from a proper authentication context (e.g., React Context or a state management library)
        // after the user has logged in. Using '2' corresponds to the default 'user1'.
        formData.append('user_id', '2');

        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost/hanoi-air-quality-monitor/api';
            const response = await fetch(`${API_BASE_URL}/content/submit_report.php`, {
                method: 'POST',
                body: formData,
            });

            const textResult = await response.text();
            let result;
            try {
                result = JSON.parse(textResult);
            } catch (jsonError) {
                console.error("Parsed Response Text:", textResult);
                throw new Error("Phản hồi từ server không hợp lệ. Vui lòng kiểm tra console.");
            }

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Có lỗi xảy ra khi gửi báo cáo.');
            }

            setSuccess('Cảm ơn! Báo cáo của bạn đã được gửi thành công và đang chờ duyệt.');
            setForm({ district: 'Ba Đình', address: '', type: 'burning', customType: '', description: '' });
            setEvidenceFile(null);

            // Optionally, call the parent onSubmitReport handler
            if (onSubmitReport && result.data) {
                onSubmitReport(result.data);
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Không thể kết nối đến server. Vui lòng thử lại sau.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 lg:p-10 animate-fade-in h-full overflow-y-auto pb-20 relative">
            <header className="mb-10">
                <h1 className="text-4xl font-extrabold text-white mb-3">Báo Cáo Điểm Nóng</h1>
                <p className="text-slate-300 text-xl">Cùng cộng đồng phát hiện và báo cáo các nguồn gây ô nhiễm</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-3xl p-8 lg:p-10 border border-slate-700 shadow-2xl">
                    <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3 border-b border-slate-700 pb-4">
                        <AlertTriangle className="text-orange-500" size={32} />
                        Thông tin phản ánh
                    </h2>

                    <form onSubmit={handlePreSubmit} className="space-y-8">
                        {/* Area Selection */}
                        <div>
                            <label className="block text-xl font-bold text-slate-200 mb-3">Khu vực (Quận/Huyện)</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-4 text-slate-400" size={28} />
                                <select
                                    className="w-full bg-slate-900 border border-slate-600 rounded-2xl py-4 pl-14 pr-6 text-white text-lg font-medium focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all cursor-pointer"
                                    value={form.district}
                                    onChange={e => setForm({ ...form, district: e.target.value })}
                                    disabled={isSubmitting}
                                >
                                    {HANOI_DISTRICTS_RAW.map(d => (
                                        <option key={d.name} value={d.name}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Address Input */}
                        <div>
                            <label className="block text-xl font-bold text-slate-200 mb-3">Địa chỉ cụ thể</label>
                            <input
                                type="text"
                                className="w-full bg-slate-900 border border-slate-600 rounded-2xl py-4 px-6 text-white text-lg focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 outline-none placeholder-slate-500 transition-all"
                                placeholder="Ví dụ: Số 123 đường Xuân Thủy..."
                                value={form.address}
                                required
                                onChange={e => setForm({ ...form, address: e.target.value })}
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Pollution Type Grid */}
                        <div>
                            <label className="block text-xl font-bold text-slate-200 mb-4">Loại hình ô nhiễm</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {(['burning', 'construction', 'traffic', 'industrial', 'other'] as const).map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => setForm({ ...form, type })}
                                        className={`p-6 rounded-2xl border-2 text-lg font-bold transition-all flex flex-col items-center gap-3 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50
                                            ${form.type === type
                                                ? { burning: 'bg-red-500/20 border-red-500 text-red-400', construction: 'bg-orange-500/20 border-orange-500 text-orange-400', traffic: 'bg-purple-500/20 border-purple-500 text-purple-400', industrial: 'bg-blue-500/20 border-blue-500 text-blue-400', other: 'bg-emerald-500/20 border-emerald-500 text-emerald-400' }[type]
                                                : 'bg-slate-900 border-slate-700 text-slate-400'
                                            }`}
                                    >
                                        <span className="text-4xl">
                                            {{ burning: '🔥', construction: '🏗️', traffic: '🚗', industrial: '🏭', other: '❓' }[type]}
                                        </span>
                                        {{ burning: 'Đốt rác', construction: 'Xây dựng', traffic: 'Giao thông', industrial: 'Công nghiệp', other: 'Khác' }[type]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {form.type === 'other' && (
                            <div className="animate-fade-in-up">
                                <label className="block text-xl font-bold text-emerald-400 mb-3">Vui lòng ghi rõ loại hình <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-900 border border-emerald-500/50 rounded-2xl py-4 px-6 text-white text-lg focus:ring-4 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
                                    placeholder="Ví dụ: Mùi hóa chất lạ, Xả thải nước đen..."
                                    value={form.customType}
                                    onChange={e => setForm({ ...form, customType: e.target.value })}
                                    disabled={isSubmitting}
                                />
                            </div>
                        )}

                        {/* Description */}
                        <div>
                            <label className="block text-xl font-bold text-slate-200 mb-3">Mô tả chi tiết</label>
                            <textarea
                                className="w-full bg-slate-900 border border-slate-600 rounded-2xl py-4 px-6 text-white text-lg focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 outline-none h-40 resize-none transition-all"
                                placeholder="Mô tả mức độ khói bụi, thời gian diễn ra, ảnh hưởng đến xung quanh..."
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                disabled={isSubmitting}
                            />
                            <div className="flex justify-end mt-1">
                                <span className={`text-xs ${form.description.length < 10 ? 'text-orange-400' : 'text-green-400'}`}>
                                    {form.description.length}/10 ký tự tối thiểu
                                </span>
                            </div>
                        </div>

                        {/* Evidence Upload */}
                        <div>
                            <label className="block text-xl font-bold text-slate-200 mb-3">Hình ảnh/Video bằng chứng <span className="text-red-500">*</span></label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileChange}
                                accept="image/*,video/*"
                                disabled={isSubmitting}
                            />
                            {!evidenceFile ? (
                                <div
                                    onClick={() => !isSubmitting && fileInputRef.current?.click()}
                                    className="border-3 border-dashed border-slate-600 rounded-2xl p-10 text-center hover:border-blue-500 hover:bg-slate-700/30 transition-all cursor-pointer group"
                                >
                                    <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <Camera size={40} className="text-slate-400 group-hover:text-blue-400" />
                                    </div>
                                    <span className="text-slate-400 font-medium text-lg">Nhấn để tải lên ảnh hoặc video</span>
                                    <p className="text-slate-500 text-sm mt-2">Hỗ trợ JPG, PNG, MP4, MOV, AVI... (Tối đa 50MB)</p>
                                </div>
                            ) : (
                                <div className="bg-slate-900 border border-slate-600 rounded-2xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Paperclip className="text-green-400" />
                                        <span className="text-white truncate">{evidenceFile.name}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setEvidenceFile(null)}
                                        className="p-2 text-slate-400 hover:text-white hover:bg-red-500/20 rounded-full"
                                        disabled={isSubmitting}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-center gap-3 text-red-300">
                                <AlertTriangle size={24} />
                                <span>{error}</span>
                            </div>
                        )}
                        {success && (
                            <div className="bg-green-500/10 border border-green-500/50 p-4 rounded-xl flex items-center gap-3 text-green-300">
                                <CheckCircle size={24} />
                                <span>{success}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-blue-500/40 active:scale-[0.98] text-invariant-white
                                ${isSubmitting ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white'}`}
                        >
                            {isSubmitting ? (
                                <><Loader className="animate-spin" /> Đang Gửi Báo Cáo...</>
                            ) : (
                                <><Send size={24} /> Gửi Báo Cáo Ngay</>
                            )}
                        </button>
                    </form>
                </div>

                {/* Sidebar Info Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gradient-to-br from-blue-900/50 to-slate-900 p-8 rounded-3xl border border-blue-500/30 shadow-xl">
                        <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <CheckCircle className="text-blue-400" size={28} />
                            Quy Trình Xử Lý
                        </h3>
                        <div className="space-y-6 relative">
                            <div className="absolute left-[19px] top-2 bottom-4 w-0.5 bg-slate-700"></div>
                            <div className="flex gap-4 relative z-10">
                                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 font-bold text-white shadow-lg border-4 border-slate-900">1</div>
                                <div>
                                    <h4 className="font-bold text-white text-lg">Tiếp nhận</h4>
                                    <p className="text-slate-400 text-base">Hệ thống ghi nhận thông tin và hình ảnh từ bạn.</p>
                                </div>
                            </div>
                            <div className="flex gap-4 relative z-10">
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 font-bold text-slate-300 border-4 border-slate-900">2</div>
                                <div>
                                    <h4 className="font-bold text-slate-200 text-lg">Xác minh</h4>
                                    <p className="text-slate-400 text-base">Admin kiểm tra tính xác thực của báo cáo (trong 24h).</p>
                                </div>
                            </div>
                            <div className="flex gap-4 relative z-10">
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 font-bold text-slate-300 border-4 border-slate-900">3</div>
                                <div>
                                    <h4 className="font-bold text-slate-200 text-lg">Xử lý</h4>
                                    <p className="text-slate-400 text-base">Gửi thông báo tới cơ quan chức năng để xử lý vi phạm.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-800 rounded-3xl p-8 max-w-md w-full border border-slate-700 shadow-2xl animate-scale-in">
                        <div className="mb-6 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle size={32} className="text-blue-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Xác nhận gửi báo cáo?</h3>
                            <p className="text-slate-300">Thông tin của bạn sẽ được gửi đến Ban quản trị để xác minh. Bạn có chắc chắn muốn tiếp tục?</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-3 rounded-xl font-bold text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmSubmit}
                                className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all"
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

export default ReportPollution;
