/**
 * JoinRoomPage Component
 * Allows users to join existing game rooms using room codes or links
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Users, 
  LogIn, 
  Search,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePlayer } from '../contexts/PlayerContext';

const JoinRoomPage = () => {
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams();
  const { playerName, updatePlayerName } = usePlayer();
  
  const [formData, setFormData] = useState({
    playerName: playerName || '',
    roomId: urlRoomId || ''
  });
  
  const [isJoining, setIsJoining] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);
  const [errors, setErrors] = useState({});

  // Auto-validate room when roomId changes
  useEffect(() => {
    if (formData.roomId && formData.roomId.length >= 4) {
      validateRoom(formData.roomId);
    } else {
      setRoomInfo(null);
    }
  }, [formData.roomId]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value.toUpperCase() // Room IDs are uppercase
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateRoom = async (roomId) => {
    if (!roomId || roomId.length < 4) {
      setRoomInfo(null);
      return;
    }

    setIsValidating(true);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3060'}/api/rooms/${roomId}`);
      const data = await response.json();
      
      if (response.ok) {
        setRoomInfo(data.roomData);
        setErrors(prev => ({ ...prev, roomId: null }));
      } else {
        setRoomInfo(null);
        setErrors(prev => ({ ...prev, roomId: data.error || 'Room not found' }));
      }
    } catch (error) {
      console.error('Error validating room:', error);
      setRoomInfo(null);
      setErrors(prev => ({ ...prev, roomId: 'Failed to validate room' }));
    } finally {
      setIsValidating(false);
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
    
    if (!formData.roomId.trim()) {
      newErrors.roomId = 'Room code is required';
    } else if (formData.roomId.trim().length < 4) {
      newErrors.roomId = 'Room code must be at least 4 characters';
    }
    
    if (!roomInfo) {
      newErrors.roomId = 'Please enter a valid room code';
    } else if (roomInfo.gameState !== 'waiting') {
      newErrors.roomId = 'This game has already started';
    } else if (roomInfo.players.length >= roomInfo.maxPlayers) {
      newErrors.roomId = 'This room is full';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleJoinRoom = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsJoining(true);
    
    try {
      // Update player name if changed
      if (formData.playerName !== playerName) {
        updatePlayerName(formData.playerName);
      }
      
      // Join room via API
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3060'}/api/rooms/${formData.roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: formData.playerName
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join room');
      }
      
      toast.success('Successfully joined the room!');
      
      // Navigate to the game room
      navigate(`/room/${formData.roomId}`);
      
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error(error.message || 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  const getRoomStatusColor = () => {
    if (!roomInfo) return 'text-gray-500';
    
    switch (roomInfo.gameState) {
      case 'waiting':
        return 'text-green-600';
      case 'playing':
        return 'text-yellow-600';
      case 'finished':
        return 'text-gray-600';
      default:
        return 'text-gray-500';
    }
  };

  const getRoomStatusText = () => {
    if (!roomInfo) return 'Enter room code to check status';
    
    switch (roomInfo.gameState) {
      case 'waiting':
        return 'Waiting for players';
      case 'playing':
        return 'Game in progress';
      case 'finished':
        return 'Game finished';
      default:
        return 'Unknown status';
    }
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
            <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg">
              🚪
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Join Game Room
            </h1>
            <p className="text-gray-600">
              Enter the room code to join your friends' game
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

            {/* Room Code */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.roomId}
                  onChange={(e) => handleInputChange('roomId', e.target.value)}
                  className={`input pr-10 ${errors.roomId ? 'input-error' : ''}`}
                  placeholder="Enter room code (e.g., ABC123)"
                  maxLength={10}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {isValidating ? (
                    <div className="loading-spinner w-5 h-5"></div>
                  ) : roomInfo ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : formData.roomId && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
              {errors.roomId && (
                <p className="text-error text-sm mt-1">{errors.roomId}</p>
              )}
            </div>

            {/* Room Info */}
            {formData.roomId && (
              <motion.div
                className="mb-6 p-4 rounded-xl border-2 border-gray-200"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <Search className="w-4 h-4 mr-2" />
                  Room Status
                </h3>
                
                {isValidating ? (
                  <div className="flex items-center text-gray-500">
                    <div className="loading-spinner w-4 h-4 mr-2"></div>
                    Checking room...
                  </div>
                ) : roomInfo ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${getRoomStatusColor()}`}>
                        {getRoomStatusText()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Players:</span>
                      <span className="font-medium">
                        {roomInfo.players.length}/{roomInfo.maxPlayers}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">AI Players:</span>
                      <span className="font-medium">{roomInfo.aiPlayers}</span>
                    </div>
                    {roomInfo.players.length > 0 && (
                      <div className="mt-3">
                        <span className="text-gray-600 text-xs">Current Players:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {roomInfo.players.map((player, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                            >
                              {player.isHost && '👑'} {player.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : formData.roomId ? (
                  <div className="text-red-600 text-sm">
                    Room not found or invalid code
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">
                    Enter a room code to see details
                  </div>
                )}
              </motion.div>
            )}

            {/* Join Button */}
            <motion.button
              onClick={handleJoinRoom}
              disabled={isJoining || !roomInfo || roomInfo.gameState !== 'waiting'}
              className="btn btn-success btn-lg w-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isJoining ? (
                <div className="flex items-center justify-center">
                  <div className="loading-spinner w-5 h-5 mr-2"></div>
                  Joining Room...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <LogIn className="w-5 h-5 mr-2" />
                  Join Room
                </div>
              )}
            </motion.button>

            {/* Help Text */}
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>
                Don't have a room code? Ask your friend to share the room link,
                or <Link to="/create" className="text-primary hover:underline">create your own room</Link>.
              </p>
            </div>
          </motion.div>

          {/* Instructions */}
          <motion.div
            className="mt-8 bg-white rounded-xl p-6 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Users className="w-5 h-5 mr-2 text-primary" />
              How to Join
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>1. Get the room code from your friend (e.g., "ABC123")</div>
              <div>2. Enter your name and the room code above</div>
              <div>3. Click "Join Room" to enter the game</div>
              <div>4. Wait for the host to start the game</div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> Room codes are usually 4-6 characters long and 
                contain letters and numbers (e.g., ABC123, XYZ789).
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default JoinRoomPage;