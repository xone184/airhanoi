<?php
/**
 * User Settings API
 * Endpoints:
 *   GET /api/settings.php - Get user settings
 *   PUT /api/settings.php - Update user settings
 */

require_once 'config.php';

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetSettings();
        break;
    case 'PUT':
        handleUpdateSettings();
        break;
    default:
        sendError('Method not allowed', 405);
}

function handleGetSettings() {
    global $db;
    $user = requireAuth();
    
    $stmt = $db->prepare("
        SELECT 
            s.*,
            d.name as alertDistrict
        FROM user_settings s
        LEFT JOIN dim_districts d ON s.alert_district_id = d.district_id
        WHERE s.user_id = ?
    ");
    $stmt->execute([$user['user_id']]);
    $settings = $stmt->fetch();
    
    if (!$settings) {
        // Create default settings
        $insertStmt = $db->prepare("
            INSERT INTO user_settings (user_id, alert_threshold, enable_email_alerts, language, temperature_unit)
            VALUES (?, 150, 1, 'vi', 'c')
        ");
        $insertStmt->execute([$user['user_id']]);
        
        $settings = [
            'user_id' => $user['user_id'],
            'email' => $user['email'],
            'phone' => '',
            'alertDistrict' => null,
            'alertThreshold' => 150,
            'enableEmailAlerts' => true,
            'enableSmsAlerts' => false,
            'language' => 'vi',
            'temperatureUnit' => 'c'
        ];
    } else {
        $settings = [
            'user_id' => $settings['user_id'],
            'email' => $user['email'],
            'phone' => $settings['phone'] ?? '',
            'alertDistrict' => $settings['alertDistrict'],
            'alertThreshold' => (int)$settings['alert_threshold'],
            'enableEmailAlerts' => (bool)$settings['enable_email_alerts'],
            'enableSmsAlerts' => (bool)$settings['enable_sms_alerts'],
            'language' => $settings['language'],
            'temperatureUnit' => $settings['temperature_unit']
        ];
    }
    
    sendSuccess($settings);
}

function handleUpdateSettings() {
    global $db;
    $user = requireAuth();
    $input = getJsonInput();
    
    // 1. Update email in users table if provided
    if (isset($input['email']) && filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
        $emailStmt = $db->prepare("UPDATE users SET email = ? WHERE user_id = ?");
        $emailStmt->execute([$input['email'], $user['user_id']]);
    }
    
    // 2. Update user_settings table
    $alertDistrictId = null;
    if (!empty($input['alertDistrict'])) {
        $districtStmt = $db->prepare("SELECT district_id FROM dim_districts WHERE name = ?");
        $districtStmt->execute([$input['alertDistrict']]);
        $district = $districtStmt->fetch();
        if ($district) {
            $alertDistrictId = $district['district_id'];
        }
    }
    
    $stmt = $db->prepare("
        INSERT INTO user_settings 
        (user_id, alert_district_id, alert_threshold, enable_email_alerts, enable_sms_alerts, language, temperature_unit, phone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            alert_district_id = VALUES(alert_district_id),
            alert_threshold = VALUES(alert_threshold),
            enable_email_alerts = VALUES(enable_email_alerts),
            enable_sms_alerts = VALUES(enable_sms_alerts),
            language = VALUES(language),
            temperature_unit = VALUES(temperature_unit),
            phone = VALUES(phone)
    ");
    
    // Correctly handle boolean conversion
    $enableEmail = isset($input['enableEmailAlerts']) ? (int)(bool)$input['enableEmailAlerts'] : 1;
    $enableSms = isset($input['enableSmsAlerts']) ? (int)(bool)$input['enableSmsAlerts'] : 0;
    
    $stmt->execute([
        $user['user_id'],
        $alertDistrictId,
        $input['alertThreshold'] ?? 150,
        $enableEmail,
        $enableSms,
        $input['language'] ?? 'vi',
        $input['temperatureUnit'] ?? 'c',
        sanitize($input['phone'] ?? '')
    ]);
    
    sendSuccess(['message' => 'Settings updated successfully']);
}

