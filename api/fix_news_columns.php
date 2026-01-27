<?php
/**
 * Database Migration: Expand URL Columns
 * Run this script once to fix the "Data too long" error
 * Access: GET /api/fix_news_columns.php
 */

header('Content-Type: application/json');
require_once 'config.php';

$db = Database::getInstance()->getConnection();
$results = [];

try {
    // Expand external_url column to allow longer URLs
    $db->exec("ALTER TABLE news_items MODIFY COLUMN external_url VARCHAR(1000)");
    $results[] = "✅ Expanded external_url to VARCHAR(1000)";
} catch (Exception $e) {
    $results[] = "⚠️ external_url: " . $e->getMessage();
}

try {
    // Expand image_url column as well
    $db->exec("ALTER TABLE news_items MODIFY COLUMN image_url VARCHAR(1000)");
    $results[] = "✅ Expanded image_url to VARCHAR(1000)";
} catch (Exception $e) {
    $results[] = "⚠️ image_url: " . $e->getMessage();
}

try {
    // Expand title column
    $db->exec("ALTER TABLE news_items MODIFY COLUMN title VARCHAR(500)");
    $results[] = "✅ Expanded title to VARCHAR(500)";
} catch (Exception $e) {
    $results[] = "⚠️ title: " . $e->getMessage();
}

try {
    // Expand summary column
    $db->exec("ALTER TABLE news_items MODIFY COLUMN summary TEXT");
    $results[] = "✅ Changed summary to TEXT";
} catch (Exception $e) {
    $results[] = "⚠️ summary: " . $e->getMessage();
}

echo json_encode([
    'success' => true,
    'message' => 'Database migration completed',
    'results' => $results
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
