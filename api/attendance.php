<?php
require_once __DIR__ . '/../config/bootstrap.php';

$user = require_login();
$action = $_GET['action'] ?? 'list';

/*
|--------------------------------------------------------------------------
| CHECK IN: SAVE PRESENT
|--------------------------------------------------------------------------
*/
if ($action === 'checkin') {

    if ($user['role'] !== 'user') {
        respond([
            'success' => false,
            'message' => 'Only student/faculty accounts can check in.'
        ], 403);
    }

    $data = input_json();
    $eventId = filter_var(
        $data['event_id'] ?? null,
        FILTER_VALIDATE_INT
    );

    if (!$eventId || $eventId < 1) {
        respond([
            'success' => false,
            'message' => 'A valid event is required.'
        ], 422);
    }

    $stmt = $conn->prepare(
        'SELECT event_id, event_date, target_group, attendance_closed
         FROM events
         WHERE event_id = ?'
    );

    $stmt->bind_param('i', $eventId);
    $stmt->execute();
    $event = $stmt->get_result()->fetch_assoc();

    if (!$event) {
        respond([
            'success' => false,
            'message' => 'Event not found.'
        ], 404);
    }

    if ((int)$event['attendance_closed'] === 1) {
        respond([
            'success' => false,
            'message' => 'Attendance for this event is already closed.'
        ], 403);
    }

    if ($event['event_date'] !== date('Y-m-d')) {
        respond([
            'success' => false,
            'message' => 'Attendance can only be recorded on the event date.'
        ], 422);
    }

    // CHECK EVENT TARGET
    $target = trim($event['target_group']);
    $department = $user['department'] ?? '';
    $program = $user['program'] ?? '';

    if ($target === 'All Students') {
        // All registered user accounts are eligible.
    } elseif (
        $target === 'Department of Education' ||
        $target === 'Department of Technology and Engineering'
    ) {
        if ($department !== $target) {
            respond([
                'success' => false,
                'message' => 'This event is not intended for your department.'
            ], 403);
        }
    } else {
        // Treat other recognized target values as program names.
        $stmt = $conn->prepare(
            'SELECT COUNT(*) AS total
             FROM users
             WHERE program = ? AND role = "user"'
        );
        $stmt->bind_param('s', $target);
        $stmt->execute();
        $targetExists = (int)$stmt->get_result()->fetch_assoc()['total'];

        if ($targetExists === 0 || $program !== $target) {
            respond([
                'success' => false,
                'message' => 'This event is not intended for your program.'
            ], 403);
        }
    }

    // SAVE PRESENT
    try {
        $stmt = $conn->prepare(
            "INSERT INTO attendance (event_id, user_id, status)
             VALUES (?, ?, 'Present')"
        );

        $userId = (int)$user['user_id'];
        $stmt->bind_param('ii', $eventId, $userId);
        $stmt->execute();

        respond([
            'success' => true,
            'message' => 'Attendance recorded successfully.'
        ]);

    } catch (mysqli_sql_exception $e) {

        if ($e->getCode() === 1062) {
            respond([
                'success' => false,
                'message' => 'Your attendance is already recorded for this event.'
            ], 409);
        }

        error_log($e->getMessage());

        respond([
            'success' => false,
            'message' => 'Could not record attendance.'
        ], 500);
    }
}


