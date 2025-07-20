/**
 * HomePage Component
 * Main landing page for LudoPals with game options and navigation
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, 
  Zap, 
  Plus, 
  LogIn, 
  Gamepad2, 
  Star,
  Shield,
  Smartphone
} from 'lucide-react';
import { usePlayer } from '../contexts/PlayerContext';

const HomePage = () => {
  const { playerName, isNameSet, setGuestName } = usePlayer();

  const handleQuickStart = () => {
    if (!isNameSet) {
      setGuestName();
    }
  };

  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: "Multiplayer Fun",
      description: "Play with 2-4 friends in real-time"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Private Rooms",
      description: "Create secure rooms with shareable links"
    },
    {
      icon: <Gamepad2 className="w-8 h-8" />,
      title: "AI Opponents",
      description: "Mix human and computer players"
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: "Mobile Optimized",
      description: "Perfect for phones and tablets"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="safe-area-top">
        <div className="container mx-auto px-4 py-6">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-3xl mr-4 shadow-lg">
                🎲
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                LudoPals
              </h1>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Play the classic Ludo game with friends online. Create private rooms, 
              challenge AI opponents, or join quick matches!
            </p>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {isNameSet ? (
            <div className="bg-white rounded-xl p-6 shadow-lg inline-block">
              <p className="text-lg text-gray-700">
                Welcome back, <span className="font-semibold text-primary">{playerName}</span>!
              </p>
              <p className="text-gray-500 mt-1">Ready to play some Ludo?</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6 shadow-lg inline-block">
              <p className="text-lg text-gray-700">
                Welcome to LudoPals! 🎉
              </p>
              <p className="text-gray-500 mt-1">Choose an option below to get started</p>
            </div>
          )}
        </motion.div>

        {/* Game Options */}
        <motion.div
          className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {/* Create Room */}
          <Link to="/create">
            <motion.div
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mr-4 group-hover:bg-primary/20 transition-colors">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Create Room</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Start a new game and invite friends with a shareable link. 
                Configure players, AI opponents, and game settings.
              </p>
              <div className="flex items-center text-primary font-medium">
                <span>Get Started</span>
                <motion.div
                  className="ml-2"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  →
                </motion.div>
              </div>
            </motion.div>
          </Link>

          {/* Quick Play */}
          <Link to="/quick-play" onClick={handleQuickStart}>
            <motion.div
              className="bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group text-white"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4 group-hover:bg-white/30 transition-colors">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold">Quick Play</h3>
              </div>
              <p className="text-blue-100 mb-4">
                Jump into a game instantly! Get matched with other players 
                or play against AI opponents right away.
              </p>
              <div className="flex items-center font-medium">
                <span>Play Now</span>
                <motion.div
                  className="ml-2"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  ⚡
                </motion.div>
              </div>
            </motion.div>
          </Link>

          {/* Join Room */}
          <Link to="/join">
            <motion.div
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4 group-hover:bg-green-200 transition-colors">
                  <LogIn className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Join Room</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Have a room code or link from a friend? Enter it here to 
                join their game and start playing together.
              </p>
              <div className="flex items-center text-green-600 font-medium">
                <span>Join Game</span>
                <motion.div
                  className="ml-2"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  →
                </motion.div>
              </div>
            </motion.div>
          </Link>

          {/* How to Play */}
          <motion.div
            className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group border border-purple-100"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4 group-hover:bg-purple-200 transition-colors">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">How to Play</h3>
            </div>
            <p className="text-gray-600 mb-4">
              New to Ludo? Learn the rules, strategies, and tips to become 
              a Ludo master and dominate your friends!
            </p>
            <div className="flex items-center text-purple-600 font-medium">
              <span>Learn Rules</span>
              <motion.div
                className="ml-2"
                animate={{ rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                ⭐
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* Features Section */}
        <motion.div
          className="max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Why Choose LudoPals?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-xl p-6 shadow-lg text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
                whileHover={{ y: -5 }}
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          className="text-center mt-16 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <div className="bg-white rounded-2xl p-8 shadow-lg max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Join the Fun! 🎉
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-bold text-primary mb-2">1000+</div>
                <div className="text-gray-600">Games Played</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">500+</div>
                <div className="text-gray-600">Active Players</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">24/7</div>
                <div className="text-gray-600">Available</div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default HomePage;