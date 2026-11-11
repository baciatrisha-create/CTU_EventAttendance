
<?php

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $host = getenv('MYSQLHOST') ?: 'mysql.railway.internal';
    $port = (int)(getenv('MYSQLPORT') ?: 3306);
    $dbname = getenv('MYSQLDATABASE') ?: 'ctu_eventattendance';
    $username = getenv('MYSQLUSER') ?: 'root';
    $password = getenv('MYSQLPASSWORD') ?: '';

    $conn = new mysqli(
        $host,
        $username,
        $password,
        $dbname,
        $port
    );

    $conn->set_charset('utf8mb4');

} catch (Throwable $e) {
    error_log('Database connection error: ' . $e->getMessage());

    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');

    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed.'
    ]);

    exit;
}
