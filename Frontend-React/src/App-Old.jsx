import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store';
import AuthPage from './components/Auth/AuthPage';
import ChatInterface from './components/Chat/ChatInterface';

function App() {
  const { isAuthenticated, token } = useAuthStore();

  // Verify token on app load
  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!response.ok) {
            // Token is invalid, logout
            useAuthStore.getState().logout();
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          useAuthStore.getState().logout();
        }
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {isAuthenticated ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <ChatInterface />
          </motion.div>
        ) : (
          <motion.div
            key="auth"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <AuthPage />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-color)',
            border: '1px solid var(--toast-border)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />

      {/* CSS Variables for Toast Theming */}
      <style jsx global>{`
        :root {
          --toast-bg: rgba(255, 255, 255, 0.9);
          --toast-color: #374151;
          --toast-border: rgba(156, 163, 175, 0.2);
        }
        
        .dark {
          --toast-bg: rgba(31, 41, 55, 0.9);
          --toast-color: #f3f4f6;
          --toast-border: rgba(107, 114, 128, 0.2);
        }
      `}</style>
    </div>
  );
}

export default App;
