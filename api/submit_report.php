<?php
/**
 * API Endpoint to submit a new pollution report from a user.
 * Endpoint: POST /api/submit_report.php
 *
 * This script handles multipart/form-data submissions, including a file upload.
 * It is publicly accessible (authentication could be added via tokens).
 */

// Disable display_errors to prevent HTML output interfering with JSON response
ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json');
require_once 'config.php';

// --- Helper Functions ---
function getDistrictId($name, $db)
{
    $stmt = $db->prepare("SELECT district_id FROM dim_districts WHERE name = ? LIMIT 1");
    $stmt->execute([$name]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return $result ? (int) $result['district_id'] : null;
}

function getPollutionTypeId($code, $db)
{
    $stmt = $db->prepare("SELECT type_id FROM dim_pollution_types WHERE type_code = ? LIMIT 1");
    $stmt->execute([$code]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return $result ? (int) $result['type_id'] : null;
}

// --- Main Logic ---

// Check if the request size exceeds post_max_size (which clears $_POST and $_FILES)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && empty($_POST) && empty($_FILES) && $_SERVER['CONTENT_LENGTH'] > 0) {
    sendError('Kích thước file vượt quá giới hạn cho phép của server (post_max_size).', 400);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Invalid request method. Only POST is accepted.', 405);
    exit;
}

// Wrap the entire logic in a try-catch block for cleaner error handling
try {
    // 1. Validate Text Inputs
    $required_fields = ['district', 'address', 'type', 'description', 'user_id'];
    foreach ($required_fields as $field) {
        if (empty($_POST[$field])) {
            throw new Exception("Trường bắt buộc '$field' bị thiếu.", 400);
        }
    }

    $districtName = trim($_POST['district']);
    $address = trim($_POST['address']);
    $typeCode = trim($_POST['type']);
    $customType = isset($_POST['customType']) ? trim($_POST['customType']) : null;
    $description = trim($_POST['description']);
    $userId = intval($_POST['user_id']);

    // 2. Validate File Upload and its error code
    if (!isset($_FILES['evidence'])) {
        throw new Exception('Không tìm thấy file bằng chứng trong request.', 400);
    }

    $file = $_FILES['evidence'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $uploadErrors = [
            UPLOAD_ERR_INI_SIZE => 'File vượt quá dung lượng cho phép trong php.ini (upload_max_filesize).',
            UPLOAD_ERR_FORM_SIZE => 'File vượt quá dung lượng cho phép đã khai báo trong form HTML.',
            UPLOAD_ERR_PARTIAL => 'File chỉ được upload một phần.',
            UPLOAD_ERR_NO_FILE => 'Không có file nào được upload.',
            UPLOAD_ERR_NO_TMP_DIR => 'Thiếu thư mục tạm.',
            UPLOAD_ERR_CANT_WRITE => 'Không thể ghi file vào disk.',
            UPLOAD_ERR_EXTENSION => 'Một extension của PHP đã chặn việc upload file.',
        ];
        $errorMessage = $uploadErrors[$file['error']] ?? 'Lỗi upload không xác định.';
        throw new Exception($errorMessage, 400);
    }

    // 3. File Validation (Size, Type)
    $maxFileSize = 50 * 1024 * 1024; // 50MB
    $allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/quicktime',
        'video/webm',
        'video/x-matroska',
        'video/avi',
        'video/mpeg',
        'video/3gpp'
    ];

    if ($file['size'] > $maxFileSize) {
        throw new Exception('Kích thước file vượt quá 50MB.', 400);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);
    if (!in_array($mimeType, $allowedMimeTypes)) {
        throw new Exception("Định dạng file không được hỗ trợ: '$mimeType'.", 400);
    }

    // 4. Process and Move the Uploaded File
    $uploadDir = '../uploads/';
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0777, true)) {
            throw new Exception('Không thể tạo thư mục uploads. Vui lòng kiểm tra quyền ghi của thư mục gốc.', 500);
        }
    }
    if (!is_writable($uploadDir)) {
        throw new Exception('Thư mục uploads không có quyền ghi. Vui lòng CHMOD 755 hoặc 777 cho thư mục này.', 500);
    }

    $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $uniqueFilename = uniqid('report_', true) . '.' . strtolower($fileExtension);
    $uploadPath = $uploadDir . $uniqueFilename;
    $publicUrl = 'uploads/' . $uniqueFilename;

    if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
        $lastError = error_get_last();
        throw new Exception('Không thể lưu file tải lên. Lỗi: ' . ($lastError['message'] ?? 'Không rõ'), 500);
    }

    // 5. Insert into Database
    $db = Database::getInstance()->getConnection();
    $db->beginTransaction();

    $districtId = getDistrictId($districtName, $db);
    if (!$districtId) {
        throw new Exception("Quận/Huyện không hợp lệ: '$districtName'", 400);
    }

    $typeId = getPollutionTypeId($typeCode, $db);
    if (!$typeId) {
        throw new Exception("Loại ô nhiễm không hợp lệ: '$typeCode'", 400);
    }

    $stmt = $db->prepare("
        INSERT INTO pollution_reports 
        (user_id, district_id, address, type_id, custom_type, description, image_url, status)
        VALUES (:user_id, :district_id, :address, :type_id, :custom_type, :description, :image_url, 'pending')
    ");

    $stmt->execute([
        ':user_id' => $userId,
        ':district_id' => $districtId,
        ':address' => $address,
        ':type_id' => $typeId,
        ':custom_type' => ($typeCode === 'other') ? $customType : null,
        ':description' => $description,
        ':image_url' => $publicUrl
    ]);

    $newReportId = $db->lastInsertId();
    $db->commit();

    // 6. Return Success Response
    sendSuccess([
        'message' => 'Báo cáo đã được gửi thành công!',
        'report_id' => $newReportId,
        'image_url' => $publicUrl
    ]);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    // Clean up uploaded file if DB insert fails
    if (isset($uploadPath) && file_exists($uploadPath)) {
        unlink($uploadPath);
    }
    sendError('Lỗi CSDL: ' . $e->getMessage(), 500);

} catch (Exception $e) {
    // Clean up uploaded file if any other error occurs
    if (isset($uploadPath) && file_exists($uploadPath)) {
        unlink($uploadPath);
    }
    sendError($e->getMessage(), $e->getCode() ?: 500);
}

?>