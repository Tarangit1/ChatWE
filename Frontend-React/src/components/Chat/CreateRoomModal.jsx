import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Globe, Key, Users, Eye, EyeOff } from 'lucide-react';
import { useChatStore } from '../../store';
import toast from 'react-hot-toast';

const CreateRoomModal = ({ onClose }) => {
  const { setRooms, rooms } = useChatStore();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPrivate: false,
    accessKey: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showAccessKey, setShowAccessKey] = useState(false);

  const generateAccessKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 8; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, accessKey: key }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const roomData = {
        name: formData.name,
        description: formData.description,
        isPrivate: formData.isPrivate,
        ...(formData.isPrivate && { accessKey: formData.accessKey })
      };

      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(roomData)
      });

      const data = await response.json();

      if (response.ok) {
        setRooms([...rooms, data]);
        toast.success(
          formData.isPrivate 
            ? `Private room "${formData.name}" created! Access key: ${formData.accessKey}`
            : `Room "${formData.name}" created successfully!`,
          { duration: formData.isPrivate ? 6000 : 4000 }
        );
        onClose();
      } else {
        toast.error(data.message || 'Failed to create room');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'isPrivate' && checked && !prev.accessKey && { accessKey: '' })
    }));
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
              Create New Room
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Room Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter room name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe what this room is about"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
            />
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${formData.isPrivate ? 'bg-purple-100 dark:bg-purple-900' : 'bg-gray-200 dark:bg-gray-600'}`}>
                {formData.isPrivate ? (
                  <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                ) : (
                  <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {formData.isPrivate ? 'Private Room' : 'Public Room'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formData.isPrivate 
                    ? 'Requires access key to join' 
                    : 'Anyone can join this room'
                  }
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="isPrivate"
                checked={formData.isPrivate}
                onChange={handleInputChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Access Key (for private rooms) */}
          <AnimatePresence>
            {formData.isPrivate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Access Key
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input
                      type={showAccessKey ? 'text' : 'password'}
                      name="accessKey"
                      value={formData.accessKey}
                      onChange={handleInputChange}
                      placeholder="Enter or generate access key"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                      required={formData.isPrivate}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAccessKey(!showAccessKey)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showAccessKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={generateAccessKey}
                    className="px-3 py-2 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                  >
                    <Key className="w-4 h-4" />
                  </motion.button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Share this key with others to let them join your private room
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <div className="flex space-x-3 pt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading || !formData.name}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </div>
              ) : (
                'Create Room'
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default CreateRoomModal;