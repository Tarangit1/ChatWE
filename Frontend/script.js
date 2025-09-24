// Global variables
let socket = null;
let currentUser = null;
let currentRoom = null;
let token = localStorage.getItem('token');
const API_BASE = window.location.origin;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Load dark mode preference
    loadDarkModePreference();
    
    // Check if user is already logged in
    if (token) {
        verifyToken();
    } else {
        showAuthPage();
    }

    // Set up event listeners
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Auth forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('createRoomForm').addEventListener('submit', handleCreateRoom);

    // Message input
    const messageInput = document.getElementById('messageInput');
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Typing indicators
    messageInput.addEventListener('input', function() {
        if (!currentRoom || !socket) return;
        
        if (!isCurrentlyTyping) {
            isCurrentlyTyping = true;
            socket.emit('typing', { isTyping: true });
        }
        
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            isCurrentlyTyping = false;
            socket.emit('typing', { isTyping: false });
        }, 1000);
    });
    
    messageInput.addEventListener('blur', function() {
        if (isCurrentlyTyping && socket) {
            isCurrentlyTyping = false;
            socket.emit('typing', { isTyping: false });
            clearTimeout(typingTimeout);
        }
    });
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            token = data.token;
            currentUser = data.user;
            localStorage.setItem('token', token);
            showChatPage();
            showToast('Login successful!', 'success');
        } else {
            showToast(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
        console.error('Login error:', error);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (data.success) {
            token = data.token;
            currentUser = data.user;
            localStorage.setItem('token', token);
            showChatPage();
            showToast('Registration successful!', 'success');
        } else {
            showToast(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
        console.error('Register error:', error);
    }
}

async function verifyToken() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            showChatPage();
        } else {
            localStorage.removeItem('token');
            token = null;
            showAuthPage();
        }
    } catch (error) {
        localStorage.removeItem('token');
        token = null;
        showAuthPage();
        console.error('Token verification error:', error);
    }
}

function logout() {
    localStorage.removeItem('token');
    token = null;
    currentUser = null;
    currentRoom = null;
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    showAuthPage();
    showToast('Logged out successfully', 'success');
}

// Page navigation functions
function showAuthPage() {
    document.getElementById('auth-page').classList.remove('hidden');
    document.getElementById('chat-page').classList.add('hidden');
}

function showChatPage() {
    document.getElementById('auth-page').classList.add('hidden');
    document.getElementById('chat-page').classList.remove('hidden');
    document.getElementById('username').textContent = currentUser.username;
    
    // Initialize Socket.IO connection
    initializeSocket();
    loadRooms();
}

function showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
}

function showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
}

// Socket.IO functions
function initializeSocket() {
    socket = io(window.location.origin, {
        auth: {
            token: token
        },
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });

    // Listen for new messages
    socket.on('new-message', (messageData) => {
        if (currentRoom) {
            displayMessage(messageData);
        }
    });

    // Listen for user joining
    socket.on('user-joined', (data) => {
        if (currentRoom) {
            showSystemMessage(data.message, 'join');
            showToast(`${data.username} joined the room`, 'success');
        }
    });

    // Listen for user leaving
    socket.on('user-left', (data) => {
        if (currentRoom) {
            showSystemMessage(data.message, 'leave');
            showToast(`${data.username} left the room`, 'info');
        }
    });

    // Listen for room joined confirmation
    socket.on('room-joined', (data) => {
        console.log('Room joined successfully:', data.room.name);
        // Display existing messages
        const messagesContainer = document.getElementById('messages-container');
        messagesContainer.innerHTML = '';
        
        data.messages.forEach(message => {
            displayMessage(message);
        });
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });

    // Listen for typing indicators
    socket.on('user-typing', (data) => {
        if (currentRoom) {
            showTypingIndicator(data.username, data.isTyping);
        }
    });

    socket.on('error', (error) => {
        showToast(error.message || 'Socket error occurred', 'error');
    });
}

// Room functions
async function loadRooms() {
    try {
        const response = await fetch(`${API_BASE}/api/rooms`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            displayRooms(data.rooms);
        } else {
            showToast('Failed to load rooms', 'error');
        }
    } catch (error) {
        showToast('Failed to load rooms', 'error');
        console.error('Load rooms error:', error);
    }
}

function displayRooms(rooms) {
    const roomsList = document.getElementById('rooms-list');
    roomsList.innerHTML = '';

    rooms.forEach(room => {
        const roomElement = document.createElement('div');
        roomElement.className = 'room-item';
        roomElement.onclick = () => joinRoom(room);
        
        roomElement.innerHTML = `
            <div class="room-name">${room.name}</div>
            <div class="room-description">${room.description || 'No description'}</div>
            <div class="room-members">${room.memberCount} members</div>
        `;
        
        roomsList.appendChild(roomElement);
    });
}

