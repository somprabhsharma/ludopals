/**
 * Player utility functions for LudoPals
 * Handles player identity, UUID generation, and player data management
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique player UUID
 * Uses a combination of timestamp and random values for uniqueness
 */
export function generatePlayerUUID() {
  return uuidv4();
}

/**
 * Generate a shorter player ID for display purposes
 */
export function generatePlayerId() {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Validate player name
 */
export function validatePlayerName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Name is required' };
  }

  const trimmedName = name.trim();
  
  if (trimmedName.length === 0) {
    return { isValid: false, error: 'Name cannot be empty' };
  }

  if (trimmedName.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long' };
  }

  if (trimmedName.length > 20) {
    return { isValid: false, error: 'Name must be less than 20 characters' };
  }

  // Check for invalid characters
  const validNameRegex = /^[a-zA-Z0-9\s\-_]+$/;
  if (!validNameRegex.test(trimmedName)) {
    return { isValid: false, error: 'Name can only contain letters, numbers, spaces, hyphens, and underscores' };
  }

  return { isValid: true, name: trimmedName };
}

/**
 * Generate a unique username within a room
 * Appends numbers if the name already exists
 */
export function generateUniqueUsername(desiredName, existingPlayers) {
  const validation = validatePlayerName(desiredName);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const baseName = validation.name;
  const existingNames = existingPlayers.map(player => player.name.toLowerCase());
  
  let uniqueName = baseName;
  let counter = 2;
  
  while (existingNames.includes(uniqueName.toLowerCase())) {
    uniqueName = `${baseName} (${counter})`;
    counter++;
  }
  
  return uniqueName;
}

/**
 * Get player color based on player order
 */
export function getPlayerColor(playerOrder) {
  const colors = ['red', 'blue', 'green', 'yellow'];
  return colors[playerOrder % colors.length];
}

/**
 * Get player avatar emoji based on color
 */
export function getPlayerAvatar(color) {
  const avatars = {
    red: '🔴',
    blue: '🔵',
    green: '🟢',
    yellow: '🟡'
  };
  return avatars[color] || '⚪';
}

/**
 * Format player display name with color indicator
 */
export function formatPlayerDisplayName(player) {
  const avatar = getPlayerAvatar(player.color);
  return `${avatar} ${player.name}`;
}

/**
 * Check if a player is the current user
 */
export function isCurrentPlayer(player, currentPlayerUUID) {
  return player.uuid === currentPlayerUUID || player.id === currentPlayerUUID;
}

/**
 * Get player statistics summary
 */
export function getPlayerStats(player, gameState) {
  if (!gameState || !gameState.pieces) {
    return {
      piecesHome: 4,
      piecesOnBoard: 0,
      piecesInFinish: 0,
      piecesFinished: 0
    };
  }

  const playerPieces = gameState.pieces.filter(piece => piece.playerId === player.id);
  
  return {
    piecesHome: playerPieces.filter(piece => piece.position === -1).length,
    piecesOnBoard: playerPieces.filter(piece => piece.position >= 0 && piece.position < 52).length,
    piecesInFinish: playerPieces.filter(piece => piece.position >= 52 && piece.position < 57).length,
    piecesFinished: playerPieces.filter(piece => piece.position === 57).length
  };
}

/**
 * Check if player has won
 */
export function hasPlayerWon(player, gameState) {
  const stats = getPlayerStats(player, gameState);
  return stats.piecesFinished === 4;
}

/**
 * Get player progress percentage
 */
export function getPlayerProgress(player, gameState) {
  const stats = getPlayerStats(player, gameState);
  const totalProgress = (stats.piecesOnBoard * 0.25) + (stats.piecesInFinish * 0.75) + (stats.piecesFinished * 1);
  return Math.round((totalProgress / 4) * 100);
}

/**
 * Create a player object
 */
export function createPlayer(uuid, name, color, isHost = false, isAI = false) {
  return {
    id: generatePlayerId(),
    uuid: uuid,
    name: name,
    color: color,
    isHost: isHost,
    isAI: isAI,
    connected: true,
    joinedAt: new Date().toISOString()
  };
}

/**
 * Save player data to localStorage
 */
export function savePlayerData(playerData) {
  try {
    localStorage.setItem('ludopals_player_data', JSON.stringify(playerData));
  } catch (error) {
    console.error('Failed to save player data:', error);
  }
}

/**
 * Load player data from localStorage
 */
export function loadPlayerData() {
  try {
    const data = localStorage.getItem('ludopals_player_data');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load player data:', error);
    return null;
  }
}

/**
 * Clear player data from localStorage
 */
export function clearPlayerData() {
  try {
    localStorage.removeItem('ludopals_player_data');
    localStorage.removeItem('ludopals_player_uuid');
    localStorage.removeItem('ludopals_player_name');
    localStorage.removeItem('ludopals_current_room');
    localStorage.removeItem('ludopals_player_id');
  } catch (error) {
    console.error('Failed to clear player data:', error);
  }
}

/**
 * Generate a random guest name
 */
export function generateGuestName() {
  const adjectives = [
    'Swift', 'Clever', 'Brave', 'Lucky', 'Smart', 'Quick', 'Bold', 'Wise',
    'Cool', 'Fast', 'Sharp', 'Bright', 'Strong', 'Calm', 'Wild', 'Free'
  ];
  
  const nouns = [
    'Player', 'Gamer', 'Champion', 'Winner', 'Master', 'Hero', 'Star', 'Ace',
    'Pro', 'Legend', 'Warrior', 'Knight', 'Ninja', 'Wizard', 'King', 'Queen'
  ];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 999) + 1;
  
  return `${adjective}${noun}${number}`;
}

export default {
  generatePlayerUUID,
  generatePlayerId,
  validatePlayerName,
  generateUniqueUsername,
  getPlayerColor,
  getPlayerAvatar,
  formatPlayerDisplayName,
  isCurrentPlayer,
  getPlayerStats,
  hasPlayerWon,
  getPlayerProgress,
  createPlayer,
  savePlayerData,
  loadPlayerData,
  clearPlayerData,
  generateGuestName
};