
<?php

$host = getenv('MYSQLHOST') ?: 'localhost';
$port = (int)(getenv('MYSQLPORT') ?: 3306);
$dbname = getenv('MYSQLDATABASE') ?: 'ctu_eventattendance';
$username = getenv('MYSQLUSER') ?: 'root';
$password = getenv('MYSQLPASSWORD') ?: '';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $conn = new mysqli(
        $host,
        $username,
        $password,
        $dbname,
        $port
    );

    $conn->set_charset('utf8mb4');

} catch (mysqli_sql_exception $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');

    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed.'
    ]);

    exit;
}
