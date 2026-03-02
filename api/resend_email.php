<?php
/**
 * Brevo Transactional Email API
 * Sử dụng Brevo API (HTTP/curl) để gửi email - không cần thư viện ngoài
 *
 * Endpoints:
 * POST /api/resend_email.php - Gửi email qua Brevo API
 */

// Brevo API Key (set via environment variable BREVO_API_KEY)
define('BREVO_API_KEY', getenv('BREVO_API_KEY') ?: '');
define('BREVO_FROM_EMAIL', 'adairhanoi@gmail.com');
define('BREVO_FROM_NAME', 'AirHanoi');
define('APP_URL', 'https://xone184.github.io/airhanoi');

require_once 'config.php';


header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Invalid request method.', 405);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    sendError('Invalid JSON data.', 400);
    exit;
}

$action = $data['action'] ?? 'send_alert';

switch ($action) {
    case 'send_test':
        handleSendTestEmail($data);
        break;
    case 'send_alert':
        handleSendAlertEmail($data);
        break;
    default:
        sendError('Unknown action.', 400);
}

/**
 * Send test email
 */
function handleSendTestEmail($data)
{
    $email = $data['email'] ?? null;

    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendError('Invalid email address.', 400);
        return;
    }

    $result = sendEmailViaPHPMailer(
        $email,
        '✅ AirHanoi - Email Test Thành Công',
        generateTestEmailHtml()
    );

    if ($result['success']) {
        sendSuccess(['message' => 'Email thử đã được gửi thành công!']);
    } else {
        sendError($result['error'], 500);
    }
}

/**
 * Send AQI alert email
 */
function handleSendAlertEmail($data)
{
    $email = $data['email'] ?? null;
    $username = $data['username'] ?? 'Người dùng';
    $district = $data['district'] ?? 'Hà Nội';
    $aqi = (int) ($data['aqi'] ?? 0);
    $threshold = (int) ($data['threshold'] ?? 150);
    $pm25 = $data['pm25'] ?? null;
    $temperature = $data['temperature'] ?? null;

    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendError('Invalid email address.', 400);
        return;
    }

    $subject = getAlertSubject($aqi, $district);
    $html = generateAlertEmailHtml($username, $district, $aqi, $threshold, $pm25, $temperature);

    $result = sendEmailViaPHPMailer($email, $subject, $html);

    if ($result['success']) {
        sendSuccess(['message' => 'Email cảnh báo đã được gửi!']);
    } else {
        sendError($result['error'], 500);
    }
}

/**
 * Send email via Brevo Transactional API (HTTP curl)
 */
function sendEmailViaPHPMailer($to, $subject, $htmlBody)
{
    $url = 'https://api.brevo.com/v3/smtp/email';

    $payload = json_encode([
        'sender' => ['name' => BREVO_FROM_NAME, 'email' => BREVO_FROM_EMAIL],
        'to' => [['email' => $to]],
        'subject' => $subject,
        'htmlContent' => $htmlBody,
        'textContent' => strip_tags(str_replace(['<br>', '</p>'], "\n", $htmlBody)),
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            'accept: application/json',
            'api-key: ' . BREVO_API_KEY,
            'content-type: application/json',
        ],
        CURLOPT_TIMEOUT => 15,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        return ['success' => false, 'error' => 'cURL error: ' . $curlError];
    }

    $decoded = json_decode($response, true);

    if ($httpCode >= 200 && $httpCode < 300) {
        return ['success' => true, 'messageId' => $decoded['messageId'] ?? null];
    }

    $errMsg = $decoded['message'] ?? $response;
    return ['success' => false, 'error' => "Brevo API Error ($httpCode): $errMsg"];
}

/**
 * Get email subject based on AQI level
 */
