<?php
/**
 * Air Quality Data API
 * Endpoints: 
 *   GET /api/air_quality.php?type=realtime|forecast
 *   POST /api/air_quality.php?action=upload_realtime|upload_forecast
 */

require_once 'config.php';

$db = Database::getInstance()->getConnection();
$type = $_GET['type'] ?? '';
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($action === 'upload_realtime' || $action === 'upload_forecast') {
    requireAdmin(); // Only admin can upload
    handleUpload($action);
} else {
    handleGetData($type);
}

function handleGetData($type)
{
    global $db;

    try {
        if ($type === 'realtime') {
            // Get latest air quality data for all districts
            $stmt = $db->query("
                SELECT 
                    d.district_id as id,
                    d.name as district,
                    d.latitude,
                    d.longitude,
                    aq.datetime,
                    aq.pm25,
                    aq.pm10,
                    aq.temperature,
                    aq.humidity,
                    aq.aqi,
                    aqs.level_name as pollution_level,
                    aqs.color_code as aqi_color
                FROM dim_districts d
                LEFT JOIN (
                    SELECT aq1.*
                    FROM fact_air_quality aq1
                    INNER JOIN (
                        SELECT district_id, MAX(datetime) as max_datetime
                        FROM fact_air_quality
                        GROUP BY district_id
                    ) aq2 ON aq1.district_id = aq2.district_id 
                        AND aq1.datetime = aq2.max_datetime
                    GROUP BY aq1.district_id
                ) aq ON d.district_id = aq.district_id
                LEFT JOIN dim_aqi_scale aqs ON aq.aqi_level_id = aqs.aqi_level_id
                ORDER BY d.name
            ");

            $data = $stmt->fetchAll();

            // Format datetime as ISO string
            foreach ($data as &$row) {
                if ($row['datetime']) {
                    $row['datetime'] = date('c', strtotime($row['datetime']));
                }
            }

            sendSuccess($data);

        } elseif ($type === 'forecast') {
            // Get forecast data
            $districtId = $_GET['district_id'] ?? null;
            $limit = $_GET['limit'] ?? 7; // Default 7 days

            $limitDays = max(1, (int) $limit);
            $maxRows = $limitDays * 30;

            $query = "
                SELECT 
                    f.forecast_id,
                    d.name as district,
                    d.latitude,
                    d.longitude,
                    f.forecast_datetime as datetime,
                    f.pm25_forecast as pm25_forecast,
                    f.pm10_forecast as pm10_forecast,
                    f.aqi_forecast as aqi_forecast,
                    aqs.level_name as pollution_level_forecast,
                    aqs.color_code as aqi_color_forecast,
                    f.temperature_forecast as temperature_forecast,
                    f.humidity_forecast as humidity_forecast,
                    'Dự báo' as data_type
                FROM fact_forecast f
                JOIN dim_districts d ON f.district_id = d.district_id
                JOIN dim_aqi_scale aqs ON f.aqi_level_id = aqs.aqi_level_id
                WHERE f.forecast_datetime >= DATE_SUB(NOW(), INTERVAL 1 DAY)
                  AND f.forecast_datetime <= DATE_ADD(NOW(), INTERVAL {$limitDays} DAY)
            ";

            $params = [];
            if ($districtId) {
                $query .= " AND f.district_id = ?";
                $params[] = $districtId;
            }

            $query .= " GROUP BY f.district_id, f.forecast_datetime ORDER BY f.forecast_datetime ASC LIMIT {$maxRows}";

            $stmt = $db->prepare($query);
            $stmt->execute($params);
            $data = $stmt->fetchAll();

            // Format datetime
            foreach ($data as &$row) {
                $row['datetime'] = date('c', strtotime($row['datetime']));
            }

            sendSuccess($data);
        } else {
            sendError('Invalid type. Use: realtime or forecast', 400);
        }
    } catch (PDOException $e) {
        // Catch any database-related errors
        sendError('Database query failed: ' . $e->getMessage(), 500);
    }
}

function handleUpload($action)
{
    global $db;

    if ($action === 'upload_realtime') {
        $input = getJsonInput();
        $data = $input['data'] ?? [];

        if (empty($data)) {
            sendError('No data provided', 400);
        }

        $inserted = 0;
        $errors = [];

        // Start transaction
        $db->beginTransaction();

        try {
            foreach ($data as $row) {
                // Find district
                $districtStmt = $db->prepare("SELECT district_id FROM dim_districts WHERE name = ?");
                $districtStmt->execute([$row['district']]);
                $district = $districtStmt->fetch();

                if (!$district) {
                    $errors[] = "District not found: " . $row['district'];
                    continue;
                }

                // Find AQI level
                $aqi = (int) $row['aqi'];
                $aqiLevelStmt = $db->prepare("
                    SELECT aqi_level_id FROM dim_aqi_scale 
                    WHERE ? BETWEEN min_aqi AND max_aqi
                ");
                $aqiLevelStmt->execute([$aqi]);
                $aqiLevel = $aqiLevelStmt->fetch();

                if (!$aqiLevel) {
                    $errors[] = "Invalid AQI level: " . $aqi;
                    continue;
                }

                // Insert or update
                $stmt = $db->prepare("
                    INSERT INTO fact_air_quality 
                    (district_id, datetime, pm25, pm10, temperature, humidity, aqi, aqi_level_id, source)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual')
                    ON DUPLICATE KEY UPDATE
                        pm25 = VALUES(pm25),
                        pm10 = VALUES(pm10),
                        temperature = VALUES(temperature),
                        humidity = VALUES(humidity),
                        aqi = VALUES(aqi),
                        aqi_level_id = VALUES(aqi_level_id)
                ");

                $datetime = date('Y-m-d H:i:s', strtotime($row['datetime']));
                $stmt->execute([
                    $district['district_id'],
                    $datetime,
                    $row['pm25'],
                    $row['pm10'],
                    $row['temperature'],
                    $row['humidity'],
                    $aqi,
                    $aqiLevel['aqi_level_id']
                ]);

                $inserted++;
            }

            $db->commit();
            sendSuccess([
                'inserted' => $inserted,
                'errors' => $errors
            ]);

        } catch (Exception $e) {
            $db->rollBack();
            sendError('Upload failed: ' . $e->getMessage(), 500);
        }

    } elseif ($action === 'upload_forecast') {
        $input = getJsonInput();
        $data = $input['data'] ?? [];

        if (empty($data)) {
            sendError('No data provided', 400);
        }

        $inserted = 0;
        $errors = [];

        $db->beginTransaction();

        try {
            foreach ($data as $row) {
                // Find district
                $districtStmt = $db->prepare("SELECT district_id FROM dim_districts WHERE name = ?");
                $districtStmt->execute([$row['district']]);
                $district = $districtStmt->fetch();

                if (!$district) {
                    $errors[] = "District not found: " . $row['district'];
                    continue;
                }

                // Find AQI level
                $aqi = (int) $row['aqi_forecast'];
                $aqiLevelStmt = $db->prepare("
                    SELECT aqi_level_id FROM dim_aqi_scale 
                    WHERE ? BETWEEN min_aqi AND max_aqi
                ");
                $aqiLevelStmt->execute([$aqi]);
                $aqiLevel = $aqiLevelStmt->fetch();

                if (!$aqiLevel) {
                    $errors[] = "Invalid AQI level: " . $aqi;
                    continue;
                }

                // Insert forecast
                $stmt = $db->prepare("
                    INSERT INTO fact_forecast 
                    (district_id, forecast_datetime, pm25_forecast, pm10_forecast, aqi_forecast, 
                     aqi_level_id, temperature_forecast, humidity_forecast, source)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual')
                ");

                $datetime = date('Y-m-d H:i:s', strtotime($row['datetime']));
                $stmt->execute([
                    $district['district_id'],
                    $datetime,
                    $row['pm25_forecast'],
                    $row['pm10_forecast'] ?? null,
                    $aqi,
                    $aqiLevel['aqi_level_id'],
                    $row['temperature_forecast'] ?? null,
                    $row['humidity_forecast'] ?? null
                ]);

                $inserted++;
            }

            $db->commit();
            sendSuccess([
                'inserted' => $inserted,
                'errors' => $errors
            ]);

        } catch (Exception $e) {
            $db->rollBack();
            sendError('Upload failed: ' . $e->getMessage(), 500);
        }
    }
}

