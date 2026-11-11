
<?php
require_once __DIR__ . '/../config/bootstrap.php';

$user = require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'Invalid request method.'], 405);
}

if (!isset($_FILES['profile_picture'])) {
    respond(['success' => false, 'message' => 'Please select a picture.'], 400);
}

$file = $_FILES['profile_picture'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    respond(['success' => false, 'message' => 'Picture upload failed.'], 400);
}

// Maximum file size: 2 MB
if ($file['size'] > 2 * 1024 * 1024) {
    respond(['success' => false, 'message' => 'Maximum image size is 2 MB.'], 422);
}

// Allow only JPEG, PNG, and WEBP images
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);

$allowedTypes = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp'
];

if (!isset($allowedTypes[$mime])) {
    respond(['success' => false, 'message' => 'Please use JPG, PNG, or WEBP format.'], 422);
}

$uploadDir = __DIR__ . '/../uploads/profile_pictures/';

if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        respond(['success' => false, 'message' => 'Could not create upload folder.'], 500);
    }
}

$filename = bin2hex(random_bytes(16)) . '.' . $allowedTypes[$mime];
$destination = $uploadDir . $filename;

if (!move_uploaded_file($file['tmp_name'], $destination)) {
    respond(['success' => false, 'message' => 'Could not save the picture.'], 500);
}

$picturePath = 'uploads/profile_pictures/' . $filename;

// Get the previous picture path
$stmt = $conn->prepare('SELECT profile_picture FROM users WHERE user_id = ? LIMIT 1');
$stmt->bind_param('i', $user['user_id']);
$stmt->execute();
$oldUser = $stmt->get_result()->fetch_assoc();

if (!$oldUser) {
    unlink($destination);
    respond(['success' => false, 'message' => 'User account not found.'], 404);
}

// Save the new picture path
$stmt = $conn->prepare('UPDATE users SET profile_picture = ? WHERE user_id = ?');
$stmt->bind_param('si', $picturePath, $user['user_id']);
$stmt->execute();

// Update the current session
$_SESSION['user']['profile_picture'] = $picturePath;

// Delete the previous uploaded picture, if it belongs to this upload folder
$oldPicture = $oldUser['profile_picture'] ?? '';

if (
    $oldPicture &&
    str_starts_with($oldPicture, 'uploads/profile_pictures/')
) {
    $oldFilename = basename($oldPicture);
    $oldPath = $uploadDir . $oldFilename;

    if (is_file($oldPath)) {
        unlink($oldPath);
    }
}

respond([
    'success' => true,
    'message' => 'Profile picture updated successfully.',
    'profile_picture' => $picturePath
]);
