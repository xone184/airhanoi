<?php
/*
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
*/

require_once 'config.php';

$apiKey = getenv('GROQ_API_KEY');

if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'Server Configuration Error: Missing API Key']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON input']);
    exit();
}

$groqUrl = 'https://api.groq.com/openai/v1/chat/completions';

$ch = curl_init($groqUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $apiKey
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($input));

// Streaming support
if (isset($input['stream']) && $input['stream'] === true) {
    curl_setopt($ch, CURLOPT_WRITEFUNCTION, function ($curl, $data) {
        echo $data;
        flush();
        return strlen($data);
    });
}

$response = curl_exec($ch);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(['error' => 'Curl Error: ' . curl_error($ch)]);
} else {
    // If not streaming, output the response directly
    if (!isset($input['stream']) || $input['stream'] !== true) {
        echo $response;
    }
}

curl_close($ch);
?>