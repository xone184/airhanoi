<?php
/**
 * Health Logs API
 * Endpoints:
 *   GET /api/health.php - Get health logs
 *   POST /api/health.php - Create new health log
 */

require_once 'config.php';

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetHealthLogs();
        break;
    case 'POST':
        handleCreateHealthLog();
        break;
    default:
        sendError('Method not allowed', 405);
}

function handleGetHealthLogs() {
    global $db;
    $user = requireAuth();
    
    $userId = $_GET['user_id'] ?? $user['user_id'];
    
    // Only allow users to see their own logs, unless admin
    if ($user['role'] !== 'admin' && $userId != $user['user_id']) {
        sendError('Forbidden', 403);
    }
    
    $stmt = $db->prepare("
        SELECT 
            h.log_id as id,
            h.user_id,
            h.log_date as date,
            h.symptoms,
            h.severity,
            h.note,
            h.aqi_at_time,
            d.name as district
        FROM health_logs h
        LEFT JOIN dim_districts d ON h.district_id = d.district_id
        WHERE h.user_id = ?
        ORDER BY h.log_date DESC
    ");
    $stmt->execute([$userId]);
    $logs = $stmt->fetchAll();
    
    // Decode JSON symptoms
    foreach ($logs as &$log) {
        if ($log['symptoms']) {
            $log['symptoms'] = json_decode($log['symptoms'], true);
        }
        $log['date'] = date('Y-m-d', strtotime($log['date']));
    }
    
    sendSuccess($logs);
}

function handleCreateHealthLog() {
    global $db;
    $user = requireAuth();
    $input = getJsonInput();
    
    $date = sanitize($input['date'] ?? date('Y-m-d'));
    $symptoms = $input['symptoms'] ?? [];
    $severity = (int)($input['severity'] ?? 1);
    $note = sanitize($input['note'] ?? '');
    $aqiAtTime = $input['aqi_at_time'] ?? null;
    $districtId = null;
    
    if (!empty($input['district'])) {
        $districtStmt = $db->prepare("SELECT district_id FROM dim_districts WHERE name = ?");
        $districtStmt->execute([$input['district']]);
        $district = $districtStmt->fetch();
        if ($district) {
            $districtId = $district['district_id'];
        }
    }
    
    if ($severity < 1 || $severity > 5) {
        sendError('Severity must be between 1 and 5', 400);
    }
    
    $stmt = $db->prepare("
        INSERT INTO health_logs 
        (user_id, log_date, symptoms, severity, note, aqi_at_time, district_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $user['user_id'],
        $date,
        json_encode($symptoms),
        $severity,
        $note,
        $aqiAtTime,
        $districtId
    ]);
    
    $logId = $db->lastInsertId();
    
    // Get created log
    $getStmt = $db->prepare("
        SELECT 
            log_id as id,
            user_id,
            log_date as date,
            symptoms,
            severity,
            note,
            aqi_at_time
        FROM health_logs
        WHERE log_id = ?
    ");
    $getStmt->execute([$logId]);
    $log = $getStmt->fetch();
    
    $log['date'] = date('Y-m-d', strtotime($log['date']));
    $log['symptoms'] = json_decode($log['symptoms'], true);
    
    sendSuccess($log, 201);
}

