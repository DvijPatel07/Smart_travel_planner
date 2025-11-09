const API_URL = 'http://localhost/smart-travel-planner/api';

// Input validation
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
    return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
}

function validateUsername(username) {
    return username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
}

// Register
if (document.getElementById('register-form')) {
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // Enhanced validation
        if (!validateUsername(username)) {
            showError('Username must be at least 3 characters and contain only letters, numbers, and underscores');
            return;
        }
        
        if (!validateEmail(email)) {
            showError('Please enter a valid email address');
            return;
        }
        
        if (!validatePassword(password)) {
            showError('Password must be at least 8 characters and contain uppercase, lowercase, and numbers');
            return;
        }

        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth.php?action=register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (data.success) {
                alert('Registration successful! Please login.');
                window.location.href = 'login.html';
            } else {
                showError(data.message);
            }
        } catch (error) {
            showError('Registration failed. Please try again.');
        }
    });
}

// Login
if (document.getElementById('login-form')) {
    const form = document.getElementById('login-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        // Disable form during submission
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading"></span> Logging in...';
        
        if (!validateEmail(email)) {
            showError('Please enter a valid email address');
            resetButton();
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth.php?action=login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                // Store auth data securely
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('lastActivity', Date.now());
                
                showSuccess('Login successful! Redirecting...');
                
                // Smooth transition to dashboard
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                showError(data.message || 'Login failed');
                resetButton();
            }
        } catch (error) {
            showError('Login failed. Please try again.');
        }
    });
}

function showMessage(message, type = 'error') {
    const messageDiv = document.getElementById('message-container') || createMessageContainer();
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} fade-in`;
    
    const icon = document.createElement('i');
    icon.className = type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
    
    alertDiv.appendChild(icon);
    alertDiv.appendChild(document.createTextNode(' ' + message));
    
    messageDiv.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.classList.add('fade-out');
        setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
}

function createMessageContainer() {
    const container = document.createElement('div');
    container.id = 'message-container';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
    `;
    document.body.appendChild(container);
    return container;
}

function showError(message) {
    showMessage(message, 'error');
}

function showSuccess(message) {
    showMessage(message, 'success');
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const lastActivity = parseInt(localStorage.getItem('lastActivity'));
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    
    if (!token) {
        window.location.href = 'login.html';
        return null;
    }
    
    // Check session timeout
    if (lastActivity && Date.now() - lastActivity > SESSION_TIMEOUT) {
        showError('Session expired. Please login again.');
        logout();
        return null;
    }
    
    // Update last activity
    localStorage.setItem('lastActivity', Date.now());
    
    // Set up activity monitoring
    setupActivityMonitoring();
    
    return token;
}

function setupActivityMonitoring() {
    ['click', 'mousemove', 'keypress'].forEach(event => {
        document.addEventListener(event, () => {
            localStorage.setItem('lastActivity', Date.now());
        });
    });
    
    // Check session status periodically
    setInterval(checkAuth, 60000); // Check every minute
}

// Reset button helper
function resetButton() {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Authorization headers
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return {};
    }
    return {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
    };
}
