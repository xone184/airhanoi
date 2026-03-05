<?php
/**
 * Direct Brevo API Test - minimal test with full debug output
 */
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

$apiKey = getenv('BREVO_API_KEY') ?: '';
$url = 'https://api.brevo.com/v3/smtp/email';

// Minimal payload with ASCII-only content
$data = [
    'sender' => ['name' => 'AirHanoi', 'email' => 'adairhanoi@gmail.com'],
    'to' => [['email' => 'adairhanoi@gmail.com']],
    'subject' => 'AirHanoi Test Email',
    'htmlContent' => '<html><body><h1>Test Email</h1><p>This is a test from AirHanoi system.</p></body></html>',
    'textContent' => 'Test Email - This is a test from AirHanoi system.'
];

$payload = json_encode($data);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'api-key: ' . $apiKey,
        'Content-Type: application/json',
    ],
    CURLOPT_TIMEOUT => 30,
    CURLOPT_VERBOSE => true,
]);

// Capture verbose output
$verbose = fopen('php://temp', 'w+');
curl_setopt($ch, CURLOPT_STDERR, $verbose);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
$curlInfo = curl_getinfo($ch);
curl_close($ch);

// Get verbose log
rewind($verbose);
$verboseLog = stream_get_contents($verbose);
fclose($verbose);

echo json_encode([
    'payload_preview' => substr($payload, 0, 300),
    'payload_length' => strlen($payload),
    'http_code' => $httpCode,
    'curl_error' => $curlError,
    'response_raw' => $response,
    'response_decoded' => json_decode($response, true),
    'curl_content_type' => $curlInfo['content_type'] ?? null,
    'curl_total_time' => $curlInfo['total_time'] ?? null,
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
