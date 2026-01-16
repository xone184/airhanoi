<?php
/**
 * Users Management API (Admin only)
 * GET    /api/users.php           -> list users
 * POST   /api/users.php           -> create new user
 * PUT    /api/users.php           -> update user status/role
 * DELETE /api/users.php           -> delete user
 *
 * PUT/DELETE Body: { "user_id": number, "action": "ban"|"activate"|"promote" }
 * POST Body: { "username": string, "email": string, "password": string, "role": "admin"|"user" }
 */

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

switch ($method) {
    case 'GET':
        handleListUsers();
        break;
    case 'POST':
        handleCreateUser();
        break;
    case 'PUT':
        handleUpdateUser();
        break;
    case 'DELETE':
        handleDeleteUser();
        break;
    default:
        sendError('Method not allowed', 405);
}

function ensureAdmin() {
    $user = requireAuth();
    if ($user['role'] !== 'admin') {
        sendError('Forbidden', 403);
    }
    return $user;
}

function handleListUsers() {
    ensureAdmin();
    $db = Database::getInstance()->getConnection();
    $stmt = $db->query("SELECT user_id, username, email, role, is_active, created_at FROM users ORDER BY created_at DESC");
    $users = $stmt->fetchAll();
    sendSuccess($users);
}

function handleUpdateUser() {
    $admin = ensureAdmin();
    $db = Database::getInstance()->getConnection();
    $input = getJsonInput();

    $userId = isset($input['user_id']) ? (int)$input['user_id'] : 0;
    $action = $input['action'] ?? '';

    if ($userId <= 0 || !in_array($action, ['ban', 'activate', 'promote', 'update_info'])) {
        sendError('Invalid input or action', 400);
    }

    // Prevent self-demotion/ban for safety
    if ($admin['user_id'] === $userId && in_array($action, ['ban', 'promote', 'update_info'])) { // Add update_info here
        // More granular check for update_info
        if ($action === 'update_info') {
            $newRole = $input['role'] ?? $admin['role'];
            if ($newRole !== $admin['role']) {
                sendError('Cannot change your own role.', 400);
            }
        } else {
             sendError('Cannot modify your own account with this action', 400);
        }
    }

    if ($action === 'ban') {
        $stmt = $db->prepare("UPDATE users SET is_active = 0 WHERE user_id = ?");
        $stmt->execute([$userId]);
    } elseif ($action === 'activate') {
        $stmt = $db->prepare("UPDATE users SET is_active = 1 WHERE user_id = ?");
        $stmt->execute([$userId]);
    } elseif ($action === 'promote') {
        $stmt = $db->prepare("UPDATE users SET role = 'admin' WHERE user_id = ?");
        $stmt->execute([$userId]);
    } elseif ($action === 'update_info') {
        $username = trim($input['username'] ?? '');
        $email    = trim($input['email'] ?? '');
        $role     = $input['role'] ?? 'user';

        if (empty($username) || empty($email) || !in_array($role, ['admin', 'user'])) {
            sendError('Username, email, and role are required for update.', 400);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            sendError('Invalid email format.', 400);
        }

        // Check for email/username collision with OTHER users
        $checkStmt = $db->prepare("SELECT user_id FROM users WHERE (username = ? OR email = ?) AND user_id != ?");
        $checkStmt->execute([$username, $email, $userId]);
        if ($checkStmt->fetch()) {
            sendError('Username or email is already in use by another account.', 409);
        }

        $stmt = $db->prepare("UPDATE users SET username = ?, email = ?, role = ? WHERE user_id = ?");
        $stmt->execute([$username, $email, $role, $userId]);
    }

    // Return updated user
    $getStmt = $db->prepare("SELECT user_id, username, email, role, is_active, created_at FROM users WHERE user_id = ?");
    $getStmt->execute([$userId]);
    $user = $getStmt->fetch();

    sendSuccess($user);
}

function handleCreateUser() {
    ensureAdmin();
    $db = Database::getInstance()->getConnection();
    $input = getJsonInput();

    $username = trim($input['username'] ?? '');
    $email    = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $role     = $input['role'] ?? 'user';

    if (empty($username) || empty($email) || empty($password)) {
        sendError('Thiếu thông tin bắt buộc (username, email, password)', 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendError('Email không hợp lệ', 400);
    }

    if (!in_array($role, ['admin', 'user'])) {
        sendError('Role không hợp lệ', 400);
    }

    // Check if username/email already exists
    $checkStmt = $db->prepare("SELECT COUNT(*) FROM users WHERE username = ? OR email = ?");
    $checkStmt->execute([$username, $email]);
    if ($checkStmt->fetchColumn() > 0) {
        sendError('Username hoặc email đã tồn tại', 400);
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // Dựa theo database_schema.sql: cột mật khẩu là `password_hash`, có thêm `full_name`
    $stmt = $db->prepare("
        INSERT INTO users (username, email, password_hash, role, full_name, is_active, created_at)
        VALUES (?, ?, ?, ?, NULL, 1, NOW())
    ");
    $stmt->execute([$username, $email, $passwordHash, $role]);

    $userId = (int)$db->lastInsertId();
    $getStmt = $db->prepare("SELECT user_id, username, email, role, is_active, created_at FROM users WHERE user_id = ?");
    $getStmt->execute([$userId]);
    $user = $getStmt->fetch();

    sendSuccess($user, 201);
}

function handleDeleteUser() {
    $admin = ensureAdmin();
    $db = Database::getInstance()->getConnection();
    $input = getJsonInput();

    $userId = isset($input['user_id']) ? (int)$input['user_id'] : 0;

    if ($userId <= 0) {
        sendError('Invalid user_id', 400);
    }

    // Không cho phép tự xóa chính mình
    if ($admin['user_id'] === $userId) {
        sendError('Không thể tự xóa tài khoản của chính bạn', 400);
    }

    $stmt = $db->prepare("DELETE FROM users WHERE user_id = ?");
    $stmt->execute([$userId]);

    sendSuccess(['deleted' => true]);
}