async function joinRoom(room) {
    try {
        // Leave current room if any
        if (currentRoom && socket) {
            socket.emit('leaveRoom', currentRoom._id);
        }

        currentRoom = room;
        
        // Update UI
        document.querySelectorAll('.room-item').forEach(item => {
            item.classList.remove('active');
        });
        event.target.closest('.room-item').classList.add('active');
        
        document.getElementById('current-room-name').textContent = room.name;
        document.getElementById('room-member-count').textContent = `${room.memberCount} members`;
        
        // Enable message input
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendButton').disabled = false;
        
        // Join room via socket
        if (socket) {
            socket.emit('join-room', { roomId: room._id });
        }
        
    } catch (error) {
        showToast('Failed to join room', 'error');
        console.error('Join room error:', error);
    }
}



function displayMessage(message) {
    const messagesContainer = document.getElementById('messages-container');
    const messageElement = document.createElement('div');
    
    const isOwnMessage = message.sender._id === currentUser._id;
    messageElement.className = `message ${isOwnMessage ? 'own' : 'other'}`;
    
    const timestamp = new Date(message.createdAt).toLocaleTimeString();
    
    messageElement.innerHTML = `
        <div class="message-header">${message.sender.username} - ${timestamp}</div>
        <div class="message-content">${message.content}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showSystemMessage(content, type) {
    const messagesContainer = document.getElementById('messages-container');
    const messageElement = document.createElement('div');
    
    messageElement.className = `message system ${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    
    messageElement.innerHTML = `
        <div class="system-message">
            <span class="system-content">${content}</span>
            <span class="system-time">${timestamp}</span>
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

let typingTimeout;
let isCurrentlyTyping = false;
let typingUsers = new Set(); // Track multiple users typing

function showTypingIndicator(username, isTyping) {
    const typingContainer = document.getElementById('typing-indicator-container');
    
    if (isTyping) {
        typingUsers.add(username);
    } else {
        typingUsers.delete(username);
    }
    
    // Update the typing indicator display
    updateTypingDisplay(typingContainer);
}

function updateTypingDisplay(container) {
    // Clear existing indicator
    container.innerHTML = '';
    
    if (typingUsers.size === 0) {
        return; // No one is typing
    }
    
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    
    let message = '';
    const usersArray = Array.from(typingUsers);
    
    if (usersArray.length === 1) {
        message = `${usersArray[0]} is typing`;
    } else if (usersArray.length === 2) {
        message = `${usersArray[0]} and ${usersArray[1]} are typing`;
    } else {
        message = `${usersArray[0]}, ${usersArray[1]} and ${usersArray.length - 2} others are typing`;
    }
    
    typingIndicator.innerHTML = `
        <div class="typing-content">
            <span>${message}</span>
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    container.appendChild(typingIndicator);
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim();
    
    if (!content || !currentRoom || !socket) return;
    
    socket.emit('send-message', {
        content: content
    });
    
    messageInput.value = '';
}

function updateMemberCount(count) {
    document.getElementById('room-member-count').textContent = `${count} members`;
    if (currentRoom) {
        currentRoom.memberCount = count;
    }
}

// Create room functions
function showCreateRoom() {
    document.getElementById('create-room-modal').classList.remove('hidden');
}

function hideCreateRoom() {
    document.getElementById('create-room-modal').classList.add('hidden');
    document.getElementById('createRoomForm').reset();
}

async function handleCreateRoom(e) {
    e.preventDefault();
    const name = document.getElementById('roomName').value;
    const description = document.getElementById('roomDescription').value;

    try {
        const response = await fetch(`${API_BASE}/api/rooms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, description })
        });

        const data = await response.json();

        if (data.success) {
            hideCreateRoom();
            loadRooms();
            showToast('Room created successfully!', 'success');
        } else {
            showToast(data.message || 'Failed to create room', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
        console.error('Create room error:', error);
    }
}

// Utility functions
function showToast(message, type = 'info') {
    const toast = document.getElementById('message-toast');
    const toastText = document.getElementById('toast-text');
    
    toastText.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Dark mode functionality
function toggleDarkMode() {
    const body = document.body;
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    body.classList.toggle('dark-mode');
    
    // Update button icon
    if (body.classList.contains('dark-mode')) {
        darkModeToggle.textContent = '☀️';
        darkModeToggle.title = 'Switch to Light Mode';
        localStorage.setItem('darkMode', 'enabled');
    } else {
        darkModeToggle.textContent = '🌙';
        darkModeToggle.title = 'Switch to Dark Mode';
        localStorage.setItem('darkMode', 'disabled');
    }
}

// Load dark mode preference on page load
function loadDarkModePreference() {
    const darkMode = localStorage.getItem('darkMode');
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    // Default to dark mode if no preference is set, or if explicitly enabled
    if (darkMode === null || darkMode === 'enabled') {
        document.body.classList.add('dark-mode');
        if (darkModeToggle) {
            darkModeToggle.textContent = '☀️';
            darkModeToggle.title = 'Switch to Light Mode';
        }
        // Set default preference if none exists
        if (darkMode === null) {
            localStorage.setItem('darkMode', 'enabled');
        }
    } else {
        // Light mode
        if (darkModeToggle) {
            darkModeToggle.textContent = '🌙';
            darkModeToggle.title = 'Switch to Dark Mode';
        }
    }
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (socket) {
        socket.disconnect();
    }
});