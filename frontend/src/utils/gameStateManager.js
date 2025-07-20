/**
 * LudoPals - Game State Management
 * This file handles game state updates, validation, and flow control
 * Integrates with both human and AI players
 */

import {
  GAME_CONSTANTS,
  executeMove,
  checkWinCondition,
  getValidMoves,
  getAnotherTurn,
  getNextPlayerTurn,
  rollDice,
  createInitialGameState
} from './ludoRules.js';

import {
  selectAIMove,
  handleAITurn,
  AI_DIFFICULTY
} from './aiPlayer.js';

// Game state validation
export function validateGameState(gameState) {
  const errors = [];

  if (!gameState) {
    errors.push('Game state is null or undefined');
    return errors;
  }

  // Validate players
  if (!gameState.players || !Array.isArray(gameState.players)) {
    errors.push('Players array is missing or invalid');
  } else {
    if (gameState.players.length < GAME_CONSTANTS.MIN_PLAYERS) {
      errors.push(`Not enough players (minimum ${GAME_CONSTANTS.MIN_PLAYERS})`);
    }
    if (gameState.players.length > GAME_CONSTANTS.MAX_PLAYERS) {
      errors.push(`Too many players (maximum ${GAME_CONSTANTS.MAX_PLAYERS})`);
    }

    // Check for duplicate colors
    const colors = gameState.players.map(p => p.color);
    const uniqueColors = [...new Set(colors)];
    if (colors.length !== uniqueColors.length) {
      errors.push('Duplicate player colors detected');
    }
  }

  // Validate pieces
  if (!gameState.pieces || !Array.isArray(gameState.pieces)) {
    errors.push('Pieces array is missing or invalid');
  } else {
    const expectedPieces = gameState.players.length * GAME_CONSTANTS.PIECES_PER_PLAYER;
    if (gameState.pieces.length !== expectedPieces) {
      errors.push(`Invalid number of pieces (expected ${expectedPieces}, got ${gameState.pieces.length})`);
    }
  }

  // Validate current turn
  if (typeof gameState.currentTurn !== 'number' || 
      gameState.currentTurn < 0 || 
      gameState.currentTurn >= gameState.players.length) {
    errors.push('Invalid current turn index');
  }

  // Validate game phase
  const validPhases = ['waiting', 'playing', 'finished'];
  if (!validPhases.includes(gameState.gamePhase)) {
    errors.push('Invalid game phase');
  }

  return errors;
}

// Create a new game with players
export function createNewGame(players, roomId) {
  if (!players || players.length < GAME_CONSTANTS.MIN_PLAYERS) {
    throw new Error(`At least ${GAME_CONSTANTS.MIN_PLAYERS} players required`);
  }

  if (players.length > GAME_CONSTANTS.MAX_PLAYERS) {
    throw new Error(`Maximum ${GAME_CONSTANTS.MAX_PLAYERS} players allowed`);
  }

  const gameState = createInitialGameState(players);
  gameState.roomId = roomId;
  gameState.createdAt = new Date().toISOString();
  gameState.lastActivity = new Date().toISOString();

  return gameState;
}

// Handle dice roll
export function handleDiceRoll(gameState, playerId) {
  const errors = validateGameState(gameState);
  if (errors.length > 0) {
    throw new Error(`Invalid game state: ${errors.join(', ')}`);
  }

  const currentPlayer = gameState.players[gameState.currentTurn];
  if (currentPlayer.id !== playerId) {
    throw new Error('Not your turn');
  }

  if (gameState.gamePhase !== 'playing') {
    throw new Error('Game is not in playing state');
  }

  const diceValue = rollDice();
  const newGameState = { ...gameState };
  
  newGameState.lastDiceRoll = {
    playerId,
    value: diceValue,
    timestamp: new Date().toISOString()
  };

  newGameState.lastActivity = new Date().toISOString();

  // Add to move history
  newGameState.moveHistory = newGameState.moveHistory || [];
  newGameState.moveHistory.push({
    type: 'dice_roll',
    playerId,
    diceValue,
    timestamp: new Date().toISOString()
  });

  return {
    gameState: newGameState,
    diceValue,
    validMoves: getValidMoves(newGameState, playerId, diceValue)
  };
}

