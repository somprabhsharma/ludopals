/**
 * LudoPals - AI Player Logic
 * This file contains AI algorithms for computer-controlled players
 * Includes different difficulty levels and strategic decision making
 */

import {
  GAME_CONSTANTS,
  getValidMoves,
  getPiecesCutByMove,
  getNextPosition,
  getStartPosition,
  isSafePosition,
  isStarPosition,
  checkWinCondition
} from './ludoRules.js';

// AI difficulty levels
export const AI_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
};

// Move priorities for AI decision making
const MOVE_PRIORITIES = {
  WIN_GAME: 1000,           // Move that wins the game
  CUT_OPPONENT: 800,        // Cut an opponent's piece
  MOVE_TO_SAFETY: 600,      // Move to a safe position
  ADVANCE_FURTHEST: 400,    // Advance the piece closest to home
  MOVE_OUT_OF_HOME: 300,    // Move a piece out of home
  BLOCK_OPPONENT: 200,      // Block opponent's advancement
  ADVANCE_ANY: 100,         // Any forward movement
  DEFAULT: 50               // Default move value
};

/**
 * Calculate the distance a piece needs to travel to reach the finish
 */
function getDistanceToFinish(piece, playerColor) {
  const { position } = piece;
  
  if (position === GAME_CONSTANTS.HOME_POSITION) {
    return GAME_CONSTANTS.BOARD_SIZE + GAME_CONSTANTS.MOVES_TO_WIN;
  }
  
  if (position >= GAME_CONSTANTS.FINISH_START) {
    return GAME_CONSTANTS.FINISH_END - position;
  }
  
  // Calculate distance on main board + finish area
  const startPos = getStartPosition(playerColor);
  let distanceOnBoard;
  
  if (position >= startPos) {
    distanceOnBoard = GAME_CONSTANTS.BOARD_SIZE - (position - startPos);
  } else {
    distanceOnBoard = startPos - position;
  }
  
  return distanceOnBoard + GAME_CONSTANTS.MOVES_TO_WIN;
}

/**
 * Check if a piece is in danger of being cut
 */
