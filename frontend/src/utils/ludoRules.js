/**
 * LudoPals - Core Ludo Game Logic
 * This file contains all the game rules, board layout, and mechanics
 * Shared between frontend and backend for consistency
 */

// Game constants
export const GAME_CONSTANTS = {
  BOARD_SIZE: 52, // Main board positions (0-51)
  HOME_POSITION: -1, // Pieces start at home
  FINISH_START: 52, // First position in finish area
  FINISH_END: 57, // Last position in finish area (52-57 = 6 positions)
  PIECES_PER_PLAYER: 4,
  MAX_PLAYERS: 4,
  MIN_PLAYERS: 2,
  DICE_MIN: 1,
  DICE_MAX: 6,
  MOVES_TO_WIN: 6, // Number of moves needed to get from finish start to end
};

// Player colors and their starting positions on the board
export const PLAYER_COLORS = ['red', 'blue', 'green', 'yellow'];

export const PLAYER_START_POSITIONS = {
  red: 0,    // Red starts at position 0
  blue: 13,  // Blue starts at position 13
  green: 26, // Green starts at position 26
  yellow: 39 // Yellow starts at position 39
};

// Safe positions on the board where pieces cannot be cut
export const SAFE_POSITIONS = [0, 8, 13, 21, 26, 34, 39, 47];

// Special positions
export const STAR_POSITIONS = [8, 21, 34, 47]; // Star positions (safe + special)

// Home entry positions for each color (where pieces enter finish area)
export const HOME_ENTRY_POSITIONS = {
  red: 51,    // Red enters finish area from position 51
  blue: 12,   // Blue enters finish area from position 12
  green: 25,  // Green enters finish area from position 25
  yellow: 38  // Yellow enters finish area from position 38
};

/**
 * Get the starting position for a player color
 */
export function getStartPosition(color) {
  return PLAYER_START_POSITIONS[color];
}

/**
 * Check if a position is safe (pieces cannot be cut here)
 */
export function isSafePosition(position) {
  return SAFE_POSITIONS.includes(position);
}

/**
 * Check if a position is a star position
 */
export function isStarPosition(position) {
  return STAR_POSITIONS.includes(position);
}

/**
 * Get the next position on the board (with wrapping)
 */
export function getNextPosition(currentPosition, steps, playerColor) {
  // If piece is at home, can only move out with a 6
  if (currentPosition === GAME_CONSTANTS.HOME_POSITION) {
    return steps === 6 ? getStartPosition(playerColor) : GAME_CONSTANTS.HOME_POSITION;
  }

  // If piece is in finish area
  if (currentPosition >= GAME_CONSTANTS.FINISH_START) {
    const newPosition = currentPosition + steps;
    // Can't move beyond the end of finish area
    return newPosition <= GAME_CONSTANTS.FINISH_END ? newPosition : currentPosition;
  }

  // Check if piece should enter finish area
  const homeEntry = HOME_ENTRY_POSITIONS[playerColor];
  const startPos = getStartPosition(playerColor);
  
  // Calculate how many steps the piece has taken from its start
  let totalSteps;
  if (currentPosition >= startPos) {
    totalSteps = currentPosition - startPos;
  } else {
    totalSteps = (GAME_CONSTANTS.BOARD_SIZE - startPos) + currentPosition;
  }

  // If the piece would pass or land on its home entry position
  const newTotalSteps = totalSteps + steps;
  
  if (newTotalSteps >= (GAME_CONSTANTS.BOARD_SIZE - 1)) {
    // Piece should enter finish area
    const stepsIntoFinish = newTotalSteps - (GAME_CONSTANTS.BOARD_SIZE - 1);
    return GAME_CONSTANTS.FINISH_START + stepsIntoFinish;
  }

  // Normal board movement with wrapping
  let newPosition = currentPosition + steps;
  if (newPosition >= GAME_CONSTANTS.BOARD_SIZE) {
    newPosition = newPosition - GAME_CONSTANTS.BOARD_SIZE;
  }

  return newPosition;
}

/**
 * Check if a move is valid
 */
