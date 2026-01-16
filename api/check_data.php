<?php
require_once 'config.php';

try {
    $db = Database::getInstance()->getConnection();
    $stmt = $db->query("SELECT COUNT(*) as count FROM fact_air_quality");
    $result = $stmt->fetch();
    echo "Row count in fact_air_quality: " . $result['count'];
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
