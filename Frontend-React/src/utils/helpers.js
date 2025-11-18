// Notification utility
export const notify = {
  success: (message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('ChatWE', {
        body: message,
        icon: '/favicon.ico',
        tag: 'success'
      });
    }
  },
  
  newMessage: (username, message, roomName) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`New message in ${roomName}`, {
        body: `${username}: ${message}`,
        icon: '/favicon.ico',
        tag: 'message'
      });
    }
  },
  
  requestPermission: async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }
};

// Sound utility
export const sounds = {
  messageSound: null,
  
  init() {
    this.messageSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhAT+Z3PO/dSMFl20AAHjH8N2QQAoUXrTp66hVFApGn+DyvmwhAT+Z3PO/dSMF');
  },
  
  playMessage() {
    if (this.messageSound) {
      this.messageSound.currentTime = 0;
      this.messageSound.play().catch(() => {});
    }
  }
};

// Theme utility
export const theme = {
  toggle: () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    return isDark;
  },
  
  init: () => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  }
};

// Utility functions
export const formatDate = (date) => {
  const now = new Date();
  const messageDate = new Date(date);
  const diffInHours = (now - messageDate) / (1000 * 60 * 60);
  
  if (diffInHours < 24) {
    return messageDate.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } else if (diffInHours < 24 * 7) {
    return messageDate.toLocaleDateString([], { 
      weekday: 'short',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } else {
    return messageDate.toLocaleDateString([], { 
      month: 'short',
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
};

export const generateRoomKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  }
};

// Emoji picker utility
export const emojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
  '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
  '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
  '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙',
  '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋',
  '🖖', '👏', '🙌', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
  '✨', '🎉', '🎊', '🔥', '💯', '⭐', '🌟', '💫', '⚡', '☄️'
];