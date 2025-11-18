import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: (user, token) => {
        set({ user, token, isAuthenticated: true });
        localStorage.setItem('token', token);
      },
      
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        localStorage.removeItem('token');
      },
      
      updateUser: (userData) => {
        set({ user: { ...get().user, ...userData } });
      },
    }),
    {
      name: 'chatwe-auth',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

export const useChatStore = create((set, get) => ({
  // Socket connection
  socket: null,
  isConnected: false,
  
  // Rooms
  rooms: [],
  currentRoom: null,
  
  // Messages
  messages: [],
  typingUsers: [],
  
  // Private rooms
  privateRooms: [],
  joinedPrivateRooms: [],
  
  // AI Recommendations
  aiSuggestions: [],
  isLoadingAI: false,
  
  // Actions
  setSocket: (socket) => set({ socket }),
  setConnected: (isConnected) => set({ isConnected }),
  
  setRooms: (rooms) => set({ rooms }),
  setCurrentRoom: (room) => set({ currentRoom: room, messages: [] }),
  
  addMessage: (message) => set(state => ({ 
    messages: [...state.messages, message] 
  })),
  setMessages: (messages) => set({ messages }),
  
  setTypingUsers: (users) => set({ typingUsers: users }),
  
  addPrivateRoom: (room) => set(state => ({
    privateRooms: [...state.privateRooms, room]
  })),
  
  setPrivateRooms: (privateRooms) => set({ privateRooms }),
  
  setAISuggestions: (suggestions) => set({ aiSuggestions: suggestions }),
  setLoadingAI: (isLoading) => set({ isLoadingAI: isLoading }),
  
  reset: () => set({
    socket: null,
    isConnected: false,
    rooms: [],
    currentRoom: null,
    messages: [],
    typingUsers: [],
    privateRooms: [],
    joinedPrivateRooms: [],
    aiSuggestions: [],
    isLoadingAI: false,
  }),
}));