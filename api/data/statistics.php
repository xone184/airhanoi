<?php
/**
 * Statistics API
 * Aggregate air quality data for charts and export
 *
 * GET  /api/statistics.php                              - Tổng quan thống kê
 * GET  /api/statistics.php?type=weekly                  - Thống kê theo tuần
 * GET  /api/statistics.php?type=monthly                 - Thống kê theo tháng
 * GET  /api/statistics.php?type=ranking                 - Xếp hạng quận
 * GET  /api/statistics.php?type=trends&district_id=1    - Xu hướng theo quận
 * GET  /api/statistics.php?type=yearly_compare          - So sánh AQI từng tháng qua các năm (DB)
 * GET  /api/statistics.php?type=owm_history&year=2023   - Lịch sử AQI từ OpenWeatherMap
 * POST /api/statistics.php?type=ai_analysis             - Gọi AI phân tích
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
    case 'yearly_compare':
        handleYearlyCompare($db);
        break;
    case 'owm_history':
        handleOwmHistory();
        break;
    case 'ai_analysis':
        if ($method !== 'POST') sendError('Method not allowed', 405);
        handleAiAnalysis();
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

/**
 * So sánh AQI trung bình theo tháng qua từng năm trong DB hệ thống
 */
function handleYearlyCompare($db) {
    $stmt = $db->query("
        SELECT
            YEAR(datetime)  AS year,
            MONTH(datetime) AS month_num,
            DATE_FORMAT(datetime, '%m') AS month_label,
            ROUND(AVG(aqi), 1)   AS avg_aqi,
            ROUND(AVG(pm25), 1)  AS avg_pm25,
            ROUND(MAX(aqi), 0)   AS max_aqi,
            ROUND(MIN(aqi), 0)   AS min_aqi,
            COUNT(*)             AS total_records
        FROM fact_air_quality
        GROUP BY YEAR(datetime), MONTH(datetime)
        ORDER BY YEAR(datetime) ASC, MONTH(datetime) ASC
    ");
    $rows = $stmt->fetchAll();

    // Group by year
    $byYear = [];
    $years  = [];
    foreach ($rows as $r) {
        $y = (int)$r['year'];
        if (!isset($byYear[$y])) {
            $byYear[$y] = [];
            $years[] = $y;
        }
        $byYear[$y][] = [
            'month'         => (int)$r['month_num'],
            'month_label'   => $r['month_label'],
            'avg_aqi'       => (float)$r['avg_aqi'],
            'avg_pm25'      => (float)$r['avg_pm25'],
            'max_aqi'       => (float)$r['max_aqi'],
            'min_aqi'       => (float)$r['min_aqi'],
            'total_records' => (int)$r['total_records'],
        ];
    }

    // Build pivot: each row = one month (1-12), columns = years
    $pivot = [];
    for ($m = 1; $m <= 12; $m++) {
        $entry = ['month' => str_pad($m, 2, '0', STR_PAD_LEFT)];
        foreach ($years as $y) {
            $found = null;
            foreach ($byYear[$y] as $d) {
                if ($d['month'] === $m) { $found = $d; break; }
            }
            $entry["{$y}_avg_aqi"]  = $found ? $found['avg_aqi']  : null;
            $entry["{$y}_avg_pm25"] = $found ? $found['avg_pm25'] : null;
            $entry["{$y}_max_aqi"]  = $found ? $found['max_aqi']  : null;
        }
        $pivot[] = $entry;
    }

    // Year-level summary (avg of avgs)
    $summaries = [];
    foreach ($years as $y) {
        $aqiVals  = array_column($byYear[$y], 'avg_aqi');
        $pm25Vals = array_column($byYear[$y], 'avg_pm25');
        $summaries[$y] = [
            'year'       => $y,
            'avg_aqi'    => $aqiVals  ? round(array_sum($aqiVals)  / count($aqiVals),  1) : null,
            'avg_pm25'   => $pm25Vals ? round(array_sum($pm25Vals) / count($pm25Vals), 1) : null,
            'max_aqi'    => $aqiVals  ? max(array_column($byYear[$y], 'max_aqi'))  : null,
            'min_aqi'    => $aqiVals  ? min(array_column($byYear[$y], 'min_aqi'))  : null,
            'months_data'=> count($byYear[$y]),
        ];
    }

    sendSuccess([
        'years'     => $years,
        'by_year'   => $byYear,
        'pivot'     => $pivot,
        'summaries' => array_values($summaries),
    ]);
}

/**
 * Proxy lấy lịch sử Air Pollution từ OpenWeatherMap cho Hà Nội
 * Params: year (int, default = current year - 1)
 * OWM Air Pollution History API: https://api.openweathermap.org/data/2.5/air_pollution/history
 * Lưu ý: chỉ hỗ trợ từ ngày 27/11/2020 trở đi
 */
function handleOwmHistory() {
    $owmKey = defined('OWM_API_KEY') ? OWM_API_KEY : (getenv('OWM_API_KEY') ?: '');
    // Fallback: đọc từ file .env nếu không có constant
    if (!$owmKey) {
        $envFile = __DIR__ . '/../../.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos($line, 'VITE_OWM_API_KEY=') === 0) {
                    $owmKey = trim(substr($line, strlen('VITE_OWM_API_KEY=')));
                    break;
                }
                if (strpos($line, 'OWM_API_KEY=') === 0) {
                    $owmKey = trim(substr($line, strlen('OWM_API_KEY=')));
                    break;
                }
            }
        }
    }

    if (!$owmKey) {
        sendError('OWM_API_KEY chưa được cấu hình. Thêm VITE_OWM_API_KEY vào .env', 500);
        return;
    }

    $year = isset($_GET['year']) ? (int)$_GET['year'] : (date('Y') - 1);
    // Giới hạn: OWM chỉ có data từ 2020-11-27
    $year = max(2020, min((int)date('Y'), $year));

    // Hà Nội tọa độ trung tâm
    $lat  = 21.0285;
    $lon  = 105.8542;

    // Lấy từng tháng: start = đầu tháng, end = cuối tháng (Unix timestamp)
    $monthly = [];
    for ($m = 1; $m <= 12; $m++) {
        $start = mktime(0, 0, 0, $m, 1, $year);
        $end   = mktime(23, 59, 59, $m, date('t', $start), $year);

        // Nếu tháng trong tương lai thì bỏ qua
        if ($start > time()) continue;

        $url = "https://api.openweathermap.org/data/2.5/air_pollution/history";
        $url .= "?lat={$lat}&lon={$lon}&start={$start}&end={$end}&appid={$owmKey}";

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $resp = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$resp) continue;

        $json = json_decode($resp, true);
        if (!isset($json['list']) || empty($json['list'])) continue;

        // Tính trung bình các chỉ số trong tháng
        $aqiVals  = array_column($json['list'], 'main');
        $aqiNums  = array_map(fn($x) => $x['aqi'] ?? null, $aqiVals);
        $aqiNums  = array_filter($aqiNums, fn($v) => $v !== null);

        $components = [];
        foreach ($json['list'] as $item) {
            foreach ($item['components'] as $k => $v) {
                $components[$k][] = $v;
            }
        }

        // OWM AQI: 1=Good,2=Fair,3=Moderate,4=Poor,5=VeryPoor  → scale to 0-500
        $aqiAvgRaw = count($aqiNums) ? array_sum($aqiNums) / count($aqiNums) : null;
        // Chuyển sang thang AQI US tương đương thô
        $aqiScaled = $aqiAvgRaw ? round($aqiAvgRaw * 50, 1) : null;

        $monthly[] = [
            'month'       => str_pad($m, 2, '0', STR_PAD_LEFT),
            'year'        => $year,
            'owm_aqi_raw' => $aqiAvgRaw ? round($aqiAvgRaw, 2) : null,
            'avg_aqi'     => $aqiScaled,
            'avg_pm25'    => isset($components['pm2_5'])
                ? round(array_sum($components['pm2_5']) / count($components['pm2_5']), 1)
                : null,
            'avg_pm10'    => isset($components['pm10'])
                ? round(array_sum($components['pm10'])  / count($components['pm10']),  1)
                : null,
            'avg_no2'     => isset($components['no2'])
                ? round(array_sum($components['no2'])   / count($components['no2']),   1)
                : null,
            'data_points' => count($json['list']),
            'source'      => 'OpenWeatherMap',
        ];
    }

    sendSuccess([
        'year'    => $year,
        'lat'     => $lat,
        'lon'     => $lon,
        'monthly' => $monthly,
    ]);
}

