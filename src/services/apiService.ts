
// API Base URL - Adjust according to your setup
// Nếu api/ nằm trong project: http://localhost/hanoi-air-quality-monitor/api
// Nếu api/ nằm trong htdocs/api: http://localhost/api
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost/hanoi-air-quality-monitor/api';

// Get auth token from localStorage
const getToken = (): string | null => {
    const user = localStorage.getItem('user');
    if (user) {
        try {
            const userData = JSON.parse(user);
            return userData.token || null;
        } catch {
            return null;
        }
    }
    return null;
};

// API Request helper
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
    const token = getToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const url = `${API_BASE_URL}/${endpoint}`;
        console.log('API Request:', url, options.method || 'GET');

        const response = await fetch(url, {
            ...options,
            headers,
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            return {
                success: false,
                error: `Server returned non-JSON response: ${text.substring(0, 120)}`
            };
        }

        // Đọc body an toàn, tránh lỗi "Unexpected end of JSON input"
        const rawText = await response.text();
        if (!rawText || !rawText.trim()) {
            console.error('Empty JSON response body from server, status:', response.status);
            return {
                success: false,
                error: `Empty JSON response from server (HTTP ${response.status}). Kiểm tra lỗi PHP/XAMPP hoặc cấu hình database.`
            };
        }

        let result: any;
        try {
            result = JSON.parse(rawText);
        } catch (parseErr) {
            console.error('Invalid JSON response:', rawText);
            return {
                success: false,
                error: `Server returned invalid JSON: ${rawText.substring(0, 200)}`
            };
        }

        if (!response.ok) {
            console.error('API Error Response:', result);
            return {
                success: false,
                error: result.error || `HTTP ${response.status}: ${response.statusText}`
            };
        }

        return result;
    } catch (error: any) {
        console.error('API Request Error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            url: `${API_BASE_URL}/${endpoint}`
        });
        return {
            success: false,
            error: error.message || 'Network error. Kiểm tra: 1) XAMPP Apache đã chạy chưa? 2) Đường dẫn API đúng chưa? 3) CORS được cấu hình chưa?'
        };
    }
}

