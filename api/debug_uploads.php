<?php
/**
 * Debug script to check uploaded files and image URL format
 * Access: GET /api/debug_uploads.php
 */

header('Content-Type: application/json');
require_once 'config.php';

$debug = [
    'version' => '1.0',
    'timestamp' => date('c'),
    'server' => $_SERVER['HTTP_HOST'] ?? 'unknown',
];

// 1. Check uploads directory existence
$uploadsDir = dirname(__DIR__) . '/uploads';
$debug['uploads_dir'] = [
    'path' => $uploadsDir,
    'exists' => is_dir($uploadsDir),
    'writable' => is_writable($uploadsDir),
];

// 2. List files in uploads directory
if (is_dir($uploadsDir)) {
    $files = array_diff(scandir($uploadsDir), ['.', '..']);
    $debug['uploads_files'] = array_values($files);
    $debug['uploads_count'] = count($files);
} else {
    $debug['uploads_files'] = [];
    $debug['uploads_count'] = 0;
}

// 3. Check a sample report's image_url from database
try {
    $db = Database::getInstance()->getConnection();
    $stmt = $db->query("SELECT report_id, image_url FROM pollution_reports ORDER BY report_id DESC LIMIT 5");
    $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $debug['sample_reports'] = $reports;
} catch (Exception $e) {
    $debug['db_error'] = $e->getMessage();
}

// 4. Suggest correct URL format
$baseUrl = 'https://' . ($_SERVER['HTTP_HOST'] ?? 'airhanoi.onrender.com');
$debug['suggested_image_base_url'] = $baseUrl;
$debug['example_full_url'] = $baseUrl . '/uploads/example.jpg';

echo json_encode($debug, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
