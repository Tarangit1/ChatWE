import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Message from '../models/Message.js';
import Room from '../models/Room.js';

const router = express.Router();

// AI Recommendation endpoint
router.post('/recommendations', authenticateToken, async (req, res) => {
    try {
        console.log('AI Recommendations - User:', req.user);
        console.log('AI Recommendations - Body:', req.body);
        
        const { roomId } = req.body;
        const userId = req.user._id;

        if (!roomId) {
            return res.status(400).json({ error: 'Room ID is required' });
        }

        // Verify user has access to the room
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        if (!room.members.includes(userId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get recent messages from the room (last 10 messages for context)
        const recentMessages = await Message.find({ room: roomId })
            .populate('sender', 'username')
            .sort({ createdAt: -1 })
            .limit(10);

        // Reverse to get chronological order
        recentMessages.reverse();

        // Generate AI recommendations based on conversation context
        const recommendations = generateContextualRecommendations(recentMessages, userId);

        res.json({ recommendations });
    } catch (error) {
        console.error('AI Recommendations error:', error);
        res.status(500).json({ error: 'Failed to generate recommendations' });
    }
});

// Function to generate contextual recommendations based on recent messages
function generateContextualRecommendations(messages, currentUserId) {
    if (!messages || messages.length === 0) {
        return [
            "Hello! How's everyone doing?",
            "What's on your mind today?",
            "Any updates to share?"
        ];
    }

    const lastMessage = messages[messages.length - 1];
    const lastFewMessages = messages.slice(-3);
    const messageContents = messages.map(m => m.content.toLowerCase());
    const lastMessageContent = lastMessage.content.toLowerCase();

    // Don't suggest responses to own messages
    if (lastMessage.sender._id.toString() === currentUserId) {
        return [
            "Looking forward to hearing everyone's thoughts!",
            "What do you all think?",
            "Anyone else have ideas on this?"
        ];
    }

    let suggestions = [];

    // Question detection and responses
    if (lastMessageContent.includes('?')) {
        if (lastMessageContent.includes('how are you') || lastMessageContent.includes('how\'s it going')) {
            suggestions = [
                "I'm doing great, thanks for asking!",
                "Pretty good, how about you?",
                "All good here! How's your day going?"
            ];
        } else if (lastMessageContent.includes('what') && lastMessageContent.includes('think')) {
            suggestions = [
                "I think that's a great point!",
                "Interesting perspective, I agree!",
                "That makes a lot of sense to me"
            ];
        } else if (lastMessageContent.includes('anyone') || lastMessageContent.includes('everybody')) {
            suggestions = [
                "Count me in!",
                "I'm interested!",
                "Sounds good to me!"
            ];
        } else {
            suggestions = [
                "That's a good question!",
                "Let me think about that...",
                "Hmm, interesting point!"
            ];
        }
    }
    
    // Greeting detection
    else if (lastMessageContent.includes('hello') || lastMessageContent.includes('hi') || 
             lastMessageContent.includes('hey') || lastMessageContent.includes('good morning') ||
             lastMessageContent.includes('good afternoon') || lastMessageContent.includes('good evening')) {
        suggestions = [
            "Hey there! 👋",
            "Hello! Good to see you!",
            "Hi! How's it going?"
        ];
    }
    
    // Agreement/enthusiasm responses
    else if (lastMessageContent.includes('awesome') || lastMessageContent.includes('great') || 
             lastMessageContent.includes('amazing') || lastMessageContent.includes('fantastic')) {
        suggestions = [
            "Absolutely! That's fantastic!",
            "I totally agree! 🎉",
            "That's really awesome!"
        ];
    }
    
    // Problem/help responses
    else if (lastMessageContent.includes('problem') || lastMessageContent.includes('issue') || 
             lastMessageContent.includes('help') || lastMessageContent.includes('stuck')) {
        suggestions = [
            "I'd be happy to help!",
            "Let me know if you need assistance",
            "What can we do to help?"
        ];
    }
    
    // Thanks responses
    else if (lastMessageContent.includes('thank') || lastMessageContent.includes('thanks')) {
        suggestions = [
            "You're very welcome!",
            "Happy to help! 😊",
            "No problem at all!"
        ];
    }
    
    // Work/project related
    else if (lastMessageContent.includes('project') || lastMessageContent.includes('work') || 
             lastMessageContent.includes('deadline') || lastMessageContent.includes('meeting')) {
        suggestions = [
            "Sounds like a solid plan!",
            "Let me know how I can contribute",
            "When do we need this completed?"
        ];
    }
    
    // Weekend/time related
    else if (lastMessageContent.includes('weekend') || lastMessageContent.includes('friday') || 
             lastMessageContent.includes('monday')) {
        suggestions = [
            "Hope you have a great weekend!",
            "Enjoy your time off!",
            "Looking forward to next week!"
        ];
    }
    
    // Default contextual responses based on conversation flow
    else {
        // Analyze conversation tone and content
        const isPositive = messageContents.some(msg => 
            msg.includes('good') || msg.includes('nice') || msg.includes('love') || 
            msg.includes('happy') || msg.includes('excited')
        );
        
        const isDiscussion = lastFewMessages.length > 1 && 
            lastFewMessages.every(m => m.content.length > 10);

        if (isPositive) {
            suggestions = [
                "That's really nice to hear!",
                "I love that energy! 💪",
                "Glad things are going well!"
            ];
        } else if (isDiscussion) {
            suggestions = [
                "That's an interesting point!",
                "I see what you mean",
                "Thanks for sharing that perspective"
            ];
        } else {
            suggestions = [
                "Interesting! Tell me more",
                "That makes sense",
                "I appreciate you sharing that"
            ];
        }
    }

    // Fallback suggestions if none generated
    if (suggestions.length === 0) {
        suggestions = [
            "That's interesting!",
            "Thanks for sharing!",
            "Good point!"
        ];
    }

    return suggestions.slice(0, 3); // Return max 3 suggestions
}

export default router;