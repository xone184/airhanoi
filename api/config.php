<?php
/**
 * Database Configuration
 * Cấu hình kết nối cơ sở dữ liệu
 */

// ---- DB Credentials: sửa cho khớp với phpMyAdmin ----
// Bạn đang dùng database tên "doan" với user root (XAMPP mặc định)
if (!defined('DB_HOST'))
    define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
if (!defined('DB_PORT'))
    define('DB_PORT', getenv('DB_PORT') ?: '3306');
if (!defined('DB_NAME'))
    define('DB_NAME', getenv('DB_NAME') ?: 'doan');
if (!defined('DB_USER'))
    define('DB_USER', getenv('DB_USER') ?: 'root');
if (!defined('DB_PASS'))
    define('DB_PASS', getenv('DB_PASS') ?: '');
if (!defined('DB_CHARSET'))
    define('DB_CHARSET', 'utf8mb4');

// Production: Tắt hiển thị lỗi để tránh lộ thông tin và làm vỡ JSON
// Development: Bật hiển thị lỗi để debug
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS Configuration
// Note: Headers are now handled by Apache Server (000-default.conf)
// We comment these out to prevent "Duplicate Headers" error
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if (!headers_sent()) {
    header('Content-Type: application/json; charset=UTF-8');
}
// Set Content-Type only
if (!headers_sent()) {
    header('Content-Type: application/json; charset=UTF-8');
}

// Timezone
date_default_timezone_set('Asia/Ho_Chi_Minh');

/**
 * Database Connection Class
 */
class Database
{
    private static $instance = null;
    private $conn;

    private function __construct()
    {
        try {
            // Thêm port vào DSN để kết nối đúng tới MySQL port 3306
            $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];

            $this->conn = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Database connection failed: ' . $e->getMessage()
            ]);
            exit();
        }
    }

    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection()
    {
        return $this->conn;
    }
}

/**
 * Response Helper Functions
 */
function sendResponse($success, $data = null, $error = null, $statusCode = 200)
{
    http_response_code($statusCode);
    $response = ['success' => $success];

    if ($data !== null) {
        $response['data'] = $data;
    }

    if ($error !== null) {
        $response['error'] = $error;
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit();
}

function sendError($message, $statusCode = 400)
{
    sendResponse(false, null, $message, $statusCode);
}

function sendSuccess($data, $statusCode = 200)
{
    sendResponse(true, $data, null, $statusCode);
}

/**
 * Get JSON input
 */
function getJsonInput()
{
    $json = file_get_contents('php://input');
    return json_decode($json, true);
}

/**
 * Verify JWT Token (Simple implementation)
 * TODO: Implement proper JWT verification
 */
function verifyToken($token)
{
    // Simple token verification - in production use JWT library
    if (empty($token)) {
        return null;
    }

    // Decode token (simple base64 for demo)
    $decoded = json_decode(base64_decode($token), true);

    if (!$decoded || !isset($decoded['user_id'])) {
        return null;
    }

    // Verify user exists and is active
    $db = Database::getInstance()->getConnection();
    $stmt = $db->prepare("SELECT user_id, username, email, role FROM users WHERE user_id = ? AND is_active = 1");
    $stmt->execute([$decoded['user_id']]);
    $user = $stmt->fetch();

    return $user ?: null;
}

/**
 * Get current user from Authorization header
 */
function getCurrentUser()
{
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? null;

    if ($token) {
        $token = str_replace('Bearer ', '', $token);
        return verifyToken($token);
    }

    return null;
}

/**
 * Require authentication
 */
function requireAuth()
{
    $user = getCurrentUser();
    if (!$user) {
        sendError('Unauthorized', 401);
    }
    return $user;
}

/**
 * Require admin role
 */
function requireAdmin()
{
    $user = requireAuth();
    if ($user['role'] !== 'admin') {
        sendError('Forbidden: Admin access required', 403);
    }
    return $user;
}

/**
 * Sanitize input
 */
function sanitize($data)
{
    if (is_array($data)) {
        return array_map('sanitize', $data);
    }
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

