<?php
/**
 * Notification Center API
 * Quản lý thông báo người dùng
 *
 * GET    /api/notifications.php              - Lấy danh sách thông báo của user
 * GET    /api/notifications.php?unread=1     - Đếm thông báo chưa đọc
 * POST   /api/notifications.php              - Tạo thông báo mới (system/admin)
 * PUT    /api/notifications.php?id=1         - Đánh dấu đã đọc
 * PUT    /api/notifications.php?action=read_all - Đánh dấu tất cả đã đọc
 * DELETE /api/notifications.php?id=1         - Xóa thông báo
 */

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Ensure notification_logs table exists
ensureNotificationTable();

switch ($method) {
    case 'GET':
        handleGet();
        break;
    case 'POST':
        handlePost();
        break;
    case 'PUT':
        handlePut();
        break;
    case 'DELETE':
        handleDelete();
        break;
    default:
        sendError('Method not allowed', 405);
}

/**
 * Auto-create notification_logs table if not exists
 */
function ensureNotificationTable() {
    $db = Database::getInstance()->getConnection();
    $db->exec("
        CREATE TABLE IF NOT EXISTS `notification_logs` (
            `id` bigint(20) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `user_id` int(11) NOT NULL,
            `type` enum('alert','welcome','newsletter','system','report') NOT NULL DEFAULT 'system',
            `title` varchar(255) NOT NULL,
            `message` text NOT NULL,
            `icon` varchar(10) DEFAULT '🔔',
            `is_read` tinyint(1) NOT NULL DEFAULT 0,
            `link` varchar(255) DEFAULT NULL COMMENT 'Optional: route to navigate to',
            `metadata` longtext DEFAULT NULL COMMENT 'JSON extra data',
            `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX `idx_user_read` (`user_id`, `is_read`),
            INDEX `idx_created` (`created_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Notification Center logs';
    ");
}

/**
 * GET: List notifications or count unread
 */
function handleGet() {
    $user = requireAuth();
    $db = Database::getInstance()->getConnection();

    // Count unread only
    if (isset($_GET['unread'])) {
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM notification_logs WHERE user_id = ? AND is_read = 0");
        $stmt->execute([$user['user_id']]);
        sendSuccess(['unread_count' => (int)$stmt->fetch()['count']]);
    }

    // List notifications (paginated)
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(50, max(10, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;
    $type = $_GET['type'] ?? null;

    $where = "WHERE user_id = ?";
    $params = [$user['user_id']];

    if ($type) {
        $where .= " AND type = ?";
        $params[] = $type;
    }

    // Total count
    $countStmt = $db->prepare("SELECT COUNT(*) as total FROM notification_logs $where");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetch()['total'];

    // Fetch notifications
    $params[] = $limit;
    $params[] = $offset;
    $stmt = $db->prepare("
        SELECT id, type, title, message, icon, is_read, link, metadata, created_at
        FROM notification_logs $where
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute($params);
    $notifications = $stmt->fetchAll();

    // Parse metadata JSON
    foreach ($notifications as &$n) {
        $n['is_read'] = (bool)$n['is_read'];
        if ($n['metadata']) {
            $n['metadata'] = json_decode($n['metadata'], true);
        }
    }

    sendSuccess([
        'notifications' => $notifications,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'total_pages' => ceil($total / $limit)
        ]
    ]);
}

/**
 * POST: Create notification (for system use or admin broadcast)
 */
function handlePost() {
    $input = getJsonInput();
    $db = Database::getInstance()->getConnection();

    // Allow system-level creation (from cron, alert_cron, etc.)
    $userId = $input['user_id'] ?? null;
    $type = $input['type'] ?? 'system';
    $title = $input['title'] ?? '';
    $message = $input['message'] ?? '';
    $icon = $input['icon'] ?? '🔔';
    $link = $input['link'] ?? null;
    $metadata = isset($input['metadata']) ? json_encode($input['metadata'], JSON_UNESCAPED_UNICODE) : null;

    if (!$userId || !$title || !$message) {
        sendError('user_id, title and message are required', 400);
    }

    // If broadcasting to all users
    if ($userId === 'all') {
        $user = requireAdmin();
        $usersStmt = $db->query("SELECT user_id FROM users WHERE is_active = 1");
        $users = $usersStmt->fetchAll();
        $count = 0;

        $insertStmt = $db->prepare("
            INSERT INTO notification_logs (user_id, type, title, message, icon, link, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");

        foreach ($users as $u) {
            $insertStmt->execute([$u['user_id'], $type, $title, $message, $icon, $link, $metadata]);
            $count++;
        }

        sendSuccess(['message' => "Đã gửi thông báo cho $count người dùng", 'count' => $count]);
    }

    // Single user notification
    $stmt = $db->prepare("
        INSERT INTO notification_logs (user_id, type, title, message, icon, link, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([(int)$userId, $type, $title, $message, $icon, $link, $metadata]);

    sendSuccess(['message' => 'Thông báo đã được tạo', 'id' => (int)$db->lastInsertId()]);
}

/**
 * PUT: Mark as read
 */
function handlePut() {
    $user = requireAuth();
    $db = Database::getInstance()->getConnection();

    $action = $_GET['action'] ?? null;

    // Mark ALL as read
    if ($action === 'read_all') {
        $stmt = $db->prepare("UPDATE notification_logs SET is_read = 1 WHERE user_id = ? AND is_read = 0");
        $stmt->execute([$user['user_id']]);
        sendSuccess(['message' => 'Đã đánh dấu tất cả đã đọc', 'updated' => $stmt->rowCount()]);
    }

    // Mark single as read
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) {
        sendError('Notification ID is required', 400);
    }

    $stmt = $db->prepare("UPDATE notification_logs SET is_read = 1 WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $user['user_id']]);

    if ($stmt->rowCount() === 0) {
        sendError('Notification not found', 404);
    }

    sendSuccess(['message' => 'Đã đánh dấu đã đọc']);
}

/**
 * DELETE: Remove notification
 */
function handleDelete() {
    $user = requireAuth();
    $db = Database::getInstance()->getConnection();

    $id = (int)($_GET['id'] ?? 0);
    if (!$id) {
        sendError('Notification ID is required', 400);
    }

    $stmt = $db->prepare("DELETE FROM notification_logs WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $user['user_id']]);

    if ($stmt->rowCount() === 0) {
        sendError('Notification not found', 404);
    }

    sendSuccess(['message' => 'Đã xóa thông báo']);
}
?>
