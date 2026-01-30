<?php
/**
 * Debug Script: Kiểm tra dữ liệu Forecast trong database
 * Truy cập: /api/debug_forecast.php
 */

require_once 'config.php';

header('Content-Type: application/json');

try {
    $db = Database::getInstance()->getConnection();

    // 1. Đếm tổng số bản ghi forecast
    $countStmt = $db->query("SELECT COUNT(*) as total FROM fact_forecast");
    $totalCount = $countStmt->fetch()['total'];

    // 2. Lấy 10 bản ghi mới nhất
    $latestStmt = $db->query("
        SELECT 
            f.forecast_id,
            d.name as district,
            f.forecast_datetime,
            f.pm25_forecast,
            f.aqi_forecast,
            f.source,
            NOW() as server_time
        FROM fact_forecast f
        JOIN dim_districts d ON f.district_id = d.district_id
        ORDER BY f.forecast_datetime DESC
        LIMIT 10
    ");
    $latestRecords = $latestStmt->fetchAll();

    // 3. Đếm số bản ghi có forecast_datetime >= NOW()
    $futureStmt = $db->query("
        SELECT COUNT(*) as future_count 
        FROM fact_forecast 
        WHERE forecast_datetime >= NOW()
    ");
    $futureCount = $futureStmt->fetch()['future_count'];

    // 4. Đếm số bản ghi có forecast_datetime < NOW() (quá khứ)
    $pastStmt = $db->query("
        SELECT COUNT(*) as past_count 
        FROM fact_forecast 
        WHERE forecast_datetime < NOW()
    ");
    $pastCount = $pastStmt->fetch()['past_count'];

    // 5. Lấy datetime range
    $rangeStmt = $db->query("
        SELECT 
            MIN(forecast_datetime) as oldest,
            MAX(forecast_datetime) as newest,
            NOW() as server_now
        FROM fact_forecast
    ");
    $range = $rangeStmt->fetch();

    echo json_encode([
        'success' => true,
        'debug_info' => [
            'total_records' => (int) $totalCount,
            'future_records_shown' => (int) $futureCount,
            'past_records_hidden' => (int) $pastCount,
            'server_time' => $range['server_now'],
            'datetime_range' => [
                'oldest' => $range['oldest'],
                'newest' => $range['newest']
            ],
            'latest_10_records' => $latestRecords,
            'diagnosis' => $futureCount == 0
                ? 'PROBLEM: Không có bản ghi nào có forecast_datetime >= NOW(). Dữ liệu CSV cần có datetime trong tương lai!'
                : 'OK: Có ' . $futureCount . ' bản ghi sẽ được hiển thị.'
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
