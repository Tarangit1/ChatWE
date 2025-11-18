import express from 'express';
import { body } from 'express-validator';
import Room from '../models/Room.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation rules
const createRoomValidation = [
    body('name')
        .isLength({ min: 3, max: 50 })
        .withMessage('Room name must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9\s_-]+$/)
        .withMessage('Room name can only contain letters, numbers, spaces, hyphens, and underscores'),
    body('description')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Description cannot exceed 200 characters'),
    body('isPrivate')
        .optional()
        .isBoolean()
        .withMessage('isPrivate must be a boolean'),
    body('keyExpiration')
        .optional()
        .isISO8601()
        .withMessage('Key expiration must be a valid date')
];

// Get all public rooms
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const skip = (page - 1) * limit;

        const searchQuery = search ? {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ],
            isPrivate: false
        } : { isPrivate: false };

        const rooms = await Room.find(searchQuery)
            .populate('createdBy', 'username')
            .sort({ lastActivity: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Room.countDocuments(searchQuery);

        const roomsWithMemberCount = rooms.map(room => ({
            ...room.toObject(),
            memberCount: room.members.length
        }));

        res.json({
            success: true,
            rooms: roomsWithMemberCount,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch rooms',
            error: error.message
        });
    }
});

// Get room by ID
router.get('/:id', async (req, res) => {
    try {
        const room = await Room.findById(req.params.id)
            .populate('createdBy', 'username avatar')
            .populate('members.user', 'username avatar isOnline');

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        res.json({
            success: true,
            room: {
                ...room.toObject(),
                memberCount: room.members.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch room',
            error: error.message
        });
    }
});

// Create new room
router.post('/', authenticateToken, createRoomValidation, handleValidationErrors, async (req, res) => {
    try {
        const { name, description, isPrivate = false, tags = [], keyExpiration = null } = req.body;

        // Check if room name already exists
        const existingRoom = await Room.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') } 
        });

        if (existingRoom) {
            return res.status(400).json({
                success: false,
                message: 'Room name already exists'
            });
        }

        const room = new Room({
            name,
            description,
            createdBy: req.user._id,
            isPrivate,
            tags,
            members: [{
                user: req.user._id,
                joinedAt: new Date()
            }]
        });

        // Generate access key for private rooms
        let accessKey = null;
        if (isPrivate) {
            accessKey = room.generateAccessKey();
            if (keyExpiration) {
                room.keyExpiresAt = new Date(keyExpiration);
            }
        }

        await room.save();
        await room.populate('createdBy', 'username avatar');

        // Add room to user's joined rooms
        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { joinedRooms: room._id }
        });

        res.status(201).json({
            success: true,
            message: 'Room created successfully',
            room: {
                ...room.toObject(),
                memberCount: room.members.length
            },
            accessKey: accessKey // Include access key in response for private rooms
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create room',
            error: error.message
        });
    }
});

// Join room
router.post('/:id/join', authenticateToken, async (req, res) => {
    try {
        const { accessKey } = req.body;
        const room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Check if room is private and validate access key
        if (room.isPrivate) {
            if (!accessKey) {
                return res.status(400).json({
                    success: false,
                    message: 'Access key required for private room'
                });
            }

            if (!room.isValidAccessKey(accessKey)) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid or expired access key'
                });
            }
        }

        // Check if user is already a member
        const isMember = room.members.some(member => 
            member.user.toString() === req.user._id.toString()
        );

        if (isMember) {
            return res.status(400).json({
                success: false,
                message: 'You are already a member of this room'
            });
        }

        // Check room capacity
        if (room.members.length >= room.maxMembers) {
            return res.status(400).json({
                success: false,
                message: 'Room is at maximum capacity'
            });
        }

        // Add user to room
        room.members.push({
            user: req.user._id,
            joinedAt: new Date()
        });
        room.lastActivity = new Date();
        await room.save();

        // Add room to user's joined rooms
        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { joinedRooms: room._id }
        });

        res.json({
            success: true,
            message: 'Successfully joined the room'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to join room',
            error: error.message
        });
    }
});

// Leave room
router.post('/:id/leave', authenticateToken, async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Remove user from room
        room.members = room.members.filter(member => 
            member.user.toString() !== req.user._id.toString()
        );
        await room.save();

        // Remove room from user's joined rooms
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { joinedRooms: room._id }
        });

        res.json({
            success: true,
            message: 'Successfully left the room'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to leave room',
            error: error.message
        });
    }
});

// Get room messages
router.get('/:id/messages', async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const skip = (page - 1) * limit;

        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        const messages = await Message.find({ room: req.params.id })
            .populate('sender', 'username avatar')
            .populate('replyTo', 'content sender')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Message.countDocuments({ room: req.params.id });

        res.json({
            success: true,
            messages: messages.reverse(), // Reverse to show oldest first
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages',
            error: error.message
        });
    }
});

// Join room by access key
router.post('/join-by-key', authenticateToken, async (req, res) => {
    try {
        const { accessKey } = req.body;

        if (!accessKey) {
            return res.status(400).json({
                success: false,
                message: 'Access key is required'
            });
        }

        const room = await Room.findOne({ accessKey }).populate('createdBy', 'username');

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Invalid access key'
            });
        }

        // Check if key is expired
        if (room.keyExpiresAt && room.keyExpiresAt < new Date()) {
            return res.status(403).json({
                success: false,
                message: 'Access key has expired'
            });
        }

        // Check if user is already a member
        const isMember = room.members.some(member => 
            member.user.toString() === req.user._id.toString()
        );

        if (!isMember) {
            // Add user to room members
            room.members.push({
                user: req.user._id,
                joinedAt: new Date()
            });

            await room.save();
            await room.updateActivity();

            // Add room to user's joined rooms
            await User.findByIdAndUpdate(req.user._id, {
                $addToSet: { joinedRooms: room._id }
            });
        }

        res.json({
            success: true,
            message: 'Successfully joined room',
            room: {
                ...room.toObject(),
                memberCount: room.members.length,
                accessKey: undefined // Don't return access key in response
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to join room',
            error: error.message
        });
    }
});

export default router;