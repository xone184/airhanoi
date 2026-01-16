<?php
// SMTP Debug - Brevo Specific v2.0
header('Content-Type: text/plain');
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "=== CHECK DEPLOYMENT VERSION: 2.0 (NEW) ===\n"; // Header indicator
echo "Date: " . date('Y-m-d H:i:s') . "\n";

$targets = [
    'smtp-relay.brevo.com' => [587, 2525, 465],
    'smtp.sendgrid.net' => [2525]
];

foreach ($targets as $host => $ports) {
    echo "------------------------------------------------\n";
    echo "Target: $host\n";
    $ip = gethostbyname($host);
    echo "Resolved IP: $ip\n";

    foreach ($ports as $port) {
        echo "  Checking Port $port... ";
        $start = microtime(true);
        $fp = @fsockopen($host, $port, $errno, $errstr, 5);
        $time = round((microtime(true) - $start) * 1000);

        if ($fp) {
            echo "✅ OPEN (${time}ms)\n";
            fwrite($fp, "EHLO AirHanoiTest\r\n");
            echo "    Response: " . trim(fgets($fp)) . "\n";
            fclose($fp);
        } else {
            echo "❌ TIMEOUT/CLOSED (Error: $errstr) (${time}ms)\n";
        }
    }
}
echo "------------------------------------------------\n";
?>