import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Lock, Users, Hash } from 'lucide-react';
import { useChatStore } from '../../store';

const RoomsList = ({ collapsed }) => {
  const { 
    rooms, 
    privateRooms, 
    currentRoom, 
    setCurrentRoom, 
    socket 
  } = useChatStore();

  const handleRoomSelect = (room) => {
    if (currentRoom?._id !== room._id) {
      // Leave current room
      if (currentRoom && socket) {
        socket.emit('leaveRoom', currentRoom._id);
      }
      
      // Join new room
      setCurrentRoom(room);
      if (socket) {
        socket.emit('join-room', { roomId: room._id });
      }
    }
  };

  const RoomItem = ({ room, isPrivate = false }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      onClick={() => handleRoomSelect(room)}
      className={`
        cursor-pointer p-3 mx-2 mb-2 rounded-lg transition-all duration-200
        ${currentRoom?._id === room._id
          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
        }
      `}
    >
      <div className="flex items-center space-x-3">
        <div className={`
          p-2 rounded-lg
          ${currentRoom?._id === room._id
            ? 'bg-white/20'
            : 'bg-gray-200 dark:bg-gray-600'
          }
        `}>
          {isPrivate ? (
            <Lock className="w-4 h-4" />
          ) : (
            <Hash className="w-4 h-4" />
          )}
        </div>
        
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold truncate">{room.name}</h3>
              {isPrivate && (
                <Lock className="w-3 h-3 ml-2 flex-shrink-0" />
              )}
            </div>
            
            {room.description && (
              <p className={`
                text-sm truncate mt-1
                ${currentRoom?._id === room._id
                  ? 'text-white/80'
                  : 'text-gray-500 dark:text-gray-400'
                }
              `}>
                {room.description}
              </p>
            )}
            
            <div className={`
              flex items-center space-x-2 mt-2 text-xs
              ${currentRoom?._id === room._id
                ? 'text-white/70'
                : 'text-gray-400'
              }
            `}>
              <Users className="w-3 h-3" />
              <span>{room.memberCount || 0} members</span>
              {!isPrivate && (
                <>
                  <Globe className="w-3 h-3 ml-2" />
                  <span>Public</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="h-full overflow-y-auto">
      {!collapsed && (
        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Rooms
          </h2>
        </div>
      )}
      
      <div className="space-y-1">
        {/* Public Rooms */}
        <AnimatePresence>
          {rooms.map((room) => (
            <RoomItem key={room._id} room={room} />
          ))}
        </AnimatePresence>
        
        {/* Private Rooms */}
        {privateRooms && privateRooms.length > 0 && (
          <>
            {!collapsed && (
              <div className="px-4 py-2 mt-6">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Private Rooms
                </h3>
              </div>
            )}
            <AnimatePresence>
              {privateRooms.map((room) => (
                <RoomItem key={room._id} room={room} isPrivate={true} />
              ))}
            </AnimatePresence>
          </>
        )}
        
        {/* Empty State */}
        {rooms.length === 0 && (!privateRooms || privateRooms.length === 0) && !collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 text-center text-gray-500 dark:text-gray-400"
          >
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No rooms available</p>
            <p className="text-xs mt-1">Create one to get started!</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default RoomsList;