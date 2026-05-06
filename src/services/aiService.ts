import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true,
});

export const aiService = {
    async analyzeYearlyTrend(yearlyData: any[], owmData: any[]) {
        try {
            const prompt = `Dưới đây là dữ liệu thống kê chất lượng không khí (AQI) trung bình theo tháng qua các năm.
Dữ liệu từ DB nội bộ: ${JSON.stringify(yearlyData)}
Dữ liệu lịch sử từ OpenWeatherMap: ${JSON.stringify(owmData)}

Hãy đóng vai là một chuyên gia môi trường, phân tích dữ liệu trên và đưa ra nhận định ngắn gọn, súc tích (khoảng 3-4 câu) về:
1. Xu hướng thay đổi AQI giữa năm nay so với các năm trước.
2. Dự đoán tình hình ô nhiễm trong các tháng tới dựa trên quy luật mùa (nếu có).
3. Đưa ra 1 lời khuyên chung cho người dân Hà Nội.

Định dạng trả về: Chỉ trả về đoạn văn bản nhận định, không cần tiêu đề.`;

            const completion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'llama3-8b-8192',
            });

            return completion.choices[0]?.message?.content || 'Không thể tạo nhận định lúc này.';
        } catch (error) {
            console.error('Lỗi khi gọi AI:', error);
            return 'Đã xảy ra lỗi khi lấy nhận định từ AI.';
        }
    }
};
