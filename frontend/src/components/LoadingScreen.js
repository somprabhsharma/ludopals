/**
 * LoadingScreen Component
 * Displays a loading screen with animations while the app initializes
 */

import React from 'react';
import { motion } from 'framer-motion';

const LoadingScreen = ({ message = 'Loading your game...' }) => {
  return (
    <div className="fixed inset-0 bg-gradient-game flex flex-col items-center justify-center z-50">
      {/* Animated Logo */}
      <motion.div
        className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-2xl"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          duration: 0.8
        }}
      >
        🎲
      </motion.div>

      {/* App Title */}
      <motion.h1
        className="text-4xl font-bold text-white mb-2 text-shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        LudoPals
      </motion.h1>

      {/* Loading Message */}
      <motion.p
        className="text-white/80 text-lg mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        {message}
      </motion.p>

      {/* Loading Spinner */}
      <motion.div
        className="relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.4 }}
      >
        {/* Outer Ring */}
        <motion.div
          className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        {/* Inner Ring */}
        <motion.div
          className="absolute inset-2 w-12 h-12 border-4 border-white/10 border-b-white/60 rounded-full"
          animate={{ rotate: -360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </motion.div>

      {/* Loading Dots */}
      <motion.div
        className="flex space-x-2 mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.4 }}
      >
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="w-3 h-3 bg-white rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: index * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </motion.div>

      {/* Progress Indicator */}
      <motion.div
        className="mt-8 w-64 h-1 bg-white/20 rounded-full overflow-hidden"
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: 1, width: 256 }}
        transition={{ delay: 1, duration: 0.6 }}
      >
        <motion.div
          className="h-full bg-white rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{
            delay: 1.2,
            duration: 2,
            ease: "easeInOut"
          }}
        />
      </motion.div>

      {/* Fun Facts */}
      <motion.div
        className="mt-8 text-center max-w-md px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.6 }}
      >
        <p className="text-white/60 text-sm">
          Did you know? Ludo is derived from the ancient Indian game Pachisi!
        </p>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;