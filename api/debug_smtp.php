<?php
// Debug SMTP Connection
header('Content-Type: text/plain');

$hosts = ['smtp.gmail.com'];
$ports = [587, 465];

echo "--- SMTP Connectivity Test ---\n";
echo "Server IP: " . $_SERVER['SERVER_ADDR'] . "\n";
echo "PHP Version: " . phpversion() . "\n\n";

foreach ($hosts as $host) {
    echo "Testing Host: $host\n";
    $ip = gethostbyname($host);
    echo "Resolved IP (IPv4): $ip\n";

    foreach ($ports as $port) {
        echo "  Trying Port $port... ";
        $connection = @fsockopen($ip, $port, $errno, $errstr, 5);

        if (is_resource($connection)) {
            echo "✅ SUCCESS (Connected)\n";
            fclose($connection);
        } else {
            echo "❌ FAILED (Error $errno: $errstr)\n";
        }
    }
    echo "\n";
}

echo "--- End Test ---\n";
?>