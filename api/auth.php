<?php
require_once __DIR__ . '/../config/bootstrap.php';
$action = $_GET['action'] ?? '';
$data = input_json();

if ($action === 'register') {
    $schoolId = trim($data['school_id'] ?? '');
    $name = trim($data['full_name'] ?? '');
    $email = strtolower(trim($data['email'] ?? ''));
    $password = (string)($data['password'] ?? '');
    $department = trim($data['department'] ?? '');
    $program = trim($data['program'] ?? '');
    $year = trim($data['year_level'] ?? '');
    $section = trim($data['section'] ?? '');
    if (!$schoolId || !$name || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8 || !$department || !$program || !$year || !$section) {
        respond(['success'=>false,'message'=>'Complete all fields. Password must contain at least 8 characters.'], 422);
    }
    $hash = password_hash($password, PASSWORD_DEFAULT);
    try {
        $stmt = $conn->prepare('INSERT INTO users (school_id,full_name,email,password_hash,role,department,program,year_level,section) VALUES (?,?,?,?,\'user\',?,?,?,?)');
        $stmt->bind_param('ssssssss', $schoolId,$name,$email,$hash,$department,$program,$year,$section);
        $stmt->execute();
        respond(['success'=>true,'message'=>'Account created. You can now log in.']);
    } catch (mysqli_sql_exception $e) {
        if ($e->getCode() === 1062) respond(['success'=>false,'message'=>'The ID or email is already registered.'], 409);
        respond(['success'=>false,'message'=>'Could not create account.'], 500);
    }
}

if ($action === 'login') {
    $email = strtolower(trim($data['email'] ?? ''));
    $password = (string)($data['password'] ?? '');
    $role = $data['role'] ?? 'user';
    $stmt = $conn->prepare('SELECT user_id,school_id,full_name,email,password_hash,role,department,program,year_level,section,profile_picture FROM users WHERE email=? LIMIT 1');
    $stmt->bind_param('s', $email); $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    if (!$user || !password_verify($password, $user['password_hash']) || $user['role'] !== $role) {
        respond(['success'=>false,'message'=>'Incorrect email, password, or account type.'], 401);
    }
    session_regenerate_id(true);
    unset($user['password_hash']);
    $_SESSION['user'] = $user;
    respond(['success'=>true,'user'=>$user]);
}

if ($action === 'me') {
    respond(['success'=>true,'user'=>$_SESSION['user'] ?? null]);
}
if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time()-42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
    respond(['success'=>true,'message'=>'Logged out.']);
}
respond(['success'=>false,'message'=>'Unknown action.'], 404);
