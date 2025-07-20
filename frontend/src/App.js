import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// Context Providers
import { GameProvider } from './contexts/GameContext';
import { SocketProvider } from './contexts/SocketContext';
import { PlayerProvider } from './contexts/PlayerContext';

// Pages
import HomePage from './pages/HomePage';
import CreateRoomPage from './pages/CreateRoomPage';
import JoinRoomPage from './pages/JoinRoomPage';
import GameRoomPage from './pages/GameRoomPage';
import QuickPlayPage from './pages/QuickPlayPage';
import NotFoundPage from './pages/NotFoundPage';

// Components
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import NetworkStatus from './components/NetworkStatus';

// Hooks
import { useLocalStorage } from './hooks/useLocalStorage';
import { useNetworkStatus } from './hooks/useNetworkStatus';

// Utils
import { generatePlayerUUID } from './utils/playerUtils';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [playerUUID, setPlayerUUID] = useLocalStorage('ludopals_player_uuid', null);
  const [playerName, setPlayerName] = useLocalStorage('ludopals_player_name', '');
  const isOnline = useNetworkStatus();

  // Initialize player UUID if not exists
  useEffect(() => {
    if (!playerUUID) {
      const newUUID = generatePlayerUUID();
      setPlayerUUID(newUUID);
      console.log('Generated new player UUID:', newUUID);
    }
  }, [playerUUID, setPlayerUUID]);

  // Handle app initialization
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Simulate loading time for better UX
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check if we need to restore any game state
        const savedRoomId = localStorage.getItem('ludopals_current_room');
        if (savedRoomId) {
          console.log('Found saved room ID:', savedRoomId);
          // We'll handle room restoration in the GameContext
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('App initialization error:', error);
        toast.error('Failed to initialize app');
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Handle network status changes
  useEffect(() => {
    if (!isOnline) {
      toast.error('You are offline. Some features may not work.');
    } else {
      // Only show online message if we were previously offline
      const wasOffline = localStorage.getItem('ludopals_was_offline');
      if (wasOffline) {
        toast.success('You are back online!');
        localStorage.removeItem('ludopals_was_offline');
      }
    }
    
    if (!isOnline) {
      localStorage.setItem('ludopals_was_offline', 'true');
    }
  }, [isOnline]);

  // Clear player identity (logout)
  const clearPlayerIdentity = () => {
    setPlayerUUID(null);
    setPlayerName('');
    localStorage.removeItem('ludopals_current_room');
    localStorage.removeItem('ludopals_player_id');
    toast.success('Player identity cleared');
  };

  // Page transition variants
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 20,
    },
    in: {
      opacity: 1,
      y: 0,
    },
    out: {
      opacity: 0,
      y: -20,
    },
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.3,
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <PlayerProvider 
        playerUUID={playerUUID}
        playerName={playerName}
        setPlayerName={setPlayerName}
        clearPlayerIdentity={clearPlayerIdentity}
      >
        <SocketProvider>
          <GameProvider>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
              {/* Network Status Indicator */}
              <NetworkStatus isOnline={isOnline} />
              
              {/* Main App Content */}
              <AnimatePresence mode="wait">
                <Routes>
                  <Route
                    path="/"
                    element={
                      <motion.div
                        key="home"
                        initial="initial"
                        animate="in"
                        exit="out"
                        variants={pageVariants}
                        transition={pageTransition}
                      >
                        <HomePage />
                      </motion.div>
                    }
                  />
                  
                  <Route
                    path="/create"
                    element={
                      <motion.div
                        key="create"
                        initial="initial"
                        animate="in"
                        exit="out"
                        variants={pageVariants}
                        transition={pageTransition}
                      >
                        <CreateRoomPage />
                      </motion.div>
                    }
                  />
                  
                  <Route
                    path="/join/:roomId?"
                    element={
                      <motion.div
                        key="join"
                        initial="initial"
                        animate="in"
                        exit="out"
                        variants={pageVariants}
                        transition={pageTransition}
                      >
                        <JoinRoomPage />
                      </motion.div>
                    }
                  />
                  
                  <Route
                    path="/room/:roomId"
                    element={
                      <motion.div
                        key="room"
                        initial="initial"
                        animate="in"
                        exit="out"
                        variants={pageVariants}
                        transition={pageTransition}
                      >
                        <GameRoomPage />
                      </motion.div>
                    }
                  />
                  
                  <Route
                    path="/quick-play"
                    element={
                      <motion.div
                        key="quick-play"
                        initial="initial"
                        animate="in"
                        exit="out"
                        variants={pageVariants}
                        transition={pageTransition}
                      >
                        <QuickPlayPage />
                      </motion.div>
                    }
                  />
                  
                  {/* Redirect old room format */}
                  <Route
                    path="/game/:roomId"
                    element={<Navigate to="../room/:roomId" replace />}
                  />
                  
                  {/* 404 Page */}
                  <Route
                    path="*"
                    element={
                      <motion.div
                        key="404"
                        initial="initial"
                        animate="in"
                        exit="out"
                        variants={pageVariants}
                        transition={pageTransition}
                      >
                        <NotFoundPage />
                      </motion.div>
                    }
                  />
                </Routes>
              </AnimatePresence>
              
              {/* Global App Footer */}
              <footer className="text-center py-4 text-sm text-gray-500 safe-area-bottom">
                <p>
                  Made with ❤️ by{' '}
                  <span className="font-semibold text-primary">LudoPals Team</span>
                </p>
                <p className="mt-1">
                  <button
                    onClick={clearPlayerIdentity}
                    className="text-gray-400 hover:text-gray-600 underline text-xs"
                  >
                    Clear Identity
                  </button>
                </p>
              </footer>
            </div>
          </GameProvider>
        </SocketProvider>
      </PlayerProvider>
    </ErrorBoundary>
  );
}

export default App;