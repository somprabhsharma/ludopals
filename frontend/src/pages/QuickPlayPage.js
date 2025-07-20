/**
 * QuickPlayPage Component
 * Handles quick matchmaking for instant game access
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Zap, 
  Users, 
  Bot,
  Clock,
  Search,
  Play,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePlayer } from '../contexts/PlayerContext';

const QuickPlayPage = () => {
  const navigate = useNavigate();
  const { playerName, playerUUID, isNameSet, updatePlayerName, setGuestName } = usePlayer();
  
  const [formData, setFormData] = useState({
    playerName: playerName || '',
    preferredPlayers: 4,
    allowAI: true
  });
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [queuePosition, setQueuePosition] = useState(null);
  const [errors, setErrors] = useState({});

  // Timer for search duration
  useEffect(() => {
    let interval;
    if (isSearching) {
      interval = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
    } else {
      setSearchTime(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSearching]);

  // Auto-generate name if not set
  useEffect(() => {
    if (!isNameSet && !formData.playerName) {
      const guestName = setGuestName();
      setFormData(prev => ({ ...prev, playerName: guestName }));
    }
  }, [isNameSet, formData.playerName, setGuestName]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.playerName.trim()) {
      newErrors.playerName = 'Player name is required';
    } else if (formData.playerName.trim().length < 2) {
      newErrors.playerName = 'Name must be at least 2 characters';
    } else if (formData.playerName.trim().length > 20) {
      newErrors.playerName = 'Name must be less than 20 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStartQuickPlay = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsSearching(true);
    setQueuePosition(Math.floor(Math.random() * 5) + 1); // Simulate queue position
    
    try {
      // Update player name if changed
      if (formData.playerName !== playerName) {
        updatePlayerName(formData.playerName);
      }
      
      // Simulate matchmaking process
      toast.success('Searching for players...');
      
      // Simulate finding a match after 3-8 seconds
      const matchTime = Math.random() * 5000 + 3000;
      
      setTimeout(async () => {
        try {
          // Create a quick play room via API
          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3060'}/api/rooms/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              playerName: formData.playerName,
              playerUUID: playerUUID,
              maxPlayers: formData.preferredPlayers,
              aiPlayers: formData.allowAI ? formData.preferredPlayers - 1 : 0
            }),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'Failed to create quick play room');
          }
          
          toast.success('Match found! Joining game...');
          
          // Navigate to the game room
          setTimeout(() => {
            navigate(`/room/${data.roomId}`);
          }, 1000);
          
        } catch (error) {
          console.error('Error creating quick play room:', error);
          toast.error(error.message || 'Failed to find match');
          setIsSearching(false);
        }
      }, matchTime);
      
    } catch (error) {
      console.error('Error starting quick play:', error);
      toast.error(error.message || 'Failed to start quick play');
      setIsSearching(false);
    }
  };

  const handleCancelSearch = () => {
    setIsSearching(false);
    setQueuePosition(null);
    toast('Search cancelled');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playerOptions = [
    { value: 2, label: '2 Players', description: 'Quick 1v1 match', icon: '⚡' },
    { value: 4, label: '4 Players', description: 'Full Ludo experience', icon: '👥' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6 safe-area-top">
        {/* Header */}
        <motion.div
          className="flex items-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link 
            to="/" 
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mr-4"
          >
            <ArrowLeft className="w-6 h-6 mr-2" />
            <span>Back to Home</span>
          </Link>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg">
              ⚡
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Quick Play
            </h1>
            <p className="text-gray-600">
              Jump into a game instantly with other players or AI opponents
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {!isSearching ? (
              /* Setup Form */
              <motion.div
                key="setup"
                className="bg-white rounded-2xl shadow-lg p-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                {/* Player Name */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={formData.playerName}
                    onChange={(e) => handleInputChange('playerName', e.target.value)}
                    className={`input ${errors.playerName ? 'input-error' : ''}`}
                    placeholder="Enter your name"
                    maxLength={20}
                  />
                  {errors.playerName && (
                    <p className="text-error text-sm mt-1">{errors.playerName}</p>
                  )}
                </div>

                {/* Preferred Players */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Users className="w-4 h-4 inline mr-2" />
                    Preferred Game Size
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {playerOptions.map((option) => (
                      <motion.button
                        key={option.value}
                        type="button"
                        onClick={() => handleInputChange('preferredPlayers', option.value)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          formData.preferredPlayers === option.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center mb-2">
                          <span className="text-2xl mr-2">{option.icon}</span>
                          <span className="font-semibold">{option.label}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {option.description}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* AI Players Option */}
                <div className="mb-8">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowAI}
                      onChange={(e) => handleInputChange('allowAI', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`relative w-12 h-6 rounded-full transition-colors ${
                      formData.allowAI ? 'bg-primary' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        formData.allowAI ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </div>
                    <div className="ml-3">
                      <div className="flex items-center">
                        <Bot className="w-4 h-4 mr-1 text-blue-500" />
                        <span className="font-medium text-gray-900">Allow AI Players</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Fill empty slots with computer players if needed
                      </p>
                    </div>
                  </label>
                </div>

                {/* Game Summary */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Quick Play Setup</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>• Player: {formData.playerName || 'You'}</div>
                    <div>• Game Size: {formData.preferredPlayers} players</div>
                    <div>• AI Players: {formData.allowAI ? 'Allowed' : 'Not allowed'}</div>
                    <div>• Matchmaking: Automatic</div>
                  </div>
                </div>

                {/* Start Button */}
                <motion.button
                  onClick={handleStartQuickPlay}
                  className="btn btn-primary btn-lg w-full"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-center">
                    <Zap className="w-5 h-5 mr-2" />
                    Start Quick Play
                  </div>
                </motion.button>

                {/* Help Text */}
                <div className="mt-6 text-center text-sm text-gray-500">
                  <p>
                    We'll find the best match for you based on your preferences.
                    If no players are available, AI opponents will join.
                  </p>
                </div>
              </motion.div>
            ) : (
              /* Searching State */
              <motion.div
                key="searching"
                className="bg-white rounded-2xl shadow-lg p-8 text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.6 }}
              >
                <motion.div
                  className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Search className="w-10 h-10 text-primary" />
                </motion.div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Finding Players...
                </h2>
                <p className="text-gray-600 mb-6">
                  Searching for the perfect match for you
                </p>

                {/* Search Stats */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-center mb-2">
                      <Clock className="w-5 h-5 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-600">Search Time</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatTime(searchTime)}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-center mb-2">
                      <Users className="w-5 h-5 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-600">Queue Position</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      #{queuePosition}
                    </div>
                  </div>
                </div>

                {/* Progress Animation */}
                <div className="mb-8">
                  <div className="flex justify-center space-x-2">
                    {[0, 1, 2].map((index) => (
                      <motion.div
                        key={index}
                        className="w-3 h-3 bg-primary rounded-full"
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
                  </div>
                </div>

                {/* Cancel Button */}
                <button
                  onClick={handleCancelSearch}
                  className="btn btn-secondary btn-lg"
                >
                  Cancel Search
                </button>

                <div className="mt-6 text-sm text-gray-500">
                  <p>
                    Average wait time is usually under 30 seconds.
                    We'll create a room with AI players if needed.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tips */}
          {!isSearching && (
            <motion.div
              className="mt-8 bg-white rounded-xl p-6 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-primary" />
                Quick Play Tips
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div>• 2-player games start faster than 4-player games</div>
                <div>• AI players ensure you always get a game</div>
                <div>• Peak hours (evenings) have more human players</div>
                <div>• You can cancel and try again anytime</div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickPlayPage;