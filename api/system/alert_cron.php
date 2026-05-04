<?php
/**
 * Alert Cron API with Brevo API
 * 
 * Ý tưởng sử dụng:
 *  - Dùng Windows Task Scheduler hoặc Cron trên server gọi URL:
 *      http://localhost/doan_airhanoi/api/alert_cron.php?key=YOUR_SECRET
 *  - Script sẽ:
 *      1. Lấy cài đặt từ bảng user_settings + users
 *      2. Lấy AQI hiện tại từ view v_latest_air_quality
 *      3. Nếu AQI >= ngưỡng cảnh báo của user -> gửi email qua Brevo API
 */

require_once '../config/config.php';

// Brevo API config
if (!defined('BREVO_API_KEY'))
    define('BREVO_API_KEY', getenv('BREVO_API_KEY') ?: '');
if (!defined('BREVO_FROM_EMAIL'))
    define('BREVO_FROM_EMAIL', 'adairhanoi@gmail.com');
if (!defined('BREVO_FROM_NAME'))
    define('BREVO_FROM_NAME', getenv('MAIL_FROM_NAME') ?: 'AirHanoi');
if (!defined('APP_URL'))
    define('APP_URL', 'https://xone184.github.io/airhanoi');

// Simple security key (thay đổi giá trị này và giữ bí mật)
$EXPECTED_KEY = 'airhanoi_cron_secret';
$providedKey = $_GET['key'] ?? null;
if ($providedKey !== $EXPECTED_KEY) {
    sendError('Unauthorized cron access', 403);
}

$db = Database::getInstance()->getConnection();

try {
    // Lấy danh sách người dùng có bật cảnh báo email
    $stmt = $db->prepare("
        SELECT 
            us.user_id,
            us.alert_threshold,
            us.enable_email_alerts,
            us.enable_sms_alerts,
            us.alert_district_id,
            u.email,
            u.username,
            d.name AS district_name,
            v.aqi,
            v.pm25,
            v.temperature
        FROM user_settings us
        JOIN users u ON us.user_id = u.user_id
        LEFT JOIN dim_districts d ON us.alert_district_id = d.district_id
        LEFT JOIN v_latest_air_quality v ON v.district_name = d.name
        WHERE us.enable_email_alerts = 1
          AND u.email IS NOT NULL
          AND u.email <> ''
    ");
    $stmt->execute();
    $rows = $stmt->fetchAll();

    if (!$rows) {
        sendSuccess(['message' => 'No users with alert settings found', 'sent' => 0]);
    }

    $sentCount = 0;
    $errors = [];

    foreach ($rows as $row) {
        $aqi = isset($row['aqi']) ? (int) $row['aqi'] : null;
        $threshold = (int) $row['alert_threshold'];

        if ($aqi === null) {
            continue;
        }

        if ($aqi < $threshold) {
            continue;
        }

        $email = $row['email'];
        $district = $row['district_name'] ?: 'Khu vực theo dõi';
        $username = $row['username'] ?: 'Người dùng';
        $pm25 = $row['pm25'] ?? null;
        $temperature = $row['temperature'] ?? null;

        // Gửi email qua Brevo API
        $result = sendAlertEmail(
            $email,
            $username,
            $district,
            $aqi,
            $threshold,
            $pm25,
            $temperature
        );

        if ($result['success']) {
            $sentCount++;
        } else {
            $errors[] = "Không gửi được cho user_id {$row['user_id']} ({$email}): {$result['error']}";
        }
    }

    sendSuccess([
        'message' => 'Alert cron executed with Brevo API',
        'sent' => $sentCount,
        'errors' => $errors,
    ]);

} catch (Exception $e) {
    sendError('Cron failed: ' . $e->getMessage(), 500);
}

// ============================================
// Helper Functions
// ============================================

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
}

function getAqiSeverity($aqi)
{
    if ($aqi <= 100)
        return ['label' => 'Tốt', 'color' => '#10B981', 'bgColor' => '#D1FAE5', 'icon' => '✅'];
    if ($aqi <= 150)
        return ['label' => 'Trung bình', 'color' => '#F59E0B', 'bgColor' => '#FEF3C7', 'icon' => '⚠️'];
    if ($aqi <= 200)
        return ['label' => 'Kém', 'color' => '#F97316', 'bgColor' => '#FFEDD5', 'icon' => '🟠'];
    if ($aqi <= 300)
        return ['label' => 'Xấu', 'color' => '#EF4444', 'bgColor' => '#FEE2E2', 'icon' => '🔴'];
    return ['label' => 'Nguy hại', 'color' => '#7C3AED', 'bgColor' => '#EDE9FE', 'icon' => '🚨'];
}

