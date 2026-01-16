import { PollutionReport, UserSettings, DistrictData, HealthLog, ForecastData } from "../types";
type AdminUserRow = {
    id: number;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'banned';
    joined: string;
};
import { api } from './apiService';

// API Base URL
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost/hanoi-air-quality-monitor/api';

// Initial Mock Reports if DB is empty (Synced with database_schema.sql)
const SEED_REPORTS: PollutionReport[] = [
    {
        report_id: 1,
        user_id: 2, // Matches 'Standard User' in SQL
        district: "Bắc Từ Liêm",
        address: "Gần đường tàu Cổ Nhuế",
        type: "burning",
        description: "Đốt rác tự phát khói đen mù mịt gây khó thở cho người dân xung quanh.",
        status: "pending",
        created_at: new Date().toISOString()
    },
    {
        report_id: 2,
        user_id: 2,
        district: "Cầu Giấy",
        address: "Ngã tư Xuân Thủy",
        type: "construction",
        description: "Bụi từ công trình xây dựng không che chắn kỹ, bay mù mịt xuống đường.",
        status: "pending",
        created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
        report_id: 3,
        user_id: 2,
        district: "Hoàng Mai",
        address: "Khu công nghiệp Vĩnh Tuy",
        type: "industrial",
        description: "Có mùi hóa chất lạ nồng nặc vào buổi tối.",
        status: "verified",
        created_at: new Date(Date.now() - 86400000).toISOString()
    },
];

// Seed Logs for Demo
const SEED_HEALTH_LOGS: HealthLog[] = [
    { id: 1, date: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0], symptoms: ['Cay mắt'], severity: 2, note: "Hơi khó chịu khi đi đường", aqi_at_time: 110 },
    { id: 2, date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0], symptoms: ['Ho', 'Khó thở'], severity: 4, note: "AQI cao quá, người mệt mỏi", aqi_at_time: 165 },
    { id: 3, date: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0], symptoms: ['Mệt mỏi'], severity: 1, note: "Ở trong nhà cả ngày", aqi_at_time: 85 },
];

class DatabaseService {
    // --- REPORTS MANAGEMENT ---

    async getReports(): Promise<PollutionReport[]> {
        try {
            const result = await api.getReports();
            if (result.success && result.data) {
                return result.data;
            }
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        }
        return [];
    }

    async addReport(report: Omit<PollutionReport, 'report_id' | 'created_at' | 'status'>): Promise<PollutionReport> {
        const result = await api.createReport(report);
        if (result.success && result.data) {
            return result.data;
        }
        throw new Error(result.error || 'Failed to create report');
    }

    async updateReportStatus(ids: number[], status: 'verified' | 'rejected'): Promise<void> {
        if (ids.length === 0) return;

        if (ids.length === 1) {
            await api.updateReportStatus(ids[0], status === 'verified' ? 'verify' : 'reject');
        } else {
            await api.bulkUpdateReportStatus(ids, status);
        }
    }

    // --- SETTINGS MANAGEMENT ---

