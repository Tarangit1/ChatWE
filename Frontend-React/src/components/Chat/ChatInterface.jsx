import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Users, 
  Settings, 
  LogOut, 
  Plus,
  Key,
  Globe,
  Lock,
  Moon,
  Sun
} from 'lucide-react';
import { useAuthStore, useChatStore } from '../../store';
import RoomsList from './RoomsList';
import ChatArea from './ChatArea';
import CreateRoomModal from './CreateRoomModal';
import JoinPrivateRoomModal from './JoinPrivateRoomModal';
import toast from 'react-hot-toast';
import io from 'socket.io-client';

const ChatInterface = () => {
  const { user, logout } = useAuthStore();
  const { 
    socket, 
    setSocket, 
    setConnected, 
    currentRoom, 
    setRooms,
    addMessage,
    setTypingUsers,
    reset
  } = useChatStore();

  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinPrivate, setShowJoinPrivate] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    if (user && !socket) {
      const newSocket = io(window.location.origin, {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      newSocket.on('connect', () => {
        setConnected(true);
        setSocket(newSocket);
        toast.success('Connected to chat!');
      });

      newSocket.on('disconnect', () => {
        setConnected(false);
      });

      newSocket.on('new-message', (messageData) => {
        addMessage(messageData);
      });

      newSocket.on('user-joined', (data) => {
        toast(`${data.username} joined the room`, {
          icon: '👋',
        });
      });

      newSocket.on('user-left', (data) => {
        toast(`${data.username} left the room`, {
          icon: '👋',
        });
      });

      newSocket.on('typing-update', (users) => {
        setTypingUsers(users);
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user, socket, setSocket, setConnected, addMessage, setTypingUsers]);

  // Load rooms
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const response = await fetch('/api/rooms', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        if (response.ok) {
          setRooms(data);
        }
      } catch (error) {
        console.error('Failed to load rooms:', error);
      }
    };

    if (user) {
      loadRooms();
    }
  }, [user, setRooms]);

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
    }
    reset();
    logout();
    toast.success('Logged out successfully');
  };

  return (
    <div className={`h-screen flex ${isDarkMode ? 'dark' : ''}`}>
      <div className="flex w-full bg-gray-50 dark:bg-gray-900 transition-colors">
        {/* Sidebar */}
        <motion.div
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className={`${
            sidebarCollapsed ? 'w-16' : 'w-80'
          } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300`}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center space-x-3"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">ChatWE</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Welcome, {user?.username}</p>
                  </div>
                </motion.div>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Room Actions */}
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 space-y-3"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCreateRoom(true)}
                className="w-full flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all"
              >
                <Plus className="w-5 h-5" />
                <span>Create Room</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowJoinPrivate(true)}
                className="w-full flex items-center space-x-3 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                <Key className="w-5 h-5" />
                <span>Join Private Room</span>
              </motion.button>
            </motion.div>
          )}

          {/* Rooms List */}
          <div className="flex-1 overflow-hidden">
            <RoomsList collapsed={sidebarCollapsed} />
          </div>

          {/* User Actions */}
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2"
            >
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-full flex items-center space-x-3 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-2 text-red-600 hover:text-red-700 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {currentRoom ? (
            <ChatArea />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900"
            >
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Welcome to ChatWE
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8">
                  Select a room to start chatting or create a new one
                </p>
                <div className="flex justify-center space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreateRoom(true)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    Create Your First Room
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateRoom && (
          <CreateRoomModal onClose={() => setShowCreateRoom(false)} />
        )}
        {showJoinPrivate && (
          <JoinPrivateRoomModal onClose={() => setShowJoinPrivate(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatInterface;