/**
 * GameRoomPage Component
 * Main game interface where players play Ludo
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Users, 
  Share2, 
  Copy,
  Play,
  Pause,
  RotateCcw,
  Crown,
  Bot,
  Wifi,
  WifiOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useGame } from '../contexts/GameContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useSocket } from '../contexts/SocketContext';
import LudoBoard from '../components/LudoBoard';

const GameRoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { playerUUID, playerName } = usePlayer();
  const { isConnected } = useSocket();
  const {
    gameState,
    roomData,
    isLoading,
    error,
    joinGameRoom,
    leaveGameRoom,
    rollDice,
    movePiece,
    selectPiece,
    startGame,
    selectedPiece,
    validMoves,
    lastDiceRoll,
    isRollingDice,
    isMovingPiece,
    gameMessages,
    isMyTurn,
    getCurrentPlayerInfo
  } = useGame();

  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Join room on component mount
  useEffect(() => {
    if (roomId && playerUUID && !roomData) {
      joinGameRoom(roomId);
    }
  }, [roomId, playerUUID, roomData]); // Removed joinGameRoom from dependencies to prevent multiple calls

  // Handle leaving room on unmount
  useEffect(() => {
    return () => {
      if (roomData) {
        leaveGameRoom();
      }
    };
  }, [roomData, leaveGameRoom]);

  const handleCopyRoomLink = async () => {
    const roomLink = `${window.location.origin}/join/${roomId}`;
    try {
      await navigator.clipboard.writeText(roomLink);
      setCopied(true);
      toast.success('Room link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleShareRoom = () => {
    const roomLink = `${window.location.origin}/join/${roomId}`;
    const shareText = `Join my Ludo game! Room code: ${roomId}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Join my Ludo game!',
        text: shareText,
        url: roomLink
      });
    } else {
      setShowShareModal(true);
    }
  };

  const handleLeaveRoom = () => {
    leaveGameRoom();
    navigate('/');
  };

  const handleDiceRoll = () => {
    if (isMyTurn() && !lastDiceRoll) {
      rollDice();
    }
  };

  const handlePieceClick = (pieceId) => {
    if (isMyTurn() && lastDiceRoll) {
      const validMove = validMoves.find(move => move.pieceId === pieceId);
      if (validMove) {
        movePiece(pieceId);
      } else {
        selectPiece(pieceId);
      }
    }
  };

  const getPlayerColor = (color) => {
    const colors = {
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500'
    };
    return colors[color] || 'bg-gray-500';
  };

  const getCurrentPlayer = () => {
    return getCurrentPlayerInfo();
  };

  const isHost = () => {
    return roomData?.players?.find(p => p.id === playerUUID)?.isHost || false;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-12 h-12 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Room Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/" className="btn btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-12 h-12 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-4 safe-area-top">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center">
            <button
              onClick={handleLeaveRoom}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mr-4"
            >
              <ArrowLeft className="w-6 h-6 mr-2" />
              <span>Leave</span>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Room {roomId}</h1>
              <div className="flex items-center text-sm text-gray-600">
                {isConnected ? (
                  <><Wifi className="w-4 h-4 mr-1" /> Connected</>
                ) : (
                  <><WifiOff className="w-4 h-4 mr-1" /> Disconnected</>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleShareRoom}
              className="btn btn-secondary btn-sm"
            >
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </button>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Game Board */}
          <div className="lg:col-span-3">
            <motion.div
              className="bg-white rounded-2xl shadow-lg p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              {/* Game Status */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  {gameState?.gamePhase === 'waiting' ? (
                    <div className="flex items-center text-yellow-600">
                      <Pause className="w-5 h-5 mr-2" />
                      Waiting to start
                    </div>
                  ) : gameState?.gamePhase === 'playing' ? (
                    <div className="flex items-center text-green-600">
                      <Play className="w-5 h-5 mr-2" />
                      Game in progress
                    </div>
                  ) : gameState?.gamePhase === 'finished' ? (
                    <div className="flex items-center text-blue-600">
                      <Crown className="w-5 h-5 mr-2" />
                      Game finished
                    </div>
                  ) : (
                    <div className="flex items-center text-gray-600">
                      <RotateCcw className="w-5 h-5 mr-2" />
                      Loading...
                    </div>
                  )}
                </div>
                
                {isHost() && gameState?.gamePhase === 'waiting' && (
                  <button
                    onClick={startGame}
                    className="btn btn-primary btn-sm"
                    disabled={roomData.players.length < 2}
                  >
                    Start Game
                  </button>
                )}
              </div>

              {/* Current Turn */}
              {gameState?.gamePhase === 'playing' && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      {isMyTurn() ? (
                        <div className="text-primary font-semibold">Your turn!</div>
                      ) : (
                        <div className="text-gray-600">
                          {getCurrentPlayer()?.name || 'Unknown'}'s turn
                        </div>
                      )}
                    </div>
                    
                    {isMyTurn() && (
                      <div className="flex items-center space-x-4">
                        {!lastDiceRoll ? (
                          <button
                            onClick={handleDiceRoll}
                            disabled={isRollingDice}
                            className="dice"
                          >
                            {isRollingDice ? '🎲' : '🎲'}
                          </button>
                        ) : (
                          <div className="dice">
                            {lastDiceRoll.value}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ludo Game Board */}
              {gameState?.gamePhase === 'playing' ? (
                <LudoBoard
                  gameState={gameState}
                  playerUUID={playerUUID}
                  onPieceClick={handlePieceClick}
                  validMoves={validMoves}
                  selectedPiece={selectedPiece}
                />
              ) : (
                <div className="aspect-square bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎲</div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Ludo Board</h3>
                    <p className="text-gray-600">
                      {gameState?.gamePhase === 'waiting' 
                        ? 'Waiting for game to start...'
                        : 'Game board will appear here'
                      }
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Players */}
            <motion.div
              className="bg-white rounded-2xl shadow-lg p-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Players ({roomData.players.length}/{roomData.maxPlayers})
              </h3>
              
              <div className="space-y-3">
                {roomData.players.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center p-3 rounded-lg ${
                      getCurrentPlayer()?.id === player.id
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full ${getPlayerColor(player.color)} flex items-center justify-center text-white text-sm font-bold mr-3`}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900">
                          {player.name}
                        </span>
                        {player.isHost && (
                          <Crown className="w-4 h-4 ml-1 text-yellow-500" />
                        )}
                        {player.isAI && (
                          <Bot className="w-4 h-4 ml-1 text-blue-500" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {player.connected ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Empty slots */}
                {Array.from({ length: roomData.maxPlayers - roomData.players.length }).map((_, index) => (
                  <div key={`empty-${index}`} className="flex items-center p-3 rounded-lg bg-gray-50 border-2 border-dashed border-gray-300">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                      <span className="text-gray-500 text-xs">?</span>
                    </div>
                    <span className="text-gray-500">Waiting for player...</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Game Messages */}
            <motion.div
              className="bg-white rounded-2xl shadow-lg p-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <h3 className="font-semibold text-gray-900 mb-4">Game Log</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {gameMessages.length > 0 ? (
                  gameMessages.slice(0, 10).map((message) => (
                    <div
                      key={message.id}
                      className={`text-sm p-2 rounded ${
                        message.type === 'success' ? 'bg-green-50 text-green-800' :
                        message.type === 'error' ? 'bg-red-50 text-red-800' :
                        message.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                        'bg-gray-50 text-gray-800'
                      }`}
                    >
                      {message.text}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No messages yet
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Share Room</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Code
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={roomId}
                      readOnly
                      className="input flex-1"
                    />
                    <button
                      onClick={handleCopyRoomLink}
                      className="btn btn-secondary"
                    >
                      {copied ? <span>✓</span> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Link
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={`${window.location.origin}/join/${roomId}`}
                      readOnly
                      className="input flex-1 text-xs"
                    />
                    <button
                      onClick={handleCopyRoomLink}
                      className="btn btn-secondary"
                    >
                      {copied ? <span>✓</span> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="btn btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameRoomPage;