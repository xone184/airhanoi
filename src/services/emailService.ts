/**
 * EmailJS Service
 * Gửi email trực tiếp từ frontend qua EmailJS SDK
 */
import emailjs from '@emailjs/browser';

// EmailJS Configuration
const EMAILJS_PUBLIC_KEY = 'x2nznLfYeS91lI62z';
const EMAILJS_SERVICE_ID = 'service_57bwzsv';
const EMAILJS_TEMPLATE_ID = 'template_184stu9';

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

/**
 * Gửi email test từ trang Cài Đặt
 */
export async function sendTestEmail(toEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
        const result = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            to_email: toEmail,
            name: 'Người dùng AirHanoi',
            title: 'Email Test - Hệ thống thông báo AirHanoi',
            message: 'Đây là email thử nghiệm từ AirHanoi. Nếu bạn nhận được email này, hệ thống gửi mail đã hoạt động tốt!',
        });

        if (result.status === 200) {
            return { success: true };
        }
        return { success: false, error: `EmailJS Error: ${result.text}` };
    } catch (error: any) {
        console.error('EmailJS sendTestEmail error:', error);
        return { success: false, error: error?.text || error?.message || 'Không thể gửi email thử' };
    }
}

/**
 * Gửi email cảnh báo AQI
 */
export async function sendAlertEmail(params: {
    toEmail: string;
    username: string;
    district: string;
    aqi: number;
    threshold: number;
    pm25?: number;
    temperature?: number;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const severity = getAqiSeverity(params.aqi);

        const result = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            to_email: params.toEmail,
            name: params.username,
            title: `⚠️ Cảnh báo AQI: ${params.aqi} - ${severity.label} tại ${params.district}`,
            message: `Hệ thống AirHanoi phát hiện chất lượng không khí tại ${params.district} đang ở mức ${severity.label} (AQI: ${params.aqi}). Ngưỡng đăng ký của bạn: ${params.threshold}.${params.pm25 ? ` PM2.5: ${params.pm25} µg/m³.` : ''}${params.temperature ? ` Nhiệt độ: ${params.temperature}°C.` : ''} Vui lòng hạn chế hoạt động ngoài trời và bảo vệ sức khỏe.`,
        });

        if (result.status === 200) {
            return { success: true };
        }
        return { success: false, error: `EmailJS Error: ${result.text}` };
    } catch (error: any) {
        console.error('EmailJS sendAlertEmail error:', error);
        return { success: false, error: error?.text || error?.message || 'Không thể gửi email cảnh báo' };
    }
}

/**
 * Gửi email chào mừng khi đăng ký newsletter
 */
export async function sendWelcomeEmail(toEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
        const result = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            to_email: toEmail,
            name: toEmail,
            title: '🌱 Đăng ký bản tin AirHanoi thành công',
            message: 'Cảm ơn bạn đã đăng ký nhận bản tin môi trường từ AirHanoi. Chúng tôi sẽ gửi cho bạn các thông tin cập nhật về chất lượng không khí, mẹo sống xanh và các sự kiện môi trường sắp diễn ra.',
        });

        if (result.status === 200) {
            return { success: true };
        }
        return { success: false, error: `EmailJS Error: ${result.text}` };
    } catch (error: any) {
        console.error('EmailJS sendWelcomeEmail error:', error);
        return { success: false, error: error?.text || error?.message || 'Không thể gửi email chào mừng' };
    }
}

// Helper: Get AQI severity info
function getAqiSeverity(aqi: number) {
    if (aqi <= 100) return { label: 'Tốt', icon: '✅' };
    if (aqi <= 150) return { label: 'Trung bình', icon: '⚠️' };
    if (aqi <= 200) return { label: 'Kém', icon: '🟠' };
    if (aqi <= 300) return { label: 'Xấu', icon: '🔴' };
    return { label: 'Nguy hại', icon: '🚨' };
}
