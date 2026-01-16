import React, { useState } from 'react';
import { User } from '../types';
import { KeyRound, Mail, ShieldCheck, ArrowRight } from 'lucide-react';

interface LoginProps {
    onLogin: (user: User) => void;
    onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToRegister }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Form submitted!', { username, password: '***' });
        setError('');
        
        const cleanUsername = username.trim();
        const cleanPassword = password.trim();

        if (!cleanUsername || !cleanPassword) {
            setError('Vui lòng nhập đầy đủ Email/Username và Mật khẩu.');
            return;
        }

        console.log('Starting login process...');
        setLoading(true);

        try {
            // Call API to login
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost/hanoi-air-quality-monitor/api';
            console.log('Login attempt:', { username: cleanUsername, API_BASE });
            
            const response = await fetch(`${API_BASE}/auth.php?action=login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: cleanUsername,
                    password: cleanPassword
                })
            });

            // Đọc raw response để tránh lỗi "Unexpected end of JSON input"
            const contentType = response.headers.get('content-type');
            const rawText = await response.text();

            // Nếu không phải JSON
            if (!contentType || !contentType.includes('application/json')) {
                console.error('Non-JSON response from auth.php:', rawText);
                setError(
                    `Server trả về lỗi (không phải JSON): ${rawText.substring(0, 150) || 'Response rỗng'}. ` +
                    'Kiểm tra lỗi PHP trong php_error_log hoặc tạm bật hiển thị lỗi trong api/config.php.'
                );
                setLoading(false);
                return;
            }

            if (!rawText || !rawText.trim()) {
                console.error('Empty JSON response body from auth.php, status:', response.status);
                setError(
                    `Server trả về JSON rỗng (HTTP ${response.status}). ` +
                    'Có thể auth.php đang lỗi 500/PHP. Vui lòng kiểm tra log PHP (php_error_log).'
                );
                setLoading(false);
                return;
            }

            let result: any;
            try {
                result = JSON.parse(rawText);
            } catch (parseErr) {
                console.error('Invalid JSON from auth.php:', rawText);
                setError(
                    'Server trả về JSON không hợp lệ. Chi tiết: ' +
                    rawText.substring(0, 200)
                );
                setLoading(false);
                return;
            }
            console.log('Login API response:', result);
            console.log('Response status:', response.status);

            if (!response.ok || !result.success) {
                console.error('Login failed:', result);
                setError(result.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
                setLoading(false);
            return;
        }

            // Save user and token to localStorage
            if (result.data.user && result.data.token) {
                localStorage.setItem('user', JSON.stringify({
                    ...result.data.user,
                    token: result.data.token
                }));
                
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

        } catch (error: any) {
            const API_BASE_FOR_ERROR = import.meta.env.VITE_API_BASE_URL || 'http://localhost/hanoi-air-quality-monitor/api';
            console.error('Login error:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                url: `${API_BASE_FOR_ERROR}/auth.php?action=login`
            });
            
            // Hiển thị lỗi chi tiết hơn
            if (error.message && error.message.includes('fetch')) {
                if (error.message.includes('CORS')) {
                    setError('Lỗi CORS: Header Access-Control-Allow-Origin bị trùng lặp. Đang sửa...');
                } else {
                    setError('Không thể kết nối đến server. Kiểm tra: 1) XAMPP Apache đã chạy chưa? 2) URL API đúng chưa? 3) CORS được cấu hình chưa?');
                }
            } else {
                setError('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và xem Console (F12) để biết chi tiết.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Immersive Background specifically for Login */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555921015-5532091f6026?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center z-0"></div>
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-0"></div>

            <div className="glass-panel p-8 rounded-3xl shadow-2xl w-full max-w-md relative z-10 animate-fade-in-up border border-white/10">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30 animate-float">
                        <span className="text-4xl font-bold text-white text-invariant-white">HN</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Chào mừng trở lại</h2>
                    <p className="text-slate-300 mt-2 text-sm">Hệ thống Quan trắc & Cảnh báo Chất lượng Không khí</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-300 uppercase tracking-wider ml-1">Email</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-cyan-400 transition-colors z-10" size={20} />
                            <input
                                type="text"
                                className="w-full glass-input rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all relative"
                                placeholder="Nhập email của bạn (VD: admin@airhanoi.vn)"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-300 uppercase tracking-wider ml-1">Mật khẩu</label>
                        <div className="relative group">
                            <KeyRound className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-cyan-400 transition-colors z-10" size={20} />
                            <input
                                type="password"
                                className="w-full glass-input rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all relative"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg text-center animate-fade-in">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-invariant-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-900/50 active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70"
                    >
                        {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
                        {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                    </button>
                </form>
                
                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                    <p className="text-slate-400 text-sm">Chưa có tài khoản?</p>
                    <button 
                        onClick={onSwitchToRegister}
                        className="text-cyan-400 font-bold hover:text-cyan-300 mt-2 transition-colors hover:underline"
                    >
                        Đăng ký tài khoản mới
                    </button>
                </div>

                
            </div>
        </div>
    );
};

export default Login;