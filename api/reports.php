<?php
/**
 * Pollution Reports API
 * Endpoints:
 *   GET /api/reports.php - Get all reports (with filters)
 *   POST /api/reports.php - Create new report
 *   PUT /api/reports.php?id=X&action=verify|reject - Update report status
 */

require_once 'config.php';

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetReports();
        break;
    case 'POST':
        handleCreateReport();
        break;
    case 'PUT':
        handleUpdateReport();
        break;
    default:
        sendError('Method not allowed', 405);
}

function handleGetReports()
{
    global $db;

    $status = $_GET['status'] ?? 'all';
    $userId = $_GET['user_id'] ?? null;
    $date = $_GET['date'] ?? null;

    $user = getCurrentUser(); // Optional auth

    $query = "
        SELECT 
            pr.report_id,
            pr.user_id,
            pr.district_id,
            d.name as district,
            pr.address,
            pt.type_code as type,
            pt.type_name,
            pr.custom_type,
            pr.description,
            pr.image_url,
            pr.latitude,
            pr.longitude,
            pr.status,
            pr.verified_by,
            pr.verified_at,
            pr.rejection_reason,
            pr.created_at,
            u.username,
            u.email
        FROM pollution_reports pr
        JOIN dim_districts d ON pr.district_id = d.district_id
        JOIN dim_pollution_types pt ON pr.type_id = pt.type_id
        JOIN users u ON pr.user_id = u.user_id
        WHERE 1=1
    ";

    $params = [];

    if ($status !== 'all') {
        $query .= " AND pr.status = ?";
        $params[] = $status;
    }

    if ($userId) {
        $query .= " AND pr.user_id = ?";
        $params[] = $userId;
    }

    if ($date) {
        $query .= " AND DATE(pr.created_at) = ?";
        $params[] = $date;
    }

    $query .= " ORDER BY pr.created_at DESC";

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $reports = $stmt->fetchAll();

    // Format dates
    foreach ($reports as &$report) {
        $report['created_at'] = date('c', strtotime($report['created_at']));
        if ($report['verified_at']) {
            $report['verified_at'] = date('c', strtotime($report['verified_at']));
        }
    }

    sendSuccess($reports);
}

