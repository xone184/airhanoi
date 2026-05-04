import { DistrictData } from "../types";

// Groq API Configuration
// Groq API Configuration
// Call backend proxy instead of direct Groq API
const GROQ_API_URL = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/system/chat.php` : "http://localhost/airhanoi/api/system/chat.php";
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

interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    score: number;
}

// Web Search function using Tavily API
const searchWeb = async (query: string, type: 'general' | 'news' = 'news'): Promise<SearchResult[]> => {
    const API_URL = import.meta.env.VITE_API_BASE_URL
        ? `${import.meta.env.VITE_API_BASE_URL}/data/web_search.php`
        : "http://localhost/airhanoi/api/data/web_search.php";

    console.log("🔍 [WebSearch] Calling API:", API_URL);
    console.log("🔍 [WebSearch] Query:", query, "Type:", type);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, type, max_results: 5 })
        });

        console.log("🔍 [WebSearch] Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.warn('🔍 [WebSearch] Failed:', response.status, errorText);
            return [];
        }

        const data = await response.json();
        console.log("🔍 [WebSearch] Raw response:", data);

        // Handle different response formats
        const results = data.success && data.data?.results
            ? data.data.results
            : (data.results || []);

        console.log("🔍 [WebSearch] Parsed results:", results.length, "items");
        return results;
    } catch (error) {
        console.error('🔍 [WebSearch] Error:', error);
        return [];
    }
};

// Detect if query needs web search
const needsWebSearch = (query: string): boolean => {
    const searchKeywords = [
        // Tin tức / news
        'tin tức', 'news', 'mới nhất', 'hôm nay', 'gần đây', 'gần nhất',
        'theo báo', 'cập nhật', 'sự kiện', 'reddit', 'internet',
        // Thời tiết
        'thời tiết', 'dự báo thời tiết', 'mưa', 'nắng', 'nhiệt độ', 'bão',
        'gió', 'độ ẩm', 'khí hậu',
        // Sức khỏe / y tế
        'bệnh', 'sức khỏe', 'bệnh viện', 'thuốc', 'điều trị', 'y tế',
        'phòng ngừa', 'triệu chứng',
        // Thông tin/nghiên cứu
        'thông tin', 'nghiên cứu', 'báo cáo', 'dữ liệu', 'theo nghiên cứu',
        // Chính sách/quy định
        'chính sách', 'quy định', 'luật', 'biện pháp', 'giải pháp',
        // So sánh / quốc tế
        'so sánh', 'tokyo', 'beijing', 'bangkok', 'thế giới', 'quốc tế',
    ];
    const lowerQuery = query.toLowerCase();
    const needsSearch = searchKeywords.some(keyword => lowerQuery.includes(keyword));
    console.log("🔍 [NeedsWebSearch] Query:", query, "Result:", needsSearch);
    return needsSearch;
};

export const generateAIResponse = async (
    question: string,
    contextData: DistrictData[],
    onChunk?: (text: string) => void,
    webSearchEnabled: boolean = true
): Promise<AIResponse> => {
    console.log("🚀 generateAIResponse (Groq) called with question:", question);

    // Prepare system data summary
    const avgAQI = contextData.length > 0
        ? Math.round(contextData.reduce((acc, d) => acc + d.aqi, 0) / contextData.length)
        : 0;

    const topPolluted = [...contextData].sort((a, b) => b.aqi - a.aqi).slice(0, 5);
    const topClean = [...contextData].sort((a, b) => a.aqi - b.aqi).slice(0, 5);

    // Web search if needed AND enabled
    let webResults: SearchResult[] = [];
    let webSearchContext = '';

    if (webSearchEnabled && needsWebSearch(question)) {
        console.log("🔍 Performing web search for:", question);
        webResults = await searchWeb(question, 'news');
        console.log("🔍 Web search returned:", webResults.length, "results");

        if (webResults.length > 0) {
            webSearchContext = `
🌐 THÔNG TIN TỪ INTERNET (Nguồn tin mới nhất):
${webResults.map((r, i) => `${i + 1}. [${r.title}]
   📝 ${r.snippet ? r.snippet.substring(0, 200) : 'No snippet'}...
   🔗 ${r.url}`).join('\n\n')}

⚠️ LƯU Ý: Khi sử dụng thông tin từ internet, hãy trích dẫn nguồn bằng cách ghi [Nguồn: tên bài viết].
`;
        }
    }

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
${webSearchContext}`;

    const systemPrompt = `Bạn là trợ lý AI chuyên gia về chất lượng không khí tại Hà Nội tên là "AirHanoi AI".

🎯 NHIỆM VỤ:
- Phân tích và trả lời câu hỏi dựa trên DỮ LIỆU THỜI GIAN THỰC bên dưới
- Nếu có thông tin từ internet, hãy tham khảo và trích dẫn nguồn
- Đưa ra lời khuyên sức khỏe cụ thể, hữu ích
- Trả lời bằng ngôn ngữ người dùng sử dụng (Tiếng Việt hoặc Tiếng Anh)

📝 QUY TẮC:
- Trả lời ngắn gọn, súc tích (tối đa 300 từ)
- Sử dụng emoji phù hợp để dễ đọc
- Ưu tiên dữ liệu được cung cấp, không bịa số liệu
- Nếu được hỏi về khu vực cụ thể, tìm trong dữ liệu và trả lời chính xác
- Đưa ra cảnh báo sức khỏe khi AQI > 100
- Khi trích dẫn thông tin từ internet, ghi rõ [Nguồn: tên nguồn]

${dataSummary}`;

    const userPrompt = question;

    try {
        const text = await callGroqChat(systemPrompt, userPrompt, onChunk);

        // Return with sources from web search
        const sources = webResults.map(r => ({
            title: r.title,
            url: r.url
        }));

        console.log("✅ [generateAIResponse] Returning with", sources.length, "sources:", sources);

        return { text, sources };
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
