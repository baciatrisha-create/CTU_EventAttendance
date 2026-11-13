
<?php

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {

    $databaseUrl = getenv('DATABASE_URL');
    error_log('DATABASE_URL: ' . ($databaseUrl ? 'SET' : 'MISSING'));
    error_log('MYSQLHOST: ' . (getenv('MYSQLHOST') ? 'SET' : 'MISSING'));
    error_log('MYSQLUSER: ' . (getenv('MYSQLUSER') ? 'SET' : 'MISSING'));
    error_log('MYSQLDATABASE: ' . (getenv('MYSQLDATABASE') ? 'SET' : 'MISSING'));

    if (!empty($databaseUrl)) {

        $db = parse_url($databaseUrl);

        $host = $db['host'] ?? '';
        $port = $db['port'] ?? 3306;
        $username = $db['user'] ?? '';
        $password = $db['pass'] ?? '';
        $dbname = ltrim($db['path'] ?? '', '/');

    } else {

        $host = getenv('MYSQLHOST') ?: '';
        $port = (int)(getenv('MYSQLPORT') ?: 3306);
        $dbname = getenv('MYSQLDATABASE') ?: '';
        $username = getenv('MYSQLUSER') ?: '';
        $password = getenv('MYSQLPASSWORD') ?: '';

    }

    if (
        empty($host) ||
        empty($username) ||
        empty($dbname) ||
        $password === ''
    ) {
        throw new Exception('Missing database environment variables.');
    }

    $conn = new mysqli(
        $host,
        $username,
        $password,
        $dbname,
        (int)$port
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
