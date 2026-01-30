<?php
/**
 * Web Search API Proxy
 * Endpoint: POST /api/web_search.php
 * 
 * Sử dụng Tavily API để tìm kiếm thông tin trên internet
 * Hỗ trợ tìm kiếm Google News, Reddit, và các nguồn khác
 */

require_once 'config.php';

// Tavily API Configuration
$TAVILY_API_KEY = getenv('TAVILY_API_KEY') ?: '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';
$TAVILY_API_URL = 'https://api.tavily.com/search';

// Handle CORS
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

$input = getJsonInput();
$query = $input['query'] ?? '';
$searchType = $input['type'] ?? 'general'; // 'general', 'news'
$maxResults = $input['max_results'] ?? 5;

if (empty($query)) {
    sendError('Query is required', 400);
}

// Enhance query for Vietnamese air quality context
$enhancedQuery = $query;
if (
    strpos(strtolower($query), 'ô nhiễm') !== false ||
    strpos(strtolower($query), 'không khí') !== false ||
    strpos(strtolower($query), 'aqi') !== false
) {
    $enhancedQuery = $query . ' Hà Nội Vietnam';
}

try {
    // Prepare Tavily API request
    $tavilyPayload = [
        'api_key' => $TAVILY_API_KEY,
        'query' => $enhancedQuery,
        'search_depth' => 'basic',
        'include_answer' => false,
        'include_raw_content' => false,
        'max_results' => min((int) $maxResults, 10),
        'include_domains' => [],
        'exclude_domains' => []
    ];

    // Add news-specific domains for news searches
    if ($searchType === 'news') {
        $tavilyPayload['include_domains'] = [
            'vnexpress.net',
            'thanhnien.vn',
            'dantri.com.vn',
            'tuoitre.vn',
            'reddit.com',
            'news.google.com'
        ];
    }

    // Call Tavily API
    $ch = curl_init($TAVILY_API_URL);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($tavilyPayload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        throw new Exception("cURL Error: $curlError");
    }

    if ($httpCode !== 200) {
        throw new Exception("Tavily API returned HTTP $httpCode: $response");
    }

    $data = json_decode($response, true);

    if (!$data || !isset($data['results'])) {
        throw new Exception("Invalid response from Tavily API");
    }

    // Format results for frontend
    $results = array_map(function ($item) {
        return [
            'title' => $item['title'] ?? 'No title',
            'url' => $item['url'] ?? '',
            'snippet' => $item['content'] ?? '',
            'score' => $item['score'] ?? 0
        ];
    }, $data['results']);

    sendSuccess([
        'query' => $query,
        'results' => $results,
        'count' => count($results)
    ]);

} catch (Exception $e) {
    error_log("Web Search Error: " . $e->getMessage());
    sendError('Search failed: ' . $e->getMessage(), 500);
}
