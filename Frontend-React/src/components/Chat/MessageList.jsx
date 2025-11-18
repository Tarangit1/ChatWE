import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

const MessageList = ({ messages, currentUser }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const Message = ({ message, isOwn }) => (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
        {!isOwn && (
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {message.sender?.username?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {message.sender?.username}
            </span>
          </div>
        )}
        
        <div
          className={`px-4 py-2 rounded-2xl ${
            isOwn
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-br-md'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
          }`}
        >
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
        
        <div className={`mt-1 text-xs text-gray-500 dark:text-gray-400 ${isOwn ? 'text-right' : 'text-left'}`}>
          {formatTime(message.createdAt)}
        </div>
      </div>
      
      {isOwn && (
        <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center ml-2 order-1">
          <span className="text-white text-xs font-bold">
            {currentUser?.username?.charAt(0)?.toUpperCase()}
          </span>
        </div>
      )}
    </motion.div>
  );

  const SystemMessage = ({ message }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex justify-center mb-4"
    >
      <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm">
        {message.content}
      </div>
    </motion.div>
  );

  return (
    <div className="h-full overflow-y-auto p-4 space-y-2">
      <AnimatePresence>
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
              <span className="text-white text-xl">💬</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Start the conversation
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Be the first to send a message in this room
            </p>
          </motion.div>
        ) : (
          messages.map((message) => {
            if (message.type === 'system') {
              return <SystemMessage key={message._id} message={message} />;
            }
            
            const isOwn = message.sender?._id === currentUser?._id;
            return (
              <Message
                key={message._id}
                message={message}
                isOwn={isOwn}
              />
            );
          })
        )}
      </AnimatePresence>
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;