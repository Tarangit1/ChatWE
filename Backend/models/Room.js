import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Room name is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Room name must be at least 3 characters'],
        maxlength: [50, 'Room name cannot exceed 50 characters']
    },
    description: {
        type: String,
        maxlength: [200, 'Description cannot exceed 200 characters'],
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    isPrivate: {
        type: Boolean,
        default: false
    },
    accessKey: {
        type: String,
        sparse: true, // Only index non-null values
        unique: true
    },
    keyExpiresAt: {
        type: Date,
        default: null
    },
    maxMembers: {
        type: Number,
        default: 100
    },
    tags: [{
        type: String,
        trim: true
    }],
    lastActivity: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Update lastActivity when room is accessed
roomSchema.methods.updateActivity = function() {
    this.lastActivity = new Date();
    return this.save();
};

// Generate unique access key for private rooms
roomSchema.methods.generateAccessKey = function() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.accessKey = result;
    return result;
};

// Check if access key is valid
roomSchema.methods.isValidAccessKey = function(key) {
    if (!this.isPrivate) return true;
    if (!this.accessKey) return false;
    if (this.keyExpiresAt && this.keyExpiresAt < new Date()) return false;
    return this.accessKey === key;
};

// Get active members count
roomSchema.virtual('memberCount').get(function() {
    return this.members.length;
});

export default mongoose.model('Room', roomSchema);