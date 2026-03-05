<?php
/**
 * Debug Brevo API - Test with minimal payload
 */
require_once 'config.php';

header('Content-Type: application/json');

$apiKey = getenv('BREVO_API_KEY') ?: '';

// 1. Check if API key exists
if (empty($apiKey)) {
    echo json_encode(['error' => 'BREVO_API_KEY env variable is EMPTY or NOT SET', 'env_check' => false]);
    exit;
}

echo json_encode([
    'api_key_set' => true,
    'api_key_length' => strlen($apiKey),
    'api_key_prefix' => substr($apiKey, 0, 10) . '...',
    'php_version' => PHP_VERSION,
    'json_test' => json_encode(['test' => '✅ emoji test 🌿'], JSON_UNESCAPED_UNICODE),
    'curl_available' => function_exists('curl_init'),
]);
