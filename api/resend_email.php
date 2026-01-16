<?php
/**
 * PHPMailer Email API
 * Sử dụng PHPMailer với Gmail SMTP để gửi email
 *
 * Endpoints:
 * POST /api/resend_email.php - Gửi email qua Gmail SMTP
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Enable Debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Load PHPMailer classes safely
$phpMailerPath = __DIR__ . '/libs/PHPMailer-master/src/PHPMailer.php';
if (!file_exists($phpMailerPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server Error: PHPMailer library not found. Check deployment.']);
    exit;
}

require __DIR__ . '/libs/PHPMailer-master/src/Exception.php';
require __DIR__ . '/libs/PHPMailer-master/src/PHPMailer.php';
require __DIR__ . '/libs/PHPMailer-master/src/SMTP.php';

require_once 'config.php';

// Safe load mail_config only if exists (it might be ignored in git)
if (file_exists('mail_config.php')) {
    require_once 'mail_config.php';
}

// Fallback to Env Vars if constants not defined
if (!defined('MAIL_USER'))
    define('MAIL_USER', getenv('MAIL_USER') ?: '');
if (!defined('MAIL_PASS'))
    define('MAIL_PASS', getenv('MAIL_PASS') ?: '');
if (!defined('MAIL_FROM_NAME'))
    define('MAIL_FROM_NAME', getenv('MAIL_FROM_NAME') ?: 'AirHanoi');


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
 * Send email via PHPMailer with Gmail SMTP
 */
function sendEmailViaPHPMailer($to, $subject, $htmlBody)
{
    $mail = new PHPMailer(true);

    try {
        // Server settings
// $mail->SMTPDebug = SMTP::DEBUG_SERVER; // Enable verbose debug output
        $mail->isSMTP();
        // Force IPv4
        $mail->Host = gethostbyname('smtp.gmail.com');
        $mail->SMTPAuth = true;
        $mail->Username = MAIL_USER;
        $mail->Password = MAIL_PASS;
        // Revert to 587/STARTTLS with IPv4 fix
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;

        $mail->SMTPOptions = array(
            'ssl' => array(
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            )
        );

        // Recipients
        $mail->setFrom(MAIL_USER, MAIL_FROM_NAME);
        $mail->addAddress($to);

        // Content
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Subject = $subject;
        $mail->Body = $htmlBody;
        $mail->AltBody = strip_tags(str_replace(['<br>', '</p>'], "\n", $htmlBody));

        $mail->send();
        return ['success' => true];

    } catch (Exception $e) {
        return ['success' => false, 'error' => "Mailer Error: {$mail->ErrorInfo}"];
    } catch (\Throwable $e) {
        return ['success' => false, 'error' => "System Error: " . $e->getMessage()];
    }
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
                            <div style='background: {$severity[' color']}; padding: 24px; text-align: center;'>
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
                                <div style='background: {$severity[' bgColor']}; border: 2px solid {$severity['color']};
                                    border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;'>
                                    <p style='font-size: 48px; font-weight: bold; color: {$severity[' color']}; margin:
                                        0; line-height: 1;'>AQI: $aqi</p>
                                    <p style='font-size: 20px; font-weight: 600; color: {$severity[' color']}; margin:
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
                                    <a href='http://localhost:5173/'
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
                                <a href='http://localhost:5173/settings'
                                    style='font-size: 12px; color: #3b82f6; text-decoration: underline;'>Thay đổi cài
                                    đặt thông báo</a>
                            </div>
                        </div>
                    </body>

                    </html>";
}
?>