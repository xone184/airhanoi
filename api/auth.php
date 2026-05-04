<?php
/**
 * Authentication API
 * Endpoints: /api/auth.php?action=login|register|me
 */

// OPTIONS request được xử lý bởi .htaccess và config.php
// Không cần xử lý ở đây nữa

require_once 'config.php';

$db = Database::getInstance()->getConnection();
$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'login':
        handleLogin();
        break;
    case 'register':
        handleRegister();
        break;
    case 'me':
        handleGetCurrentUser();
        break;
    case 'google_login':
        handleOAuthLogin('google');
        break;
    case 'facebook_login':
        handleOAuthLogin('facebook');
        break;
    default:
        sendError('Invalid action', 400);
}

function handleLogin()
{
    global $db;
    $input = getJsonInput();

    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';

    if (empty($username) || empty($password)) {
        sendError('Username and password are required', 400);
    }

    // Find user by username or email
    $stmt = $db->prepare("
        SELECT user_id, username, email, password_hash, role, full_name, is_active 
        FROM users 
        WHERE (username = ? OR email = ?) AND is_active = 1
    ");
    $stmt->execute([$username, $username]);
    $user = $stmt->fetch();

    if (!$user) {
        sendError('Email hoặc mật khẩu không đúng. Vui lòng thử lại.', 401);
    }

    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        // Log for debugging (remove in production)
        error_log("Password verification failed for user: $username");
        sendError('Mật khẩu không đúng. Vui lòng thử lại.', 401);
    }

    // Update last login
    $updateStmt = $db->prepare("UPDATE users SET last_login = NOW() WHERE user_id = ?");
    $updateStmt->execute([$user['user_id']]);

    // Generate simple token (in production, use JWT)
    $tokenData = [
        'user_id' => $user['user_id'],
        'username' => $user['username'],
        'role' => $user['role'],
        'exp' => time() + (7 * 24 * 60 * 60) // 7 days
    ];
    $token = base64_encode(json_encode($tokenData));

    sendSuccess([
        'user' => [
            'user_id' => $user['user_id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'role' => $user['role'],
            'full_name' => $user['full_name'],
            'isLoggedIn' => true
        ],
        'token' => $token
    ]);
}

function handleRegister()
{
    global $db;
    $input = getJsonInput();

    $username = sanitize($input['username'] ?? '');
    $email = sanitize($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $fullName = sanitize($input['fullName'] ?? '');

    if (empty($username) || empty($email) || empty($password)) {
        sendError('Username, email and password are required', 400);
    }

    if (strlen($password) < 6) {
        sendError('Password must be at least 6 characters', 400);
    }

    // Check if username or email already exists
    $checkStmt = $db->prepare("SELECT user_id FROM users WHERE username = ? OR email = ?");
    $checkStmt->execute([$username, $email]);
    if ($checkStmt->fetch()) {
        sendError('Username or email already exists', 409);
    }

    // Hash password
    $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);

    // Insert new user
    $stmt = $db->prepare("
        INSERT INTO users (username, email, password_hash, full_name, role, is_active) 
        VALUES (?, ?, ?, ?, 'user', 1)
    ");

    try {
        $stmt->execute([$username, $email, $passwordHash, $fullName]);
        $userId = $db->lastInsertId();

        // Create default settings
        $settingsStmt = $db->prepare("
            INSERT INTO user_settings (user_id, alert_threshold, enable_email_alerts, language, temperature_unit) 
            VALUES (?, 150, 1, 'vi', 'c')
        ");
        $settingsStmt->execute([$userId]);

        // Generate token
        $tokenData = [
            'user_id' => $userId,
            'username' => $username,
            'role' => 'user',
            'exp' => time() + (7 * 24 * 60 * 60)
        ];
        $token = base64_encode(json_encode($tokenData));

        sendSuccess([
            'user' => [
                'user_id' => $userId,
                'username' => $username,
                'email' => $email,
                'role' => 'user',
                'full_name' => $fullName,
                'isLoggedIn' => true
            ],
            'token' => $token
        ], 201);

    } catch (PDOException $e) {
        sendError('Registration failed: ' . $e->getMessage(), 500);
    }
}

function handleGetCurrentUser()
{
    $user = requireAuth();
    sendSuccess([
        'user_id' => $user['user_id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'role' => $user['role'],
        'isLoggedIn' => true
    ]);
}

function handleOAuthLogin($provider)
{
    global $db;
    $input = getJsonInput();

    $email = sanitize($input['email'] ?? '');
    $name = sanitize($input['name'] ?? '');
    
    if (empty($email)) {
        sendError('Email is required for OAuth login', 400);
    }

    // Check if user already exists
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        $userId = $user['user_id'];
        $username = $user['username'];
        $role = $user['role'];
        
        // Update last login
        try {
            $updateStmt = $db->prepare("UPDATE users SET last_login = NOW(), auth_provider = ? WHERE user_id = ?");
            $updateStmt->execute([$provider, $userId]);
        } catch (PDOException $e) {
            $updateStmt = $db->prepare("UPDATE users SET last_login = NOW() WHERE user_id = ?");
            $updateStmt->execute([$userId]);
        }
    } else {
        // Create new user
        $username = explode('@', $email)[0] . '_' . rand(1000, 9999);
        $role = 'user';
        
        try {
            $stmt = $db->prepare("
                INSERT INTO users (username, email, password_hash, full_name, role, is_active, auth_provider) 
                VALUES (?, ?, ?, ?, 'user', 1, ?)
            ");
            $stmt->execute([$username, $email, '', $name, $provider]);
        } catch (PDOException $e) {
            $stmt = $db->prepare("
                INSERT INTO users (username, email, password_hash, full_name, role, is_active) 
                VALUES (?, ?, ?, ?, 'user', 1)
            ");
            $stmt->execute([$username, $email, '', $name]);
        }
        
        $userId = $db->lastInsertId();

        // Create default settings
        $settingsStmt = $db->prepare("
            INSERT INTO user_settings (user_id, alert_threshold, enable_email_alerts, language, temperature_unit) 
            VALUES (?, 150, 1, 'vi', 'c')
        ");
        $settingsStmt->execute([$userId]);
    }

    // Generate token
    $tokenData = [
        'user_id' => $userId,
        'username' => $username,
        'role' => $role,
        'exp' => time() + (7 * 24 * 60 * 60)
    ];
    $token = base64_encode(json_encode($tokenData));

    sendSuccess([
        'user' => [
            'user_id' => $userId,
            'username' => $username,
            'email' => $email,
            'role' => $role,
            'full_name' => $name,
            'isLoggedIn' => true
        ],
        'token' => $token
    ]);
}

