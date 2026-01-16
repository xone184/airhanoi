<?php
/**
 * System Settings API
 * GET  /api/system_settings.php        -> Public read (maintenance banner, refresh interval)
 * PUT  /api/system_settings.php        -> Admin only (update)
 */

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Handle preflight
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$db = Database::getInstance()->getConnection();
ensureTable($db);

switch ($method) {
    case 'GET':
        handleGet($db);
        break;
    case 'PUT':
        handleUpdate($db);
        break;
    default:
        sendError('Method not allowed', 405);
}

function getDefaultSettings() {
    return [
        'maintenanceMode' => false,
        'refreshInterval' => '15m',
        'lastUpdated' => null,
        'updatedBy' => null,
    ];
}

function ensureTable(PDO $db) {
    $db->exec("CREATE TABLE IF NOT EXISTS system_settings (
        id INT PRIMARY KEY CHECK (id = 1),
        maintenance_mode TINYINT(1) NOT NULL DEFAULT 0,
        refresh_interval VARCHAR(16) NOT NULL DEFAULT '15m',
        last_updated DATETIME NULL,
        updated_by VARCHAR(100) NULL
    )");
    // Ensure single row exists
    $stmt = $db->query("SELECT COUNT(*) as cnt FROM system_settings");
    $count = $stmt->fetchColumn();
    if ((int)$count === 0) {
        $insert = $db->prepare("INSERT INTO system_settings (id, maintenance_mode, refresh_interval) VALUES (1, 0, '15m')");
        $insert->execute();
    }
}

function readSettings(PDO $db) {
    $stmt = $db->query("SELECT maintenance_mode, refresh_interval, last_updated, updated_by FROM system_settings WHERE id = 1 LIMIT 1");
    $row = $stmt->fetch();
    if (!$row) {
        return getDefaultSettings();
    }
    return [
        'maintenanceMode' => (bool)$row['maintenance_mode'],
        'refreshInterval' => $row['refresh_interval'],
        'lastUpdated' => $row['last_updated'],
        'updatedBy' => $row['updated_by'],
    ];
}

function writeSettings(PDO $db, array $settings) {
    $stmt = $db->prepare("UPDATE system_settings 
        SET maintenance_mode = ?, refresh_interval = ?, last_updated = ?, updated_by = ? 
        WHERE id = 1");
    $stmt->execute([
        (int)$settings['maintenanceMode'],
        $settings['refreshInterval'],
        $settings['lastUpdated'],
        $settings['updatedBy'],
    ]);
}

function handleGet(PDO $db) {
    $settings = readSettings($db);
    sendSuccess($settings);
}

function handleUpdate(PDO $db) {
    $user = requireAuth();
    if ($user['role'] !== 'admin') {
        sendError('Forbidden', 403);
    }
    $input = getJsonInput();

    $settings = readSettings($db);
    if (isset($input['maintenanceMode'])) {
        $settings['maintenanceMode'] = (bool)$input['maintenanceMode'];
    }
    if (isset($input['refreshInterval'])) {
        $settings['refreshInterval'] = preg_replace('/[^0-9a-zA-Z]/', '', $input['refreshInterval']); // basic sanitize
    }
    $settings['lastUpdated'] = date('Y-m-d H:i:s');
    $settings['updatedBy'] = $user['username'] ?? ('user_'.$user['user_id']);

    writeSettings($db, $settings);
    sendSuccess($settings);
}