function isPieceInDanger(piece, gameState, playerColor) {
  const { position } = piece;
  
  // Pieces at home or in finish area are safe
  if (position === GAME_CONSTANTS.HOME_POSITION || position >= GAME_CONSTANTS.FINISH_START) {
    return false;
  }
  
  // Pieces on safe positions are safe
  if (isSafePosition(position)) {
    return false;
  }
  
  // Check if any opponent can reach this position with their next move
  const opponents = gameState.players.filter(p => p.color !== playerColor);
  
  for (const opponent of opponents) {
    const opponentPieces = gameState.pieces.filter(p => p.playerColor === opponent.color);
    
    for (const opponentPiece of opponentPieces) {
      // Check all possible dice values (1-6)
      for (let dice = 1; dice <= 6; dice++) {
        const nextPos = getNextPosition(opponentPiece.position, dice, opponent.color);
        if (nextPos === position) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Evaluate a move and assign it a score
 */
function evaluateMove(move, gameState, playerId, playerColor, difficulty = AI_DIFFICULTY.MEDIUM) {
  let score = MOVE_PRIORITIES.DEFAULT;
  const { pieceId, fromPosition, toPosition, willCutPieces, cutPieces } = move;
  
  // Find the piece being moved
  const piece = gameState.pieces.find(p => p.id === pieceId);
  if (!piece) return score;
  
  // Check if this move wins the game
  const tempGameState = JSON.parse(JSON.stringify(gameState));
  const tempPiece = tempGameState.pieces.find(p => p.id === pieceId);
  if (tempPiece) {
    tempPiece.position = toPosition;
    if (checkWinCondition(tempGameState, playerId)) {
      return MOVE_PRIORITIES.WIN_GAME;
    }
  }
  
  // Prioritize cutting opponent pieces
  if (willCutPieces && cutPieces.length > 0) {
    score += MOVE_PRIORITIES.CUT_OPPONENT;
    // Bonus for cutting multiple pieces
    score += (cutPieces.length - 1) * 100;
  }
  
  // Moving out of home
  if (fromPosition === GAME_CONSTANTS.HOME_POSITION) {
    score += MOVE_PRIORITIES.MOVE_OUT_OF_HOME;
  }
  
  // Moving to safety
  if (isSafePosition(toPosition)) {
    score += MOVE_PRIORITIES.MOVE_TO_SAFETY;
    
    // Extra bonus if piece was in danger
    if (isPieceInDanger(piece, gameState, playerColor)) {
      score += 200;
    }
  }
  
  // Advancing towards finish
  const distanceBefore = getDistanceToFinish({ ...piece, position: fromPosition }, playerColor);
  const distanceAfter = getDistanceToFinish({ ...piece, position: toPosition }, playerColor);
  const advancement = distanceBefore - distanceAfter;
  
  if (advancement > 0) {
    score += MOVE_PRIORITIES.ADVANCE_ANY + (advancement * 10);
    
    // Bonus for advancing the furthest piece
    const playerPieces = gameState.pieces.filter(p => p.playerColor === playerColor);
    const furthestDistance = Math.min(...playerPieces.map(p => getDistanceToFinish(p, playerColor)));
    
    if (distanceBefore === furthestDistance) {
      score += MOVE_PRIORITIES.ADVANCE_FURTHEST;
    }
  }
  
  // Star position bonus
  if (isStarPosition(toPosition)) {
    score += 50;
  }
  
  // Difficulty-based adjustments
  switch (difficulty) {
    case AI_DIFFICULTY.EASY:
      // Add some randomness to make moves less optimal
      score += Math.random() * 200 - 100;
      break;
      
    case AI_DIFFICULTY.HARD:
      // Additional strategic considerations for hard difficulty
      
      // Blocking opponents
      const opponentPieces = gameState.pieces.filter(p => p.playerColor !== playerColor);
      for (const opponentPiece of opponentPieces) {
        const opponentDistance = getDistanceToFinish(opponentPiece, opponentPiece.playerColor);
        if (opponentDistance < 10) { // Opponent is close to winning
          // Check if we can block them
          for (let dice = 1; dice <= 6; dice++) {
            const opponentNextPos = getNextPosition(opponentPiece.position, dice, opponentPiece.playerColor);
            if (opponentNextPos === toPosition && !isSafePosition(toPosition)) {
              score += MOVE_PRIORITIES.BLOCK_OPPONENT;
            }
          }
        }
      }
      
      // Prefer keeping pieces together for protection
      const nearbyAllies = gameState.pieces.filter(p => 
        p.playerColor === playerColor && 
        p.id !== pieceId &&
        Math.abs(p.position - toPosition) <= 3
      );
      score += nearbyAllies.length * 25;
      
      break;
      
    case AI_DIFFICULTY.MEDIUM:
    default:
      // Balanced play with slight randomness
      score += Math.random() * 50 - 25;
      break;
  }
  
  return score;
}

/**
 * Select the best move for an AI player
 */
export function selectAIMove(gameState, playerId, diceValue, difficulty = AI_DIFFICULTY.MEDIUM) {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) {
    throw new Error('Player not found');
  }
  
  const validMoves = getValidMoves(gameState, playerId, diceValue);
  
  if (validMoves.length === 0) {
    return null; // No valid moves
  }
  
  if (validMoves.length === 1) {
    return validMoves[0]; // Only one move available
  }
  
  // Evaluate all moves and select the best one
  const evaluatedMoves = validMoves.map(move => ({
    ...move,
    score: evaluateMove(move, gameState, playerId, player.color, difficulty)
  }));
  
  // Sort by score (highest first)
  evaluatedMoves.sort((a, b) => b.score - a.score);
  
  // For easy difficulty, sometimes pick a suboptimal move
  if (difficulty === AI_DIFFICULTY.EASY && Math.random() < 0.3) {
    const randomIndex = Math.floor(Math.random() * Math.min(3, evaluatedMoves.length));
    return evaluatedMoves[randomIndex];
  }
  
  return evaluatedMoves[0];
}

/**
 * Simulate AI thinking time (for better UX)
 */
export function getAIThinkingTime(difficulty = AI_DIFFICULTY.MEDIUM) {
  const baseTimes = {
    [AI_DIFFICULTY.EASY]: { min: 500, max: 1500 },
    [AI_DIFFICULTY.MEDIUM]: { min: 1000, max: 2500 },
    [AI_DIFFICULTY.HARD]: { min: 1500, max: 3500 }
  };
  
  const { min, max } = baseTimes[difficulty];
  return Math.random() * (max - min) + min;
}

/**
 * Get AI player personality traits for display
 */
export function getAIPersonality(difficulty = AI_DIFFICULTY.MEDIUM) {
  const personalities = {
    [AI_DIFFICULTY.EASY]: {
      name: 'Friendly Bot',
      description: 'Plays casually and makes occasional mistakes',
      avatar: '🤖',
      traits: ['Casual', 'Friendly', 'Unpredictable']
    },
    [AI_DIFFICULTY.MEDIUM]: {
      name: 'Smart Bot',
      description: 'Balanced gameplay with good strategy',
      avatar: '🎯',
      traits: ['Strategic', 'Balanced', 'Competitive']
    },
    [AI_DIFFICULTY.HARD]: {
      name: 'Master Bot',
      description: 'Advanced strategy and tactical thinking',
      avatar: '🧠',
      traits: ['Tactical', 'Aggressive', 'Calculating']
    }
  };
  
  return personalities[difficulty];
}

/**
 * Create an AI player object
 */
export function createAIPlayer(playerId, playerName, color, difficulty = AI_DIFFICULTY.MEDIUM) {
  const personality = getAIPersonality(difficulty);
  
  return {
    id: playerId,
    name: playerName || personality.name,
    color: color,
    isAI: true,
    isHost: false,
    connected: true,
    difficulty: difficulty,
    personality: personality,
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      piecesCut: 0,
      piecesLost: 0
    }
  };
}

/**
 * Handle AI player turn
 */
export async function handleAITurn(gameState, playerId, diceValue, difficulty = AI_DIFFICULTY.MEDIUM) {
  // Simulate thinking time
  const thinkingTime = getAIThinkingTime(difficulty);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      const selectedMove = selectAIMove(gameState, playerId, diceValue, difficulty);
      resolve(selectedMove);
    }, thinkingTime);
  });
}

