import React, { useState } from 'react';
import { User } from '../types';
import { KeyRound, Mail, User as UserIcon, ArrowLeft } from 'lucide-react';

interface RegisterProps {
    onRegister: (user: User) => void;
    onBackToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onRegister, onBackToLogin }) => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email.trim() || !name.trim() || !password.trim()) {
            setError('Vui lòng điền đầy đủ thông tin.');
            return;
        }

        if (!validateEmail(email)) {
            setError('Định dạng Email không hợp lệ.');
            return;
        }

        if (password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Mật khẩu nhập lại không khớp.');
            return;
        }

        try {
            // Call API to register
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost/hanoi-air-quality-monitor/api';
            const response = await fetch(`${API_BASE}/auth.php?action=register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: email,
                    email: email,
                    password: password,
                    fullName: name
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                setError(result.error || 'Đăng ký thất bại. Vui lòng thử lại.');
                return;
            }

            // Save user and token to localStorage
            if (result.data.user && result.data.token) {
                localStorage.setItem('user', JSON.stringify({
                    ...result.data.user,
                    token: result.data.token
                }));

                onRegister({
                    user_id: result.data.user.user_id,
                    username: result.data.user.username,
                    email: result.data.user.email,
                    role: result.data.user.role,
                    isLoggedIn: true,
                    token: result.data.token
                });
            }

        } catch (error: any) {
            console.error('Register error:', error);
            setError('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background - same as Login */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555921015-5532091f6026?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center z-0" />
            <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm z-0" />

            <div className="relative z-10 w-full max-w-[420px]">
                <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
                    <button
                        onClick={onBackToLogin}
                        className="absolute top-6 left-6 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={22} />
                    </button>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-white">Đăng Ký</h2>
                        <p className="text-slate-400 mt-2">Tạo tài khoản để nhận cảnh báo ô nhiễm</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Họ tên</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-3 text-slate-500 z-10" size={20} />
                                <input
                                    type="text"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 outline-none relative"
                                    placeholder="Nhập họ tên của bạn"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-slate-500 z-10" size={20} />
                                <input
                                    type="email"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 outline-none relative"
                                    placeholder="Nhập email của bạn"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Mật khẩu</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-3 text-slate-500 z-10" size={20} />
                                <input
                                    type="password"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 outline-none relative"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1 ml-1">Tối thiểu 6 ký tự</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Nhập lại mật khẩu</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-3 text-slate-500 z-10" size={20} />
                                <input
                                    type="password"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 outline-none relative"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</p>}

                        <button
                            type="submit"
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-invariant-white font-bold rounded-xl transition-all shadow-lg"
                        >
                            Tạo Tài Khoản
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;