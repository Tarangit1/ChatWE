import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, RefreshCw, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useChatStore, useAuthStore } from '../../store';
import toast from 'react-hot-toast';

const AIRecommendations = ({ onSuggestionSelect, currentRoom }) => {
  const { aiSuggestions, isLoadingAI, setAISuggestions, setLoadingAI } = useChatStore();
  const { user } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastFetch, setLastFetch] = useState(0);

  const loadRecommendations = async () => {
    if (!currentRoom || !user) return;
    
    // Prevent too frequent requests (debounce)
    const now = Date.now();
    if (now - lastFetch < 2000) return;
    
    setLoadingAI(true);
    setLastFetch(now);

    try {
      const response = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          roomId: currentRoom._id
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAISuggestions(data.recommendations || []);
      } else {
        console.error('Failed to load AI suggestions');
        setAISuggestions([]);
      }
    } catch (error) {
      console.error('Error loading AI suggestions:', error);
      setAISuggestions([]);
    } finally {
      setLoadingAI(false);
    }
  };

  // Load suggestions when room changes
  useEffect(() => {
    if (currentRoom) {
      loadRecommendations();
    }
  }, [currentRoom]);

  const handleSuggestionClick = (suggestion) => {
    onSuggestionSelect(suggestion);
    // Provide haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleRefresh = () => {
    loadRecommendations();
    toast.success('Refreshing suggestions...', { icon: '🤖' });
  };

  if (!currentRoom) return null;

  return (
    <AnimatePresence>
      {(aiSuggestions.length > 0 || isLoadingAI) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-700"
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
            >
              <div className="relative">
                <Bot className="w-5 h-5" />
                <motion.div
                  animate={{ rotate: isLoadingAI ? 360 : 0 }}
                  transition={{ duration: 1, repeat: isLoadingAI ? Infinity : 0, ease: "linear" }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="w-3 h-3" />
                </motion.div>
              </div>
              <span className="font-medium">AI Suggestions</span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </motion.button>

            <motion.button
              whileHover={{ rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleRefresh}
              disabled={isLoadingAI}
              className="p-1 text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingAI ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>

          {/* Suggestions */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 pb-4"
              >
                {isLoadingAI ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center py-6"
                  >
                    <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Bot className="w-5 h-5" />
                      </motion.div>
                      <span className="text-sm">Generating smart suggestions...</span>
                    </div>
                  </motion.div>
                ) : aiSuggestions.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-wrap gap-2"
                  >
                    {aiSuggestions.map((suggestion, index) => (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-3 py-2 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full text-sm border border-purple-200 dark:border-purple-600 hover:border-purple-400 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all shadow-sm hover:shadow-md"
                      >
                        <span className="flex items-center space-x-1">
                          <Sparkles className="w-3 h-3 text-purple-500" />
                          <span>{suggestion}</span>
                        </span>
                      </motion.button>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-4 text-gray-500 dark:text-gray-400"
                  >
                    <Bot className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No suggestions available</p>
                    <p className="text-xs mt-1">Try chatting more to get AI recommendations!</p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIRecommendations;