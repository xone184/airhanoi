<?php
header("Content-Type: application/json; charset=UTF-8");

$API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImJiYjZiOTRkMjljNzQ4ZDA4ODMyM2FmMWNiMjQ0NDZiIiwiaCI6Im11cm11cjY0In0=';

if (!isset($_GET['query'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing query parameter."]);
    exit;
}

// Sanitize and URL-encode the query
$query = urlencode($_GET['query']);

// Focus the search around Hanoi for better results
$focusPoint = '105.8542,21.0285'; // Lng,Lat for Hanoi center

$url = "https://api.openrouteservice.org/v2/geocode/search?api_key={$API_KEY}&text={$query}&boundary.country=VN&focus.point.lon=105.8542&focus.point.lat=21.0285";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8'
]);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    http_response_code(500);
    echo json_encode(["error" => "cURL Error: " . $error]);
    exit;
}

if ($httpcode >= 400) {
    http_response_code($httpcode);
    echo $response; // Forward error from OpenRouteService
    exit;
}

echo $response;