// Handle piece move
export function handlePieceMove(gameState, playerId, pieceId, diceValue) {
  const errors = validateGameState(gameState);
  if (errors.length > 0) {
    throw new Error(`Invalid game state: ${errors.join(', ')}`);
  }

  const currentPlayer = gameState.players[gameState.currentTurn];
  if (currentPlayer.id !== playerId) {
    throw new Error('Not your turn');
  }

  if (gameState.gamePhase !== 'playing') {
    throw new Error('Game is not in playing state');
  }

  // Validate that the dice was rolled by this player
  if (!gameState.lastDiceRoll || 
      gameState.lastDiceRoll.playerId !== playerId || 
      gameState.lastDiceRoll.value !== diceValue) {
    throw new Error('Invalid dice value or dice not rolled');
  }

  // Execute the move
  const moveResult = executeMove(gameState, playerId, pieceId, diceValue);
  const newGameState = moveResult.gameState;

  // Update last activity
  newGameState.lastActivity = new Date().toISOString();

  // Add to move history
  newGameState.moveHistory = newGameState.moveHistory || [];
  newGameState.moveHistory.push({
    type: 'piece_move',
    playerId,
    pieceId,
    fromPosition: moveResult.movedPiece.position,
    toPosition: moveResult.gameState.pieces.find(p => p.id === pieceId).position,
    diceValue,
    cutPieces: moveResult.cutPieces.map(p => p.id),
    timestamp: new Date().toISOString()
  });

  // Check for win condition
  if (checkWinCondition(newGameState, playerId)) {
    newGameState.gamePhase = 'finished';
    newGameState.winner = playerId;
    newGameState.finishedAt = new Date().toISOString();
    
    newGameState.moveHistory.push({
      type: 'game_end',
      winnerId: playerId,
      timestamp: new Date().toISOString()
    });
  }

  // Determine next turn
  const getsAnotherTurn = getAnotherTurn(diceValue, moveResult.cutPieces);
  if (!getsAnotherTurn && newGameState.gamePhase === 'playing') {
    newGameState.currentTurn = getNextPlayerTurn(
      newGameState.currentTurn, 
      newGameState.players, 
      true // Skip disconnected players
    );
  }

  // Clear the dice roll
  newGameState.lastDiceRoll = null;

  return {
    gameState: newGameState,
    moveResult,
    getsAnotherTurn,
    gameFinished: newGameState.gamePhase === 'finished'
  };
}

// Handle AI player turn
export async function handleAIPlayerTurn(gameState) {
  const currentPlayer = gameState.players[gameState.currentTurn];
  
  if (!currentPlayer.isAI) {
    throw new Error('Current player is not an AI');
  }

  if (gameState.gamePhase !== 'playing') {
    throw new Error('Game is not in playing state');
  }

  // Roll dice for AI
  const diceResult = handleDiceRoll(gameState, currentPlayer.id);
  let newGameState = diceResult.gameState;
  const diceValue = diceResult.diceValue;
  const validMoves = diceResult.validMoves;

  // If no valid moves, skip turn
  if (validMoves.length === 0) {
    newGameState.currentTurn = getNextPlayerTurn(
      newGameState.currentTurn,
      newGameState.players,
      true
    );
    newGameState.lastDiceRoll = null;
    
    return {
      gameState: newGameState,
      aiAction: {
        type: 'no_moves',
        diceValue,
        playerId: currentPlayer.id
      }
    };
  }

  // Let AI select a move
  const difficulty = currentPlayer.difficulty || AI_DIFFICULTY.MEDIUM;
  const selectedMove = await handleAITurn(newGameState, currentPlayer.id, diceValue, difficulty);

  if (!selectedMove) {
    // This shouldn't happen if validMoves.length > 0, but handle it
    newGameState.currentTurn = getNextPlayerTurn(
      newGameState.currentTurn,
      newGameState.players,
      true
    );
    newGameState.lastDiceRoll = null;
    
    return {
      gameState: newGameState,
      aiAction: {
        type: 'no_move_selected',
        diceValue,
        playerId: currentPlayer.id
      }
    };
  }

  // Execute AI move
  const moveResult = handlePieceMove(
    newGameState,
    currentPlayer.id,
    selectedMove.pieceId,
    diceValue
  );

  return {
    gameState: moveResult.gameState,
    aiAction: {
      type: 'move',
      diceValue,
      playerId: currentPlayer.id,
      selectedMove,
      moveResult: moveResult.moveResult,
      getsAnotherTurn: moveResult.getsAnotherTurn,
      gameFinished: moveResult.gameFinished
    }
  };
}