export function isValidMove(piece, steps, gameState, playerColor) {
  const { position } = piece;

  // Can only move out of home with a 6
  if (position === GAME_CONSTANTS.HOME_POSITION && steps !== 6) {
    return false;
  }

  // Calculate new position
  const newPosition = getNextPosition(position, steps, playerColor);

  // If position doesn't change, move is invalid
  if (newPosition === position) {
    return false;
  }

  // Check if there's already a piece of the same color at the destination
  const sameColorPieceAtDestination = gameState.pieces.some(p => 
    p.position === newPosition && 
    p.playerColor === playerColor && 
    p.id !== piece.id
  );

  if (sameColorPieceAtDestination) {
    return false;
  }

  return true;
}

/**
 * Get all pieces that would be cut by moving to a position
 */
export function getPiecesCutByMove(newPosition, movingPlayerColor, gameState) {
  // Can't cut pieces on safe positions
  if (isSafePosition(newPosition)) {
    return [];
  }

  // Can't cut pieces in finish area
  if (newPosition >= GAME_CONSTANTS.FINISH_START) {
    return [];
  }

  // Find all opponent pieces at the destination position
  return gameState.pieces.filter(piece => 
    piece.position === newPosition && 
    piece.playerColor !== movingPlayerColor
  );
}

/**
 * Execute a move and return the new game state
 */
export function executeMove(gameState, playerId, pieceId, steps) {
  const newGameState = JSON.parse(JSON.stringify(gameState)); // Deep copy
  
  // Find the piece to move
  const pieceIndex = newGameState.pieces.findIndex(p => p.id === pieceId);
  if (pieceIndex === -1) {
    throw new Error('Piece not found');
  }

  const piece = newGameState.pieces[pieceIndex];
  const player = newGameState.players.find(p => p.id === playerId);
  
  if (!player) {
    throw new Error('Player not found');
  }

  // Validate the move
  if (!isValidMove(piece, steps, gameState, player.color)) {
    throw new Error('Invalid move');
  }

  // Calculate new position
  const newPosition = getNextPosition(piece.position, steps, player.color);
  
  // Check for pieces to cut
  const cutPieces = getPiecesCutByMove(newPosition, player.color, gameState);
  
  // Cut opponent pieces (send them home)
  cutPieces.forEach(cutPiece => {
    const cutPieceIndex = newGameState.pieces.findIndex(p => p.id === cutPiece.id);
    if (cutPieceIndex !== -1) {
      newGameState.pieces[cutPieceIndex].position = GAME_CONSTANTS.HOME_POSITION;
      newGameState.pieces[cutPieceIndex].isSafe = false;
    }
  });

  // Move the piece
  newGameState.pieces[pieceIndex].position = newPosition;
  newGameState.pieces[pieceIndex].isSafe = isSafePosition(newPosition);

  // Update player statistics
  const playerIndex = newGameState.players.findIndex(p => p.id === playerId);
  if (playerIndex !== -1) {
    // Count pieces at home and finished
    const playerPieces = newGameState.pieces.filter(p => p.playerId === playerId);
    newGameState.players[playerIndex].piecesHome = playerPieces.filter(p => p.position === GAME_CONSTANTS.HOME_POSITION).length;
    newGameState.players[playerIndex].piecesFinished = playerPieces.filter(p => p.position === GAME_CONSTANTS.FINISH_END).length;
  }

  return {
    gameState: newGameState,
    cutPieces: cutPieces,
    movedPiece: piece
  };
}

/**
 * Check if a player has won the game
 */
export function checkWinCondition(gameState, playerId) {
  const playerPieces = gameState.pieces.filter(p => p.playerId === playerId);
  return playerPieces.every(piece => piece.position === GAME_CONSTANTS.FINISH_END);
}

/**
 * Get all valid moves for a player given a dice roll
 */
export function getValidMoves(gameState, playerId, diceValue) {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return [];

  const playerPieces = gameState.pieces.filter(p => p.playerId === playerId);
  const validMoves = [];

  playerPieces.forEach(piece => {
    if (isValidMove(piece, diceValue, gameState, player.color)) {
      const newPosition = getNextPosition(piece.position, diceValue, player.color);
      const cutPieces = getPiecesCutByMove(newPosition, player.color, gameState);
      
      validMoves.push({
        pieceId: piece.id,
        fromPosition: piece.position,
        toPosition: newPosition,
        willCutPieces: cutPieces.length > 0,
        cutPieces: cutPieces
      });
    }
  });

  return validMoves;
}