// Upload file helper
async function apiUpload(
    endpoint: string,
    file: File,
    type: string
): Promise<{ success: boolean; data?: any; error?: string }> {
    const token = getToken();

    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}?type=${type}`, {
            method: 'POST',
            headers,
            body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: result.error || `HTTP ${response.status}: ${response.statusText}`
            };
        }

        return result;
    } catch (error: any) {
        console.error('API Upload Error:', error);
        return {
            success: false,
            error: error.message || 'Network error'
        };
    }
}

// ============================================
// API Endpoints
// ============================================

export const api = {
    // Authentication
    async login(username: string, password: string) {
        return apiRequest('auth.php?action=login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
    },

    async register(userData: { username: string; email: string; password: string; fullName?: string }) {
        return apiRequest('auth.php?action=register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    },

    async getCurrentUser() {
        return apiRequest('auth.php?action=me');
    },

    // Air Quality Data
    async getRealtimeData() {
        return apiRequest<DistrictData[]>('air_quality.php?type=realtime');
    },

    async getForecastData(districtId?: number, limit?: number) {
        let url = 'air_quality.php?type=forecast';
        if (districtId) url += `&district_id=${districtId}`;
        if (limit) url += `&limit=${limit}`;
        return apiRequest<ForecastData[]>(url);
    },

    async getForecastDataAll() {
        return apiRequest<ForecastData[]>('air_quality.php?type=forecast&limit=210'); // 30 districts * 7 days
    },

    async uploadRealtimeCSV(file: File) {
        return apiUpload('upload.php', file, 'realtime');
    },

    async uploadForecastCSV(file: File) {
        return apiUpload('upload.php', file, 'forecast');
    },

    // Pollution Reports
    async getReports(filters?: { status?: string; userId?: number; date?: string }) {
        let url = 'reports.php';
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.userId) params.append('user_id', filters.userId.toString());
        if (filters?.date) params.append('date', filters.date);
        if (params.toString()) url += '?' + params.toString();
        return apiRequest<PollutionReport[]>(url);
    },

    async createReport(report: Omit<PollutionReport, 'report_id' | 'created_at' | 'status'>) {
        return apiRequest<PollutionReport>('reports.php', {
            method: 'POST',
            body: JSON.stringify(report),
        });
    },

    async updateReportStatus(reportId: number, action: 'verify' | 'reject', reason?: string) {
        return apiRequest(`reports.php?id=${reportId}&action=${action}`, {
            method: 'PUT',
            body: JSON.stringify({ reason }),
        });
    },

    async bulkUpdateReportStatus(ids: number[], status: 'verified' | 'rejected', reason?: string) {
        return apiRequest('reports.php', {
            method: 'PUT',
            body: JSON.stringify({ ids, status, reason, action: 'bulk' }),
        });
    },

    // User Settings
    async getSettings() {
        return apiRequest<UserSettings>('settings.php');
    },

    async updateSettings(settings: Partial<UserSettings>) {
        return apiRequest('settings.php', {
            method: 'PUT',
            body: JSON.stringify(settings),
        });
    },

    // System settings (maintenance, refresh interval)
    async getSystemSettings() {
        return apiRequest('system_settings.php');
    },

    async updateSystemSettings(payload: { maintenanceMode?: boolean; refreshInterval?: string }) {
        return apiRequest('system_settings.php', {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    },

    // Email notifications via Resend
    async sendTestEmail(payload: { email?: string; subject?: string; message?: string }) {
        return apiRequest('resend_email.php', {
            method: 'POST',
            body: JSON.stringify({
                action: 'send_test',
                email: payload.email
            }),
        });
    },

    async sendAqiAlertEmail(payload: {
        email: string;
        username: string;
        district: string;
        aqi: number;
        threshold: number;
        pm25?: number;
        temperature?: number;
    }) {
        return apiRequest('resend_email.php', {
            method: 'POST',
            body: JSON.stringify({
                action: 'send_alert',
                ...payload
            }),
        });
    },

    // Users (admin)
    async getUsers() {
        return apiRequest('users.php');
    },

    async updateUser(userId: number, action: 'ban' | 'activate' | 'promote') {
        return apiRequest('users.php', {
            method: 'PUT',
            body: JSON.stringify({ user_id: userId, action }),
        });
    },

    async updateUserInfo(userId: number, username: string, email: string, role: string) {
        return apiRequest('users.php', {
            method: 'PUT',
            body: JSON.stringify({
                user_id: userId,
                action: 'update_info',
                username,
                email,
                role
            }),
        });
    },

    async createUser(payload: { username: string; email: string; password: string; role: 'admin' | 'user' }) {
        return apiRequest('users.php', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async deleteUser(userId: number) {
        return apiRequest('users.php', {
            method: 'DELETE',
            body: JSON.stringify({ user_id: userId }),
        });
    },

    // Health Logs
    async getHealthLogs(userId?: number) {
        let url = 'health.php';
        if (userId) url += `?user_id=${userId}`;
        return apiRequest<HealthLog[]>(url);
    },

    async createHealthLog(log: Omit<HealthLog, 'id'>) {
        return apiRequest<HealthLog>('health.php', {
            method: 'POST',
            body: JSON.stringify(log),
        });
    },

    // News
    async getNews(category?: string, limit?: number) {
        let url = 'news.php';
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (limit) params.append('limit', limit.toString());
        if (params.toString()) url += '?' + params.toString();
        return apiRequest<NewsItem[]>(url);
    },

    // Refresh news from external sources (Reddit, Google News)
    async refreshNews() {
        return apiRequest<{ message: string; inserted: number }>('news.php?action=fetch_external');
    },

    // Newsletter subscription
    async subscribeNewsletter(email: string) {
        return apiRequest<{ message: string; subscriber_id?: number; already_subscribed?: boolean }>('newsletter.php', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    },

    async getNewsletterSubscribers() {
        return apiRequest<{ id: number; email: string; subscribed_at: string; status: string }[]>('newsletter.php');
    },
};

// Import types
import { DistrictData, ForecastData, PollutionReport, UserSettings, HealthLog, NewsItem } from '../types';

