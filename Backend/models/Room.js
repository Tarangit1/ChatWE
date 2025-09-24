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

// Get active members count
roomSchema.virtual('memberCount').get(function() {
    return this.members.length;
});

export default mongoose.model('Room', roomSchema);