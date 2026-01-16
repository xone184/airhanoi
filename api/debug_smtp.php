<?php
// Advanced Network Diagnostics
header('Content-Type: text/plain');
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "=== AIRHANOI NETWORK DIAGNOSTICS ===\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n";
echo "Server IP: " . $_SERVER['SERVER_ADDR'] . "\n\n";

// 1. Basic Internet Check (HTTP/Port 80)
echo "1. HTTP CONNECTIVITY (Port 80)\n";
$google = @fsockopen('www.google.com', 80, $errno, $errstr, 5);
if ($google) {
    echo "✅ www.google.com:80 is OPEN. Server has internet access.\n";
    fclose($google);
} else {
    echo "❌ www.google.com:80 is BLOCKED. Error: $errstr\n";
}
echo "\n";

// 2. SMTP Connectivity Tests
echo "2. SMTP CONNECTIVITY (Ports 587, 465, 2525)\n";
$hosts = [
    'smtp.gmail.com',         // Standard Gmail
    'smtp.googlemail.com',    // Alias (often different routing)
    'smtp.sendgrid.net'       // Benchmark (to see if ALL SMTP is blocked)
];

foreach ($hosts as $host) {
    echo "Testing Host: $host\n";
    $ip = gethostbyname($host);
    echo "  IP: $ip\n";

    foreach ([587, 465, 2525] as $port) {
        $start = microtime(true);
        $fp = @fsockopen($host, $port, $errno, $errstr, 3);
        $end = microtime(true);
        $time = round(($end - $start) * 1000);

        if ($fp) {
            echo "  ✅ Port $port: OPEN ($time ms)\n";
            fclose($fp);
        } else {
            echo "  ❌ Port $port: CLOSED/TIMEOUT ($time ms) - $errstr\n";
        }
    }
    echo "------------------------------------------------\n";
}

echo "\nRecommendation:\n";
echo "- If Port 587/465 are CLOSED for Gmail but OPEN for SendGrid: Gmail is blocked.\n";
echo "- If ALL are CLOSED: Your hosting provider blocks SMTP. Use an Email API.\n";
echo "- If smtp.googlemail.com works: Update config to use that.\n";
?>