function handleCreateReport()
{
    global $db;

    $user = requireAuth();
    $input = getJsonInput();

    $districtName = sanitize($input['district'] ?? '');
    $address = sanitize($input['address'] ?? '');
    $type = sanitize($input['type'] ?? '');
    $customType = sanitize($input['customType'] ?? null);
    $description = sanitize($input['description'] ?? '');
    $imageUrl = sanitize($input['image_url'] ?? null);
    $latitude = $input['latitude'] ?? null;
    $longitude = $input['longitude'] ?? null;

    // START PATCH: Handle frontend double-submit bug
    // If input contains report_id, it means the report was already created by submit_report.php
    // We just return the existing report to satisfy the frontend.
    if (!empty($input['report_id'])) {
        $getStmt = $db->prepare("
            SELECT 
                pr.report_id,
                pr.user_id,
                d.name as district,
                pr.address,
                pt.type_code as type,
                pr.custom_type,
                pr.description,
                pr.image_url,
                pr.status,
                pr.created_at
            FROM pollution_reports pr
            JOIN dim_districts d ON pr.district_id = d.district_id
            JOIN dim_pollution_types pt ON pr.type_id = pt.type_id
            WHERE pr.report_id = ?
        ");
        $getStmt->execute([$input['report_id']]);
        $report = $getStmt->fetch();

        if ($report) {
            $report['created_at'] = date('c', strtotime($report['created_at']));
            sendSuccess($report, 200);
            return;
        }
    }
    // END PATCH

    // Validate
    if (empty($districtName) || empty($address) || empty($type) || empty($description)) {
        sendError('Missing required fields', 400);
    }

    // Find district
    $districtStmt = $db->prepare("SELECT district_id FROM dim_districts WHERE name = ?");
    $districtStmt->execute([$districtName]);
    $district = $districtStmt->fetch();

    if (!$district) {
        sendError('District not found', 404);
    }

    // Find pollution type
    $typeStmt = $db->prepare("SELECT type_id FROM dim_pollution_types WHERE type_code = ?");
    $typeStmt->execute([$type]);
    $pollutionType = $typeStmt->fetch();

    if (!$pollutionType) {
        sendError('Invalid pollution type', 400);
    }

    // Insert report
    $stmt = $db->prepare("
        INSERT INTO pollution_reports 
        (user_id, district_id, address, type_id, custom_type, description, image_url, latitude, longitude, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    ");

    $stmt->execute([
        $user['user_id'],
        $district['district_id'],
        $address,
        $pollutionType['type_id'],
        $customType,
        $description,
        $imageUrl,
        $latitude,
        $longitude
    ]);

    $reportId = $db->lastInsertId();

    // Get created report
    $getStmt = $db->prepare("
        SELECT 
            pr.report_id,
            pr.user_id,
            d.name as district,
            pr.address,
            pt.type_code as type,
            pr.custom_type,
            pr.description,
            pr.image_url,
            pr.status,
            pr.created_at
        FROM pollution_reports pr
        JOIN dim_districts d ON pr.district_id = d.district_id
        JOIN dim_pollution_types pt ON pr.type_id = pt.type_id
        WHERE pr.report_id = ?
    ");
    $getStmt->execute([$reportId]);
    $report = $getStmt->fetch();

    $report['created_at'] = date('c', strtotime($report['created_at']));

    sendSuccess($report, 201);
}

function handleUpdateReport()
{
    global $db;

    $admin = requireAdmin();
    $reportId = $_GET['id'] ?? null;
    $action = $_GET['action'] ?? '';
    $input = getJsonInput();

    if (!$reportId) {
        sendError('Report ID is required', 400);
    }

    if ($action === 'verify') {
        $stmt = $db->prepare("
            UPDATE pollution_reports 
            SET status = 'verified', verified_by = ?, verified_at = NOW()
            WHERE report_id = ?
        ");
        $stmt->execute([$admin['user_id'], $reportId]);

    } elseif ($action === 'reject') {
        $reason = sanitize($input['reason'] ?? '');
        $stmt = $db->prepare("
            UPDATE pollution_reports 
            SET status = 'rejected', verified_by = ?, verified_at = NOW(), rejection_reason = ?
            WHERE report_id = ?
        ");
        $stmt->execute([$admin['user_id'], $reason, $reportId]);

    } elseif ($action === 'bulk') {
        // Bulk update multiple reports
        $ids = $input['ids'] ?? [];
        $newStatus = sanitize($input['status'] ?? '');

        if (empty($ids) || !in_array($newStatus, ['verified', 'rejected'])) {
            sendError('Invalid request', 400);
        }

        $placeholders = str_repeat('?,', count($ids) - 1) . '?';
        $params = [$newStatus, $admin['user_id']];

        if ($newStatus === 'verified') {
            $stmt = $db->prepare("
                UPDATE pollution_reports 
                SET status = ?, verified_by = ?, verified_at = NOW()
                WHERE report_id IN ($placeholders)
            ");
        } else {
            $reason = sanitize($input['reason'] ?? '');
            $stmt = $db->prepare("
                UPDATE pollution_reports 
                SET status = ?, verified_by = ?, verified_at = NOW(), rejection_reason = ?
                WHERE report_id IN ($placeholders)
            ");
            $params[] = $reason;
        }

        $params = array_merge(array_slice($params, 0, -1), $ids, [array_slice($params, -1)[0]]);
        $stmt->execute(array_merge([$newStatus, $admin['user_id']], $ids, $newStatus === 'rejected' ? [$reason] : []));

        sendSuccess(['updated' => count($ids)]);
        return;
    } else {
        sendError('Invalid action. Use: verify or reject', 400);
    }

    sendSuccess(['message' => 'Report updated successfully']);
}