/**
 * Check if a player gets another turn (rolled a 6 or cut a piece)
 */
export function getAnotherTurn(diceValue, cutPieces) {
  return diceValue === 6 || cutPieces.length > 0;
}

/**
 * Get the next player's turn
 */
export function getNextPlayerTurn(currentTurn, players, skipDisconnected = true) {
  let nextTurn = (currentTurn + 1) % players.length;
  
  // Skip disconnected players if specified
  if (skipDisconnected) {
    let attempts = 0;
    while (!players[nextTurn].connected && attempts < players.length) {
      nextTurn = (nextTurn + 1) % players.length;
      attempts++;
    }
  }
  
  return nextTurn;
}

/**
 * Initialize game pieces for all players
 */
export function initializeGamePieces(players) {
  const pieces = [];
  
  players.forEach((player, playerIndex) => {
    for (let i = 1; i <= GAME_CONSTANTS.PIECES_PER_PLAYER; i++) {
      pieces.push({
        id: `${player.id}_piece_${i}`,
        playerId: player.id,
        playerColor: player.color,
        pieceNumber: i,
        position: GAME_CONSTANTS.HOME_POSITION,
        isSafe: false
      });
    }
  });
  
  return pieces;
}

/**
 * Create initial game state
 */
export function createInitialGameState(players) {
  return {
    players: players,
    pieces: initializeGamePieces(players),
    currentTurn: 0,
    gamePhase: 'playing', // 'waiting', 'playing', 'finished'
    winner: null,
    lastDiceRoll: null,
    moveHistory: []
  };
}

/**
 * Simulate a dice roll
 */
export function rollDice() {
  return Math.floor(Math.random() * GAME_CONSTANTS.DICE_MAX) + GAME_CONSTANTS.DICE_MIN;
}

/**
 * Get board position coordinates for rendering
 * Returns {x, y} coordinates for a given position
 */
export function getBoardCoordinates(position, boardSize = 400) {
  if (position === GAME_CONSTANTS.HOME_POSITION) {
    return null; // Home positions are handled separately
  }

  if (position >= GAME_CONSTANTS.FINISH_START) {
    return null; // Finish positions are handled separately
  }

  // Calculate position on the board (clockwise from top-left)
  const cellSize = boardSize / 15; // 15x15 grid
  const center = boardSize / 2;
  
  // Map positions to board coordinates (simplified for now)
  // This would need to be expanded for actual board rendering
  const angle = (position / GAME_CONSTANTS.BOARD_SIZE) * 2 * Math.PI;
  const radius = boardSize * 0.35;
  
  return {
    x: center + radius * Math.cos(angle - Math.PI / 2),
    y: center + radius * Math.sin(angle - Math.PI / 2)
  };
}

/**
 * Get current player
 */
export function getCurrentPlayer(gameState) {
  if (!gameState || !gameState.players || gameState.currentTurn < 0) {
    return null;
  }
  return gameState.players[gameState.currentTurn];
}

/**
 * Check if it's a player's turn
 */
export function isPlayerTurn(gameState, playerId) {
  const currentPlayer = getCurrentPlayer(gameState);
  return currentPlayer && currentPlayer.id === playerId;
}

export default {
  GAME_CONSTANTS,
  PLAYER_COLORS,
  PLAYER_START_POSITIONS,
  SAFE_POSITIONS,
  STAR_POSITIONS,
  HOME_ENTRY_POSITIONS,
  getStartPosition,
  isSafePosition,
  isStarPosition,
  getNextPosition,
  isValidMove,
  getPiecesCutByMove,
  executeMove,
  checkWinCondition,
  getValidMoves,
  getAnotherTurn,
  getNextPlayerTurn,
  initializeGamePieces,
  createInitialGameState,
  rollDice,
  getBoardCoordinates,
  getCurrentPlayer,
  isPlayerTurn
};