/**
 * Gọi Groq API để phân tích dữ liệu
 */
function handleAiAnalysis() {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || empty($input['yearlyData']) || empty($input['owmData'])) {
        sendError('Missing data', 400);
    }

    $groqKey = defined('GROQ_API_KEY') ? GROQ_API_KEY : (getenv('GROQ_API_KEY') ?: '');
    if (!$groqKey) {
        $envFile = __DIR__ . '/../../.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos($line, 'VITE_GROQ_API_KEY=') === 0) {
                    $groqKey = trim(substr($line, strlen('VITE_GROQ_API_KEY=')));
                    break;
                }
                if (strpos($line, 'GROQ_API_KEY=') === 0) {
                    $groqKey = trim(substr($line, strlen('GROQ_API_KEY=')));
                    break;
                }
            }
        }
    }

    if (!$groqKey) {
        sendError('GROQ API Key is not configured', 500);
    }

    $prompt = "Dưới đây là dữ liệu thống kê chất lượng không khí (AQI) trung bình theo tháng qua các năm.\n"
            . "Dữ liệu từ DB nội bộ: " . json_encode($input['yearlyData']) . "\n"
            . "Dữ liệu lịch sử từ OpenWeatherMap: " . json_encode($input['owmData']) . "\n\n"
            . "Hãy đóng vai là một chuyên gia môi trường, phân tích dữ liệu trên và đưa ra nhận định ngắn gọn, súc tích (khoảng 3-4 câu) về:\n"
            . "1. Xu hướng thay đổi AQI giữa năm nay so với các năm trước.\n"
            . "2. Dự đoán tình hình ô nhiễm trong các tháng tới dựa trên quy luật mùa (nếu có).\n"
            . "3. Đưa ra 1 lời khuyên chung cho người dân Hà Nội.\n\n"
            . "Định dạng trả về: Chỉ trả về đoạn văn bản nhận định, không cần tiêu đề.";

    $ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'model' => 'llama3-8b-8192',
        'messages' => [
            ['role' => 'user', 'content' => $prompt]
        ]
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $groqKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) {
        sendError('Failed to get analysis from AI', 500);
    }

    $data = json_decode($response, true);
    $content = $data['choices'][0]['message']['content'] ?? 'Không có nhận định.';
    sendSuccess(['analysis' => $content]);
}
?>
