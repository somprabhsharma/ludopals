require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Socket.IO setup with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));
app.use(compression());
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

// Apply rate limiting to all requests
app.use('/api/', limiter);

// Game state storage (in production, this should be in database)
const gameRooms = new Map();
const playerSessions = new Map();
const quickPlayQueue = [];

// Game constants
const GAME_CONSTANTS = {
  PIECES_PER_PLAYER: 4,
  HOME_POSITION: -1,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4
};

// Utility functions
const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const generatePlayerId = () => {
  return Math.random().toString(36).substring(2, 15);
};

// Initialize game pieces for all players
const initializeGamePieces = (players) => {
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
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'LudoPals Backend Running',
    version: '1.0.0',
    activeRooms: gameRooms.size,
    activePlayers: playerSessions.size,
    queueLength: quickPlayQueue.length
  });
});

// Create a new game room
app.post('/api/rooms/create', async (req, res) => {
  try {
    const { playerName, playerUUID, maxPlayers = 4, aiPlayers = 0 } = req.body;
    
    if (!playerName || playerName.trim().length === 0) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    if (!playerUUID || playerUUID.trim().length === 0) {
      return res.status(400).json({ error: 'Player UUID is required' });
    }

    if (maxPlayers < 2 || maxPlayers > 4) {
      return res.status(400).json({ error: 'Max players must be between 2 and 4' });
    }

    if (aiPlayers < 0 || aiPlayers >= maxPlayers) {
      return res.status(400).json({ error: 'Invalid number of AI players' });
    }

    const roomId = generateRoomId();
    const playerId = playerUUID.trim(); // Use the provided UUID instead of generating random ID
    
    // Create initial players array with host
    const players = [{
      id: playerId,
      uuid: playerId,
      name: playerName.trim(),
      isHost: true,
      isAI: false,
      color: 'red', // Host gets red
      connected: true
    }];

    // Add AI players if specified
    const colors = ['red', 'blue', 'green', 'yellow'];
    const aiPlayerNames = ['AI Bot Alpha', 'AI Bot Beta', 'AI Bot Gamma'];
    
    for (let i = 0; i < aiPlayers; i++) {
      const aiPlayerId = generatePlayerId();
      const availableColor = colors.find(color => !players.map(p => p.color).includes(color));
      
      players.push({
        id: aiPlayerId,
        uuid: aiPlayerId,
        name: aiPlayerNames[i] || `AI Bot ${i + 1}`,
        isHost: false,
        isAI: true,
        color: availableColor || colors[i + 1],
        connected: true // AI players are always "connected"
      });
    }

    // Create initial game state with proper structure for frontend validation
    const initialGameState = {
      gamePhase: 'waiting', // waiting, playing, finished
      players: players,
      pieces: initializeGamePieces(players), // Frontend expects pieces array
      currentTurn: 0, // Frontend expects player index, not player ID
      winner: null,
      lastDiceRoll: null,
      moveHistory: []
    };

    const roomData = {
      id: roomId,
      maxPlayers,
      aiPlayers,
      players,
      gameState: 'waiting', // Keep for backward compatibility
      gamePhase: 'waiting', // Add gamePhase for consistency
      gameStateData: initialGameState, // Store the actual game state
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    gameRooms.set(roomId, roomData);
    
    // Store in database
    const { error } = await supabase
      .from('game_rooms')
      .insert([{
        room_id: roomId,
        max_players: maxPlayers,
        ai_players: aiPlayers,
        game_state: 'waiting',
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Database error:', error);
    }

    res.json({
      roomId,
      playerId,
      roomData
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Join a game room
app.post('/api/rooms/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { playerName } = req.body;
    
    if (!playerName || playerName.trim().length === 0) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    const room = gameRooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Count only human players (non-AI) for room capacity check
    const humanPlayerCount = room.players.filter(p => !p.isAI).length;
    if (humanPlayerCount >= room.maxPlayers) {
      return res.status(400).json({ error: 'Room is full' });
    }

    if (room.gameState !== 'waiting') {
      return res.status(400).json({ error: 'Game already in progress' });
    }

    const playerId = generatePlayerId();
    const colors = ['red', 'blue', 'green', 'yellow'];
    const usedColors = room.players.map(p => p.color);
    const availableColor = colors.find(color => !usedColors.includes(color));

    const newPlayer = {
      id: playerId,
      name: playerName.trim(),
      isHost: false,
      isAI: false,
      color: availableColor,
      connected: true
    };

    room.players.push(newPlayer);
    room.lastActivity = new Date().toISOString();
    
    // Notify all players in the room
    io.to(roomId).emit('playerJoined', {
      player: newPlayer,
      roomData: room
    });

    res.json({
      playerId,
      roomData: room
    });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Get room information
app.get('/api/rooms/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;
    const room = gameRooms.get(roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ roomData: room });
  } catch (error) {
    console.error('Error getting room:', error);
    res.status(500).json({ error: 'Failed to get room information' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join a room
  socket.on('joinRoom', ({ roomId, playerId }, callback) => {
    try {
      console.log(`Player ${playerId} attempting to join room ${roomId}`);
      
      // Get room data first, before joining socket room
      const room = gameRooms.get(roomId);
      if (!room) {
        if (callback) callback({ error: 'Room not found' });
        return;
      }
      
      // Initialize gameStateData if it doesn't exist (for backward compatibility)
      if (!room.gameStateData) {
        room.gameStateData = {
          gamePhase: room.gameState || 'waiting',
          players: room.players,
          pieces: initializeGamePieces(room.players), // Frontend expects pieces array
          currentTurn: 0, // Frontend expects player index, not player ID
          winner: null,
          lastDiceRoll: null,
          moveHistory: []
        };
      }
      
      // Look for existing player by ID or UUID
      let player = room.players.find(p => p.id === playerId || p.uuid === playerId);
      
      console.log(`Looking for player ${playerId} in room ${roomId}`);
      console.log(`Room players:`, room.players.map(p => ({ id: p.id, uuid: p.uuid, name: p.name, isAI: p.isAI })));
      
      if (player) {
        // Existing player reconnecting - check if they're already connected with a different socket
        if (player.connected && player.socketId && player.socketId !== socket.id) {
          console.log(`Player ${playerId} already connected with socket ${player.socketId}, rejecting duplicate connection`);
          if (callback) callback({ error: 'Player already connected from another session' });
          return;
        }
        
        // Update connection info
        player.connected = true;
        player.socketId = socket.id;
        console.log(`Existing player ${playerId} reconnected to room ${roomId}`);
      } else {
        // New player joining - validate room capacity and state
        if (room.gameState !== 'waiting') {
          if (callback) callback({ error: 'Game already in progress' });
          return;
        }
        
        // Count total players (including AI) for absolute limit
        const totalPlayerCount = room.players.length;
        if (totalPlayerCount >= room.maxPlayers) {
          if (callback) callback({ error: 'Room is full' });
          return;
        }
        
        // Count only human players for game balance
        const humanPlayerCount = room.players.filter(p => !p.isAI).length;
        if (humanPlayerCount >= room.maxPlayers) {
          if (callback) callback({ error: 'Maximum human players reached' });
          return;
        }
        
        // Add new player to room
        const colors = ['red', 'blue', 'green', 'yellow'];
        const usedColors = room.players.map(p => p.color);
        const availableColor = colors.find(color => !usedColors.includes(color));
        
        player = {
          id: playerId,
          uuid: playerId, // Store UUID for consistency
          name: `Player ${room.players.length + 1}`, // Default name, will be updated
          isHost: false, // Host is assigned during room creation, not during join
          isAI: false,
          color: availableColor || 'red',
          connected: true,
          socketId: socket.id
        };
        
        room.players.push(player);
        console.log(`New player ${playerId} added to room ${roomId} as ${player.isHost ? 'host' : 'player'}`);
        
        // Update game state with new player
        if (room.gameStateData) {
          room.gameStateData.players = room.players;
          // CRITICAL FIX: Update pieces array to match new player count
          room.gameStateData.pieces = initializeGamePieces(room.players);
        }
        
        // Notify other players
        socket.to(roomId).emit('playerJoined', {
          player: player,
          roomData: room
        });
      }
      
      // Only join socket room after all validations pass
      socket.join(roomId);
      socket.roomId = roomId;
      socket.playerId = playerId;
      
      // Update room activity
      room.lastActivity = new Date().toISOString();
      
      // Send success response with room data
      if (callback) callback({ roomData: room });
      
      // Broadcast updated room state
      io.to(roomId).emit('roomUpdate', room);
      
      // Send game state update to all players in room
      if (room.gameStateData) {
        io.to(roomId).emit('gameStateUpdate', room.gameStateData);
      }
    } catch (error) {
      console.error('Error in joinRoom:', error);
      if (callback) callback({ error: 'Failed to join room' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    if (socket.roomId && socket.playerId) {
      const room = gameRooms.get(socket.roomId);
      if (room) {
        const player = room.players.find(p => p.id === socket.playerId);
        if (player) {
          player.connected = false;
          player.socketId = null;
        }
        
        // Broadcast updated room state
        io.to(socket.roomId).emit('roomUpdate', room);
      }
    }
  });

  // Start game
  socket.on('startGame', ({ roomId }, callback) => {
    try {
      console.log(`Player ${socket.playerId} attempting to start game in room ${roomId}`);
      
      const room = gameRooms.get(roomId);
      if (!room) {
        if (callback) callback({ error: 'Room not found' });
        return;
      }
      
      // Check if player is the host
      const player = room.players.find(p => p.id === socket.playerId || p.uuid === socket.playerId);
      if (!player || !player.isHost) {
        if (callback) callback({ error: 'Only the host can start the game' });
        return;
      }
      
      // Check if game is in waiting state
      if (room.gameState !== 'waiting') {
        if (callback) callback({ error: 'Game is not in waiting state' });
        return;
      }
      
      // Check minimum players (at least 2 total players with at least 1 human)
      const humanPlayers = room.players.filter(p => !p.isAI);
      const totalPlayers = room.players.length;
      
      if (humanPlayers.length < 1) {
        if (callback) callback({ error: 'Need at least 1 human player to start the game' });
        return;
      }
      
      if (totalPlayers < GAME_CONSTANTS.MIN_PLAYERS) {
        if (callback) callback({ error: 'Need at least 2 players to start the game' });
        return;
      }
      
      // Update room state
      room.gameState = 'playing';
      room.lastActivity = new Date().toISOString();
      
      // Update game state data
      if (!room.gameStateData) {
        room.gameStateData = {
          gamePhase: 'playing',
          players: room.players,
          pieces: initializeGamePieces(room.players),
          currentTurn: 0,
          winner: null,
          lastDiceRoll: null,
          moveHistory: []
        };
      } else {
        room.gameStateData.gamePhase = 'playing';
        room.gameStateData.currentTurn = 0;
        room.gameStateData.lastDiceRoll = null;
      }
      
      console.log(`Game started in room ${roomId} with ${room.players.length} players`);
      
      // Send success response
      if (callback) callback({ success: true });
      
      // Broadcast game started event to all players
      io.to(roomId).emit('gameStarted', {
        gameState: room.gameStateData,
        roomData: room
      });
      
      // Broadcast updated room state
      io.to(roomId).emit('roomUpdate', room);
      
      // Broadcast updated game state
      io.to(roomId).emit('gameStateUpdate', room.gameStateData);
      
    } catch (error) {
      console.error('Error in startGame:', error);
      if (callback) callback({ error: 'Failed to start game' });
    }
  });

  // Roll dice
  socket.on('rollDice', ({ roomId, playerId }, callback) => {
    try {
      console.log(`Player ${playerId} attempting to roll dice in room ${roomId}`);
      
      const room = gameRooms.get(roomId);
      if (!room) {
        if (callback) callback({ error: 'Room not found' });
        return;
      }
      
      // Check if game is in playing state
      if (room.gameState !== 'playing' || room.gameStateData?.gamePhase !== 'playing') {
        if (callback) callback({ error: 'Game is not in playing state' });
        return;
      }
      
      // Check if it's the player's turn
      const currentPlayerIndex = room.gameStateData.currentTurn;
      const currentPlayer = room.gameStateData.players[currentPlayerIndex];
      
      if (!currentPlayer || (currentPlayer.id !== playerId && currentPlayer.uuid !== playerId)) {
        if (callback) callback({ error: 'Not your turn' });
        return;
      }
      
      // Check if player already rolled dice this turn
      if (room.gameStateData.lastDiceRoll && room.gameStateData.lastDiceRoll.playerId === playerId) {
        if (callback) callback({ error: 'You have already rolled the dice this turn' });
        return;
      }
      
      // Roll the dice (1-6)
      const diceValue = Math.floor(Math.random() * 6) + 1;
      
      // Update game state
      room.gameStateData.lastDiceRoll = {
        playerId: playerId,
        value: diceValue,
        timestamp: Date.now()
      };
      
      // Add to move history
      room.gameStateData.moveHistory.push({
        type: 'dice_roll',
        playerId: playerId,
        value: diceValue,
        timestamp: Date.now()
      });
      
      room.lastActivity = new Date().toISOString();
      
      console.log(`Player ${playerId} rolled ${diceValue} in room ${roomId}`);
      
      // Send success response
      if (callback) callback({ diceValue: diceValue });
      
      // Broadcast dice roll to all players
      io.to(roomId).emit('diceRolled', {
        playerId: playerId,
        diceValue: diceValue,
        gameState: room.gameStateData
      });
      
      // Broadcast updated game state
      io.to(roomId).emit('gameStateUpdate', room.gameStateData);
      
    } catch (error) {
      console.error('Error in rollDice:', error);
      if (callback) callback({ error: 'Failed to roll dice' });
    }
  });

  // Move piece
  socket.on('movePiece', ({ roomId, playerId, pieceId, diceValue }, callback) => {
    try {
      console.log(`Player ${playerId} attempting to move piece ${pieceId} in room ${roomId}`);
      
      const room = gameRooms.get(roomId);
      if (!room) {
        if (callback) callback({ error: 'Room not found' });
        return;
      }
      
      // Check if game is in playing state
      if (room.gameState !== 'playing' || room.gameStateData?.gamePhase !== 'playing') {
        if (callback) callback({ error: 'Game is not in playing state' });
        return;
      }
      
      // Check if it's the player's turn
      const currentPlayerIndex = room.gameStateData.currentTurn;
      const currentPlayer = room.gameStateData.players[currentPlayerIndex];
      
      if (!currentPlayer || (currentPlayer.id !== playerId && currentPlayer.uuid !== playerId)) {
        if (callback) callback({ error: 'Not your turn' });
        return;
      }
      
      // Check if player has rolled dice
      if (!room.gameStateData.lastDiceRoll || room.gameStateData.lastDiceRoll.playerId !== playerId) {
        if (callback) callback({ error: 'You must roll the dice first' });
        return;
      }
      
      // Verify dice value matches
      if (room.gameStateData.lastDiceRoll.value !== diceValue) {
        if (callback) callback({ error: 'Invalid dice value' });
        return;
      }
      
      // Find the piece to move
      const piece = room.gameStateData.pieces.find(p => p.id === pieceId);
      if (!piece) {
        if (callback) callback({ error: 'Piece not found' });
        return;
      }
      
      // Check if piece belongs to current player
      if (piece.playerId !== playerId) {
        if (callback) callback({ error: 'This piece does not belong to you' });
        return;
      }
      
      // Calculate new position (simplified logic for now)
      let newPosition = piece.position;
      
      // If piece is at home, can only move out with a 6
      if (piece.position === GAME_CONSTANTS.HOME_POSITION) {
        if (diceValue === 6) {
          // Move piece to starting position
          const playerColor = currentPlayer.color;
          const startPositions = { red: 0, blue: 13, green: 26, yellow: 39 };
          newPosition = startPositions[playerColor] || 0;
        } else {
          if (callback) callback({ error: 'Need a 6 to move piece out of home' });
          return;
        }
      } else {
        // Move piece forward by dice value
        newPosition = piece.position + diceValue;
        
        // Simple boundary check (more complex logic needed for finish area)
        if (newPosition >= 52) {
          newPosition = newPosition - 52; // Wrap around for now
        }
      }
      
      // Update piece position
      piece.position = newPosition;
      piece.isSafe = [0, 8, 13, 21, 26, 34, 39, 47].includes(newPosition);
      
      // Add to move history
      room.gameStateData.moveHistory.push({
        type: 'piece_move',
        playerId: playerId,
        pieceId: pieceId,
        fromPosition: piece.position,
        toPosition: newPosition,
        diceValue: diceValue,
        timestamp: Date.now()
      });
      
      // Clear dice roll and move to next player's turn
      room.gameStateData.lastDiceRoll = null;
      
      // Move to next player (unless rolled a 6)
      if (diceValue !== 6) {
        room.gameStateData.currentTurn = (room.gameStateData.currentTurn + 1) % room.gameStateData.players.length;
      }
      
      room.lastActivity = new Date().toISOString();
      
      console.log(`Player ${playerId} moved piece ${pieceId} to position ${newPosition} in room ${roomId}`);
      
      // Send success response
      if (callback) callback({ success: true, newPosition: newPosition });
      
      // Broadcast piece move to all players
      io.to(roomId).emit('pieceMoved', {
        playerId: playerId,
        pieceId: pieceId,
        newPosition: newPosition,
        diceValue: diceValue,
        gameState: room.gameStateData
      });
      
      // Broadcast updated game state
      io.to(roomId).emit('gameStateUpdate', room.gameStateData);
      
    } catch (error) {
      console.error('Error in movePiece:', error);
      if (callback) callback({ error: 'Failed to move piece' });
    }
  });
});

// Cleanup inactive rooms (run every 5 minutes)
setInterval(() => {
  const now = new Date();
  const timeout = parseInt(process.env.GAME_SESSION_TIMEOUT) || 15 * 60 * 1000; // 15 minutes
  
  for (const [roomId, room] of gameRooms.entries()) {
    const lastActivity = new Date(room.lastActivity);
    if (now - lastActivity > timeout) {
      console.log(`Cleaning up inactive room: ${roomId}`);
      gameRooms.delete(roomId);
      
      // Remove from database
      supabase
        .from('game_rooms')
        .delete()
        .eq('room_id', roomId)
        .then(({ error }) => {
          if (error) console.error('Error deleting room from database:', error);
        });
    }
  }
}, 5 * 60 * 1000); // 5 minutes

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3060;

server.listen(PORT, () => {
  console.log(`🚀 LudoPals server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🎮 Environment: ${process.env.NODE_ENV || 'development'}`);
});