    async getSettings(): Promise<UserSettings> {
        try {
            const result = await api.getSettings();
            if (result.success && result.data) {
                return result.data;
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }

        // Fallback default
        return {
            email: '',
            phone: '',
            alertDistrict: 'Ba Đình',
            alertThreshold: 150,
            enableEmailAlerts: true,
            enableSmsAlerts: false,
            language: 'vi',
            temperatureUnit: 'c',
            themeMode: 'light'
        };
    }

    async saveSettings(settings: Partial<UserSettings>): Promise<void> {
        await api.updateSettings(settings);
    }

    async getSystemSettings(): Promise<{ maintenanceMode: boolean; refreshInterval: string; lastUpdated?: string; updatedBy?: string }> {
        const result = await api.getSystemSettings();
        if (result.success && result.data) return result.data as any;
        return { maintenanceMode: false, refreshInterval: '15m' };
    }

    async updateSystemSettings(payload: { maintenanceMode?: boolean; refreshInterval?: string }): Promise<void> {
        const result = await api.updateSystemSettings(payload);
        if (!result.success) {
            throw new Error(result.error || 'Failed to update system settings');
        }
    }

    async sendTestEmail(payload: { email?: string; subject?: string; message?: string }): Promise<void> {
        // Use Resend via PHP API
        const result = await api.sendTestEmail(payload);
        if (!result.success) {
            throw new Error(result.error || 'Không thể gửi email thử');
        }
    }

    // --- USERS (Admin) ---
    async getUsers(): Promise<AdminUserRow[]> {
        const result = await api.getUsers();
        if (result.success && result.data) {
            return (result.data as any[]).map(u => ({
                id: Number(u.user_id),
                name: u.username,
                email: u.email,
                role: u.role,
                status: Number(u.is_active) === 1 ? 'active' : 'banned',
                joined: u.created_at
            }));
        }
        throw new Error(result.error || 'Failed to load users');
    }

    async updateUser(userId: number, action: 'ban' | 'activate' | 'promote'): Promise<AdminUserRow> {
        const result = await api.updateUser(userId, action);
        if (result.success && result.data) {
            const u: any = result.data;
            return {
                id: Number(u.user_id),
                name: u.username,
                email: u.email,
                role: u.role,
                status: Number(u.is_active) === 1 ? 'active' : 'banned',
                joined: u.created_at
            };
        }
        throw new Error(result.error || 'Failed to update user');
    }

    async updateUserInfo(userId: number, username: string, email: string, role: string): Promise<AdminUserRow> {
        const result = await api.updateUserInfo(userId, username, email, role);
        if (result.success && result.data) {
            const u: any = result.data;
            return {
                id: Number(u.user_id),
                name: u.username,
                email: u.email,
                role: u.role,
                status: Number(u.is_active) === 1 ? 'active' : 'banned',
                joined: u.created_at
            };
        }
        throw new Error(result.error || 'Failed to update user info');
    }

    async createUser(payload: { username: string; email: string; password: string; role: 'admin' | 'user' }): Promise<AdminUserRow> {
        const result = await api.createUser(payload);
        if (result.success && result.data) {
            const u: any = result.data;
            return {
                id: Number(u.user_id),
                name: u.username,
                email: u.email,
                role: u.role,
                status: Number(u.is_active) === 1 ? 'active' : 'banned',
                joined: u.created_at,
            };
        }
        throw new Error(result.error || 'Failed to create user');
    }

    async deleteUser(userId: number): Promise<void> {
        const result = await api.deleteUser(userId);
        if (!result.success) {
            throw new Error(result.error || 'Failed to delete user');
        }
    }

    // --- DATA CACHING (Realtime & Forecast) ---
    // Lấy dữ liệu từ API backend

    async getRealtimeData(): Promise<DistrictData[]> {
        try {
            const result = await api.getRealtimeData();
            if (result.success && result.data) {
                return result.data;
            }
        } catch (error) {
            console.error('Failed to fetch realtime data:', error);
        }
        return [];
    }

    async getForecastData(): Promise<ForecastData[]> {
        try {
            const result = await api.getForecastData();
            if (result.success && result.data) {
                return result.data;
            }
        } catch (error) {
            console.error('Failed to fetch forecast data:', error);
        }
        return [];
    }

    // --- HEALTH LOGS ---

    async getHealthLogs(): Promise<HealthLog[]> {
        try {
            const result = await api.getHealthLogs();
            if (result.success && result.data) {
                return result.data;
            }
        } catch (error) {
            console.error('Failed to fetch health logs:', error);
        }
        return [];
    }

    async addHealthLog(log: Omit<HealthLog, 'id'>): Promise<HealthLog> {
        const result = await api.createHealthLog(log);
        if (result.success && result.data) {
            return result.data;
        }
        throw new Error(result.error || 'Failed to create health log');
    }
}

export const db = new DatabaseService();