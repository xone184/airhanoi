<?php
/**
 * CSV Upload API
 * Endpoint: POST /api/upload.php?type=realtime|forecast
 * Handles CSV file uploads from admin panel
 */

require_once 'config.php';

requireAdmin(); // Only admin can upload

$type = $_GET['type'] ?? '';
$file = $_FILES['file'] ?? null;

if (!$file || !isset($file['tmp_name'])) {
    sendError('No file uploaded', 400);
}

if ($type !== 'realtime' && $type !== 'forecast') {
    sendError('Invalid type. Use: realtime or forecast', 400);
}

$db = Database::getInstance()->getConnection();

// Read CSV file
$csvFile = fopen($file['tmp_name'], 'r');
if (!$csvFile) {
    sendError('Failed to read uploaded file', 500);
}

$headers = fgetcsv($csvFile); // Read header row
$inserted = 0;
$errors = [];

// Start transaction
$db->beginTransaction();

try {
    if ($type === 'realtime') {
        // Expected headers: datetime,district,latitude,longitude,pm25,pm10,temperature,humidity,aqi,pollution_level,aqi_color
        $expectedHeaders = ['datetime', 'district', 'pm25', 'pm10', 'temperature', 'humidity', 'aqi'];

        // Validate headers
        foreach ($expectedHeaders as $header) {
            if (!in_array($header, $headers)) {
                throw new Exception("Missing required header: $header");
            }
        }

        // Clear old CSV realtime data before re-importing to avoid duplicates
        $db->exec("DELETE FROM fact_air_quality WHERE source = 'csv'");

        while (($row = fgetcsv($csvFile)) !== false) {
            if (count($row) < count($headers))
                continue;

            $data = array_combine($headers, $row);

            // Find district
            $districtStmt = $db->prepare("SELECT district_id FROM dim_districts WHERE name = ?");
            $districtStmt->execute([trim($data['district'])]);
            $district = $districtStmt->fetch();

            if (!$district) {
                $errors[] = "District not found: " . $data['district'];
                continue;
            }

            // Calculate or find AQI level
            $aqi = (int) $data['aqi'];
            $aqiLevelStmt = $db->prepare("
                SELECT aqi_level_id FROM dim_aqi_scale 
                WHERE ? BETWEEN min_aqi AND max_aqi
            ");
            $aqiLevelStmt->execute([$aqi]);
            $aqiLevel = $aqiLevelStmt->fetch();

            if (!$aqiLevel) {
                $errors[] = "Invalid AQI: " . $aqi;
                continue;
            }

            // Parse datetime
            $datetime = date('Y-m-d H:i:s', strtotime($data['datetime']));
            if (!$datetime) {
                $errors[] = "Invalid datetime: " . $data['datetime'];
                continue;
            }

            // Insert or update (có unique constraint trên district_id + datetime)
            $stmt = $db->prepare("
                INSERT INTO fact_air_quality 
                (district_id, datetime, pm25, pm10, temperature, humidity, aqi, aqi_level_id, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'csv')
                ON DUPLICATE KEY UPDATE
                    pm25 = VALUES(pm25),
                    pm10 = VALUES(pm10),
                    temperature = VALUES(temperature),
                    humidity = VALUES(humidity),
                    aqi = VALUES(aqi),
                    aqi_level_id = VALUES(aqi_level_id)
            ");

            $stmt->execute([
                $district['district_id'],
                $datetime,
                floatval($data['pm25']),
                floatval($data['pm10']),
                floatval($data['temperature']),
                floatval($data['humidity']),
                $aqi,
                $aqiLevel['aqi_level_id']
            ]);

            $inserted++;
        }

    } elseif ($type === 'forecast') {
        // Expected headers: datetime,district,latitude,longitude,pm25_forecast,aqi_forecast,pollution_level_forecast,aqi_color_forecast
        $expectedHeaders = ['datetime', 'district', 'pm25_forecast', 'aqi_forecast'];

        foreach ($expectedHeaders as $header) {
            if (!in_array($header, $headers)) {
                throw new Exception("Missing required header: $header");
            }
        }

        // Clear old CSV forecast data before re-importing to avoid duplicates
        $db->exec("DELETE FROM fact_forecast WHERE source = 'csv'");

        while (($row = fgetcsv($csvFile)) !== false) {
            if (count($row) < count($headers))
                continue;

            $data = array_combine($headers, $row);

            // Find district
            $districtStmt = $db->prepare("SELECT district_id FROM dim_districts WHERE name = ?");
            $districtStmt->execute([trim($data['district'])]);
            $district = $districtStmt->fetch();

            if (!$district) {
                $errors[] = "District not found: " . $data['district'];
                continue;
            }

            // Find AQI level
            $aqi = (int) $data['aqi_forecast'];
            $aqiLevelStmt = $db->prepare("
                SELECT aqi_level_id FROM dim_aqi_scale 
                WHERE ? BETWEEN min_aqi AND max_aqi
            ");
            $aqiLevelStmt->execute([$aqi]);
            $aqiLevel = $aqiLevelStmt->fetch();

            if (!$aqiLevel) {
                $errors[] = "Invalid AQI: " . $aqi;
                continue;
            }

            // Parse datetime
            $datetime = date('Y-m-d H:i:s', strtotime($data['datetime']));
            if (!$datetime) {
                $errors[] = "Invalid datetime: " . $data['datetime'];
                continue;
            }

            // Insert forecast
            $stmt = $db->prepare("
                INSERT INTO fact_forecast 
                (district_id, forecast_datetime, pm25_forecast, pm10_forecast, aqi_forecast, 
                 aqi_level_id, temperature_forecast, humidity_forecast, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'csv')
                ON DUPLICATE KEY UPDATE
                    pm25_forecast = VALUES(pm25_forecast),
                    pm10_forecast = VALUES(pm10_forecast),
                    aqi_forecast = VALUES(aqi_forecast),
                    aqi_level_id = VALUES(aqi_level_id),
                    temperature_forecast = VALUES(temperature_forecast),
                    humidity_forecast = VALUES(humidity_forecast)
            ");

            $stmt->execute([
                $district['district_id'],
                $datetime,
                floatval($data['pm25_forecast']),
                isset($data['pm10_forecast']) ? floatval($data['pm10_forecast']) : null,
                $aqi,
                $aqiLevel['aqi_level_id'],
                isset($data['temperature_forecast']) ? floatval($data['temperature_forecast']) : null,
                isset($data['humidity_forecast']) ? floatval($data['humidity_forecast']) : null
            ]);

            $inserted++;
        }
    }

    fclose($csvFile);
    $db->commit();

    sendSuccess([
        'message' => "Successfully imported $inserted records",
        'inserted' => $inserted,
        'errors' => $errors,
        'errors_count' => count($errors)
    ]);

} catch (Exception $e) {
    fclose($csvFile);
    $db->rollBack();
    sendError('Upload failed: ' . $e->getMessage(), 500);
}

