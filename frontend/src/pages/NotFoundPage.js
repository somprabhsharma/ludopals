/**
 * NotFoundPage Component
 * 404 error page for invalid routes
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  ArrowLeft, 
  Search,
  Plus,
  Zap,
  HelpCircle
} from 'lucide-react';

const NotFoundPage = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const quickActions = [
    {
      icon: <Home className="w-6 h-6" />,
      title: 'Go Home',
      description: 'Return to the main page',
      link: '/',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      icon: <Plus className="w-6 h-6" />,
      title: 'Create Room',
      description: 'Start a new game',
      link: '/create',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      icon: <Search className="w-6 h-6" />,
      title: 'Join Room',
      description: 'Join an existing game',
      link: '/join',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Quick Play',
      description: 'Jump into a game instantly',
      link: '/quick-play',
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="container mx-auto px-4 py-8 safe-area-top safe-area-bottom">
        <div className="max-w-4xl mx-auto text-center">
          {/* 404 Animation */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 200 }}
          >
            <div className="relative">
              {/* Large 404 Text */}
              <motion.h1
                className="text-9xl md:text-[12rem] font-bold text-gray-200 select-none"
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                404
              </motion.h1>
              
              {/* Floating Dice */}
              <motion.div
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  y: [0, -10, 0]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="text-6xl md:text-8xl">🎲</div>
              </motion.div>
            </div>
          </motion.div>

          {/* Error Message */}
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Oops! Page Not Found
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
              Looks like you've rolled the dice and landed on a page that doesn't exist. 
              Don't worry, let's get you back to the game!
            </p>
            
            {/* Fun Messages */}
            <div className="bg-white rounded-xl p-6 shadow-lg max-w-md mx-auto">
              <div className="flex items-center justify-center mb-3">
                <HelpCircle className="w-8 h-8 text-blue-500 mr-2" />
                <span className="text-lg font-semibold text-gray-900">Did you know?</span>
              </div>
              <p className="text-gray-600 text-sm">
                In Ludo, landing on the wrong square can send you back home. 
                But here, we'll help you find the right path! 🏠
              </p>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Where would you like to go?
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {quickActions.map((action, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
                >
                  <Link
                    to={action.link}
                    className="block bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group"
                  >
                    <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center text-white mb-4 mx-auto group-hover:scale-110 transition-transform`}>
                      {action.icon}
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {action.title}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {action.description}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Navigation Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
          >
            <button
              onClick={handleGoBack}
              className="btn btn-secondary btn-lg flex items-center"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Go Back
            </button>
            
            <Link to="/" className="btn btn-primary btn-lg flex items-center">
              <Home className="w-5 h-5 mr-2" />
              Home Page
            </Link>
          </motion.div>

          {/* Additional Help */}
          <motion.div
            className="mt-16 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.6 }}
          >
            <div className="bg-white rounded-xl p-6 shadow-lg max-w-2xl mx-auto">
              <h4 className="font-semibold text-gray-900 mb-3">
                Still having trouble?
              </h4>
              <p className="text-gray-600 mb-4">
                If you're looking for something specific or encountered an error, 
                here are some common solutions:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="text-left">
                  <h5 className="font-medium text-gray-900 mb-2">Common Issues:</h5>
                  <ul className="space-y-1">
                    <li>• Check the URL for typos</li>
                    <li>• Try refreshing the page</li>
                    <li>• Clear your browser cache</li>
                  </ul>
                </div>
                
                <div className="text-left">
                  <h5 className="font-medium text-gray-900 mb-2">Quick Links:</h5>
                  <ul className="space-y-1">
                    <li>• <Link to="/" className="text-primary hover:underline">Homepage</Link></li>
                    <li>• <Link to="/create" className="text-primary hover:underline">Create New Game</Link></li>
                    <li>• <Link to="/quick-play" className="text-primary hover:underline">Quick Play</Link></li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Fun Footer */}
          <motion.div
            className="mt-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.6 }}
          >
            <div className="flex items-center justify-center space-x-2 text-gray-500">
              <span>🎲</span>
              <span className="text-sm">
                Remember: In Ludo, every roll is a new chance!
              </span>
              <span>🎲</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;