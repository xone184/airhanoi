<?php
/**
 * Debug Web Search - Test Tavily API
 * Endpoint: GET /api/debug_web_search.php
 */

require_once 'config.php';

header('Content-Type: application/json');

// Tavily API Configuration
$TAVILY_API_KEY = getenv('TAVILY_API_KEY') ?: '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';
$TAVILY_API_URL = 'https://api.tavily.com/search';

$testQuery = 'ô nhiễm không khí Hà Nội Vietnam';

try {
    // Check if cURL is available
    if (!function_exists('curl_init')) {
        throw new Exception('cURL is not enabled on this server');
    }

    // Prepare Tavily API request
    $tavilyPayload = [
        'api_key' => $TAVILY_API_KEY,
        'query' => $testQuery,
        'search_depth' => 'basic',
        'include_answer' => false,
        'include_raw_content' => false,
        'max_results' => 3
    ];

    error_log("Debug Web Search: Testing with query: " . $testQuery);
    error_log("Debug Web Search: API Key: " . substr($TAVILY_API_KEY, 0, 10) . "...");

    // Call Tavily API
    $ch = curl_init($TAVILY_API_URL);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($tavilyPayload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    $curlInfo = curl_getinfo($ch);
    curl_close($ch);

    if ($curlError) {
        throw new Exception("cURL Error: $curlError");
    }

    $data = json_decode($response, true);

    echo json_encode([
        'success' => true,
        'debug' => [
            'query' => $testQuery,
            'api_key_preview' => substr($TAVILY_API_KEY, 0, 15) . '...',
            'http_code' => $httpCode,
            'curl_info' => [
                'total_time' => $curlInfo['total_time'],
                'connect_time' => $curlInfo['connect_time']
            ],
            'tavily_response' => $data,
            'results_count' => isset($data['results']) ? count($data['results']) : 0
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => [
            'api_key_preview' => isset($TAVILY_API_KEY) ? substr($TAVILY_API_KEY, 0, 15) . '...' : 'NOT SET'
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