function getHealthRecommendations($aqi)
{
    if ($aqi <= 150) {
        return ['Hạn chế hoạt động ngoài trời kéo dài', 'Người nhạy cảm nên theo dõi sức khỏe'];
    }
    if ($aqi <= 200) {
        return ['Hạn chế hoạt động thể chất ngoài trời', 'Đeo khẩu trang khi ra ngoài', 'Đóng cửa sổ trong nhà'];
    }
    if ($aqi <= 300) {
        return ['Tránh mọi hoạt động ngoài trời', 'Sử dụng khẩu trang N95/KN95', 'Bật máy lọc không khí trong nhà', 'Người già, trẻ em, người có bệnh hô hấp cần đặc biệt cẩn thận'];
    }
    return ['🚨 KHẨN CẤP: Ở trong nhà, đóng kín cửa', 'Sử dụng khẩu trang N95/KN95 nếu phải ra ngoài', 'Bật máy lọc không khí ở mức tối đa', 'Tránh mọi hoạt động thể chất', 'Liên hệ bác sĩ nếu có triệu chứng khó thở'];
}

function generateAlertEmailHtml($username, $district, $aqi, $threshold, $pm25 = null, $temperature = null)
{
    $severity = getAqiSeverity($aqi);
    $recommendations = getHealthRecommendations($aqi);

    $recommendationsHtml = '';
    foreach ($recommendations as $rec) {
        $recommendationsHtml .= "<p style='font-size: 15px; line-height: 28px; color: #4b5563; margin: 0;'>• $rec</p>";
    }

    $extraDataHtml = '';
    if ($pm25 !== null || $temperature !== null) {
        $extraDataHtml = '<div style="text-align: center; margin-bottom: 16px;">';
        if ($pm25 !== null)
            $extraDataHtml .= "<span style='font-size: 14px; color: #4b5563; margin: 0 12px;'>PM2.5: <strong>$pm25 µg/m³</strong></span>";
        if ($temperature !== null)
            $extraDataHtml .= "<span style='font-size: 14px; color: #4b5563; margin: 0 12px;'>Nhiệt độ: <strong>{$temperature}°C</strong></span>";
        $extraDataHtml .= '</div>';
    }

    return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='font-family: -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;'><div style='max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'><div style='background: {$severity['color']}; padding: 24px; text-align: center;'><h1 style='color: #ffffff; margin: 0; font-size: 24px;'>{$severity['icon']} AirHanoi Alert</h1></div><div style='padding: 32px 24px;'><p style='font-size: 16px; color: #1f2937;'>Xin chào <strong>$username</strong>,</p><p style='font-size: 16px; color: #4b5563; margin-bottom: 24px;'>Hệ thống AirHanoi phát hiện chất lượng không khí tại khu vực <strong>$district</strong> đang ở mức cảnh báo:</p><div style='background: {$severity['bgColor']}; border: 2px solid {$severity['color']}; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;'><p style='font-size: 48px; font-weight: bold; color: {$severity['color']}; margin: 0;'>AQI: $aqi</p><p style='font-size: 20px; font-weight: 600; color: {$severity['color']}; margin: 8px 0 0 0;'>{$severity['label']}</p><p style='font-size: 14px; color: #6b7280; margin: 12px 0 0 0;'>Ngưỡng đăng ký: $threshold</p></div>$extraDataHtml<hr style='border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;'><h2 style='font-size: 18px; color: #1f2937; margin-bottom: 16px;'>📋 Khuyến nghị sức khỏe</h2>$recommendationsHtml<div style='text-align: center; margin-top: 24px;'><a href='http://localhost:5173/' style='background: #3b82f6; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;'>Xem chi tiết</a></div></div><div style='background: #f9fafb; padding: 24px; text-align: center;'><p style='font-size: 12px; color: #9ca3af;'>Email tự động từ AirHanoi</p></div></div></body></html>";
}

function sendAlertEmail($email, $username, $district, $aqi, $threshold, $pm25 = null, $temperature = null)
{
    $subject = getAlertSubject($aqi, $district);
    $htmlBody = generateAlertEmailHtml($username, $district, $aqi, $threshold, $pm25, $temperature);

    // Send via Brevo API (cURL)
    $url = 'https://api.brevo.com/v3/smtp/email';
    $data = [
        'sender' => ['name' => BREVO_FROM_NAME, 'email' => BREVO_FROM_EMAIL],
        'to' => [['email' => trim($email)]],
        'subject' => $subject,
        'htmlContent' => $htmlBody,
    ];

    $payload = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'api-key: ' . BREVO_API_KEY,
            'Content-Type: application/json; charset=utf-8',
        ],
        CURLOPT_TIMEOUT => 30,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        return ['success' => false, 'error' => 'cURL error: ' . $curlError];
    }

    if ($httpCode >= 200 && $httpCode < 300) {
        return ['success' => true];
    }

    $decoded = json_decode($response, true);
    $errMsg = $decoded['message'] ?? $response;
    return ['success' => false, 'error' => "Brevo API Error ($httpCode): $errMsg"];
}
?>
