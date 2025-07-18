const { useState, useEffect, useRef, useCallback } = React;
const { createRoot } = ReactDOM;

// Base URL for the backend (Cloud Run service URL)
// IMPORTANT: Replace with your deployed Cloud Run URL
const BACKEND_URL = 'http://localhost:3001'; // Default for local development

// Unique device ID for session persistence
const getDeviceId = () => {
    let deviceId = localStorage.getItem('ludoDeviceId');
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('ludoDeviceId', deviceId);
    }
    return deviceId;
};

const generateNewDeviceId = () => {
    localStorage.removeItem('ludoDeviceId');
    window.location.reload(); // Reload to generate new UUID
};

const playerId = getDeviceId(); // Client-side UUID for player identity

// Helper for generating UUIDs
const generateUUID = () => crypto.randomUUID();

// Ludo game constants
const COLORS = ['red', 'green', 'yellow', 'blue'];
const HOME_POSITIONS = {
    red: ['H0', 'H1', 'H2', 'H3'],
    green: ['H4', 'H5', 'H6', 'H7'],
    yellow: ['H8', 'H9', 'H10', 'H11'],
    blue: ['H12', 'H13', 'H14', 'H15'],
};
const START_POSITIONS = {
    red: 0,    // Global path index
    green: 13,
    yellow: 26,
    blue: 39,
};
const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47]; // Global path indices that are safe (stars)
const FINISH_ENTRANCES = {
    red: 51,
    green: 12,
    yellow: 25,
    blue: 38,
};
const TOTAL_PATH_LENGTH = 52;
const HOME_LANE_LENGTH = 5; // Path within the home stretch (excluding entrance)

// Mapping for board cells to grid areas and path order
// This is a simplified mapping for illustration. A real Ludo board has 52 main path cells + home entries.
// For a 15x15 grid, we need to map 52 cells + 4x5 home lane cells + 4x4 home base cells.
// This will be complex. For simplicity, we'll use a linear array for game logic and visual mapping for UI.
// The visual mapping below is indicative and simplified; a proper grid system would be needed.

// Global path mapping for a standard 15x15 Ludo board (simplified for logic)
// Real mapping would be very tedious. Assume a 0-51 path.
const BOARD_CELL_GRID_MAP = []; // This would be 52 entries, mapping global path index to grid-area or x,y

// Example: cell 0 (red start) could be {gridArea: '7/2/8/3'}
// We'll define a function to map game state positions to grid positions later.
// For now, assume pieces have a `position` property that can be a number (0-51 for path), 'home' or 'finish'.

