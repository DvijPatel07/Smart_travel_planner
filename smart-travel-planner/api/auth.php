<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$request = isset($_GET['action']) ? $_GET['action'] : '';

// Register User
if ($method === 'POST' && $request === 'register') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $username = sanitize($data['username'] ?? '');
    $email = sanitize($data['email'] ?? '');
    $password = $data['password'] ?? '';
    
    // Validation
    if (empty($username) || empty($email) || empty($password)) {
        sendResponse([
            'success' => false,
            'message' => 'All fields are required'
        ], 400);
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse([
            'success' => false,
            'message' => 'Invalid email format'
        ], 400);
    }
    
    if (strlen($password) < 6) {
        sendResponse([
            'success' => false,
            'message' => 'Password must be at least 6 characters'
        ], 400);
    }
    
    try {
        // Check if user exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $email]);
        
        if ($stmt->rowCount() > 0) {
            sendResponse([
                'success' => false,
                'message' => 'Username or email already exists'
            ], 400);
        }
        
        // Hash password
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        
        // Insert user
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
        $stmt->execute([$username, $email, $passwordHash]);
        
        sendResponse([
            'success' => true,
            'message' => 'Registration successful',
            'userId' => $pdo->lastInsertId()
        ], 201);
        
    } catch(PDOException $e) {
        sendResponse([
            'success' => false,
            'message' => 'Registration failed: ' . $e->getMessage()
        ], 500);
    }
}

// Login User
if ($method === 'POST' && $request === 'login') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $email = sanitize($data['email'] ?? '');
    $password = $data['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        sendResponse([
            'success' => false,
            'message' => 'Email and password are required'
        ], 400);
    }
    
    try {
        $stmt = $pdo->prepare("SELECT id, username, email, password_hash FROM users WHERE email = ?");
        $stmt->execute([$email]);
        
        if ($stmt->rowCount() === 0) {
            sendResponse([
                'success' => false,
                'message' => 'Invalid credentials'
            ], 401);
        }
        
        $user = $stmt->fetch();
        
        if (!password_verify($password, $user['password_hash'])) {
            sendResponse([
                'success' => false,
                'message' => 'Invalid credentials'
            ], 401);
        }
        
        // Generate JWT token
        $token = generateJWT($user['id'], $user['username'], $user['email']);
        
        sendResponse([
            'success' => true,
            'message' => 'Login successful',
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email']
            ]
        ]);
        
    } catch(PDOException $e) {
        sendResponse([
            'success' => false,
            'message' => 'Login failed: ' . $e->getMessage()
        ], 500);
    }
}

// Get Current User
if ($method === 'GET' && $request === 'me') {
    $user = getAuthUser();
    
    try {
        $stmt = $pdo->prepare("SELECT id, username, email, profile_image, created_at FROM users WHERE id = ?");
        $stmt->execute([$user['userId']]);
        
        if ($stmt->rowCount() === 0) {
            sendResponse([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        }
        
        sendResponse([
            'success' => true,
            'user' => $stmt->fetch()
        ]);
        
    } catch(PDOException $e) {
        sendResponse([
            'success' => false,
            'message' => 'Failed to get user'
        ], 500);
    }
}

sendResponse([
    'success' => false,
    'message' => 'Invalid request'
], 400);
?>
