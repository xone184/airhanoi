const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost/doan_airhanoi/api';

export const aiService = {
    async analyzeYearlyTrend(yearlyData: any[], owmData: any[]) {
        try {
            const response = await fetch(`${API_BASE}/data/statistics.php?type=ai_analysis`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    yearlyData,
                    owmData
                })
            });

            if (!response.ok) {
                throw new Error('Lỗi từ server: ' + response.statusText);
            }

            const data = await response.json();
            if (data.success && data.data && data.data.analysis) {
                return data.data.analysis;
            } else {
                return 'Không thể tạo nhận định lúc này. ' + (data.error || '');
            }
        } catch (error) {
            console.error('Lỗi khi gọi AI qua backend:', error);
            return 'Đã xảy ra lỗi khi lấy nhận định từ AI. Vui lòng kiểm tra lại kết nối.';
        }
    }
};
