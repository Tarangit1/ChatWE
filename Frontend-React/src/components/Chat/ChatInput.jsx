import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { emojis } from '../../utils/helpers.js';

const ChatInput = ({ onSendMessage, disabled, placeholder = "Type a message..." }) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addEmoji = (emoji) => {
    const cursor = inputRef.current?.selectionStart || message.length;
    const newMessage = message.slice(0, cursor) + emoji + message.slice(cursor);
    setMessage(newMessage);
    
    // Reset cursor position
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(cursor + emoji.length, cursor + emoji.length);
    }, 0);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Voice recording functionality would be implemented here
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            ref={emojiPickerRef}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-80 max-h-48 overflow-y-auto z-50"
          >
            <div className="grid grid-cols-8 gap-2">
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => addEmoji(emoji)}
                  className="text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Container */}
      <div className="flex items-end gap-3 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        {/* Emoji Button */}
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="flex-shrink-0 p-2 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Smile size={20} />
        </button>

        {/* File Upload Button */}
        <button className="flex-shrink-0 p-2 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <Paperclip size={20} />
        </button>

        {/* Message Input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-2xl border-none resize-none outline-none focus:ring-2 focus:ring-purple-500 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed max-h-32"
            style={{
              minHeight: '48px',
              maxHeight: '128px',
              height: 'auto'
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
          />
        </div>

        {/* Voice Recording Button */}
        <motion.button
          onClick={toggleRecording}
          whileTap={{ scale: 0.95 }}
          className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
            isRecording
              ? 'text-red-500 bg-red-100 dark:bg-red-900/20'
              : 'text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
        </motion.button>

        {/* Send Button */}
        <motion.button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          whileTap={{ scale: 0.95 }}
          className={`flex-shrink-0 p-3 rounded-xl transition-all ${
            message.trim() && !disabled
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
          } disabled:cursor-not-allowed`}
        >
          <Send size={18} />
        </motion.button>
      </div>
    </div>
  );
};

export default ChatInput;