/**
 * Get AI move explanation for debugging/display
 */
export function getAIMoveExplanation(move, gameState, playerId, playerColor) {
  if (!move) return 'No valid moves available';
  
  const explanations = [];
  
  if (move.fromPosition === GAME_CONSTANTS.HOME_POSITION) {
    explanations.push('Moving piece out of home');
  }
  
  if (move.willCutPieces) {
    explanations.push(`Cutting ${move.cutPieces.length} opponent piece(s)`);
  }
  
  if (isSafePosition(move.toPosition)) {
    explanations.push('Moving to safe position');
  }
  
  if (isStarPosition(move.toPosition)) {
    explanations.push('Landing on star position');
  }
  
  const piece = gameState.pieces.find(p => p.id === move.pieceId);
  if (piece) {
    const distanceBefore = getDistanceToFinish({ ...piece, position: move.fromPosition }, playerColor);
    const distanceAfter = getDistanceToFinish({ ...piece, position: move.toPosition }, playerColor);
    const advancement = distanceBefore - distanceAfter;
    
    if (advancement > 0) {
      explanations.push(`Advancing ${advancement} step(s) towards finish`);
    }
  }
  
  return explanations.length > 0 ? explanations.join(', ') : 'Strategic move';
}

export default {
  AI_DIFFICULTY,
  selectAIMove,
  getAIThinkingTime,
  getAIPersonality,
  createAIPlayer,
  handleAITurn,
  getAIMoveExplanation
};