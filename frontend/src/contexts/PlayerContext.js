/**
 * PlayerContext - Manages player identity and state
 * Handles player UUID, name, and session management
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  validatePlayerName, 
  generateGuestName, 
  savePlayerData, 
  loadPlayerData 
} from '../utils/playerUtils';

const PlayerContext = createContext();

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}

export function PlayerProvider({ 
  children, 
  playerUUID, 
  playerName, 
  setPlayerName, 
  clearPlayerIdentity 
}) {
  const [isNameSet, setIsNameSet] = useState(false);
  const [playerData, setPlayerData] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);

  // Initialize player data
  useEffect(() => {
    const initializePlayer = () => {
      // Load existing player data
      const savedData = loadPlayerData();
      
      const data = {
        uuid: playerUUID,
        name: playerName || '',
        joinedAt: savedData?.joinedAt || new Date().toISOString(),
        gamesPlayed: savedData?.gamesPlayed || 0,
        gamesWon: savedData?.gamesWon || 0,
        totalPlayTime: savedData?.totalPlayTime || 0,
        preferences: savedData?.preferences || {
          soundEnabled: true,
          animationsEnabled: true,
          autoRoll: false,
          showMoveHints: true
        }
      };
      
      setPlayerData(data);
      setIsNameSet(!!playerName && playerName.trim().length > 0);
      
      // Save updated data
      savePlayerData(data);
    };

    if (playerUUID) {
      initializePlayer();
    }
  }, [playerUUID, playerName]);

  // Update player name
  const updatePlayerName = (newName) => {
    const validation = validatePlayerName(newName);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const validName = validation.name;
    setPlayerName(validName);
    setIsNameSet(true);

    // Update player data
    if (playerData) {
      const updatedData = {
        ...playerData,
        name: validName
      };
      setPlayerData(updatedData);
      savePlayerData(updatedData);
    }
  };

  // Generate and set a guest name
  const setGuestName = () => {
    const guestName = generateGuestName();
    updatePlayerName(guestName);
    return guestName;
  };

  // Update player preferences
  const updatePreferences = (newPreferences) => {
    if (!playerData) return;

    const updatedData = {
      ...playerData,
      preferences: {
        ...playerData.preferences,
        ...newPreferences
      }
    };
    
    setPlayerData(updatedData);
    savePlayerData(updatedData);
  };

  // Update game statistics
  const updateGameStats = (gameResult) => {
    if (!playerData) return;

    const updatedData = {
      ...playerData,
      gamesPlayed: playerData.gamesPlayed + 1,
      gamesWon: gameResult.won ? playerData.gamesWon + 1 : playerData.gamesWon,
      totalPlayTime: playerData.totalPlayTime + (gameResult.playTime || 0)
    };

    setPlayerData(updatedData);
    savePlayerData(updatedData);

    // Add to game history
    const historyEntry = {
      id: Date.now(),
      roomId: gameResult.roomId,
      players: gameResult.players,
      winner: gameResult.winner,
      playTime: gameResult.playTime,
      completedAt: new Date().toISOString(),
      playerWon: gameResult.won
    };

    setGameHistory(prev => [historyEntry, ...prev.slice(0, 49)]); // Keep last 50 games
  };

  // Join a room
  const joinRoom = (roomData) => {
    setCurrentRoom(roomData);
    localStorage.setItem('ludopals_current_room', roomData.id);
  };

  // Leave current room
  const leaveRoom = () => {
    setCurrentRoom(null);
    localStorage.removeItem('ludopals_current_room');
  };

  // Clear all player data
  const clearAllData = () => {
    clearPlayerIdentity();
    setPlayerData(null);
    setIsNameSet(false);
    setCurrentRoom(null);
    setGameHistory([]);
  };

  // Get player display info
  const getDisplayInfo = () => {
    if (!playerData) return null;

    return {
      name: playerData.name || 'Anonymous',
      uuid: playerData.uuid,
      gamesPlayed: playerData.gamesPlayed,
      gamesWon: playerData.gamesWon,
      winRate: playerData.gamesPlayed > 0 ? 
        Math.round((playerData.gamesWon / playerData.gamesPlayed) * 100) : 0,
      totalPlayTime: playerData.totalPlayTime,
      joinedAt: playerData.joinedAt
    };
  };

  // Check if player is ready to play
  const isReadyToPlay = () => {
    return !!(playerUUID && isNameSet && playerData);
  };

  // Get player preferences
  const getPreferences = () => {
    return playerData?.preferences || {
      soundEnabled: true,
      animationsEnabled: true,
      autoRoll: false,
      showMoveHints: true
    };
  };

  const contextValue = {
    // Player identity
    playerUUID,
    playerName: playerData?.name || '',
    isNameSet,
    playerData,
    
    // Player actions
    updatePlayerName,
    setGuestName,
    updatePreferences,
    updateGameStats,
    clearAllData,
    
    // Room management
    currentRoom,
    joinRoom,
    leaveRoom,
    
    // Game history
    gameHistory,
    
    // Utility functions
    getDisplayInfo,
    isReadyToPlay,
    getPreferences,
    
    // Validation
    validateName: validatePlayerName
  };

  return (
    <PlayerContext.Provider value={contextValue}>
      {children}
    </PlayerContext.Provider>
  );
}

export default PlayerContext;