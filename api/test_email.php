<?php
// Script test gửi email nhanh qua CLI
$_SERVER['REQUEST_METHOD'] = 'POST';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/resend_email.php';

echo "Dang thu gui email test...\n";

// Mock data
$data = [
    'action' => 'send_test',
    'email' => 'test_user@example.com' // Thay bằng email thực tế nếu muốn nhận mail
];

// Capture output
ob_start();
handleSendTestEmail($data);
$output = ob_get_clean();

echo "Ket qua:\n";
echo $output;
echo "\n";
?>