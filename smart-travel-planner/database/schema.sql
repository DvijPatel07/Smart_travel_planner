CREATE DATABASE IF NOT EXISTS smart_travel_planner;
USE smart_travel_planner;

-- Users Table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_image VARCHAR(255) DEFAULT 'default.jpg',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trips Table
CREATE TABLE trips (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    trip_name VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    start_date DATE,
    end_date DATE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Trip Members Table
CREATE TABLE trip_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    trip_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('owner', 'member') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_trip_member (trip_id, user_id)
);

-- Places Table
CREATE TABLE places (
    id INT PRIMARY KEY AUTO_INCREMENT,
    trip_id INT NOT NULL,
    place_name VARCHAR(200) NOT NULL,
    place_type VARCHAR(50),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    api_data JSON,
    added_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Expenses Table
-- Expense Splits Table
CREATE TABLE expense_splits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    expense_id INT NOT NULL,
    user_id INT NOT NULL,
    amount_owed DECIMAL(10, 2) NOT NULL,
    is_settled BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Friends Table
CREATE TABLE expenses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    trip_id INT NOT NULL,
    description VARCHAR(255),
    amount DECIMAL(10,2),
    paid_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id),
    FOREIGN KEY (paid_by) REFERENCES users(id)
);

CREATE TABLE friends (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (friend_id) REFERENCES users(id)
);


-- API Cache Table
CREATE TABLE api_cache (
    id INT PRIMARY KEY AUTO_INCREMENT,
    query_key VARCHAR(255) UNIQUE NOT NULL,
    response_data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_trip_user ON trips(user_id);
CREATE INDEX idx_trip_members ON trip_members(trip_id, user_id);
CREATE INDEX idx_expenses_trip ON expenses(trip_id);
CREATE INDEX idx_friends_user ON friends(user_id, friend_id);