// Get current player
export function getCurrentPlayer(gameState) {
  if (!gameState || !gameState.players || gameState.currentTurn < 0) {
    return null;
  }
  return gameState.players[gameState.currentTurn];
}

// Check if it's a player's turn
export function isPlayerTurn(gameState, playerId) {
  const currentPlayer = getCurrentPlayer(gameState);
  return currentPlayer && currentPlayer.id === playerId;
}

// Get game statistics
export function getGameStatistics(gameState) {
  if (!gameState) return null;

  const stats = {
    totalMoves: 0,
    piecesCut: 0,
    diceRolls: 0,
    gameStarted: gameState.createdAt,
    gameDuration: null,
    playerStats: {}
  };

  // Calculate from move history
  if (gameState.moveHistory) {
    gameState.moveHistory.forEach(move => {
      switch (move.type) {
        case 'dice_roll':
          stats.diceRolls++;
          break;
        case 'piece_move':
          stats.totalMoves++;
          if (move.cutPieces && move.cutPieces.length > 0) {
            stats.piecesCut += move.cutPieces.length;
          }
          break;
      }
    });
  }

  // Calculate game duration
  if (gameState.finishedAt) {
    const start = new Date(gameState.createdAt);
    const end = new Date(gameState.finishedAt);
    stats.gameDuration = end - start;
  }

  // Player-specific stats
  gameState.players.forEach(player => {
    const playerPieces = gameState.pieces.filter(p => p.playerId === player.id);
    stats.playerStats[player.id] = {
      name: player.name,
      color: player.color,
      isAI: player.isAI,
      piecesHome: playerPieces.filter(p => p.position === GAME_CONSTANTS.HOME_POSITION).length,
      piecesFinished: playerPieces.filter(p => p.position === GAME_CONSTANTS.FINISH_END).length,
      piecesOnBoard: playerPieces.filter(p => 
        p.position !== GAME_CONSTANTS.HOME_POSITION && 
        p.position < GAME_CONSTANTS.FINISH_START
      ).length,
      piecesInFinishArea: playerPieces.filter(p => 
        p.position >= GAME_CONSTANTS.FINISH_START && 
        p.position < GAME_CONSTANTS.FINISH_END
      ).length
    };
  });

  return stats;
}

// Update player connection status
export function updatePlayerConnection(gameState, playerId, connected) {
  const newGameState = { ...gameState };
  const playerIndex = newGameState.players.findIndex(p => p.id === playerId);
  
  if (playerIndex !== -1) {
    newGameState.players[playerIndex].connected = connected;
    newGameState.lastActivity = new Date().toISOString();
    
    // Add to move history
    newGameState.moveHistory = newGameState.moveHistory || [];
    newGameState.moveHistory.push({
      type: connected ? 'player_reconnect' : 'player_disconnect',
      playerId,
      timestamp: new Date().toISOString()
    });
  }
  
  return newGameState;
}

// Check if game should be abandoned due to disconnections
export function shouldAbandonGame(gameState) {
  if (!gameState || gameState.gamePhase !== 'playing') {
    return false;
  }

  const connectedHumanPlayers = gameState.players.filter(p => !p.isAI && p.connected);
  
  // Abandon if no human players are connected
  if (connectedHumanPlayers.length === 0) {
    return true;
  }

  // Abandon if only one human player is connected and there are no AI players
  const aiPlayers = gameState.players.filter(p => p.isAI);
  if (connectedHumanPlayers.length === 1 && aiPlayers.length === 0) {
    return true;
  }

  return false;
}

// Abandon game
export function abandonGame(gameState, reason = 'Game abandoned') {
  const newGameState = { ...gameState };
  newGameState.gamePhase = 'abandoned';
  newGameState.abandonedAt = new Date().toISOString();
  newGameState.abandonReason = reason;
  
  newGameState.moveHistory = newGameState.moveHistory || [];
  newGameState.moveHistory.push({
    type: 'game_abandoned',
    reason,
    timestamp: new Date().toISOString()
  });
  
  return newGameState;
}

export default {
  validateGameState,
  createNewGame,
  handleDiceRoll,
  handlePieceMove,
  handleAIPlayerTurn,
  getCurrentPlayer,
  isPlayerTurn,
  getGameStatistics,
  updatePlayerConnection,
  shouldAbandonGame,
  abandonGame
};