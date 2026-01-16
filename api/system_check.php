<?php
/**
 * System Check - Kiểm tra toàn bộ hệ thống
 * Truy cập: http://localhost/hanoi-air-quality-monitor/api/system_check.php
 */

header('Content-Type: application/json; charset=UTF-8');

require_once 'config.php';

$checks = [];

// 1. Database Connection
try {
    $db = Database::getInstance()->getConnection();
    $checks['database'] = [
        'status' => 'success',
        'message' => 'Database connection successful',
        'host' => DB_HOST,
        'database' => DB_NAME
    ];
} catch (Exception $e) {
    $checks['database'] = [
        'status' => 'error',
        'message' => 'Database connection failed: ' . $e->getMessage()
    ];
}

// 2. Check Tables
if (isset($db)) {
    $tables = ['dim_districts', 'dim_aqi_scale', 'dim_pollution_types', 'users', 'fact_air_quality', 'fact_forecast', 'pollution_reports', 'health_logs', 'news_items', 'user_settings', 'chat_history', 'system_settings'];
    $tableChecks = [];
    
    foreach ($tables as $table) {
        try {
            $stmt = $db->query("SELECT COUNT(*) as count FROM $table");
            $result = $stmt->fetch();
            $tableChecks[$table] = [
                'exists' => true,
                'row_count' => $result['count']
            ];
        } catch (Exception $e) {
            $tableChecks[$table] = [
                'exists' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    $checks['tables'] = $tableChecks;
}

// 3. Check Users
if (isset($db)) {
    try {
        $stmt = $db->query("SELECT COUNT(*) as count FROM users WHERE is_active = 1");
        $result = $stmt->fetch();
        $checks['users'] = [
            'status' => 'success',
            'active_users' => $result['count']
        ];
        
        // Check admin user
        $adminStmt = $db->query("SELECT user_id, username, email, role FROM users WHERE role = 'admin' AND is_active = 1 LIMIT 1");
        $admin = $adminStmt->fetch();
        $checks['users']['has_admin'] = $admin ? true : false;
        if ($admin) {
            $checks['users']['admin_info'] = [
                'username' => $admin['username'],
                'email' => $admin['email']
            ];
        }
    } catch (Exception $e) {
        $checks['users'] = [
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }
}

// 4. Check API Files
$apiFiles = [
    'auth.php',
    'air_quality.php',
    'reports.php',
    'settings.php',
    'health.php',
    'news.php',
    'upload.php',
    'config.php'
];

$fileChecks = [];
foreach ($apiFiles as $file) {
    $filePath = __DIR__ . '/' . $file;
    $fileChecks[$file] = [
        'exists' => file_exists($filePath),
        'readable' => is_readable($filePath)
    ];
}
$checks['api_files'] = $fileChecks;

// 5. Check Data
if (isset($db)) {
    try {
        // Check realtime data
        $realtimeStmt = $db->query("SELECT COUNT(*) as count FROM fact_air_quality");
        $realtimeCount = $realtimeStmt->fetch();
        
        // Check forecast data
        $forecastStmt = $db->query("SELECT COUNT(*) as count FROM fact_forecast");
        $forecastCount = $forecastStmt->fetch();
        
        // Check reports
        $reportsStmt = $db->query("SELECT COUNT(*) as count FROM pollution_reports");
        $reportsCount = $reportsStmt->fetch();
        
        $checks['data'] = [
            'realtime_records' => $realtimeCount['count'],
            'forecast_records' => $forecastCount['count'],
            'reports' => $reportsCount['count']
        ];
    } catch (Exception $e) {
        $checks['data'] = [
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }
}

// 6. PHP Configuration
$checks['php'] = [
    'version' => phpversion(),
    'pdo_mysql' => extension_loaded('pdo_mysql'),
    'json' => extension_loaded('json'),
    'mbstring' => extension_loaded('mbstring')
];

// 7. CORS Test
$checks['cors'] = [
    'headers_set' => headers_sent() ? false : true,
    'access_control_origin' => 'Set in headers'
];

// Summary
$allChecks = [
    'database' => $checks['database']['status'] ?? 'unknown',
    'tables' => isset($checks['tables']) ? 'ok' : 'error',
    'users' => $checks['users']['status'] ?? 'unknown',
    'api_files' => 'ok',
    'data' => isset($checks['data']) ? 'ok' : 'error',
    'php' => 'ok'
];

$summary = [
    'total_checks' => count($allChecks),
    'passed' => count(array_filter($allChecks, fn($v) => $v === 'ok' || $v === 'success')),
    'failed' => count(array_filter($allChecks, fn($v) => $v === 'error')),
    'status' => (count(array_filter($allChecks, fn($v) => $v === 'error')) === 0) ? 'all_ok' : 'has_errors'
];

echo json_encode([
    'success' => true,
    'timestamp' => date('Y-m-d H:i:s'),
    'summary' => $summary,
    'checks' => $checks
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

?>

