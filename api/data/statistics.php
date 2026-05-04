<?php
/**
 * Statistics API
 * Aggregate air quality data for charts and export
 *
 * GET  /api/statistics.php                         - Tổng quan thống kê
 * GET  /api/statistics.php?type=weekly             - Thống kê theo tuần
 * GET  /api/statistics.php?type=monthly            - Thống kê theo tháng
 * GET  /api/statistics.php?type=ranking            - Xếp hạng quận
 * GET  /api/statistics.php?type=trends&district_id=1  - Xu hướng theo quận
 */

require_once '../config/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($method !== 'GET') {
    sendError('Method not allowed', 405);
}

$type = $_GET['type'] ?? 'overview';
$districtId = isset($_GET['district_id']) ? (int)$_GET['district_id'] : null;
$days = isset($_GET['days']) ? min((int)$_GET['days'], 365) : 30;

$db = Database::getInstance()->getConnection();

switch ($type) {
    case 'overview':
        handleOverview($db, $days);
        break;
    case 'weekly':
        handleWeekly($db, $days);
        break;
    case 'monthly':
        handleMonthly($db);
        break;
    case 'ranking':
        handleRanking($db, $days);
        break;
    case 'trends':
        handleTrends($db, $districtId, $days);
        break;
    default:
        sendError('Invalid type', 400);
}

/**
 * Tổng quan: AQI trung bình, PM2.5 trung bình, số lần vượt ngưỡng
 */
function handleOverview($db, $days) {
    // Overall averages
    $stmt = $db->prepare("
        SELECT 
            ROUND(AVG(aqi), 1) as avg_aqi,
            ROUND(AVG(pm25), 1) as avg_pm25,
            ROUND(AVG(pm10), 1) as avg_pm10,
            ROUND(AVG(temperature), 1) as avg_temp,
            ROUND(AVG(humidity), 1) as avg_humidity,
            ROUND(MAX(aqi), 0) as max_aqi,
            ROUND(MIN(aqi), 0) as min_aqi,
            COUNT(DISTINCT DATE(datetime)) as total_days,
            COUNT(*) as total_records
        FROM fact_air_quality 
        WHERE datetime >= DATE_SUB(NOW(), INTERVAL ? DAY)
    ");
    $stmt->execute([$days]);
    $overview = $stmt->fetch();

    // AQI level distribution
    $stmt2 = $db->prepare("
        SELECT 
            das.level_name,
            das.color_code,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM fact_air_quality WHERE datetime >= DATE_SUB(NOW(), INTERVAL ? DAY)), 1) as percentage
        FROM fact_air_quality faq
        JOIN dim_aqi_scale das ON faq.aqi_level_id = das.aqi_level_id
        WHERE faq.datetime >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY das.aqi_level_id, das.level_name, das.color_code
        ORDER BY das.aqi_level_id
    ");
    $stmt2->execute([$days, $days]);
    $distribution = $stmt2->fetchAll();

    // Threshold violations (AQI >= 150)
    $stmt3 = $db->prepare("
        SELECT COUNT(DISTINCT CONCAT(district_id, '-', DATE(datetime))) as violations
        FROM fact_air_quality 
        WHERE aqi >= 150 AND datetime >= DATE_SUB(NOW(), INTERVAL ? DAY)
    ");
    $stmt3->execute([$days]);
    $violations = $stmt3->fetch()['violations'];

    sendSuccess([
        'period_days' => $days,
        'overview' => $overview,
        'aqi_distribution' => $distribution,
        'threshold_violations' => (int)$violations
    ]);
}

/**
 * Thống kê theo tuần: AQI trung bình mỗi tuần
 */
function handleWeekly($db, $days) {
    $stmt = $db->prepare("
        SELECT 
            YEARWEEK(datetime, 1) as year_week,
            MIN(DATE(datetime)) as week_start,
            MAX(DATE(datetime)) as week_end,
            ROUND(AVG(aqi), 1) as avg_aqi,
            ROUND(AVG(pm25), 1) as avg_pm25,
            ROUND(MAX(aqi), 0) as max_aqi,
            ROUND(MIN(aqi), 0) as min_aqi,
            COUNT(DISTINCT district_id) as districts_measured
        FROM fact_air_quality 
        WHERE datetime >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY YEARWEEK(datetime, 1)
        ORDER BY year_week DESC
    ");
    $stmt->execute([$days]);
    sendSuccess($stmt->fetchAll());
}

/**
 * Thống kê theo tháng: AQI trung bình mỗi tháng
 */
function handleMonthly($db) {
    $stmt = $db->query("
        SELECT 
            DATE_FORMAT(datetime, '%Y-%m') as month,
            ROUND(AVG(aqi), 1) as avg_aqi,
            ROUND(AVG(pm25), 1) as avg_pm25,
            ROUND(AVG(temperature), 1) as avg_temp,
            ROUND(MAX(aqi), 0) as max_aqi,
            ROUND(MIN(aqi), 0) as min_aqi,
            COUNT(DISTINCT district_id) as districts_measured,
            COUNT(*) as total_records
        FROM fact_air_quality 
        GROUP BY DATE_FORMAT(datetime, '%Y-%m')
        ORDER BY month DESC
        LIMIT 12
    ");
    sendSuccess($stmt->fetchAll());
}

/**
 * Xếp hạng quận: Top ô nhiễm / sạch nhất
 */
function handleRanking($db, $days) {
    $stmt = $db->prepare("
        SELECT 
            dd.name as district,
            ROUND(AVG(faq.aqi), 1) as avg_aqi,
            ROUND(AVG(faq.pm25), 1) as avg_pm25,
            ROUND(MAX(faq.aqi), 0) as max_aqi,
            ROUND(MIN(faq.aqi), 0) as min_aqi,
            das.level_name as dominant_level,
            das.color_code
        FROM fact_air_quality faq
        JOIN dim_districts dd ON faq.district_id = dd.district_id
        JOIN dim_aqi_scale das ON faq.aqi_level_id = das.aqi_level_id
        WHERE faq.datetime >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY dd.district_id, dd.name, das.level_name, das.color_code
        ORDER BY avg_aqi DESC
    ");
    $stmt->execute([$days]);
    $all = $stmt->fetchAll();

    sendSuccess([
        'most_polluted' => array_slice($all, 0, 5),
        'cleanest' => array_slice(array_reverse($all), 0, 5),
        'all_districts' => $all
    ]);
}

/**
 * Xu hướng theo quận cụ thể
 */
function handleTrends($db, $districtId, $days) {
    if (!$districtId) {
        sendError('district_id is required', 400);
    }

    $stmt = $db->prepare("
        SELECT 
            DATE(faq.datetime) as date,
            ROUND(AVG(faq.aqi), 1) as avg_aqi,
            ROUND(AVG(faq.pm25), 1) as avg_pm25,
            ROUND(AVG(faq.temperature), 1) as avg_temp,
            ROUND(AVG(faq.humidity), 1) as avg_humidity
        FROM fact_air_quality faq
        WHERE faq.district_id = ? AND faq.datetime >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(faq.datetime)
        ORDER BY date ASC
    ");
    $stmt->execute([$districtId, $days]);

    sendSuccess($stmt->fetchAll());
}
?>
