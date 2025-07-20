/**
 * LudoBoard Component
 * Complete visual representation of a classic Ludo game board with proper grid
 */

import React from 'react';
import { motion } from 'framer-motion';

const LudoBoard = ({ 
  gameState, 
  playerUUID, 
  onPieceClick, 
  validMoves = [], 
  selectedPiece = null 
}) => {
  // Player colors - bright and distinct
  const PLAYER_COLORS = {
    red: 'bg-red-500',
    blue: 'bg-blue-500', 
    green: 'bg-green-500',
    yellow: 'bg-yellow-500'
  };

  const PLAYER_LIGHT_COLORS = {
    red: 'bg-red-200',
    blue: 'bg-blue-200',
    green: 'bg-green-200', 
    yellow: 'bg-yellow-200'
  };

  const PLAYER_BORDER_COLORS = {
    red: 'border-red-500',
    blue: 'border-blue-500',
    green: 'border-green-500',
    yellow: 'border-yellow-500'
  };

  // Classic Ludo board - 52 positions in clockwise order
  const BOARD_POSITIONS = [
    // Red path (positions 0-12) - bottom row going right, then up
    { pos: 0, row: 8, col: 1, color: 'red', isStart: true, isSafe: true },
    { pos: 1, row: 8, col: 2 },
    { pos: 2, row: 8, col: 3 },
    { pos: 3, row: 8, col: 4 },
    { pos: 4, row: 8, col: 5 },
    { pos: 5, row: 8, col: 6 },
    { pos: 6, row: 7, col: 6 },
    { pos: 7, row: 6, col: 6 },
    { pos: 8, row: 5, col: 6, isSafe: true, isStar: true },
    { pos: 9, row: 4, col: 6 },
    { pos: 10, row: 3, col: 6 },
    { pos: 11, row: 2, col: 6 },
    { pos: 12, row: 1, col: 6 },
    
    // Blue path (positions 13-25) - top row going right, then down
    { pos: 13, row: 1, col: 8, color: 'blue', isStart: true, isSafe: true },
    { pos: 14, row: 1, col: 9 },
    { pos: 15, row: 1, col: 10 },
    { pos: 16, row: 1, col: 11 },
    { pos: 17, row: 1, col: 12 },
    { pos: 18, row: 1, col: 13 },
    { pos: 19, row: 2, col: 13 },
    { pos: 20, row: 3, col: 13 },
    { pos: 21, row: 4, col: 13, isSafe: true, isStar: true },
    { pos: 22, row: 5, col: 13 },
    { pos: 23, row: 6, col: 13 },
    { pos: 24, row: 7, col: 13 },
    { pos: 25, row: 8, col: 13 },
    
    // Green path (positions 26-38) - right side going down, then left
    { pos: 26, row: 8, col: 14, color: 'green', isStart: true, isSafe: true },
    { pos: 27, row: 9, col: 14 },
    { pos: 28, row: 10, col: 14 },
    { pos: 29, row: 11, col: 14 },
    { pos: 30, row: 12, col: 14 },
    { pos: 31, row: 13, col: 14 },
    { pos: 32, row: 13, col: 13 },
    { pos: 33, row: 13, col: 12 },
    { pos: 34, row: 13, col: 11, isSafe: true, isStar: true },
    { pos: 35, row: 13, col: 10 },
    { pos: 36, row: 13, col: 9 },
    { pos: 37, row: 13, col: 8 },
    { pos: 38, row: 13, col: 7 },
    
    // Yellow path (positions 39-51) - bottom row going left, then up
    { pos: 39, row: 12, col: 7, color: 'yellow', isStart: true, isSafe: true },
    { pos: 40, row: 11, col: 7 },
    { pos: 41, row: 10, col: 7 },
    { pos: 42, row: 9, col: 7 },
    { pos: 43, row: 8, col: 7 },
    { pos: 44, row: 7, col: 7 },
    { pos: 45, row: 7, col: 8 },
    { pos: 46, row: 7, col: 9 },
    { pos: 47, row: 7, col: 10, isSafe: true, isStar: true },
    { pos: 48, row: 7, col: 11 },
    { pos: 49, row: 7, col: 12 },
    { pos: 50, row: 7, col: 13 },
    { pos: 51, row: 7, col: 14 }
  ];

  // Finish lanes - paths to center for each color
  const FINISH_LANES = {
    red: [
      { pos: 52, row: 7, col: 1, color: 'red', isFinish: true },
      { pos: 53, row: 7, col: 2, color: 'red', isFinish: true },
      { pos: 54, row: 7, col: 3, color: 'red', isFinish: true },
      { pos: 55, row: 7, col: 4, color: 'red', isFinish: true },
      { pos: 56, row: 7, col: 5, color: 'red', isFinish: true },
      { pos: 57, row: 7, col: 6, color: 'red', isFinish: true }
    ],
    blue: [
      { pos: 52, row: 2, col: 7, color: 'blue', isFinish: true },
      { pos: 53, row: 3, col: 7, color: 'blue', isFinish: true },
      { pos: 54, row: 4, col: 7, color: 'blue', isFinish: true },
      { pos: 55, row: 5, col: 7, color: 'blue', isFinish: true },
      { pos: 56, row: 6, col: 7, color: 'blue', isFinish: true },
      { pos: 57, row: 7, col: 7, color: 'blue', isFinish: true }
    ],
    green: [
      { pos: 52, row: 8, col: 12, color: 'green', isFinish: true },
      { pos: 53, row: 8, col: 11, color: 'green', isFinish: true },
      { pos: 54, row: 8, col: 10, color: 'green', isFinish: true },
      { pos: 55, row: 8, col: 9, color: 'green', isFinish: true },
      { pos: 56, row: 8, col: 8, color: 'green', isFinish: true },
      { pos: 57, row: 8, col: 7, color: 'green', isFinish: true }
    ],
    yellow: [
      { pos: 52, row: 12, col: 8, color: 'yellow', isFinish: true },
      { pos: 53, row: 11, col: 8, color: 'yellow', isFinish: true },
      { pos: 54, row: 10, col: 8, color: 'yellow', isFinish: true },
      { pos: 55, row: 9, col: 8, color: 'yellow', isFinish: true },
      { pos: 56, row: 8, col: 8, color: 'yellow', isFinish: true },
      { pos: 57, row: 7, col: 8, color: 'yellow', isFinish: true }
    ]
  };

  // Get pieces at a specific position
  const getPiecesAtPosition = (position) => {
    if (!gameState?.pieces) return [];
    return gameState.pieces.filter(piece => piece.position === position);
  };

  // Get pieces in home area for a player
  const getHomePieces = (playerColor) => {
    if (!gameState?.pieces) return [];
    return gameState.pieces.filter(piece => 
      piece.playerColor === playerColor && piece.position === -1
    );
  };

  // Check if a piece can be moved
  const canMovePiece = (pieceId) => {
    return validMoves.some(move => move.pieceId === pieceId);
  };

  // Check if a piece is selected
  const isPieceSelected = (pieceId) => {
    return selectedPiece === pieceId;
  };

  // Render a game piece
  const renderPiece = (piece, index = 0) => {
    const isMovable = canMovePiece(piece.id);
    const isSelected = isPieceSelected(piece.id);
    const isMyPiece = gameState?.players?.find(p => p.id === playerUUID)?.color === piece.playerColor;

    return (
      <motion.div
        key={piece.id}
        className={`
          w-5 h-5 rounded-full border-2 border-white cursor-pointer shadow-sm
          ${PLAYER_COLORS[piece.playerColor]}
          ${isSelected ? 'ring-2 ring-yellow-400' : ''}
          ${isMovable ? 'ring-2 ring-green-400 animate-pulse' : ''}
          ${!isMyPiece ? 'cursor-default' : ''}
        `}
        style={{
          position: 'absolute',
          top: `${2 + index * 3}px`,
          left: `${2 + index * 3}px`,
          zIndex: 10 + index
        }}
        onClick={() => isMyPiece && onPieceClick && onPieceClick(piece.id)}
        whileHover={isMyPiece ? { scale: 1.1 } : {}}
        whileTap={isMyPiece ? { scale: 0.95 } : {}}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: index * 0.1 }}
      />
    );
  };

  // Render board cell
  const renderBoardCell = (cellInfo) => {
    const pieces = getPiecesAtPosition(cellInfo.pos);
    const isStart = cellInfo.isStart;
    const isSafe = cellInfo.isSafe;
    const isStar = cellInfo.isStar;
    const isFinish = cellInfo.isFinish;
    const color = cellInfo.color;
    
    return (
      <div
        key={`cell-${cellInfo.pos}`}
        className={`
          relative w-6 h-6 border border-gray-400 flex items-center justify-center text-xs
          ${isStart ? PLAYER_LIGHT_COLORS[color] : ''}
          ${isFinish ? PLAYER_LIGHT_COLORS[color] : ''}
          ${!isStart && !isFinish ? 'bg-white' : ''}
          ${isSafe && !isStart ? 'bg-green-100' : ''}
          ${isStar ? 'bg-blue-100' : ''}
        `}
      >
        {/* Start position indicator */}
        {isStart && (
          <div className={`absolute inset-0.5 border-2 ${PLAYER_BORDER_COLORS[color]} rounded`}></div>
        )}
        
        {/* Safe zone indicator */}
        {isSafe && !isStart && (
          <div className="absolute inset-0.5 border-2 border-green-500 rounded"></div>
        )}
        
        {/* Star indicator */}
        {isStar && (
          <div className="text-blue-600 font-bold">★</div>
        )}
        
        {/* Finish area indicator */}
        {isFinish && (
          <div className={`text-xs font-bold ${PLAYER_COLORS[color].replace('bg-', 'text-')}`}>
            {cellInfo.pos - 51}
          </div>
        )}
        
        {/* Render pieces at this position */}
        {pieces.map((piece, index) => renderPiece(piece, index))}
      </div>
    );
  };

  // Render home area for a player - simple and clear
  const renderHomeArea = (playerColor) => {
    const homePieces = getHomePieces(playerColor);
    
    return (
      <div className={`
        w-24 h-24 ${PLAYER_LIGHT_COLORS[playerColor]} 
        border-4 border-gray-800 
        rounded-lg relative flex flex-wrap items-center justify-center p-2
      `}>
        {/* Home area label */}
        <div className={`
          absolute -top-6 left-1/2 transform -translate-x-1/2 
          text-sm font-bold text-gray-800 bg-white px-2 rounded
        `}>
          {playerColor.toUpperCase()}
        </div>
        
        {/* Home pieces - simple layout */}
        <div className="grid grid-cols-2 gap-2 w-full h-full">
          {[0, 1, 2, 3].map((slotIndex) => {
            const piece = homePieces[slotIndex];
            return (
              <div key={`home-${playerColor}-${slotIndex}`} className="relative flex items-center justify-center">
                {piece && renderPiece(piece, 0)}
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  if (!gameState) {
    return (
      <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-gray-500">Loading game board...</div>
      </div>
    );
  }

  // Create complete board layout combining positions and finish lanes
  const createBoardLayout = () => {
    const allCells = [];
    
    // Add main board positions
    BOARD_POSITIONS.forEach(cell => {
      allCells.push(cell);
    });
    
    // Add finish lane positions
    Object.keys(FINISH_LANES).forEach(color => {
      FINISH_LANES[color].forEach(cell => {
        allCells.push(cell);
      });
    });
    
    return allCells;
  };

  // Create 15x15 grid for the board
  const createGrid = () => {
    const grid = Array(15).fill(null).map(() => Array(15).fill(null));
    const boardCells = createBoardLayout();
    
    // Place all board cells in the grid
    boardCells.forEach(cell => {
      if (cell.row >= 0 && cell.row < 15 && cell.col >= 0 && cell.col < 15) {
        grid[cell.row][cell.col] = cell;
      }
    });
    
    return grid;
  };

  const grid = createGrid();

  return (
    <div className="aspect-square bg-white rounded-xl p-4 shadow-lg max-w-2xl mx-auto">
      <div className="w-full h-full relative bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-2 border-green-300">
        
        {/* Complete Ludo Board Grid */}
        <div className="absolute inset-2">
          <div className="grid grid-cols-15 gap-px w-full h-full bg-gray-200 p-1">
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                if (cell) {
                  // This is a game position - render as board cell
                  return renderBoardCell(cell);
                } else {
                  // Empty grid cell
                  return (
                    <div
                      key={`empty-${rowIndex}-${colIndex}`}
                      className="w-full h-full bg-green-50 min-h-0"
                    />
                  );
                }
              })
            )}
          </div>
        </div>

        {/* Home areas positioned in corners */}
        <div className="absolute top-1 left-1">
          {renderHomeArea('red')}
        </div>
        
        <div className="absolute top-1 right-1">
          {renderHomeArea('blue')}
        </div>
        
        <div className="absolute bottom-1 right-1">
          {renderHomeArea('green')}
        </div>
        
        <div className="absolute bottom-1 left-1">
          {renderHomeArea('yellow')}
        </div>

        {/* Center finish area */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-200 to-yellow-300 rounded-full flex items-center justify-center border-2 border-yellow-500 shadow-md">
            <div className="text-lg">🏆</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LudoBoard;