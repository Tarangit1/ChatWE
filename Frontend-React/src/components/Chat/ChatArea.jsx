import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  MoreVertical,
  Copy,
  Check,
  Crown,
  Shield
} from 'lucide-react';
import { useChatStore, useAuthStore } from '../../store';
import MessageList from './MessageList';
import AIRecommendations from './AIRecommendations';
import ChatInput from './ChatInput';
import { copyToClipboard } from '../../utils/helpers.js';
import toast from 'react-hot-toast';

const ChatArea = () => {
  const { currentRoom, messages, typingUsers, socket } = useChatStore();
  const { user } = useAuthStore();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messageInputRef = useRef(null);
  
  let typingTimeout = useRef(null);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !socket || !currentRoom) return;

    socket.emit('send-message', {
      content: message.trim()
    });

    setMessage('');
    
    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      socket.emit('typing', { isTyping: false });
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    
    if (!socket || !currentRoom) return;
    
    // Handle typing indicator
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { isTyping: true });
    }
    
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing', { isTyping: false });
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleAISuggestionSelect = (suggestion) => {
    setMessage(suggestion);
    messageInputRef.current?.focus();
  };

  // Filter out current user from typing users
  const otherTypingUsers = typingUsers.filter(userId => userId !== user?._id);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleCopyAccessKey = async () => {
    if (currentRoom?.accessKey) {
      const success = await copyToClipboard(currentRoom.accessKey);
      if (success) {
        setCopiedKey(true);
        toast.success('Access key copied to clipboard!');
        setTimeout(() => setCopiedKey(false), 2000);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
      {/* Enhanced Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              currentRoom?.isPrivate 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                : 'bg-gradient-to-r from-purple-500 to-blue-500'
            }`}>
              {currentRoom?.isPrivate ? (
                <Shield className="w-6 h-6 text-white" />
              ) : (
                <span className="text-white font-bold text-lg">
                  {currentRoom?.name?.charAt(0)?.toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {currentRoom?.name}
                </h1>
                {currentRoom?.isPrivate && (
                  <Crown className="w-5 h-5 text-yellow-500" title="Private Room" />
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Users className="w-4 h-4" />
                <span>{currentRoom?.memberCount || 0} members</span>
                {currentRoom?.isPrivate && (
                  <>
                    <span>•</span>
                    <span className="text-purple-500 font-medium">Private</span>
                    {currentRoom?.accessKey && (
                      <>
                        <span>•</span>
                        <button
                          onClick={handleCopyAccessKey}
                          className="flex items-center space-x-1 px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                        >
                          <span className="font-mono text-xs">{currentRoom.accessKey}</span>
                          {copiedKey ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
          <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
        
        {/* Typing Indicator */}
        <AnimatePresence>
          {otherTypingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 text-sm text-purple-500 dark:text-purple-400"
            >
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span>
                  {otherTypingUsers.length === 1 ? 'Someone is' : `${otherTypingUsers.length} people are`} typing...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} currentUser={user} />
      </div>

      {/* AI Recommendations */}
      <AIRecommendations 
        onSuggestionSelect={handleAISuggestionSelect}
        currentRoom={currentRoom}
      />

      {/* Enhanced Chat Input */}
      <ChatInput
        onSendMessage={sendMessage}
        disabled={!currentRoom}
        placeholder={currentRoom ? `Message #${currentRoom.name}` : "Select a room to start chatting"}
      />
    </div>
  );
};

export default ChatArea;