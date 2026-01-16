import { DistrictData } from "../types";

// Groq API Configuration
// Groq API Configuration
// Call backend proxy instead of direct Groq API
const GROQ_API_URL = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/chat.php` : "http://localhost/airhanoi/api/chat.php";
const GROQ_MODEL = "llama-3.3-70b-versatile"; // Fast and powerful


interface GroqMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

// Call Groq API with streaming for real-time response
const callGroqChat = async (
    systemPrompt: string,
    userPrompt: string,
    onChunk?: (text: string) => void
): Promise<string> => {
    const messages: GroqMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
    ];

    const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages,
            stream: true,
            temperature: 0.7,
            max_tokens: 1024,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Groq API error:", response.status, errorText);
        throw new Error(`Groq API lỗi (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error("Không thể đọc streaming response từ Groq.");
    }

    const decoder = new TextDecoder();
    let fullContent = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() && line.startsWith('data: '));

        for (const line of lines) {
            const data = line.replace('data: ', '').trim();
            if (data === '[DONE]') continue;

            try {
                const json = JSON.parse(data);
                const content = json?.choices?.[0]?.delta?.content || "";
                if (content) {
                    fullContent += content;
                    if (onChunk) {
                        onChunk(fullContent);
                    }
                }
            } catch {
                // Skip invalid JSON
            }
        }
    }

    if (!fullContent) {
        throw new Error("Groq trả về phản hồi rỗng.");
    }
    return fullContent;
};

interface AIResponse {
    text: string;
    sources?: { title: string; url: string }[];
}

export const generateAIResponse = async (
    question: string,
    contextData: DistrictData[],
    onChunk?: (text: string) => void
): Promise<AIResponse> => {
    console.log("🚀 generateAIResponse (Groq) called with question:", question);

    // Prepare system data summary
    const avgAQI = contextData.length > 0
        ? Math.round(contextData.reduce((acc, d) => acc + d.aqi, 0) / contextData.length)
        : 0;

    const topPolluted = [...contextData].sort((a, b) => b.aqi - a.aqi).slice(0, 5);
    const topClean = [...contextData].sort((a, b) => a.aqi - b.aqi).slice(0, 5);

    const dataSummary = `
📊 THỐNG KÊ TỔNG QUAN (${contextData.length} khu vực):
- AQI trung bình: ${avgAQI}
- Mức độ: ${avgAQI <= 50 ? 'Tốt' : avgAQI <= 100 ? 'Trung bình' : avgAQI <= 150 ? 'Kém' : avgAQI <= 200 ? 'Xấu' : 'Rất xấu'}

🔴 TOP 5 Ô NHIỄM NHẤT:
${topPolluted.map((d, i) => `${i + 1}. ${d.district}: AQI ${d.aqi} (${d.pollution_level}), PM2.5: ${d.pm25}µg/m³`).join('\n')}

🟢 TOP 5 SẠCH NHẤT:
${topClean.map((d, i) => `${i + 1}. ${d.district}: AQI ${d.aqi} (${d.pollution_level}), PM2.5: ${d.pm25}µg/m³`).join('\n')}

📋 CHI TIẾT TẤT CẢ KHU VỰC:
${contextData.map(d => `${d.district}: AQI ${d.aqi}, PM2.5: ${d.pm25}, Nhiệt độ: ${d.temperature}°C, Độ ẩm: ${d.humidity}%`).join('\n')}
`;

    const systemPrompt = `Bạn là trợ lý AI chuyên gia về chất lượng không khí tại Hà Nội tên là "AirHanoi AI".

🎯 NHIỆM VỤ:
- Phân tích và trả lời câu hỏi dựa trên DỮ LIỆU THỜI GIAN THỰC bên dưới
- Đưa ra lời khuyên sức khỏe cụ thể, hữu ích
- Trả lời bằng ngôn ngữ người dùng sử dụng (Tiếng Việt hoặc Tiếng Anh)

📝 QUY TẮC:
- Trả lời ngắn gọn, súc tích (tối đa 200 từ)
- Sử dụng emoji phù hợp để dễ đọc
- Ưu tiên dữ liệu được cung cấp, không bịa số liệu
- Nếu được hỏi về khu vực cụ thể, tìm trong dữ liệu và trả lời chính xác
- Đưa ra cảnh báo sức khỏe khi AQI > 100

${dataSummary}`;

    const userPrompt = question;

    try {
        const text = await callGroqChat(systemPrompt, userPrompt, onChunk);
        return { text, sources: [] };
    } catch (error: any) {
        console.error("Groq Chat Error:", error);
        return {
            text: `❌ Đã xảy ra lỗi khi kết nối với AI: ${error?.message || 'Unknown error'}. Vui lòng thử lại.`
        };
    }
};

export const generateRouteAdvice = async (
    startDistrict: DistrictData,
    endDistrict: DistrictData,
    onChunk?: (text: string) => void
): Promise<string> => {
    const systemPrompt = `Bạn là chuyên gia tư vấn sức khỏe và di chuyển trong điều kiện ô nhiễm không khí tại Hà Nội.

🎯 NHIỆM VỤ: Đưa ra lời khuyên di chuyển an toàn dựa trên chỉ số AQI của điểm đi và điểm đến.

📝 QUY TẮC:
- Trả lời ngắn gọn (dưới 100 từ)
- Đề xuất phương tiện phù hợp (xe máy/ô tô/taxi/bus)
- Khuyến nghị loại khẩu trang cần thiết
- Cảnh báo sức khỏe nếu AQI cao
- Sử dụng emoji cho dễ đọc`;

    const userPrompt = `🚗 LỘ TRÌNH DI CHUYỂN:
- Điểm đi: ${startDistrict.district} (AQI: ${startDistrict.aqi}, PM2.5: ${startDistrict.pm25}µg/m³, ${startDistrict.pollution_level})
- Điểm đến: ${endDistrict.district} (AQI: ${endDistrict.aqi}, PM2.5: ${endDistrict.pm25}µg/m³, ${endDistrict.pollution_level})

Hãy đưa ra lời khuyên di chuyển an toàn.`;

    try {
        return await callGroqChat(systemPrompt, userPrompt, onChunk);
    } catch (error: any) {
        console.error("Route advice error:", error);
        return "❌ Không thể lấy lời khuyên từ AI lúc này. Vui lòng thử lại.";
    }
};

// Quick analysis function for dashboard widgets
export const quickAnalysis = async (
    contextData: DistrictData[],
    analysisType: 'summary' | 'health' | 'forecast'
): Promise<string> => {
    const avgAQI = contextData.length > 0
        ? Math.round(contextData.reduce((acc, d) => acc + d.aqi, 0) / contextData.length)
        : 0;

    const prompts = {
        summary: `AQI trung bình Hà Nội: ${avgAQI}. Tóm tắt tình hình trong 2 câu.`,
        health: `AQI trung bình: ${avgAQI}. Đưa ra 3 lời khuyên sức khỏe ngắn gọn.`,
        forecast: `AQI hiện tại: ${avgAQI}. Dự đoán xu hướng trong ngày.`
    };

    const systemPrompt = "Bạn là chuyên gia phân tích không khí. Trả lời cực kỳ ngắn gọn (tối đa 50 từ), sử dụng emoji.";

    try {
        return await callGroqChat(systemPrompt, prompts[analysisType]);
    } catch {
        return "Không thể phân tích lúc này.";
    }
};
