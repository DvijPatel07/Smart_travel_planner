<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$request = isset($_GET['action']) ? $_GET['action'] : '';

// Create Trip
if ($method === 'POST' && $request === 'create') {
    $user = getAuthUser();
    $data = json_decode(file_get_contents('php://input'), true);

    $tripName = sanitize($data['trip_name'] ?? '');
    $destination = sanitize($data['destination'] ?? '');
    $startDate = $data['start_date'] ?? null;
    $endDate = $data['end_date'] ?? null;
    $description = sanitize($data['description'] ?? '');

    try {
        $pdo->beginTransaction();

        // Insert trip
        $stmt = $pdo->prepare("INSERT INTO trips (user_id, trip_name, destination, start_date, end_date, description) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$user['userId'], $tripName, $destination, $startDate, $endDate, $description]);

        $tripId = $pdo->lastInsertId();

        // Add user as trip owner in trip_members
        $stmt = $pdo->prepare("INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, 'owner')");
        $stmt->execute([$tripId, $user['userId']]);

        $pdo->commit();

        sendResponse([
            'success' => true,
            'message' => 'Trip created successfully',
            'tripId' => $tripId
        ], 201);

    } catch(PDOException $e) {
        $pdo->rollBack();
        sendResponse([
            'success' => false,
            'message' => 'Failed to create trip: ' . $e->getMessage()
        ], 500);
    }
}

// Get User Trips
if ($method === 'GET' && $request === 'list') {
    $user = getAuthUser();

    try {
        $stmt = $pdo->prepare("
            SELECT DISTINCT t.*, u.username as creator_name
            FROM trips t
            LEFT JOIN trip_members tm ON t.id = tm.trip_id
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.user_id = ? OR tm.user_id = ?
            ORDER BY t.start_date DESC
        ");
        $stmt->execute([$user['userId'], $user['userId']]);

        sendResponse([
            'success' => true,
            'trips' => $stmt->fetchAll()
        ]);

    } catch(PDOException $e) {
        sendResponse([
            'success' => false,
            'message' => 'Failed to get trips'
        ], 500);
    }
}

// Get Trip Details
if ($method === 'GET' && $request === 'details') {
    $user = getAuthUser();
    $tripId = $_GET['id'] ?? 0;

    try {
        // Check if user is member or owner
        $stmt = $pdo->prepare("SELECT id FROM trip_members WHERE trip_id = ? AND user_id = ?");
        $stmt->execute([$tripId, $user['userId']]);
        $isMember = $stmt->rowCount() > 0;

        $stmt = $pdo->prepare("SELECT id FROM trips WHERE id = ? AND user_id = ?");
        $stmt->execute([$tripId, $user['userId']]);
        $isOwner = $stmt->rowCount() > 0;

        if (!$isMember && !$isOwner) {
            sendResponse([
                'success' => false,
                'message' => 'Access denied'
            ], 403);
        }

        // Get trip details
        $stmt = $pdo->prepare("SELECT t.*, u.username as creator_name FROM trips t JOIN users u ON t.user_id = u.id WHERE t.id = ?");
        $stmt->execute([$tripId]);
        $trip = $stmt->fetch();

        if (!$trip) {
            sendResponse([
                'success' => false,
                'message' => 'Trip not found'
            ], 404);
        }

        // Get trip members
        $stmt = $pdo->prepare("
            SELECT u.id, u.username, u.email, tm.role
            FROM trip_members tm
            JOIN users u ON tm.user_id = u.id
            WHERE tm.trip_id = ?
        ");
        $stmt->execute([$tripId]);
        $members = $stmt->fetchAll();

        sendResponse([
            'success' => true,
            'trip' => $trip,
            'members' => $members
        ]);

    } catch(PDOException $e) {
        sendResponse([
            'success' => false,
            'message' => 'Failed to get trip details'
        ], 500);
    }
}

// Invite Member to Trip
if ($method === 'POST' && $request === 'invite') {
    $user = getAuthUser();
    $data = json_decode(file_get_contents('php://input'), true);

    $tripId = $data['trip_id'] ?? 0;
    $email = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);

    if (!$email) {
        sendResponse([
            'success' => false,
            'message' => 'Invalid email address'
        ], 400);
        exit;
    }

    try {
        // Check if user is owner or has permission to invite
        $stmt = $pdo->prepare("
            SELECT role FROM trip_members 
            WHERE trip_id = ? AND user_id = ? 
            AND role IN ('owner', 'admin')
        ");
        $stmt->execute([$tripId, $user['userId']]);
        
        if ($stmt->rowCount() === 0) {
            sendResponse([
                'success' => false,
                'message' => 'You do not have permission to invite members'
            ], 403);
            exit;
        }

        // Check if user exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $invitedUser = $stmt->fetch();

        if (!$invitedUser) {
            sendResponse([
                'success' => false,
                'message' => 'User with this email does not exist'
            ], 404);
            exit;
        }

        // Check if user is already a member
        $stmt = $pdo->prepare("SELECT id FROM trip_members WHERE trip_id = ? AND user_id = ?");
        $stmt->execute([$tripId, $invitedUser['id']]);
        
        if ($stmt->rowCount() > 0) {
            sendResponse([
                'success' => false,
                'message' => 'User is already a member of this trip'
            ], 400);
            exit;
        }

        // Add member
        $stmt = $pdo->prepare("INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, 'member')");
        $stmt->execute([$tripId, $invitedUser['id']]);

        sendResponse([
            'success' => true,
            'message' => 'Member invited successfully'
        ]);

    } catch(PDOException $e) {
        sendResponse([
            'success' => false,
            'message' => 'Failed to invite member'
        ], 500);
    }
}

// Add Member to Trip (Direct)
if ($method === 'POST' && $request === 'add-member') {
    $user = getAuthUser();
    $data = json_decode(file_get_contents('php://input'), true);

    $tripId = $data['trip_id'] ?? 0;
    $userId = $data['user_id'] ?? 0;

    try {
        // Check if user has permission
        $stmt = $pdo->prepare("
            SELECT role FROM trip_members 
            WHERE trip_id = ? AND user_id = ? 
            AND role IN ('owner', 'admin')
        ");
        $stmt->execute([$tripId, $user['userId']]);
        
        if ($stmt->rowCount() === 0) {
            sendResponse([
                'success' => false,
                'message' => 'You do not have permission to add members'
            ], 403);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, 'member')");
        $stmt->execute([$tripId, $userId]);

        sendResponse([
            'success' => true,
            'message' => 'Member added successfully'
        ]);

    } catch(PDOException $e) {
        sendResponse([
            'success' => false,
            'message' => 'Failed to add member'
        ], 500);
    }
}

sendResponse([
    'success' => false,
    'message' => 'Invalid request'
], 400);
?>
