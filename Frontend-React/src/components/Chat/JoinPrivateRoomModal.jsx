import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Lock, Search } from 'lucide-react';
import { useChatStore } from '../../store';
import toast from 'react-hot-toast';

const JoinPrivateRoomModal = ({ onClose }) => {
  const { setRooms, rooms, setCurrentRoom, socket } = useChatStore();
  const [accessKey, setAccessKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [roomPreview, setRoomPreview] = useState(null);

  const searchRoom = async () => {
    if (!accessKey.trim()) {
      toast.error('Please enter an access key');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/rooms/search-private', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ accessKey: accessKey.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        setRoomPreview(data.room);
      } else {
        toast.error(data.message || 'Room not found');
        setRoomPreview(null);
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
      setRoomPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!roomPreview) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/rooms/join-private', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          roomId: roomPreview._id,
          accessKey: accessKey.trim() 
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Add room to rooms list if not already there
        const existingRoom = rooms.find(r => r._id === roomPreview._id);
        if (!existingRoom) {
          setRooms([...rooms, data.room]);
        }

        // Join the room
        setCurrentRoom(data.room);
        if (socket) {
          socket.emit('join-room', { roomId: data.room._id });
        }

        toast.success(`Joined private room "${roomPreview.name}"!`);
        onClose();
      } else {
        toast.error(data.message || 'Failed to join room');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (roomPreview) {
        joinRoom();
      } else {
        searchRoom();
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Join Private Room
            </h2>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Access Key Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Access Key
            </label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                  onKeyPress={handleKeyPress}
                  placeholder="ENTER-ACCESS-KEY"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors font-mono"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={searchRoom}
                disabled={isLoading || !accessKey.trim()}
                className="px-4 py-2 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4" />
              </motion.button>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Enter the 8-character access key provided by the room creator
            </p>
          </div>

          {/* Loading State */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-center py-8"
              >
                <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
                  <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Searching for room...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Room Preview */}
          <AnimatePresence>
            {roomPreview && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-lg border border-purple-200 dark:border-purple-700"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {roomPreview.name}
                    </h3>
                    {roomPreview.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {roomPreview.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>🔒 Private Room</span>
                      <span>👥 {roomPreview.memberCount || 0} members</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </motion.button>
            
            {roomPreview ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={joinRoom}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Joining...
                  </div>
                ) : (
                  'Join Room'
                )}
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={searchRoom}
                disabled={isLoading || !accessKey.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Search Room
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default JoinPrivateRoomModal;