/*
|--------------------------------------------------------------------------
| CLOSE ATTENDANCE: AUTOMATICALLY INSERT ABSENT
|--------------------------------------------------------------------------
*/
if ($action === 'close') {

    require_admin();

    $data = input_json();
    $eventId = filter_var(
        $data['event_id'] ?? null,
        FILTER_VALIDATE_INT
    );

    if (!$eventId || $eventId < 1) {
        respond([
            'success' => false,
            'message' => 'A valid event is required.'
        ], 422);
    }

    try {
        $conn->begin_transaction();

        // Lock the event while attendance is being closed.
        $stmt = $conn->prepare(
            'SELECT event_id, target_group, attendance_closed
             FROM events
             WHERE event_id = ?
             FOR UPDATE'
        );

        $stmt->bind_param('i', $eventId);
        $stmt->execute();
        $event = $stmt->get_result()->fetch_assoc();

        if (!$event) {
            $conn->rollback();

            respond([
                'success' => false,
                'message' => 'Event not found.'
            ], 404);
        }

        if ((int)$event['attendance_closed'] === 1) {
            $conn->rollback();

            respond([
                'success' => false,
                'message' => 'Attendance is already closed for this event.'
            ], 409);
        }

        $target = trim($event['target_group']);

        // Select only users eligible for this event.
        if ($target === 'All Students') {

            $sql = "
                INSERT INTO attendance (event_id, user_id, status)
                SELECT ?, u.user_id, 'Absent'
                FROM users u
                WHERE u.role = 'user'
                AND NOT EXISTS (
                    SELECT 1
                    FROM attendance a
                    WHERE a.event_id = ?
                    AND a.user_id = u.user_id
                )
            ";

            $stmt = $conn->prepare($sql);
            $stmt->bind_param('ii', $eventId, $eventId);

        } elseif (
            $target === 'Department of Education' ||
            $target === 'Department of Technology and Engineering'
        ) {

            $sql = "
                INSERT INTO attendance (event_id, user_id, status)
                SELECT ?, u.user_id, 'Absent'
                FROM users u
                WHERE u.role = 'user'
                AND u.department = ?
                AND NOT EXISTS (
                    SELECT 1
                    FROM attendance a
                    WHERE a.event_id = ?
                    AND a.user_id = u.user_id
                )
            ";

            $stmt = $conn->prepare($sql);
            $stmt->bind_param('isi', $eventId, $target, $eventId);

        } else {

            $sql = "
                INSERT INTO attendance (event_id, user_id, status)
                SELECT ?, u.user_id, 'Absent'
                FROM users u
                WHERE u.role = 'user'
                AND u.program = ?
                AND NOT EXISTS (
                    SELECT 1
                    FROM attendance a
                    WHERE a.event_id = ?
                    AND a.user_id = u.user_id
                )
            ";

            $stmt = $conn->prepare($sql);
            $stmt->bind_param('isi', $eventId, $target, $eventId);
        }

        $stmt->execute();
        $absentCount = $stmt->affected_rows;

        // Mark the event as closed.
        $stmt = $conn->prepare(
            'UPDATE events
             SET attendance_closed = 1,
                 attendance_closed_at = NOW()
             WHERE event_id = ?'
        );

        $stmt->bind_param('i', $eventId);
        $stmt->execute();

        $conn->commit();

        respond([
            'success' => true,
            'message' => 'Attendance closed successfully. Absent records generated.',
            'absent_count' => $absentCount
        ]);

    } catch (Throwable $e) {

        $conn->rollback();
        error_log($e->getMessage());

        respond([
            'success' => false,
            'message' => 'Unable to close attendance. Please check the server error log.'
        ], 500);
    }
}


/*
|--------------------------------------------------------------------------
| LIST ATTENDANCE RECORDS
|--------------------------------------------------------------------------
*/
if ($action === 'list' || $action === 'mine') {

    $sql = "
        SELECT
            a.attendance_id,
            a.event_id,
            u.user_id,
            u.school_id,
            u.full_name,
            u.email,
            u.department,
            u.program,
            u.year_level,
            u.section,
            e.title AS event_title,
            e.event_date,
            a.status,
            a.attended_at
        FROM attendance a
        JOIN users u ON u.user_id = a.user_id
        JOIN events e ON e.event_id = a.event_id
    ";

    if ($user['role'] !== 'admin') {

        $sql .= ' WHERE u.user_id = ? ORDER BY a.attended_at DESC';

        $stmt = $conn->prepare($sql);
        $userId = (int)$user['user_id'];
        $stmt->bind_param('i', $userId);
        $stmt->execute();

        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    } else {

        $sql .= ' ORDER BY a.attended_at DESC';

        $rows = $conn->query($sql)->fetch_all(MYSQLI_ASSOC);
    }

    respond([
        'success' => true,
        'records' => $rows
    ]);
}


respond([
    'success' => false,
    'message' => 'Unknown action.'
], 404);