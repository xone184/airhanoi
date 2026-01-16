<?php
// Comprehensive SMTP Debug Filter
header('Content-Type: text/plain');
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "--- SMTP NETWORK DIAGNOSTICS ---\n";
echo "Server Timestamp: " . date('Y-m-d H:i:s') . "\n";
echo "Server IP: " . $_SERVER['SERVER_ADDR'] . "\n";
echo "PHP Version: " . phpversion() . "\n\n";

$targets = [
    'smtp.gmail.com',
    'smtp.googlemail.com',
    '74.125.130.108', // Known Google SMTP IP
    '173.194.76.108'
];

$ports = [587, 465, 25];

foreach ($targets as $host) {
    echo "------------------------------------------------\n";
    echo "Testing Host: $host\n";

    // DNS Resolution
    $ip = gethostbyname($host);
    echo "Resolved IPv4: $ip";
    if ($ip === $host && !filter_var($host, FILTER_VALIDATE_IP)) {
        echo " (DNS RESOLUTION FAILED)\n";
        continue;
    }
    echo "\n";

    foreach ($ports as $port) {
        echo "  Port $port: ";
        $start = microtime(true);
        $fp = @fsockopen($host, $port, $errno, $errstr, 5); // 5s timeout
        $end = microtime(true);
        $duration = round(($end - $start) * 1000, 2);

        if ($fp) {
            echo "✅ OPEN (Connected in {$duration}ms)\n";
            fwrite($fp, "EHLO api.airhanoi.com\r\n");
            $response = fread($fp, 512);
            echo "    Server response: " . trim(substr($response, 0, 50)) . "...\n";
            fclose($fp);
        } else {
            echo "❌ CLOSED/TIMEOUT (Error $errno: $errstr) - {$duration}ms\n";
        }
    }
}
echo "\n--- End Diagnostics ---\n";
?>