function getAlertSubject($aqi, $district)
{
    if ($aqi <= 150) {
        return "⚠️ Cảnh báo nhẹ: AQI $aqi tại $district";
    }
    if ($aqi <= 200) {
        return "🟠 Cảnh báo: Chất lượng không khí kém tại $district (AQI $aqi)";
    }
    if ($aqi <= 300) {
        return "🔴 Cảnh báo cao: AQI $aqi - Mức xấu tại $district";
    }
    return "🚨 KHẨN CẤP: AQI $aqi - Nguy hại cho sức khỏe tại $district";
} /** * Get AQI severity info */
function
    getAqiSeverity(
    $aqi
) {
    if ($aqi <= 100)
        return [
            'label' => 'Tốt',
            'color' => '#10B981',
            'bgColor' => '#D1FAE5',
            'icon'
            => '✅'
        ];
    if ($aqi <= 150)
        return ['label' => 'Trung bình', 'color' => '#F59E0B', 'bgColor' => '#FEF3C7', 'icon' => '⚠️'];
    if ($aqi <= 200)
        return ['label' => 'Kém', 'color' => '#F97316', 'bgColor' => '#FFEDD5', 'icon' => '🟠'];
    if ($aqi <= 300)
        return ['label' => 'Xấu', 'color' => '#EF4444', 'bgColor' => '#FEE2E2', 'icon' => '🔴'];
    return ['label' => 'Nguy hại', 'color' => '#7C3AED', 'bgColor' => '#EDE9FE', 'icon' => '🚨'];
}

/**
 * Get health recommendations based on AQI
 */
function getHealthRecommendations($aqi)
{
    if ($aqi <= 150) {
        return [
            'Hạn chế hoạt động ngoài trời kéo dài'
            ,
            'Người nhạy cảm nên theo dõi sức khỏe',
        ];
    }
    if ($aqi <= 200) {
        return
            [
                'Hạn chế hoạt động thể chất ngoài trời',
                'Đeo khẩu trang khi ra ngoài',
                'Đóng cửa sổ trong nhà'
                ,
            ];
    }
    if ($aqi <= 300) {
        return [
            'Tránh mọi hoạt động ngoài trời',
            'Sử dụng khẩu trang N95/KN95'
            ,
            'Bật máy lọc không khí trong nhà'
            ,
            'Người già, trẻ em, người có bệnh hô hấp cần đặc biệt cẩn thận',
        ];
    }
    return
        [
            '🚨 KHẨN CẤP: Ở trong nhà, đóng kín cửa',
            'Sử dụng khẩu trang N95/KN95 nếu phải ra ngoài'
            ,
            'Bật máy lọc không khí ở mức tối đa',
            'Tránh mọi hoạt động thể chất'
            ,
            'Liên hệ bác sĩ nếu có triệu chứng khó thở',
        ];
} /** * Generate test email HTML */
function
    generateTestEmailHtml(
) {
    return '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, \' Segoe UI\', Roboto, sans-serif; background-color:
                    #f6f9fc; margin: 0; padding: 20px;">
                    <div
                        style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="background: #10B981; padding: 24px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✅ Email Test Thành Công</h1>
                        </div>
                        <div style="padding: 32px 24px;">
                            <p style="font-size: 16px; color: #1f2937; line-height: 24px;">
                                Xin chào!
                            </p>
                            <p style="font-size: 16px; color: #4b5563; line-height: 24px;">
                                Đây là email thử nghiệm từ hệ thống <strong>AirHanoi</strong>. Nếu bạn nhận được email
                                này, hệ thống gửi mail đã hoạt động tốt!
                            </p>
                            <div
                                style="background: #D1FAE5; border: 2px solid #10B981; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                                <p style="font-size: 20px; color: #10B981; font-weight: bold; margin: 0;">
                                    ✓ Cấu hình Gmail SMTP thành công
                                </p>
                            </div>
                            <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
                                Bây giờ bạn sẽ nhận được thông báo khi chất lượng không khí vượt ngưỡng đã đăng ký.
                            </p>
                        </div>
                        <div style="background: #f9fafb; padding: 24px; text-align: center;">
                            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                                Email tự động từ AirHanoi - Hệ thống giám sát chất lượng không khí Hà Nội
                            </p>
                        </div>
                    </div>
                    </body>

                    </html>';
}

/**
 * Generate AQI alert email HTML
 */
