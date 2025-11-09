<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$request = $_GET['action'] ?? '';

// Add an expense
if ($method === 'POST' && $request === 'add') {
    $user = getAuthUser();
    $data = json_decode(file_get_contents('php://input'), true);

    $tripId = intval($data['trip_id'] ?? 0);
    $description = sanitize($data['description'] ?? '');
    $amount = floatval($data['amount'] ?? 0);
    $paidBy = intval($data['paid_by'] ?? $user['userId']);

    if ($tripId <= 0 || $amount <= 0 || $description === '') {
        sendResponse(['success' => false, 'message' => 'Invalid request'], 400);
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO expenses (trip_id, description, amount, paid_by, created_at) VALUES (?, ?, ?, ?, NOW())");
        $stmt->execute([$tripId, $description, $amount, $paidBy]);
        sendResponse(['success' => true, 'message' => 'Expense added', 'expenseId' => $pdo->lastInsertId()], 201);
    } catch(PDOException $e) {
        sendResponse(['success' => false, 'message' => 'Failed to add expense'], 500);
    }
}

// Get expenses for a trip
if ($method === 'GET' && $request === 'trip-expenses') {
    $user = getAuthUser();
    $tripId = intval($_GET['trip_id'] ?? 0);

    if ($tripId <= 0) {
        sendResponse(['success' => false, 'message' => 'Trip ID required'], 400);
    }

    try {
        $stmt = $pdo->prepare("SELECT e.*, u.username as paid_by_name FROM expenses e JOIN users u ON e.paid_by = u.id WHERE e.trip_id = ? ORDER BY e.created_at DESC");
        $stmt->execute([$tripId]);
        sendResponse(['success' => true, 'expenses' => $stmt->fetchAll()]);
    } catch(PDOException $e) {
        sendResponse(['success' => false, 'message' => 'Failed to get expenses'], 500);
    }
}

sendResponse(['success' => false, 'message' => 'Invalid request'], 400);
?>
