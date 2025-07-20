/**
 * GameContext - Manages game state and logic
 * Integrates with Socket.IO for real-time gameplay and shared game logic
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useSocket } from './SocketContext';
import { usePlayer } from './PlayerContext';

// Import shared game logic
import {
  GAME_CONSTANTS,
  getValidMoves,
  checkWinCondition,
  isPlayerTurn,
  getCurrentPlayer
} from '../utils/ludoRules';

import {
  validateGameState,
  handleDiceRoll,
  handlePieceMove,
  getGameStatistics
} from '../utils/gameStateManager';

const GameContext = createContext();

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

export function GameProvider({ children }) {
  const { socket, isConnected, on, off, emit } = useSocket();
  const { playerUUID, playerName, joinRoom, leaveRoom, updateGameStats } = usePlayer();
  
  // Game state
  const [gameState, setGameState] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Game UI state
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [lastDiceRoll, setLastDiceRoll] = useState(null);
  const [isRollingDice, setIsRollingDice] = useState(false);
  const [isMovingPiece, setIsMovingPiece] = useState(false);
  const [gameMessages, setGameMessages] = useState([]);
  
  // Refs for cleanup
  const socketListeners = useRef([]);

  // Add game message
  const addGameMessage = useCallback((message, type = 'info') => {
    const newMessage = {
      id: Date.now(),
      text: message,
      type: type,
      timestamp: new Date().toISOString()
    };
    
    setGameMessages(prev => [newMessage, ...prev.slice(0, 49)]); // Keep last 50 messages
    
    // Show toast for important messages
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else if (type === 'warning') {
      toast(message, { icon: '⚠️' });
    }
  }, []);

  // Clear game state
  const clearGameState = useCallback(() => {
    setGameState(null);
    setRoomData(null);
    setSelectedPiece(null);
    setValidMoves([]);
    setLastDiceRoll(null);
    setIsRollingDice(false);
    setIsMovingPiece(false);
    setError(null);
    setGameMessages([]);
  }, []);

  // Join a game room
  const joinGameRoom = useCallback(async (roomId) => {
    if (!isConnected || !playerUUID) {
      addGameMessage('Not connected to server', 'error');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Emit join room event
      emit('joinRoom', { roomId, playerId: playerUUID }, (response) => {
        setIsLoading(false);
        
        if (response?.error) {
          setError(response.error);
          addGameMessage(`Failed to join room: ${response.error}`, 'error');
          return false;
        }

        if (response?.roomData) {
          setRoomData(response.roomData);
          joinRoom(response.roomData);
          addGameMessage(`Joined room ${roomId}`, 'success');
          return true;
        }
      });
    } catch (error) {
      setIsLoading(false);
      setError(error.message);
      addGameMessage(`Error joining room: ${error.message}`, 'error');
      return false;
    }
  }, [isConnected, playerUUID, emit, joinRoom, addGameMessage]);

  // Leave current game room
  const leaveGameRoom = useCallback(() => {
    if (roomData && isConnected) {
      emit('leaveRoom', { roomId: roomData.id, playerId: playerUUID });
      leaveRoom();
      clearGameState();
      addGameMessage('Left the game room', 'info');
    }
  }, [roomData, isConnected, emit, playerUUID, leaveRoom, clearGameState, addGameMessage]);

  // Roll dice
  const rollDice = useCallback(() => {
    if (!gameState || !roomData || !isConnected) {
      addGameMessage('Cannot roll dice - game not ready', 'error');
      return;
    }

    const currentPlayer = getCurrentPlayer(gameState);
    if (!currentPlayer || currentPlayer.uuid !== playerUUID) {
      addGameMessage('Not your turn!', 'warning');
      return;
    }

    if (isRollingDice) {
      return; // Prevent double rolling
    }

    setIsRollingDice(true);
    setError(null);

    emit('rollDice', { roomId: roomData.id, playerId: playerUUID }, (response) => {
      setIsRollingDice(false);
      
      if (response?.error) {
        setError(response.error);
        addGameMessage(`Failed to roll dice: ${response.error}`, 'error');
        return;
      }

      if (response?.diceValue) {
        setLastDiceRoll({
          value: response.diceValue,
          playerId: playerUUID,
          timestamp: Date.now()
        });
        
        // Calculate valid moves
        const moves = getValidMoves(gameState, playerUUID, response.diceValue);
        setValidMoves(moves);
        
        addGameMessage(`You rolled a ${response.diceValue}!`, 'info');
        
        if (moves.length === 0) {
          addGameMessage('No valid moves available', 'warning');
        }
      }
    });
  }, [gameState, roomData, isConnected, playerUUID, isRollingDice, emit, addGameMessage]);

  // Move piece
  const movePiece = useCallback((pieceId) => {
    if (!gameState || !roomData || !lastDiceRoll || !isConnected) {
      addGameMessage('Cannot move piece - game not ready', 'error');
      return;
    }

    if (isMovingPiece) {
      return; // Prevent double moving
    }

    const currentPlayer = getCurrentPlayer(gameState);
    if (!currentPlayer || currentPlayer.uuid !== playerUUID) {
      addGameMessage('Not your turn!', 'warning');
      return;
    }

    // Check if this is a valid move
    const validMove = validMoves.find(move => move.pieceId === pieceId);
    if (!validMove) {
      addGameMessage('Invalid move!', 'error');
      return;
    }

    setIsMovingPiece(true);
    setError(null);

    emit('movePiece', {
      roomId: roomData.id,
      playerId: playerUUID,
      pieceId: pieceId,
      diceValue: lastDiceRoll.value
    }, (response) => {
      setIsMovingPiece(false);
      
      if (response?.error) {
        setError(response.error);
        addGameMessage(`Failed to move piece: ${response.error}`, 'error');
        return;
      }

      // Clear selection and valid moves
      setSelectedPiece(null);
      setValidMoves([]);
      setLastDiceRoll(null);
      
      addGameMessage('Piece moved successfully!', 'success');
    });
  }, [gameState, roomData, lastDiceRoll, isConnected, playerUUID, isMovingPiece, validMoves, emit, addGameMessage]);

  // Select piece
  const selectPiece = useCallback((pieceId) => {
    if (!lastDiceRoll || validMoves.length === 0) {
      addGameMessage('Roll the dice first!', 'warning');
      return;
    }

    const validMove = validMoves.find(move => move.pieceId === pieceId);
    if (!validMove) {
      addGameMessage('This piece cannot be moved', 'warning');
      return;
    }

    setSelectedPiece(pieceId);
  }, [lastDiceRoll, validMoves, addGameMessage]);

  // Start game
  const startGame = useCallback(() => {
    if (!roomData || !isConnected) {
      addGameMessage('Cannot start game - room not ready', 'error');
      return;
    }

    emit('startGame', { roomId: roomData.id }, (response) => {
      if (response?.error) {
        addGameMessage(`Failed to start game: ${response.error}`, 'error');
      } else {
        addGameMessage('Game started!', 'success');
      }
    });
  }, [roomData, isConnected, emit, addGameMessage]);

  // Get current player info
  const getCurrentPlayerInfo = useCallback(() => {
    if (!gameState) return null;
    
    const currentPlayer = getCurrentPlayer(gameState);
    return currentPlayer;
  }, [gameState]);

  // Check if it's current player's turn
  const isMyTurn = useCallback(() => {
    if (!gameState || !playerUUID) return false;
    
    return isPlayerTurn(gameState, playerUUID);
  }, [gameState, playerUUID]);

  // Get game statistics
  const getStats = useCallback(() => {
    if (!gameState) return null;
    
    return getGameStatistics(gameState);
  }, [gameState]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleRoomUpdate = (data) => {
      console.log('Room update received:', data);
      setRoomData(data);
    };

    const handleGameStateUpdate = (data) => {
      console.log('Game state update received:', data);
      setGameState(data);
      
      // Validate game state
      const errors = validateGameState(data);
      if (errors.length > 0) {
        console.error('Invalid game state:', errors);
        setError('Invalid game state received');
      }
    };

    const handlePlayerJoined = (data) => {
      addGameMessage(`${data.player.name} joined the game`, 'info');
    };

    const handlePlayerLeft = (data) => {
      addGameMessage(`${data.player.name} left the game`, 'info');
    };

    const handleGameStarted = (data) => {
      setGameState(data.gameState);
      addGameMessage('Game has started!', 'success');
    };

    const handleGameEnded = (data) => {
      setGameState(data.gameState);
      const winner = data.winner;
      const isWinner = winner.uuid === playerUUID;
      
      addGameMessage(
        isWinner ? 'Congratulations! You won!' : `${winner.name} won the game!`,
        isWinner ? 'success' : 'info'
      );
      
      // Update player stats
      updateGameStats({
        roomId: roomData?.id,
        players: data.gameState.players,
        winner: winner,
        playTime: data.playTime || 0,
        won: isWinner
      });
    };

    const handleDiceRolled = (data) => {
      if (data.playerId !== playerUUID) {
        const player = gameState?.players.find(p => p.uuid === data.playerId);
        addGameMessage(`${player?.name || 'Player'} rolled a ${data.diceValue}`, 'info');
      }
    };

    const handlePieceMoved = (data) => {
      if (data.playerId !== playerUUID) {
        const player = gameState?.players.find(p => p.uuid === data.playerId);
        addGameMessage(`${player?.name || 'Player'} moved a piece`, 'info');
        
        if (data.cutPieces && data.cutPieces.length > 0) {
          addGameMessage(`${player?.name || 'Player'} cut ${data.cutPieces.length} piece(s)!`, 'warning');
        }
      }
    };

    const handleError = (data) => {
      setError(data.message);
      addGameMessage(`Error: ${data.message}`, 'error');
    };

    // Register event listeners
    const listeners = [
      ['roomUpdate', handleRoomUpdate],
      ['gameStateUpdate', handleGameStateUpdate],
      ['playerJoined', handlePlayerJoined],
      ['playerLeft', handlePlayerLeft],
      ['gameStarted', handleGameStarted],
      ['gameEnded', handleGameEnded],
      ['diceRolled', handleDiceRolled],
      ['pieceMoved', handlePieceMoved],
      ['error', handleError]
    ];

    listeners.forEach(([event, handler]) => {
      const cleanup = on(event, handler);
      if (cleanup) {
        socketListeners.current.push(cleanup);
      }
    });

    return () => {
      // Cleanup all listeners
      socketListeners.current.forEach(cleanup => cleanup());
      socketListeners.current = [];
    };
  }, [socket, isConnected, on, playerUUID]); // Removed gameState, roomData, addGameMessage, updateGameStats to prevent repeated registrations

  const contextValue = {
    // Game state
    gameState,
    roomData,
    isLoading,
    error,
    
    // UI state
    selectedPiece,
    validMoves,
    lastDiceRoll,
    isRollingDice,
    isMovingPiece,
    gameMessages,
    
    // Game actions
    joinGameRoom,
    leaveGameRoom,
    rollDice,
    movePiece,
    selectPiece,
    startGame,
    
    // Utility functions
    getCurrentPlayerInfo,
    isMyTurn,
    getStats,
    addGameMessage,
    clearGameState,
    
    // Game constants
    GAME_CONSTANTS
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}

export default GameContext;