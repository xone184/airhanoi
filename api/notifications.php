<?php
/**
 * Notifications API
 * POST /api/notifications.php?action=test_email
 * body: { "email": "user@example.com", "subject": "Test", "message": "..." }
 */

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

switch ($action) {
    case 'test_email':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }
        handleTestEmail();
        break;
    default:
        sendError('Action not found', 404);
}

function handleTestEmail() {
    $user = requireAuth();
    $input = getJsonInput();
    $email = $input['email'] ?? $user['email'] ?? null;
    $subject = $input['subject'] ?? 'AirHanoi - Test Email';
    $message = $input['message'] ?? 'Đây là email thử nghiệm từ AirHanoi. Nếu bạn nhận được email này, hệ thống gửi mail đã hoạt động.';

    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendError('Email không hợp lệ', 400);
    }

    // Simple mail() usage. Note: On Windows/XAMPP cần cấu hình SMTP trong php.ini.
    $headers = "From: AirHanoi <no-reply@airhanoi.local>\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

    $sent = @mail($email, $subject, $message, $headers);

    if ($sent) {
        sendSuccess(['sent' => true, 'email' => $email]);
    } else {
        sendError('Không thể gửi email. Kiểm tra cấu hình SMTP (php.ini: SMTP, smtp_port, sendmail_from).', 500);
    }
}