function generateAlertEmailHtml(
    $username,
    $district,
    $aqi,
    $threshold,
    $pm25 = null,
    $temperature =
    null
) {
    $severity = getAqiSeverity($aqi);
    $recommendations = getHealthRecommendations($aqi);

    $recommendationsHtml = '';
    foreach ($recommendations as $rec) {
        $recommendationsHtml .= "<p style='font-size: 15px; line-height: 28px; color: #4b5563; margin: 0;'>•
                        $rec</p>";
    }

    $extraDataHtml = '';
    if ($pm25 !== null || $temperature !== null) {
        $extraDataHtml = '<div style="text-align: center; margin-bottom: 16px;">';
        if ($pm25 !== null) {
            $extraDataHtml .= "<span style='font-size: 14px; color: #4b5563; margin: 0 12px;'>PM2.5:
                            <strong>$pm25 µg/m³</strong></span>";
        }
        if ($temperature !== null) {
            $extraDataHtml .= "<span style='font-size: 14px; color: #4b5563; margin: 0 12px;'>Nhiệt độ:
                            <strong>{$temperature}°C</strong></span>";
        }
        $extraDataHtml .= '</div>';
    }

    return "
                    <!DOCTYPE html>
                    <html>

                    <head>
                        <meta charset='UTF-8'>
                        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                    </head>

                    <body
                        style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;'>
                        <div
                            style='max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'>
                            <!-- Header -->
                            <div style='background: {$severity['color']}; padding: 24px; text-align: center;'>
                                <h1 style='color: #ffffff; margin: 0; font-size: 24px;'>{$severity['icon']} AirHanoi
                                    Alert</h1>
                            </div>

                            <!-- Content -->
                            <div style='padding: 32px 24px;'>
                                <p style='font-size: 16px; line-height: 24px; color: #1f2937;'>
                                    Xin chào <strong>$username</strong>,
                                </p>
                                <p style='font-size: 16px; line-height: 24px; color: #4b5563; margin-bottom: 24px;'>
                                    Hệ thống AirHanoi phát hiện chất lượng không khí tại khu vực
                                    <strong>$district</strong> đang ở mức cảnh báo:
                                </p>

                                <!-- AQI Box -->
                                <div style='background: {$severity['bgColor']}; border: 2px solid {$severity['color']};
                                    border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;'>
                                    <p style='font-size: 48px; font-weight: bold; color: {$severity['color']}; margin:
                                        0; line-height: 1;'>AQI: $aqi</p>
                                    <p style='font-size: 20px; font-weight: 600; color: {$severity['color']}; margin:
                                        8px 0 0 0;'>{$severity['label']}</p>
                                    <p style='font-size: 14px; color: #6b7280; margin: 12px 0 0 0;'>Ngưỡng đăng ký của
                                        bạn: $threshold</p>
                                </div>

                                $extraDataHtml

                                <hr style='border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;'>

                                <!-- Recommendations -->
                                <h2 style='font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 16px;'>📋
                                    Khuyến nghị sức khỏe</h2>
                                $recommendationsHtml

                                <hr style='border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;'>

                                <!-- CTA -->
                                <div style='text-align: center; margin-top: 24px;'>
                                    <a href='" . APP_URL . "'
                                        style='background: #3b82f6; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;'>
                                        Xem chi tiết trên AirHanoi
                                    </a>
                                </div>
                            </div>

                            <!-- Footer -->
                            <div style='background: #f9fafb; padding: 24px; text-align: center;'>
                                <p style='font-size: 12px; color: #9ca3af; margin: 4px 0;'>Email này được gửi tự động từ
                                    hệ thống AirHanoi.</p>
                                <p style='font-size: 12px; color: #9ca3af; margin: 4px 0;'>Bạn nhận email này vì đã đăng
                                    ký nhận thông báo khi AQI ≥ $threshold.</p>
                                <a href='" . APP_URL . "'
                                    style='font-size: 12px; color: #3b82f6; text-decoration: underline;'>Thay đổi cài
                                    đặt thông báo</a>
                            </div>
                        </div>
                    </body>

                    </html>";
}
?>