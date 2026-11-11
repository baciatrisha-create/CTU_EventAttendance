
<?php
require_once __DIR__ . '/../config/bootstrap.php';

$user = require_login();
$action = $_GET['action'] ?? 'list';

// LIST EVENTS
if ($action === 'list') {
    $result = $conn->query(
        'SELECT
    event_id,
    title,
    event_date,
    venue,
    target_group,
    attendance_closed,
    attendance_closed_at
    FROM events
    ORDER BY event_date ASC'
    );

    respond([
        'success' => true,
        'events' => $result->fetch_all(MYSQLI_ASSOC)
    ]);
}

// CREATE EVENT
if ($action === 'create') {
    require_admin();

    $data = input_json();

    $title = trim($data['title'] ?? '');
    $date = $data['event_date'] ?? '';
    $venue = trim($data['venue'] ?? '');
    $target = trim($data['target_group'] ?? 'All Students');

    $dt = DateTime::createFromFormat('Y-m-d', $date);

    if (!$title || !$dt || $dt->format('Y-m-d') !== $date || !$venue) {
        respond(['success'=>false,'message'=>'Enter a valid title, date, and venue.'], 422);
    }

    $createdBy = (int)$user['user_id'];

    $stmt = $conn->prepare(
        'INSERT INTO events (title,event_date,venue,target_group,created_by)
         VALUES (?,?,?,?,?)'
    );

    $stmt->bind_param('ssssi', $title, $date, $venue, $target, $createdBy);
    $stmt->execute();

    respond([
        'success' => true,
        'message' => 'Event saved.',
        'event_id' => $conn->insert_id
    ]);
}

// UPDATE EVENT
if ($action === 'update') {
    require_admin();

    $data = input_json();

    $id = (int)($data['event_id'] ?? 0);
    $title = trim($data['title'] ?? '');
    $date = $data['event_date'] ?? '';
    $venue = trim($data['venue'] ?? '');
    $target = trim($data['target_group'] ?? '');

    $dt = DateTime::createFromFormat('Y-m-d', $date);

    if (!$id || !$title || !$dt || $dt->format('Y-m-d') !== $date || !$venue || !$target) {
        respond(['success'=>false,'message'=>'Complete all valid event details.'], 422);
    }

    $stmt = $conn->prepare(
        'UPDATE events
         SET title=?, event_date=?, venue=?, target_group=?
         WHERE event_id=?'
    );

    $stmt->bind_param('ssssi', $title, $date, $venue, $target, $id);
    $stmt->execute();

    respond(['success'=>true,'message'=>'Event updated successfully.']);
}

// DELETE EVENT
if ($action === 'delete') {
    require_admin();

    $data = input_json();
    $id = (int)($data['event_id'] ?? 0);

    if (!$id) {
        respond(['success'=>false,'message'=>'Invalid event ID.'], 422);
    }

    $stmt = $conn->prepare('DELETE FROM events WHERE event_id=?');
    $stmt->bind_param('i', $id);
    $stmt->execute();

    if ($stmt->affected_rows === 0) {
        respond(['success'=>false,'message'=>'Event not found.'], 404);
    }

    respond(['success'=>true,'message'=>'Event deleted successfully.']);
}

respond(['success'=>false,'message'=>'Unknown action.'],404);
