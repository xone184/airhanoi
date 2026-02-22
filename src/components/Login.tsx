import React, { useState } from 'react';
import { User } from '../types';
import { KeyRound, Mail, ArrowRight } from 'lucide-react';

interface LoginProps {
    onLogin: (user: User) => void;
    onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToRegister }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const cleanUsername = username.trim();
        const cleanPassword = password.trim();

        if (!cleanUsername || !cleanPassword) {
            setError('Vui lòng nhập đầy đủ Email/Username và Mật khẩu.');
            return;
        }

        setLoading(true);

        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost/hanoi-air-quality-monitor/api';
            const response = await fetch(`${API_BASE}/auth.php?action=login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: cleanUsername, password: cleanPassword })
            });

            const contentType = response.headers.get('content-type');
            const rawText = await response.text();

            if (!contentType || !contentType.includes('application/json')) {
                setError(`Server lỗi: ${rawText.substring(0, 150) || 'Response rỗng'}`);
                return;
            }
            if (!rawText?.trim()) {
                setError(`Server trả về JSON rỗng (HTTP ${response.status}).`);
                return;
            }

            let result: any;
            try { result = JSON.parse(rawText); }
            catch { setError('Server trả về JSON không hợp lệ.'); return; }

            if (!response.ok || !result.success) {
                setError(result.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
                return;
            }

            if (result.data.user && result.data.token) {
                localStorage.setItem('user', JSON.stringify({ ...result.data.user, token: result.data.token }));
                onLogin({
                    user_id: result.data.user.user_id,
                    username: result.data.user.username,
                    email: result.data.user.email,
                    role: result.data.user.role,
                    isLoggedIn: true,
                    token: result.data.token
                });
            } else {
                setError('Dữ liệu đăng nhập không hợp lệ.');
            }
        } catch (err: any) {
            setError('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = (provider: string) => {
        // Social login is not implemented yet, show info message
        setError(`Đăng nhập qua ${provider} chưa được hỗ trợ. Vui lòng dùng email và mật khẩu.`);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555921015-5532091f6026?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center z-0" />
            <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm z-0" />

            <div className="relative z-10 w-full max-w-[420px] animate-fade-in-up">
                <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
                    {/* Logo & Title */}
                    <div className="text-center mb-7">
                        <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                            <span className="text-2xl font-bold text-white">HN</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Chào mừng trở lại</h2>
                        <p className="text-slate-400 mt-1 text-sm">Hệ thống Quan trắc Chất lượng Không khí</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-3 text-slate-500" size={17} />
                                <input
                                    type="text"
                                    className="w-full bg-white/10 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 transition-all"
                                    placeholder="user@airhanoi.vn"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Mật khẩu</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3.5 top-3 text-slate-500" size={17} />
                                <input
                                    type="password"
                                    className="w-full bg-white/10 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 transition-all"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-xs p-3 rounded-lg text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group disabled:opacity-70 mt-2"
                        >
                            {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
                            {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>

                    {/* Social Login Divider */}
                    <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-slate-500 text-xs">hoặc đăng nhập nhanh hơn</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Google Login */}
                    <button
                        onClick={() => handleSocialLogin('Google')}
                        className="w-full flex items-center justify-center gap-3 py-2.5 bg-white hover:bg-gray-100 text-gray-700 font-medium text-sm rounded-xl transition-all mb-3 shadow"
                    >
                        {/* Google icon SVG */}
                        <svg width="18" height="18" viewBox="0 0 48 48">
                            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                            <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                        </svg>
                        Đăng nhập với Google
                    </button>

                    {/* Facebook Login */}
                    <button
                        onClick={() => handleSocialLogin('Facebook')}
                        className="w-full flex items-center justify-center gap-3 py-2.5 bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium text-sm rounded-xl transition-all shadow"
                    >
                        {/* Facebook icon SVG */}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        Đăng nhập với Facebook
                    </button>

                    {/* Register Link */}
                    <div className="mt-6 text-center">
                        <p className="text-slate-500 text-sm">Chưa có tài khoản?</p>
                        <button
                            onClick={onSwitchToRegister}
                            className="text-cyan-400 font-semibold hover:text-cyan-300 mt-1 text-sm transition-colors hover:underline"
                        >
                            Đăng ký tài khoản mới →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;