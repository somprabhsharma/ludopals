/**
 * CreateRoomPage Component
 * Allows users to create new game rooms with customizable settings
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Users, 
  Bot, 
  Settings, 
  Play,
  Copy,
  Share2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePlayer } from '../contexts/PlayerContext';

const CreateRoomPage = () => {
  const navigate = useNavigate();
  const { playerName, playerUUID, isNameSet, updatePlayerName } = usePlayer();
  
  const [formData, setFormData] = useState({
    playerName: playerName || '',
    maxPlayers: 4,
    aiPlayers: 0,
    gameMode: 'classic'
  });
  
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState({});

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
    
    if (formData.maxPlayers < 2 || formData.maxPlayers > 4) {
      newErrors.maxPlayers = 'Players must be between 2 and 4';
    }
    
    if (formData.aiPlayers < 0 || formData.aiPlayers >= formData.maxPlayers) {
      newErrors.aiPlayers = 'Invalid number of AI players';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateRoom = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsCreating(true);
    
    try {
      // Update player name if changed
      if (formData.playerName !== playerName) {
        updatePlayerName(formData.playerName);
      }
      
      // Create room via API
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3060'}/api/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: formData.playerName,
          playerUUID: playerUUID,
          maxPlayers: formData.maxPlayers,
          aiPlayers: formData.aiPlayers
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create room');
      }
      
      toast.success('Room created successfully!');
      
      // Navigate to the game room
      navigate(`/room/${data.roomId}`);
      
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error(error.message || 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  const playerOptions = [
    { value: 2, label: '2 Players', description: 'Quick 1v1 game' },
    { value: 3, label: '3 Players', description: 'Balanced gameplay' },
    { value: 4, label: '4 Players', description: 'Classic Ludo' }
  ];

  const getAIOptions = () => {
    const options = [];
    for (let i = 0; i < formData.maxPlayers; i++) {
      options.push({
        value: i,
        label: i === 0 ? 'No AI' : `${i} AI Player${i > 1 ? 's' : ''}`,
        description: i === 0 ? 'Human players only' : `${formData.maxPlayers - i} human, ${i} AI`
      });
    }
    return options;
  };

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
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg">
              🎲
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create New Room
            </h1>
            <p className="text-gray-600">
              Set up your game and invite friends to play
            </p>
          </motion.div>

          {/* Form */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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

            {/* Max Players */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Users className="w-4 h-4 inline mr-2" />
                Number of Players
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {playerOptions.map((option) => (
                  <motion.button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      handleInputChange('maxPlayers', option.value);
                      // Reset AI players if it exceeds new max
                      if (formData.aiPlayers >= option.value) {
                        handleInputChange('aiPlayers', Math.max(0, option.value - 1));
                      }
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.maxPlayers === option.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="font-semibold">{option.label}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {option.description}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* AI Players */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Bot className="w-4 h-4 inline mr-2" />
                AI Opponents
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {getAIOptions().map((option) => (
                  <motion.button
                    key={option.value}
                    type="button"
                    onClick={() => handleInputChange('aiPlayers', option.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.aiPlayers === option.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="font-semibold">{option.label}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {option.description}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Game Summary */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Game Summary</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div>• Host: {formData.playerName || 'You'}</div>
                <div>• Total Players: {formData.maxPlayers}</div>
                <div>• Human Players: {formData.maxPlayers - formData.aiPlayers}</div>
                <div>• AI Players: {formData.aiPlayers}</div>
                <div>• Game Mode: Classic Ludo</div>
              </div>
            </div>

            {/* Create Button */}
            <motion.button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="btn btn-primary btn-lg w-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isCreating ? (
                <div className="flex items-center justify-center">
                  <div className="loading-spinner w-5 h-5 mr-2"></div>
                  Creating Room...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Play className="w-5 h-5 mr-2" />
                  Create Room
                </div>
              )}
            </motion.button>

            {/* Help Text */}
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>
                Once created, you'll get a shareable link to invite friends.
                The game starts when all players join!
              </p>
            </div>
          </motion.div>

          {/* Tips */}
          <motion.div
            className="mt-8 bg-white rounded-xl p-6 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-primary" />
              Pro Tips
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>• Mix AI and human players for balanced gameplay</div>
              <div>• 4-player games are the most fun and competitive</div>
              <div>• AI opponents have different difficulty levels</div>
              <div>• Share the room link via WhatsApp, Telegram, or copy-paste</div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CreateRoomPage;