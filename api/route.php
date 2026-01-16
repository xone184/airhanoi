<?php
header("Content-Type: application/json; charset=UTF-8");

$API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImJiYjZiOTRkMjljNzQ4ZDA4ODMyM2FmMWNiMjQ0NDZiIiwiaCI6Im11cm11cjY0In0=';

$start = $_GET['start'] ?? null;
$end   = $_GET['end'] ?? null;

if (!$start || !$end) {
    http_response_code(400);
    echo json_encode(["error" => "Missing start or end parameters."]);
    exit;
}

if (!preg_match('/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/', $start) || !preg_match('/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/', $end)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid coordinate format. Expected 'longitude,latitude'."]);
    exit;
}

$url = "https://api.openrouteservice.org/v2/directions/driving-car?api_key={$API_KEY}&start={$start}&end={$end}";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
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
    echo $response;
    exit;
}

echo $response;
?>

