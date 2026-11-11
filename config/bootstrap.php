<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'
    ]);
    session_start();
}
require_once __DIR__ . '/database.php';

function respond(array $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data);
    exit;
}
function input_json(): array {
    $data = json_decode(file_get_contents('php://input'), true);
    return is_array($data) ? $data : $_POST;
}
function require_login(): array {
    if (empty($_SESSION['user'])) respond(['success'=>false,'message'=>'Please log in first.'], 401);
    return $_SESSION['user'];
}
function require_admin(): array {
    $user = require_login();
    if ($user['role'] !== 'admin') respond(['success'=>false,'message'=>'Administrator access required.'], 403);
    return $user;
}
