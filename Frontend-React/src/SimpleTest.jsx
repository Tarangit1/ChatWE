import React from 'react';

const SimpleTest = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-4">
          ChatWE React
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
          Modern Chat Application
        </p>
        <div className="space-y-4">
          <button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-200">
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleTest;