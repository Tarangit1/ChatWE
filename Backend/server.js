import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

// Import routes and models
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import { errorHandler } from './middleware/errorHandler.js';
import User from './models/User.js';
import Room from './models/Room.js';
import Message from './models/Message.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? true : "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});

const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false // Allow Socket.IO
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    }
});

// Middleware
app.use(limiter);
app.use(morgan('combined'));
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? true : "*",
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../Frontend')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Store active socket connections
const activeUsers = new Map(); // socketId -> { userId, username, roomId }

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Serve React app
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/index.html'));
});

// Socket.IO authentication middleware
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return next(new Error('User not found'));
        }

        socket.user = user;
        next();
    } catch (error) {
        next(new Error('Authentication failed'));
    }
});

// Socket.IO connection handling
io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);

    // Update user online status
    await User.findByIdAndUpdate(socket.user._id, {
        isOnline: true,
        lastSeen: new Date()
    });

    // Handle joining room
    socket.on('join-room', async (data) => {
        try {
            const { roomId } = data;
            
            // Find the room in database
            const room = await Room.findById(roomId)
                .populate('members.user', 'username avatar isOnline');

            if (!room) {
                return socket.emit('error', { message: 'Room not found' });
            }

            // Check if user is a member
            const isMember = room.members.some(member => 
                member.user._id.toString() === socket.user._id.toString()
            );

            // If user is not a member and room is public, add them automatically
            if (!isMember) {
                if (room.isPrivate) {
                    return socket.emit('error', { message: 'You are not a member of this private room' });
                }
                
                // Add user to room members
                room.members.push({
                    user: socket.user._id,
                    joinedAt: new Date()
                });
                await room.save();
                
                // Re-populate the room to get updated member info
                await room.populate('members.user', 'username avatar isOnline');
                
                // Add room to user's joined rooms
                await User.findByIdAndUpdate(socket.user._id, {
                    $addToSet: { joinedRooms: roomId }
                });
            }

            // Join socket room
            socket.join(roomId.toString());
            
            // Store user connection info
            activeUsers.set(socket.id, {
                userId: socket.user._id,
                username: socket.user.username,
                roomId: roomId.toString()
            });

            // Update room activity
            await room.updateActivity();

            // Get recent messages
            const messages = await Message.find({ room: roomId })
                .populate('sender', 'username avatar')
                .sort({ createdAt: -1 })
                .limit(50);

            // Notify others in the room
            socket.to(roomId.toString()).emit('user-joined', {
                username: socket.user.username,
                message: `${socket.user.username} joined the room`,
                timestamp: new Date().toISOString()
            });

            // Send room data to user
            socket.emit('room-joined', {
                roomId,
                room: {
                    name: room.name,
                    description: room.description,
                    members: room.members.map(m => ({
                        username: m.user.username,
                        avatar: m.user.avatar,
                        isOnline: m.user.isOnline
                    }))
                },
                messages: messages.reverse()
            });

            console.log(`${socket.user.username} joined room: ${room.name}`);
        } catch (error) {
            console.error('Join room error:', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    });

    // Handle sending messages
    socket.on('send-message', async (data) => {
        try {
            const userConnection = activeUsers.get(socket.id);
            if (!userConnection) {
                return socket.emit('error', { message: 'User not in any room' });
            }

            const { content } = data;
            
            // Create message in database
            const message = new Message({
                content,
                sender: socket.user._id,
                room: userConnection.roomId,
                messageType: 'text'
            });

            await message.save();
            await message.populate('sender', 'username avatar');

            // Update room activity
            await Room.findByIdAndUpdate(userConnection.roomId, {
                lastActivity: new Date()
            });

            const messageData = {
                _id: message._id,
                content: message.content,
                sender: {
                    _id: message.sender._id,
                    username: message.sender.username,
                    avatar: message.sender.avatar
                },
                createdAt: message.createdAt,
                messageType: message.messageType
            };

            // Broadcast message to room
            io.to(userConnection.roomId).emit('new-message', messageData);

        } catch (error) {
            console.error('Send message error:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    // Handle user disconnect
    socket.on('disconnect', async () => {
        try {
            const userConnection = activeUsers.get(socket.id);
            
            // Update user offline status
            await User.findByIdAndUpdate(socket.user._id, {
                isOnline: false,
                lastSeen: new Date()
            });

            if (userConnection) {
                // Notify room members
                socket.to(userConnection.roomId).emit('user-left', {
                    username: socket.user.username,
                    message: `${socket.user.username} left the room`,
                    timestamp: new Date().toISOString()
                });

                activeUsers.delete(socket.id);
            }

            console.log(`${socket.user.username} disconnected`);
        } catch (error) {
            console.error('Disconnect error:', error);
        }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
        const userConnection = activeUsers.get(socket.id);
        if (userConnection) {
            socket.to(userConnection.roomId).emit('user-typing', {
                username: socket.user.username,
                isTyping: data.isTyping
            });
        }
    });
});

// Handle 404 for undefined routes (must be before error handler)
app.use((req, res, next) => {
    const error = new Error(`Route ${req.originalUrl} not found`);
    error.status = 404;
    next(error);
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await mongoose.connection.close();
    server.close(() => {
        console.log('Process terminated');
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}`);
});