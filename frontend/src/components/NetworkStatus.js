/**
 * NetworkStatus Component
 * Displays network connectivity status and connection quality
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Signal, AlertCircle } from 'lucide-react';
import { useConnectionQuality } from '../hooks/useNetworkStatus';

const NetworkStatus = ({ isOnline }) => {
  const connectionQuality = useConnectionQuality();
  const [showStatus, setShowStatus] = useState(false);
  const [lastOnlineState, setLastOnlineState] = useState(isOnline);

  // Show status when connection changes
  useEffect(() => {
    if (lastOnlineState !== isOnline) {
      setShowStatus(true);
      setLastOnlineState(isOnline);
      
      // Hide after 3 seconds if online, keep visible if offline
      const timer = setTimeout(() => {
        if (isOnline) {
          setShowStatus(false);
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, lastOnlineState]);

  // Always show if offline
  useEffect(() => {
    if (!isOnline) {
      setShowStatus(true);
    }
  }, [isOnline]);

  // Get status color based on connection quality
  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    
    switch (connectionQuality.quality) {
      case 'excellent':
        return 'bg-blue-500';
      case 'good':
        return 'bg-green-500';
      case 'fair':
        return 'bg-yellow-500';
      case 'poor':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get status text
  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    
    switch (connectionQuality.quality) {
      case 'excellent':
        return 'Excellent Connection';
      case 'good':
        return 'Good Connection';
      case 'fair':
        return 'Fair Connection';
      case 'poor':
        return 'Poor Connection';
      default:
        return 'Connected';
    }
  };

  // Get appropriate icon
  const getIcon = () => {
    if (!isOnline) {
      return <WifiOff size={16} />;
    }
    
    if (connectionQuality.shouldShowWarning) {
      return <AlertCircle size={16} />;
    }
    
    return <Wifi size={16} />;
  };

  // Get signal strength bars
  const getSignalBars = () => {
    if (!isOnline) return 0;
    
    switch (connectionQuality.quality) {
      case 'excellent':
        return 4;
      case 'good':
        return 3;
      case 'fair':
        return 2;
      case 'poor':
        return 1;
      default:
        return 2;
    }
  };

  const signalBars = getSignalBars();

  return (
    <AnimatePresence>
      {showStatus && (
        <motion.div
          className="fixed top-4 right-4 z-40 safe-area-top safe-area-right"
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30 
          }}
        >
          <div className={`${getStatusColor()} text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 min-w-max`}>
            {/* Connection Icon */}
            <div className="flex-shrink-0">
              {getIcon()}
            </div>
            
            {/* Status Text */}
            <span className="text-sm font-medium">
              {getStatusText()}
            </span>
            
            {/* Signal Strength Indicator */}
            {isOnline && (
              <div className="flex items-end space-x-1 ml-2">
                {[1, 2, 3, 4].map((bar) => (
                  <motion.div
                    key={bar}
                    className={`w-1 bg-white rounded-full ${
                      bar <= signalBars ? 'opacity-100' : 'opacity-30'
                    }`}
                    style={{ height: `${bar * 3 + 2}px` }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: bar * 0.1 }}
                  />
                ))}
              </div>
            )}
            
            {/* Close button for offline state */}
            {!isOnline && (
              <button
                onClick={() => setShowStatus(false)}
                className="ml-2 text-white/80 hover:text-white transition-colors"
                aria-label="Dismiss"
              >
                ×
              </button>
            )}
          </div>
          
          {/* Additional info for poor connections */}
          {isOnline && connectionQuality.shouldShowWarning && (
            <motion.div
              className="mt-2 bg-white rounded-lg shadow-lg p-3 text-sm text-gray-700"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-start space-x-2">
                <AlertCircle size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-700">Slow Connection Detected</p>
                  <p className="text-gray-600 mt-1">
                    Game performance may be affected. Consider switching to a better network.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Compact version for always-visible status
export const CompactNetworkStatus = ({ isOnline }) => {
  const connectionQuality = useConnectionQuality();
  
  return (
    <div className="flex items-center space-x-1">
      {/* Connection dot */}
      <motion.div
        className={`w-2 h-2 rounded-full ${
          isOnline ? 'bg-green-500' : 'bg-red-500'
        }`}
        animate={{
          scale: isOnline ? [1, 1.2, 1] : 1,
          opacity: isOnline ? [1, 0.7, 1] : [1, 0.5, 1]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Connection type indicator */}
      {isOnline && connectionQuality.connectionType !== 'unknown' && (
        <span className="text-xs text-gray-500 uppercase font-mono">
          {connectionQuality.connectionType}
        </span>
      )}
    </div>
  );
};

// Network status for game UI
export const GameNetworkStatus = ({ isOnline, className = '' }) => {
  const connectionQuality = useConnectionQuality();
  
  if (isOnline && !connectionQuality.shouldShowWarning) {
    return null; // Don't show anything for good connections
  }
  
  return (
    <motion.div
      className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
        isOnline 
          ? 'bg-yellow-100 text-yellow-800' 
          : 'bg-red-100 text-red-800'
      } ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      {isOnline ? (
        <>
          <Signal size={14} />
          <span>Slow Connection</span>
        </>
      ) : (
        <>
          <WifiOff size={14} />
          <span>Offline</span>
        </>
      )}
    </motion.div>
  );
};

export default NetworkStatus;