const getGridPositionForPath = (pathIndex, color) => {
    // This is a highly simplified mapping. In a real Ludo game,
    // you'd have a meticulous map for all 52 path cells.
    // For now, we just return a placeholder for rendering.
    // You'd need to pre-calculate all 52 coordinates or grid areas.
    const pathCoordinates = {
        // Example, map global path 0 to grid cell 7,2
        0: { row: 7, col: 2 }, // Red start
        1: { row: 7, col: 3 },
        2: { row: 7, col: 4 },
        3: { row: 7, col: 5 },
        4: { row: 7, col: 6 },
        5: { row: 6, col: 7 }, // Turn upwards
        6: { row: 5, col: 7 },
        7: { row: 4, col: 7 },
        8: { row: 3, col: 7 }, // Safe spot
        9: { row: 2, col: 7 },
        10: { row: 1, col: 7 },
        11: { row: 1, col: 8 }, // Turn right
        12: { row: 1, col: 9 }, // Green finish entrance
        13: { row: 2, col: 9 }, // Green start (safe)
        14: { row: 3, col: 9 },
        15: { row: 4, col: 9 },
        16: { row: 5, col: 9 },
        17: { row: 6, col: 9 },
        18: { row: 7, col: 10 }, // Turn right
        19: { row: 7, col: 11 },
        20: { row: 7, col: 12 },
        21: { row: 7, col: 13 }, // Safe spot
        22: { row: 7, col: 14 },
        23: { row: 7, col: 15 },
        24: { row: 8, col: 15 }, // Turn downwards
        25: { row: 9, col: 15 }, // Yellow finish entrance
        26: { row: 9, col: 14 }, // Yellow start (safe)
        27: { row: 9, col: 13 },
        28: { row: 9, col: 12 },
        29: { row: 9, col: 11 },
        30: { row: 9, col: 10 },
        31: { row: 10, col: 9 }, // Turn downwards
        32: { row: 11, col: 9 },
        33: { row: 12, col: 9 },
        34: { row: 13, col: 9 }, // Safe spot
        35: { row: 14, col: 9 },
        36: { row: 15, col: 9 },
        37: { row: 15, col: 8 }, // Turn left
        38: { row: 15, col: 7 }, // Blue finish entrance
        39: { row: 14, col: 7 }, // Blue start (safe)
        40: { row: 13, col: 7 },
        41: { row: 12, col: 7 },
        42: { row: 11, col: 7 },
        43: { row: 10, col: 7 },
        44: { row: 9, col: 6 }, // Turn left
        45: { row: 9, col: 5 },
        46: { row: 9, col: 4 },
        47: { row: 9, col: 3 }, // Safe spot
        48: { row: 9, col: 2 },
        49: { row: 9, col: 1 },
        50: { row: 8, col: 1 }, // Turn upwards
        51: { row: 8, col: 2 }, // Red finish entrance
    };

    // Home lane positions (relative to finish entrance)
    const homeLaneCoordinates = {
        red: {
            0: { row: 8, col: 3 },
            1: { row: 8, col: 4 },
            2: { row: 8, col: 5 },
            3: { row: 8, col: 6 },
            4: { row: 8, col: 7 }, // Last cell before center
        },
        green: {
            0: { row: 3, col: 8 },
            1: { row: 4, col: 8 },
            2: { row: 5, col: 8 },
            3: { row: 6, col: 8 },
            4: { row: 7, col: 8 },
        },
        yellow: {
            0: { row: 8, col: 12 },
            1: { row: 8, col: 11 },
            2: { row: 8, col: 10 },
            3: { row: 8, col: 9 },
            4: { row: 8, col: 8 },
        },
        blue: {
            0: { row: 12, col: 8 },
            1: { row: 11, col: 8 },
            2: { row: 10, col: 8 },
            3: { row: 9, col: 8 },
            4: { row: 8, col: 8 },
        },
    };

    if (typeof pathIndex === 'number' && pathCoordinates[pathIndex]) {
        return {
            gridArea: `${pathCoordinates[pathIndex].row}/${pathCoordinates[pathIndex].col}/${pathCoordinates[pathIndex].row + 1}/${pathCoordinates[pathIndex].col + 1}`
        };
    } else if (pathIndex.startsWith('L') && homeLaneCoordinates[color]) { // 'L0', 'L1', ... for home lane
        const laneIndex = parseInt(pathIndex.substring(1));
        const coords = homeLaneCoordinates[color][laneIndex];
        if (coords) {
            return {
                gridArea: `${coords.row}/${coords.col}/${coords.row + 1}/${coords.col + 1}`
            };
        }
    } else if (pathIndex.startsWith('H') && HOME_POSITIONS[color]) { // 'H0', 'H1', ... for starting home base
        // This is a simplified mapping for the initial home positions.
        // In a real game, each of the 4 home positions would have a specific grid area.
        const baseMap = {
            red: { 0: '2/2/4/4', 1: '2/4/4/6', 2: '4/2/6/4', 3: '4/4/6/6' },
            green: { 0: '2/11/4/13', 1: '2/13/4/15', 2: '4/11/6/13', 3: '4/13/6/15' },
            yellow: { 0: '11/2/13/4', 1: '11/4/13/6', 2: '13/2/15/4', 3: '13/4/15/6' },
            blue: { 0: '11/11/13/13', 1: '11/13/13/15', 2: '13/11/15/13', 3: '13/13/15/15' },
        };
        const pieceIndex = parseInt(pathIndex.substring(1)) % 4; // Map H0-H3, H4-H7 etc. to 0-3
        return { gridArea: baseMap[color][pieceIndex] };
    }
    return {}; // Fallback
};

const PlayerInfo = ({ player, isCurrentTurn, playersCount }) => {
    const playerColors = {
        red: 'bg-red-500',
        green: 'bg-green-500',
        yellow: 'bg-yellow-500',
        blue: 'bg-blue-500'
    };
    const playerBorderColors = {
        red: 'red',
        green: 'green',
        yellow: 'yellow',
        blue: 'blue'
    };
    const highlightClass = isCurrentTurn ? `current-player-highlight` : '';

    // Adjust layout based on playersCount for better mobile display
    const baseClass = "flex items-center space-x-2 p-2 rounded-lg transition-all duration-200 ease-in-out";
    const layoutClass = playersCount === 2 ? "flex-1" : "w-full sm:w-1/2 lg:w-1/4";

    return (
        <div
            className={`${baseClass} ${layoutClass} ${playerColors[player.color]} ${highlightClass}`}
            style={{ borderColor: isCurrentTurn ? playerBorderColors[player.color] : 'transparent' }}
        >
            <div className="w-4 h-4 rounded-full border border-white flex-shrink-0" style={{ backgroundColor: player.color }}></div>
            <span className="font-semibold text-white truncate text-sm sm:text-base">
                {player.username} {player.isAI && '(AI)'}
            </span>
            <span className="text-white text-sm sm:text-base">
                ({player.homePieces}/4 Home)
            </span>
        </div>
    );
};

