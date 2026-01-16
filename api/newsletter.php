<?php
/**
 * Newsletter Subscription API
 * Endpoint: /api/newsletter.php
 */

// Use PHPMailer namespace
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

// Load PHPMailer classes (Assuming path relative to api/)
require __DIR__ . '/libs/PHPMailer-master/src/Exception.php';
require __DIR__ . '/libs/PHPMailer-master/src/PHPMailer.php';
require __DIR__ . '/libs/PHPMailer-master/src/SMTP.php';

// config.php handles headers, error reporting, and DB connection
// config.php handles headers, error reporting, and DB connection
require_once 'config.php';

// Safe load mail_config only if exists
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

$db = Database::getInstance()->getConnection();

// Create table if not exists
try {
    $createTable = "CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('active', 'unsubscribed') DEFAULT 'active',
        ip_address VARCHAR(45),
        INDEX idx_email (email),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

    $db->exec($createTable);
} catch (PDOException $e) {
    // Table creation failed, but maybe it exists. Log error and continue.
    error_log("Table creation failed: " . $e->getMessage());
}

// Handle requests
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        handleSubscribe($db);
        break;
    case 'GET':
        handleGetSubscribers($db);
        break;
    default:
        sendError('Method not allowed', 405);
}

/**
 * Subscribe to newsletter
 */
function handleSubscribe($db)
{
    $input = getJsonInput();

    if (!$input || !isset($input['email'])) {
        sendError('Email là bắt buộc', 400);
    }

    $email = trim($input['email']);

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendError('Email không hợp lệ', 400);
    }

    // Get IP address
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    try {
        // Check if already subscribed
        $checkStmt = $db->prepare("SELECT id, status FROM newsletter_subscribers WHERE email = ?");
        $checkStmt->execute([$email]);
        $existing = $checkStmt->fetch();

        if ($existing) {
            if ($existing['status'] === 'active') {
                sendSuccess(['message' => 'Email này đã được đăng ký trước đó!', 'already_subscribed' => true]);
            } else {
                // Reactivate subscription
                $updateStmt = $db->prepare("UPDATE newsletter_subscribers SET status = 'active', subscribed_at = NOW() WHERE email = ?");
                $updateStmt->execute([$email]);

                // Send welcome email
                sendWelcomeEmail($email);

                sendSuccess(['message' => 'Đăng ký lại thành công! Bạn sẽ nhận được bản tin môi trường hàng tuần.']);
            }
        } else {
            // Insert new subscriber
            $stmt = $db->prepare("INSERT INTO newsletter_subscribers (email, ip_address) VALUES (?, ?)");
            $stmt->execute([$email, $ip]);

            // Send welcome email
            $emailResult = sendWelcomeEmail($email);

            sendSuccess([
                'message' => 'Đăng ký thành công! Vui lòng kiểm tra email xác nhận.',
                'subscriber_id' => $db->lastInsertId(),
                'email_sent' => $emailResult['success']
            ], 201);
        }
    } catch (PDOException $e) {
        error_log("Subscription failed: " . $e->getMessage());
        sendError('Không thể lưu đăng ký. Vui lòng thử lại.', 500);
    }
}

/**
 * Get all subscribers (admin only)
 */
function handleGetSubscribers($db)
{
    // Optional: Add admin authentication check here via requireAdmin() from config.php if needed
    // $user = requireAdmin(); 

    $status = $_GET['status'] ?? 'active';

    try {
        $stmt = $db->prepare("SELECT id, email, subscribed_at, status FROM newsletter_subscribers WHERE status = ? ORDER BY subscribed_at DESC");
        $stmt->execute([$status]);
        $subscribers = $stmt->fetchAll();

        // Get counts
        $countQuery = $db->query("SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN status = 'unsubscribed' THEN 1 ELSE 0 END) as unsubscribed
            FROM newsletter_subscribers");
        $counts = $countQuery->fetch();

        sendSuccess([
            'data' => $subscribers,
            'stats' => [
                'total' => (int) ($counts['total'] ?? 0),
                'active' => (int) ($counts['active'] ?? 0),
                'unsubscribed' => (int) ($counts['unsubscribed'] ?? 0)
            ]
        ]);
    } catch (PDOException $e) {
        error_log("Get subscribers failed: " . $e->getMessage());
        sendError('Không thể lấy danh sách đăng ký.', 500);
    }
}

/**
 * Send welcome email
 */
function sendWelcomeEmail($to)
{
    $mail = new PHPMailer(true);

    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        // Use credentials from mail_config.php 
        $mail->Username = defined('MAIL_USER') ? MAIL_USER : '';
        $mail->Password = defined('MAIL_PASS') ? MAIL_PASS : '';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;

        // Recipients
        $mail->setFrom(defined('MAIL_USER') ? MAIL_USER : 'noreply@airhanoi.com', defined('MAIL_FROM_NAME') ? MAIL_FROM_NAME : 'AirHanoi');
        $mail->addAddress($to);

        // Content
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Subject = '🌱 Chào mừng bạn đến với Bản tin Môi trường AirHanoi';

        $body = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; background-color: #f0fdf4; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background: #16a34a; padding: 32px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Đăng Ký Thành Công!</h1>
                </div>
                <div style="padding: 32px 24px;">
                    <p style="font-size: 16px; color: #1f2937; line-height: 24px;">
                        Xin chào,
                    </p>
                    <p style="font-size: 16px; color: #4b5563; line-height: 24px;">
                        Cảm ơn bạn đã đăng ký nhận bản tin môi trường từ <strong>AirHanoi</strong>. Chúng tôi sẽ gửi cho bạn các thông tin cập nhật hàng tuần về:
                    </p>
                    <ul style="color: #4b5563; line-height: 28px; margin-bottom: 24px;">
                        <li>📉 Chất lượng không khí và dự báo</li>
                        <li>🌿 Mẹo sống xanh và bảo vệ sức khỏe</li>
                        <li>📢 Các sự kiện môi trường sắp diễn ra</li>
                    </ul>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="http://localhost:5173/" style="background: #16a34a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Truy cập Website</a>
                    </div>
                </div>
                <div style="background: #fdf2f2; padding: 16px; text-align: center; border-top: 1px solid #fee2e2;">
                    <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                        Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email này.
                    </p>
                </div>
            </div>
        </body>
        </html>';

        $mail->Body = $body;
        $mail->AltBody = "Cảm ơn bạn đã đăng ký nhận bản tin môi trường từ AirHanoi. Chúng tôi sẽ gửi cho bạn các thông tin cập nhật hàng tuần.";

        $mail->send();
        return ['success' => true];

    } catch (Exception $e) {
        // Just log error, don't break the API response if email fails (unless critical)
        error_log("Mail Error: {$mail->ErrorInfo}");
        return ['success' => false, 'error' => $mail->ErrorInfo];
    }
}
