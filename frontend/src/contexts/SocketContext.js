/**
 * SocketContext - Manages WebSocket connections and real-time communication
 * Handles Socket.IO connection, events, and state management
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { usePlayer } from './PlayerContext';

const SocketContext = createContext();

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export function SocketProvider({ children }) {
  const { playerUUID, playerName, currentRoom } = usePlayer();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [lastPing, setLastPing] = useState(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Get backend URL from environment
  const getBackendUrl = () => {
    return process.env.REACT_APP_BACKEND_URL || 'http://localhost:3060';
  };

  // Connect to socket
  const connect = useCallback(() => {
    if (socket?.connected) {
      return socket;
    }

    setIsConnecting(true);
    setConnectionError(null);

    const backendUrl = getBackendUrl();
    console.log('Connecting to socket server:', backendUrl);

    const newSocket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxHttpBufferSize: 1e6,
      pingTimeout: 60000,
      pingInterval: 25000,
      forceNew: false, // Changed to false to prevent unnecessary new connections
      query: {
        playerUUID: playerUUID,
        playerName: playerName
      }
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);
      reconnectAttempts.current = 0;
      
      // Rejoin room if we were in one
      if (currentRoom) {
        newSocket.emit('joinRoom', {
          roomId: currentRoom.id,
          playerId: playerUUID
        });
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      setIsConnecting(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        toast.error('Disconnected from server');
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnecting(false);
      setConnectionError(error.message);
      reconnectAttempts.current++;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        toast.error('Failed to connect to game server');
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      toast.success('Reconnected to game server');
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      toast.error('Unable to reconnect to game server');
    });

    // Ping/pong for connection monitoring
    newSocket.on('pong', (latency) => {
      setLastPing(latency);
    });

    // Error handling
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(`Connection error: ${error.message}`);
    });

    setSocket(newSocket);
    return newSocket;
  }, [playerUUID, playerName, currentRoom]);

  // Disconnect socket
  const disconnect = useCallback(() => {
    if (socket) {
      console.log('Disconnecting socket');
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, [socket]);

  // Emit event with error handling
  const emit = useCallback((event, data, callback) => {
    if (!socket || !isConnected) {
      console.warn('Socket not connected, cannot emit:', event);
      if (callback) callback({ error: 'Not connected' });
      return;
    }

    console.log('Emitting event:', event, data);
    
    if (callback) {
      socket.emit(event, data, callback);
    } else {
      socket.emit(event, data);
    }
  }, [socket, isConnected]);

  // Listen to event
  const on = useCallback((event, handler) => {
    if (!socket) {
      console.warn('Socket not available, cannot listen to:', event);
      return;
    }

    console.log('Listening to event:', event);
    socket.on(event, handler);

    // Return cleanup function
    return () => {
      socket.off(event, handler);
    };
  }, [socket]);

  // Remove event listener
  const off = useCallback((event, handler) => {
    if (socket) {
      socket.off(event, handler);
    }
  }, [socket]);

  // Join a room
  const joinRoom = useCallback((roomId, playerId) => {
    emit('joinRoom', { roomId, playerId }, (response) => {
      if (response?.error) {
        toast.error(`Failed to join room: ${response.error}`);
      } else {
        console.log('Successfully joined room:', roomId);
      }
    });
  }, [emit]);

  // Leave a room
  const leaveRoom = useCallback((roomId, playerId) => {
    emit('leaveRoom', { roomId, playerId }, (response) => {
      if (response?.error) {
        toast.error(`Failed to leave room: ${response.error}`);
      } else {
        console.log('Successfully left room:', roomId);
      }
    });
  }, [emit]);

  // Roll dice
  const rollDice = useCallback((roomId, playerId) => {
    emit('rollDice', { roomId, playerId }, (response) => {
      if (response?.error) {
        toast.error(`Failed to roll dice: ${response.error}`);
      }
    });
  }, [emit]);

  // Move piece
  const movePiece = useCallback((roomId, playerId, pieceId, diceValue) => {
    emit('movePiece', { roomId, playerId, pieceId, diceValue }, (response) => {
      if (response?.error) {
        toast.error(`Failed to move piece: ${response.error}`);
      }
    });
  }, [emit]);

  // Start game
  const startGame = useCallback((roomId) => {
    emit('startGame', { roomId }, (response) => {
      if (response?.error) {
        toast.error(`Failed to start game: ${response.error}`);
      }
    });
  }, [emit]);

  // Send ping
  const ping = useCallback(() => {
    if (socket && isConnected) {
      const startTime = Date.now();
      socket.emit('ping', startTime);
    }
  }, [socket, isConnected]);

  // Get connection status
  const getConnectionStatus = useCallback(() => {
    return {
      isConnected,
      isConnecting,
      connectionError,
      lastPing,
      socketId: socket?.id,
      reconnectAttempts: reconnectAttempts.current
    };
  }, [isConnected, isConnecting, connectionError, lastPing, socket]);

  // Initialize socket connection
  useEffect(() => {
    if (playerUUID && playerName && !socket?.connected) {
      connect();
    }

    return () => {
      if (socket?.connected) {
        disconnect();
      }
    };
  }, [playerUUID, playerName]); // Removed connect, disconnect from dependencies to prevent circular loop

  // Ping interval for connection monitoring
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(ping, 30000); // Ping every 30 seconds

    return () => {
      clearInterval(pingInterval);
    };
  }, [isConnected, ping]);

  // Handle visibility change (reconnect when tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && playerUUID && !socket?.connected) {
        console.log('Tab became visible, attempting to reconnect...');
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, playerUUID]); // Removed connect from dependencies to prevent circular loop

  const contextValue = {
    // Socket instance
    socket,
    
    // Connection state
    isConnected,
    isConnecting,
    connectionError,
    lastPing,
    
    // Connection methods
    connect,
    disconnect,
    getConnectionStatus,
    
    // Event methods
    emit,
    on,
    off,
    
    // Game-specific methods
    joinRoom,
    leaveRoom,
    rollDice,
    movePiece,
    startGame,
    
    // Utility methods
    ping
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

export default SocketContext;