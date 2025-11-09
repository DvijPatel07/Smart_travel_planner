<?php
require_once 'config.php';

// Enable error reporting for debugging (remove in production)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$method = $_SERVER['REQUEST_METHOD'];
$request = isset($_GET['action']) ? $_GET['action'] : '';

// Helper: Search places using Nominatim OpenStreetMap API (no API key)
function nominatim_search_places($query, $limit = 20) {
    $url = "https://nominatim.openstreetmap.org/search?" . http_build_query([
        'q' => $query,
        'format' => 'json',
        'addressdetails' => 1,
        'limit' => $limit,
        'extratags' => 1,
        'namedetails' => 1
    ]);
    $opts = [
        "http" => [
            "header" => "User-Agent: SmartTravelPlanner/1.0\r\n"
        ]
    ];
    $context = stream_context_create($opts);
    $response = @file_get_contents($url, false, $context);
    if ($response === false) {
        return null;
    }
    return json_decode($response, true);
}

// === SEARCH PLACES (GET) ===
if ($method === 'GET' && $request === 'search') {
    $user = getAuthUser();
    $city  = sanitize($_GET['city'] ?? '');
    $category = sanitize($_GET['category'] ?? '');

    if (empty($city)) {
        sendResponse(['success' => false, 'message' => 'City parameter is required'], 400);
    }

    $searchQuery = $city;
    if ($category !== '') {
        $searchQuery .= " " . $category;
    }

    $places = nominatim_search_places($searchQuery);

    if ($places === null) {
        sendResponse(['success' => false, 'message' => 'Failed to fetch places from Nominatim API'], 500);
    }

    sendResponse(['success' => true, 'places' => $places]);
}

// === ADD PLACE TO TRIP (POST) ===
if ($method === 'POST' && $request === 'add') {
    $user = getAuthUser();
    $data = json_decode(file_get_contents('php://input'), true);

    $tripId = isset($data['trip_id']) ? intval($data['trip_id']) : 0;
    $placeName = isset($data['place_name']) ? sanitize($data['place_name']) : '';
    $placeType = isset($data['place_type']) ? sanitize($data['place_type']) : '';
    $address = isset($data['address']) ? sanitize($data['address']) : '';
    $latitude = isset($data['latitude']) ? $data['latitude'] : null;
    $longitude = isset($data['longitude']) ? $data['longitude'] : null;
    $apiData = isset($data['api_data']) ? json_encode($data['api_data']) : null;

    if ($tripId <= 0 || $placeName === '' || $latitude === null || $longitude === null) {
        sendResponse(['success' => false, 'message' => 'Invalid request'], 400);
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO places (trip_id, place_name, place_type, address, latitude, longitude, api_data, added_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$tripId, $placeName, $placeType, $address, $latitude, $longitude, $apiData, $user['userId']]);
        sendResponse([
            'success' => true,
            'message' => 'Place added to trip',
            'placeId' => $pdo->lastInsertId()
        ], 201);
    } catch(PDOException $e) {
        sendResponse(['success' => false, 'message' => 'Failed to add place'], 500);
    }
}

// === GET PLACES FOR TRIP (optional, if needed) ===
if ($method === 'GET' && $request === 'trip-places') {
    $user = getAuthUser();
    $tripId = isset($_GET['trip_id']) ? intval($_GET['trip_id']) : 0;

    if ($tripId <= 0) {
        sendResponse(['success' => false, 'message' => 'Trip ID is required'], 400);
    }

    try {
        $stmt = $pdo->prepare("
            SELECT p.*, u.username as added_by_name 
            FROM places p 
            JOIN users u ON p.added_by = u.id 
            WHERE p.trip_id = ?
            ORDER BY p.created_at DESC
        ");
        $stmt->execute([$tripId]);

        sendResponse(['success' => true, 'places' => $stmt->fetchAll()]);
    } catch(PDOException $e) {
        sendResponse(['success' => false, 'message' => 'Failed to get places'], 500);
    }
}

sendResponse(['success' => false, 'message' => 'Invalid request'], 400);
?>