const Dice = ({ diceValue, onRoll, isCurrentPlayerTurn, hasMoves, loading }) => {
    return (
        <button
            onClick={onRoll}
            disabled={!isCurrentPlayerTurn || !hasMoves || loading}
            className="dice bg-purple-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {loading ? (
                <div className="spinner !w-8 !h-8 !border-white !border-l-indigo-300"></div>
            ) : (
                diceValue === 0 ? '🎲' : diceValue
            )}
        </button>
    );
};

const LudoPiece = ({ piece, color, onClick, canMove }) => {
    const pieceColors = {
        red: 'piece-red',
        green: 'piece-green',
        yellow: 'piece-yellow',
        blue: 'piece-blue'
    };
    const handleClick = (e) => {
        e.stopPropagation(); // Prevent cell click event
        if (canMove) {
            onClick(piece.pieceId);
        }
    };
    return (
        <div
            className={`piece ${pieceColors[color]} ${canMove ? 'can-move' : ''}`}
            onClick={handleClick}
            style={{ zIndex: 20 }}
        >
            {/* Optionally display piece ID or first letter of color */}
        </div>
    );
};

const MessageBox = ({ messages }) => {
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    return (
        <div className="bg-gray-100 p-3 rounded-lg mt-4 max-h-40 overflow-y-auto border border-gray-200">
            {messages.length === 0 && <p className="text-gray-500 text-sm">Game messages will appear here.</p>}
            {messages.map((msg, index) => (
                <p key={index} className="text-sm text-gray-700 leading-tight mb-1">
                    <strong>{msg.player ? msg.player + ':' : ''}</strong> {msg.message}
                </p>
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
};

const BoardCell = ({ gridArea, type, color = '', pieces, onPieceClick, isCurrentTurn, diceValue, currentPlayerId }) => {
    const isSafeSpot = SAFE_SPOTS.includes(type) || type.startsWith('S'); // S for start cells
    const isHomeBase = type.startsWith('H');
    const isFinishCenter = type === 'F';
    const isHomeLane = type.startsWith('L');

    // Determine if any piece in this cell can move
    const canMovePiece = pieces.some(piece => {
        // Simplified: if it's the current player's turn, and they rolled, and the piece is theirs
        // Actual logic would come from server-sent `validMoves`
        return isCurrentTurn && piece.playerId === currentPlayerId && piece.canMove;
    });

    // Specific classes for cell types
    let cellClasses = 'cell';
    if (isHomeBase) cellClasses += ` base-${color}`;
    else if (isFinishCenter) cellClasses += ' finish-center';
    else if (isSafeSpot) cellClasses += ' safe-spot';
    else if (isHomeLane) cellClasses += ` entry-${color}`;
    else if (type === 'start') cellClasses += ` safe-spot cell-${color}-start`; // This for start specific cell
    else if (type === 'path') cellClasses += ' path-cell'; // Generic path cell

    // Add color to start cells
    if (type === 'start') {
        if (color === 'red') cellClasses += ' safe-spot-grid-2';
        else if (color === 'green') cellClasses += ' safe-spot-grid-1';
        else if (color === 'yellow') cellClasses += ' safe-spot-grid-3';
        else if (color === 'blue') cellClasses += ' safe-spot-grid-4';
    }

    // Add other safe spot grid positions (non-start)
    if (isSafeSpot && type !== 'start') {
        // This would need to be very specific for each safe spot grid area
        if (gridArea === '9/2/10/3') cellClasses += ' safe-spot-grid-5';
        else if (gridArea === '2/9/3/10') cellClasses += ' safe-spot-grid-6';
        else if (gridArea === '7/14/8/15') cellClasses += ' safe-spot-grid-7';
        else if (gridArea === '14/7/15/8') cellClasses += ' safe-spot-grid-8';
    }


    return (
        <div
            className={cellClasses}
            style={{ gridArea }}
            onClick={() => {
                // If no specific piece is clickable, maybe the cell itself is (e.g., to indicate no moves)
                // This might not be needed if piece click handles everything.
            }}
        >
            {pieces.map(piece => (
                <LudoPiece
                    key={piece.pieceId}
                    piece={piece}
                    color={piece.color}
                    onClick={onPieceClick}
                    canMove={piece.canMove}
                />
            ))}
            {isFinishCenter && <span className="text-4xl">🏁</span>}
        </div>
    );
};

const LudoBoard = ({ gameState, onPieceClick, onRollDice, messages }) => {
    if (!gameState) {
        return <div className="text-center py-8 text-gray-600">Loading game...</div>;
    }

    const { players, turn, diceValue, gameBoardState, status, gameMode } = gameState;
    const currentPlayer = players.find(p => p.playerId === turn);
    const isCurrentPlayerTurn = currentPlayer && currentPlayer.playerId === playerId;
    const canRollDice = isCurrentPlayerTurn && diceValue === 0 && status === 'in-progress' && !currentPlayer.isAI;

    // Determine if the current player has any valid moves (from server-side `gameBoardState`)
    const hasMoves = Object.values(gameBoardState || {}).some(piecesInCell =>
        piecesInCell.some(piece => piece.canMove && piece.playerId === playerId)
    );

    // Reconstruct board cells for rendering
    const boardCells = [];
    // Home areas
    boardCells.push({ gridArea: '1/1/7/7', className: 'home-red' });
    boardCells.push({ gridArea: '1/10/7/16', className: 'home-green' });
    boardCells.push({ gridArea: '10/1/16/7', className: 'home-yellow' });
    boardCells.push({ gridArea: '10/10/16/16', className: 'home-blue' });
    boardCells.push({ gridArea: '7/7/10/10', className: 'finish-center', type: 'F' });

    // Base positions inside home areas
    const homeBaseMappings = {
        red: ['2/2/4/4', '2/4/4/6', '4/2/6/4', '4/4/6/6'],
        green: ['2/11/4/13', '2/13/4/15', '4/11/6/13', '4/13/6/15'],
        yellow: ['11/2/13/4', '11/4/13/6', '13/2/15/4', '13/4/15/6'],
        blue: ['11/11/13/13', '11/13/13/15', '13/11/15/13', '13/13/15/15'],
    };

    COLORS.forEach(color => {
        homeBaseMappings[color].forEach((grid, idx) => {
            boardCells.push({ gridArea: grid, className: `base-${color}` });
        });
    });

    // Path cells and home lane cells
    const pathDefinitions = [
        // Red path segment 1 (vertical)
        { gridArea: '7/2/8/3', type: 'start', color: 'red' }, // Red Start
        { gridArea: '8/2/9/3', type: 'path' },
        { gridArea: '9/2/10/3', type: 'path' },
        { gridArea: '10/2/11/3', type: 'path' },
        { gridArea: '11/2/12/3', type: 'path' },
        { gridArea: '12/2/13/3', type: 'path' },
        { gridArea: '13/2/14/3', type: 'path' },
        { gridArea: '14/2/15/3', type: 'path' }, // Before corner

        // Red path segment 2 (horizontal bottom)
        { gridArea: '15/3/16/4', type: 'path' },
        { gridArea: '15/4/16/5', type: 'path' },
        { gridArea: '15/5/16/6', type: 'path' },
        { gridArea: '15/6/16/7', type: 'path' },
        { gridArea: '15/7/16/8', type: 'path' }, // Before corner
        { gridArea: '14/7/15/8', type: 'path', safe: true }, // Blue Start (safe)

        // Red path segment 3 (vertical)
        { gridArea: '13/7/14/8', type: 'path' },
        { gridArea: '12/7/13/8', type: 'path' },
        { gridArea: '11/7/12/8', type: 'path' },
        { gridArea: '10/7/11/8', type: 'path' },
        { gridArea: '9/7/10/8', type: 'path' },
        { gridArea: '9/6/10/7', type: 'path' }, // Before turn
        { gridArea: '9/5/10/6', type: 'path' },
        { gridArea: '9/4/10/5', type: 'path' },
        { gridArea: '9/3/10/4', type: 'path', safe: true }, // Safe spot

        // Blue path segment 1 (horizontal top)
        { gridArea: '9/14/10/15', type: 'start', color: 'blue' }, // Blue Start
        { gridArea: '9/13/10/14', type: 'path' },
        { gridArea: '9/12/10/13', type: 'path' },
        { gridArea: '9/11/10/12', type: 'path' },
        { gridArea: '9/10/10/11', type: 'path' },
        { gridArea: '9/9/10/10', type: 'path' },
        { gridArea: '9/8/10/9', type: 'path' },
        { gridArea: '9/7/10/8', type: 'path' }, // Before corner

        // Blue path segment 2 (vertical right)
        { gridArea: '10/9/11/10', type: 'path' },
        { gridArea: '11/9/12/10', type: 'path' },
        { gridArea: '12/9/13/10', type: 'path' },
        { gridArea: '13/9/14/10', type: 'path' },
        { gridArea: '14/9/15/10', type: 'path' }, // Before corner
        { gridArea: '14/8/15/9', type: 'path', safe: true }, // Yellow Start (safe)

        // Blue path segment 3 (horizontal)
        { gridArea: '13/8/14/9', type: 'path' },
        { gridArea: '12/8/13/9', type: 'path' },
        { gridArea: '11/8/12/9', type: 'path' },
        { gridArea: '10/8/11/9', type: 'path' },
        { gridArea: '9/8/10/9', type: 'path' },
        { gridArea: '9/8/10/9', type: 'path' },
        { gridArea: '8/9/9/10', type: 'path' }, // Before turn
        { gridArea: '7/9/8/10', type: 'path' },
        { gridArea: '6/9/7/10', type: 'path' },
        { gridArea: '5/9/6/10', type: 'path' },
        { gridArea: '4/9/5/10', type: 'path' },
        { gridArea: '3/9/4/10', type: 'path' },
        { gridArea: '2/9/3/10', type: 'path', safe: true }, // Safe spot

        // Green path segment 1 (vertical left)
        { gridArea: '2/7/3/8', type: 'start', color: 'green' }, // Green Start
        { gridArea: '3/7/4/8', type: 'path' },
        { gridArea: '4/7/5/8', type: 'path' },
        { gridArea: '5/7/6/8', type: 'path' },
        { gridArea: '6/7/7/8', type: 'path' },
        { gridArea: '7/7/8/8', type: 'path' },
        { gridArea: '7/6/8/7', type: 'path' },
        { gridArea: '7/5/8/6', type: 'path' },

        // Green path segment 2 (horizontal top)
        { gridArea: '7/4/8/5', type: 'path' },
        { gridArea: '7/3/8/4', type: 'path' },
        { gridArea: '7/2/8/3', type: 'path' },
        { gridArea: '7/1/8/2', type: 'path' }, // Before corner
        { gridArea: '8/1/9/2', type: 'path', safe: true }, // Red Start (safe)

        // Green path segment 3 (vertical)
        { gridArea: '8/2/9/3', type: 'path' },
        { gridArea: '8/3/9/4', type: 'path' },
        { gridArea: '8/4/9/5', type: 'path' },
        { gridArea: '8/5/9/6', type: 'path' },
        { gridArea: '8/6/9/7', type: 'path' },
        { gridArea: '8/7/9/8', type: 'path' }, // Before turn
        { gridArea: '8/7/9/8', type: 'path' },
        { gridArea: '8/7/9/8', type: 'path' },
        { gridArea: '8/7/9/8', type: 'path' },
        { gridArea: '7/14/8/15', type: 'path', safe: true }, // Safe spot


        // Home lanes (finish paths)
        { gridArea: '8/7/9/8', type: 'L', color: 'red' },
        { gridArea: '8/6/9/7', type: 'L', color: 'red' },
        { gridArea: '8/5/9/6', type: 'L', color: 'red' },
        { gridArea: '8/4/9/5', type: 'L', color: 'red' },
        { gridArea: '8/3/9/4', type: 'L', color: 'red' },

        { gridArea: '7/8/8/9', type: 'L', color: 'green' },
        { gridArea: '6/8/7/9', type: 'L', color: 'green' },
        { gridArea: '5/8/6/9', type: 'L', color: 'green' },
        { gridArea: '4/8/5/9', type: 'L', color: 'green' },
        { gridArea: '3/8/4/9', type: 'L', color: 'green' },

        { gridArea: '8/9/9/10', type: 'L', color: 'yellow' },
        { gridArea: '8/10/9/11', type: 'L', color: 'yellow' },
        { gridArea: '8/11/9/12', type: 'L', color: 'yellow' },
        { gridArea: '8/12/9/13', type: 'L', color: 'yellow' },
        { gridArea: '8/13/9/14', type: 'L', color: 'yellow' },

        { gridArea: '9/8/10/9', type: 'L', color: 'blue' },
        { gridArea: '10/8/11/9', type: 'L', color: 'blue' },
        { gridArea: '11/8/12/9', type: 'L', color: 'blue' },
        { gridArea: '12/8/13/9', type: 'L', color: 'blue' },
        { gridArea: '13/8/14/9', type: 'L', color: 'blue' },
    ];

    // Assign pieces to cells for rendering
    const cellsWithPieces = pathDefinitions.map(cell => ({
        ...cell,
        pieces: Object.values(gameBoardState || {}).flat().filter(piece => {
            const pieceGrid = getGridPositionForPath(piece.position, piece.color);
            return pieceGrid.gridArea === cell.gridArea;
        })
    }));

    // Filter out duplicate cells (e.g., safe spots are also path cells) for rendering
    const uniqueCells = [];
    const seenGridAreas = new Set();
    [...boardCells, ...cellsWithPieces].forEach(cell => {
        if (!seenGridAreas.has(cell.gridArea)) {
            uniqueCells.push(cell);
            seenGridAreas.add(cell.gridArea);
        } else {
            // Merge pieces if cell already exists (e.g., base cells)
            const existingCell = uniqueCells.find(uc => uc.gridArea === cell.gridArea);
            if (existingCell && cell.pieces) {
                existingCell.pieces = [...(existingCell.pieces || []), ...cell.pieces];
            }
        }
    });


    return (
        <div className="flex flex-col lg:flex-row gap-6 p-4">
            <div className="flex-1">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">Ludo Game</h2>
                <div className="ludo-board">
                    {uniqueCells.map((cell, index) => (
                        <BoardCell
                            key={cell.gridArea || index}
                            gridArea={cell.gridArea}
                            type={cell.type}
                            color={cell.color}
                            pieces={cell.pieces || []}
                            onPieceClick={onPieceClick}
                            isCurrentTurn={isCurrentPlayerTurn}
                            diceValue={diceValue}
                            currentPlayerId={playerId}
                        />
                    ))}
                </div>
            </div>
            <div className="lg:w-1/3 flex flex-col justify-between">
                <div>
                    <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white p-3 rounded-lg shadow-md mb-4 text-center">
                        <h3 className="text-xl font-semibold mb-1">Room ID: <span className="font-mono text-indigo-200">{gameState.roomId}</span></h3>
                        <p className="text-sm">Game Mode: {gameState.gameMode === 'human_vs_ai' ? 'Human vs. AI' : gameState.gameMode === 'quick_play' ? 'Quick Play' : 'Human Only'}</p>
                    </div>

                    <h3 className="text-lg font-bold mb-2">Players ({players.length}):</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 mb-4">
                        {players.map(player => (
                            <PlayerInfo
                                key={player.playerId}
                                player={player}
                                isCurrentTurn={player.playerId === turn}
                                playersCount={players.length}
                            />
                        ))}
                    </div>

                    <div className="flex justify-center items-center gap-4 my-4">
                        {status === 'waiting' && currentPlayer && currentPlayer.isHost && (
                            <button
                                onClick={onRollDice} // This button is repurposed for Start Game
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-200"
                                disabled={players.length < 2}
                            >
                                Start Game ({players.length}/4)
                            </button>
                        )}
                        {status === 'in-progress' && (
                            <Dice
                                diceValue={diceValue}
                                onRoll={onRollDice}
                                isCurrentPlayerTurn={isCurrentPlayerTurn}
                                hasMoves={hasMoves}
                                loading={currentPlayer && currentPlayer.isAI && isCurrentPlayerTurn} // Show loading for AI turn
                            />
                        )}
                    </div>
                    {status === 'finished' && (
                        <div className="text-center bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4">
                            <p className="font-bold">Game Over!</p>
                            <p>{players.find(p => p.homePieces === 4)?.username} won! 🎉</p>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                            >
                                Play Again
                            </button>
                        </div>
                    )}

                </div>

                <MessageBox messages={messages} />

                <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                    {gameState.roomId && (
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                alert('Room link copied to clipboard!'); // Replace with custom modal
                            }}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg shadow transition duration-200"
                        >
                            Copy Room Link
                        </button>
                    )}
                    <button
                        onClick={generateNewDeviceId}
                        className="bg-red-200 hover:bg-red-300 text-red-800 font-bold py-2 px-4 rounded-lg shadow transition duration-200"
                    >
                        Start New Identity
                    </button>
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const [gameState, setGameState] = useState(null);
    const [messages, setMessages] = useState([]);
    const [roomCreationLoading, setRoomCreationLoading] = useState(false);
    const [quickPlayLoading, setQuickPlayLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [roomInput, setRoomInput] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalContent, setModalContent] = useState({ title: '', message: '', buttons: [] });
    const [selectedGameMode, setSelectedGameMode] = useState('human_only');
    const [selectedAIPlayers, setSelectedAIPlayers] = useState(0);
    const socketRef = useRef(null);
    const roomIdRef = useRef(null); // Keep track of current roomId

    const showCustomModal = (title, message, buttons) => {
        setModalContent({ title, message, buttons });
        setShowModal(true);
    };

    const hideCustomModal = () => {
        setShowModal(false);
        setModalContent({ title: '', message: '', buttons: [] });
    };

    useEffect(() => {
        const initializeSocket = () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
            socketRef.current = io(BACKEND_URL, {
                query: {
                    playerId: playerId,
                    roomId: roomIdRef.current || '' // Pass roomId if already known (for rejoining)
                }
            });

            socketRef.current.on('connect', () => {
                console.log('Connected to socket server:', socketRef.current.id);
                addMessage('System', 'Connected to game server.');
            });

            socketRef.current.on('gameStateUpdate', (state) => {
                console.log('Game state updated:', state);
                setGameState(state);
                // Store roomId from server if this is the first update
                if (state.roomId && !roomIdRef.current) {
                    roomIdRef.current = state.roomId;
                    // Update URL to reflect room ID for sharing/rejoining
                    if (window.location.pathname.startsWith('/room/')) {
                        // Already in a room, ensure URL matches
                        if (window.location.pathname !== `/room/${state.roomId}`) {
                            window.history.replaceState(null, '', `/room/${state.roomId}`);
                        }
                    } else {
                        window.history.pushState(null, '', `/room/${state.roomId}`);
                    }
                }
            });

            socketRef.current.on('gameMessage', (msg) => {
                addMessage(msg.player, msg.message);
            });

            socketRef.current.on('error', (message) => {
                console.error('Socket error:', message);
                showCustomModal('Error', message, [{ text: 'OK', onClick: hideCustomModal }]);
            });

            socketRef.current.on('redirectToRoom', ({ roomId }) => {
                console.log('Redirecting to room:', roomId);
                const newUrl = `/room/${roomId}`;
                window.history.pushState(null, '', newUrl);
                roomIdRef.current = roomId;
                // Re-initialize socket with the new roomId
                initializeSocket(); // This will connect to the correct room with the new roomId in query
            });

            socketRef.current.on('disconnect', () => {
                console.log('Disconnected from socket server.');
                addMessage('System', 'Disconnected from game server. Attempting to reconnect...');
            });
        };

        // Check URL for room ID on initial load
        const pathParts = window.location.pathname.split('/');
        if (pathParts.length === 3 && pathParts[1] === 'room') {
            roomIdRef.current = pathParts[2];
            initializeSocket(); // Connect to a specific room immediately
        } else {
            // For homepage, don't connect socket until needed (create/join/quick play)
            // If socket already exists, disconnect it to avoid stale connections.
            if (socketRef.current) {
                 socketRef.current.disconnect();
                 socketRef.current = null;
            }
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [playerId]); // Re-run if playerId changes (e.g., 'New Identity' clicked)

    const addMessage = (player, message) => {
        setMessages(prev => [...prev, { player, message }]);
    };

    const handleCreateRoom = async (gameMode, aiPlayers = 0) => {
        if (!username.trim()) {
            showCustomModal('Input Required', 'Please enter a display username.', [{ text: 'OK', onClick: hideCustomModal }]);
            return;
        }
        setRoomCreationLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/createRoom`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ playerId, requestedUsername: username, gameMode, aiPlayers }),
            });
            const data = await response.json();
            if (response.ok) {
                console.log('Room created:', data);
                roomIdRef.current = data.roomId;
                initializeSocket(); // Connect socket to the new room
            } else {
                throw new Error(data.message || 'Failed to create room.');
            }
        } catch (error) {
            console.error('Create room error:', error);
            showCustomModal('Error', error.message, [{ text: 'OK', onClick: hideCustomModal }]);
        } finally {
            setRoomCreationLoading(false);
        }
    };

    const handleJoinRoom = () => {
        if (!roomInput.trim()) {
            showCustomModal('Input Required', 'Please enter a Room ID or use a link.', [{ text: 'OK', onClick: hideCustomModal }]);
            return;
        }
        if (!username.trim()) {
            showCustomModal('Input Required', 'Please enter a display username.', [{ text: 'OK', onClick: hideCustomModal }]);
            return;
        }
        roomIdRef.current = roomInput.trim();
        initializeSocket(); // Connect socket to the specified room
    };

    const handleQuickPlay = () => {
        if (!username.trim()) {
            showCustomModal('Input Required', 'Please enter a display username.', [{ text: 'OK', onClick: hideCustomModal }]);
            return;
        }
        setQuickPlayLoading(true);
        // Connect socket and emit quickPlayMatchmaking event
        if (!socketRef.current) {
            initializeSocket(); // Connect first if not already connected
        }
        const connectAndEmit = () => {
            if (socketRef.current && socketRef.current.connected) {
                socketRef.current.emit('quickPlayMatchmaking', { playerId, requestedUsername: username });
                addMessage('System', 'Searching for quick play match...');
            } else {
                // Wait for connection and then emit
                socketRef.current.on('connect', () => {
                    socketRef.current.emit('quickPlayMatchmaking', { playerId, requestedUsername: username });
                    addMessage('System', 'Searching for quick play match...');
                });
            }
        };
        connectAndEmit();
    };

    const handleRollDice = () => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('rollDice', { roomId: gameState.roomId, playerId });
        } else {
            console.error('Socket not connected.');
            showCustomModal('Connection Error', 'Not connected to game server. Please refresh.', [{ text: 'OK', onClick: hideCustomModal }]);
        }
    };

    const handleMovePiece = (pieceId) => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('movePiece', { roomId: gameState.roomId, playerId, pieceId, diceValue: gameState.diceValue });
        } else {
            console.error('Socket not connected.');
            showCustomModal('Connection Error', 'Not connected to game server. Please refresh.', [{ text: 'OK', onClick: hideCustomModal }]);
        }
    };

    // Render game board if gameState exists, otherwise show home page
    if (gameState && roomIdRef.current) {
        return (
            <>
                <LudoBoard
                    gameState={gameState}
                    onPieceClick={handleMovePiece}
                    onRollDice={handleRollDice}
                    messages={messages}
                />
                {showModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <button className="modal-close" onClick={hideCustomModal}>&times;</button>
                            <h3 className="text-xl font-bold mb-4">{modalContent.title}</h3>
                            <p className="mb-6">{modalContent.message}</p>
                            <div className="flex justify-center space-x-4">
                                {modalContent.buttons.map((button, index) => (
                                    <button
                                        key={index}
                                        onClick={button.onClick}
                                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded transition duration-200"
                                    >
                                        {button.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Homepage view
    return (
        <div className="text-center p-6 md:p-8">
            <h1 className="text-4xl font-extrabold text-indigo-700 mb-6">Welcome to Ludo Online! 🎲</h1>
            <p className="text-gray-600 mb-8 max-w-prose mx-auto">
                Play Ludo with friends in private rooms or quickly jump into a game with random players. No signup required! Your identity is saved on this device.
            </p>

            <div className="mb-6">
                <label htmlFor="username" className="block text-lg font-semibold text-gray-700 mb-2">
                    Your Display Name:
                </label>
                <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g., LudoMaster"
                    className="w-full max-w-sm p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                    maxLength="20"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {/* Private Room Section */}
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg shadow-md flex flex-col items-center">
                    <h2 className="text-2xl font-bold text-blue-800 mb-4">Create Private Room</h2>
                    <p className="text-gray-700 mb-4">Play with friends you invite.</p>
                    <div className="w-full mb-4">
                        <label className="block text-md font-medium text-gray-700 mb-2">Game Mode:</label>
                        <select
                            id="gameModeSelect"
                            className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-indigo-500 focus:border-indigo-500"
                            onChange={(e) => {
                                const [mode, ai] = e.target.value.split(':');
                                setSelectedGameMode(mode);
                                setSelectedAIPlayers(parseInt(ai));
                            }}
                        >
                            <option value="human_only:0">Human Players Only (2-4)</option>
                            <option value="human_vs_ai:1">1 Human vs. 3 AI</option>
                            <option value="human_vs_ai:2">2 Humans vs. 2 AI</option>
                            <option value="human_vs_ai:3">3 Humans vs. 1 AI</option>
                            <option value="human_vs_ai:0">1 Human vs. 1 AI (Practice)</option> {/* Special case handled server-side */}
                        </select>
                    </div>
                    <button
                        onClick={() => handleCreateRoom(selectedGameMode, selectedAIPlayers)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-200 w-full disabled:opacity-50"
                        disabled={roomCreationLoading || !username.trim()}
                    >
                        {roomCreationLoading ? (
                            <div className="spinner !w-6 !h-6 !border-white !border-l-indigo-300 mx-auto"></div>
                        ) : 'Create Room'}
                    </button>
                </div>

                {/* Join Room Section */}
                <div className="bg-green-50 border border-green-200 p-6 rounded-lg shadow-md flex flex-col items-center">
                    <h2 className="text-2xl font-bold text-green-800 mb-4">Join Room</h2>
                    <p className="text-gray-700 mb-4">Enter a Room ID or use a shared link.</p>
                    <input
                        type="text"
                        value={roomInput}
                        onChange={(e) => setRoomInput(e.target.value)}
                        placeholder="Enter Room ID"
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500 mb-4 text-lg"
                    />
                    <button
                        onClick={handleJoinRoom}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-200 w-full disabled:opacity-50"
                        disabled={!roomInput.trim() || !username.trim()}
                    >
                        Join Room
                    </button>
                </div>

                {/* Quick Play Section */}
                <div className="md:col-span-2 bg-yellow-50 border border-yellow-200 p-6 rounded-lg shadow-md flex flex-col items-center">
                    <h2 className="text-2xl font-bold text-yellow-800 mb-4">Quick Play</h2>
                    <p className="text-gray-700 mb-4">Get matched with random players instantly.</p>
                    <button
                        onClick={handleQuickPlay}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-200 w-full max-w-sm disabled:opacity-50"
                        disabled={quickPlayLoading || !username.trim()}
                    >
                        {quickPlayLoading ? (
                            <div className="spinner !w-6 !h-6 !border-white !border-l-yellow-300 mx-auto"></div>
                        ) : 'Find Quick Match'}
                    </button>
                </div>
            </div>

            <div className="mt-8">
                <button
                    onClick={generateNewDeviceId}
                    className="bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-2 px-4 rounded-lg shadow transition duration-200 text-sm"
                >
                    Reset Identity (Start New Game)
                </button>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="modal-close" onClick={hideCustomModal}>&times;</button>
                        <h3 className="text-xl font-bold mb-4">{modalContent.title}</h3>
                        <p className="mb-6">{modalContent.message}</p>
                        <div className="flex justify-center space-x-4">
                            {modalContent.buttons.map((button, index) => (
                                <button
                                    key={index}
                                    onClick={button.onClick}
                                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded transition duration-200"
                                >
                                    {button.text}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);