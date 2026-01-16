<?php
// Script to update database schema
require_once 'config.php';

header('Content-Type: text/plain');

try {
    $db = Database::getInstance()->getConnection();
    echo "Connecting to database...\n";

    // 1. Check user_settings table
    echo "Checking 'user_settings' table...\n";
    $columns = $db->query("SHOW COLUMNS FROM user_settings")->fetchAll(PDO::FETCH_COLUMN);

    // Add 'phone' column if missing
    if (!in_array('phone', $columns)) {
        echo "Adding missing column 'phone'...\n";
        $db->exec("ALTER TABLE user_settings ADD COLUMN phone VARCHAR(20) DEFAULT ''");
        echo "✅ Added 'phone' column.\n";
    } else {
        echo "ℹ️ Column 'phone' already exists.\n";
    }

    // Add 'alert_district_id' if missing (just in case)
    if (!in_array('alert_district_id', $columns)) {
        echo "Adding missing column 'alert_district_id'...\n";
        $db->exec("ALTER TABLE user_settings ADD COLUMN alert_district_id INT DEFAULT NULL");
        echo "✅ Added 'alert_district_id' column.\n";
    }

    // Add 'temperature_unit' if missing
    if (!in_array('temperature_unit', $columns)) {
        echo "Adding missing column 'temperature_unit'...\n";
        $db->exec("ALTER TABLE user_settings ADD COLUMN temperature_unit VARCHAR(5) DEFAULT 'c'");
        echo "✅ Added 'temperature_unit' column.\n";
    }

    // Add 'enable_sms_alerts' if missing
    if (!in_array('enable_sms_alerts', $columns)) {
        echo "Adding missing column 'enable_sms_alerts'...\n";
        $db->exec("ALTER TABLE user_settings ADD COLUMN enable_sms_alerts TINYINT(1) DEFAULT 0");
        echo "✅ Added 'enable_sms_alerts' column.\n";
    }

    echo "\nDatabase schema update completed successfully!\n";

} catch (PDOException $e) {
    echo "❌ Error updating database: " . $e->getMessage() . "\n";
    http_response_code(500);
}
?>