/**
 * Test script to verify the startGame functionality
 * This script simulates the frontend behavior to test if the backend properly handles game start
 */

const io = require('socket.io-client');

// Configuration
const BACKEND_URL = 'http://localhost:3060';
const TEST_ROOM_ID = 'TEST123';

async function testStartGame() {
  console.log('🧪 Testing startGame functionality...\n');

  // Create two socket connections to simulate two players
  const hostSocket = io(BACKEND_URL);
  const playerSocket = io(BACKEND_URL);

  return new Promise((resolve, reject) => {
    let hostConnected = false;
    let playerConnected = false;
    let roomCreated = false;
    let hostJoined = false;
    let playerJoined = false;

    // Host socket connection
    hostSocket.on('connect', () => {
      console.log('✅ Host connected to server');
      hostConnected = true;
      checkAndProceed();
    });

    // Player socket connection
    playerSocket.on('connect', () => {
      console.log('✅ Player connected to server');
      playerConnected = true;
      checkAndProceed();
    });

    function checkAndProceed() {
      if (hostConnected && playerConnected && !roomCreated) {
        createRoom();
      } else if (roomCreated && !hostJoined) {
        joinAsHost();
      } else if (hostJoined && !playerJoined) {
        joinAsPlayer();
      } else if (hostJoined && playerJoined) {
        startGame();
      }
    }

    // Step 1: Create a room via HTTP API
    async function createRoom() {
      console.log('\n📝 Creating test room...');
      
      try {
        const fetch = require('node-fetch');
        const response = await fetch(`${BACKEND_URL}/api/rooms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hostId: 'host-uuid-123',
            hostName: 'Test Host',
            maxPlayers: 4,
            isPrivate: false
          })
        });

        const data = await response.json();
        if (data.roomData) {
          console.log(`✅ Room created: ${data.roomData.id}`);
          roomCreated = true;
          checkAndProceed();
        } else {
          console.error('❌ Failed to create room:', data);
          reject(new Error('Failed to create room'));
        }
      } catch (error) {
        console.error('❌ Error creating room:', error.message);
        reject(error);
      }
    }

    // Step 2: Host joins the room
    function joinAsHost() {
      console.log('\n🏠 Host joining room...');
      
      hostSocket.emit('joinRoom', { 
        roomId: TEST_ROOM_ID, 
        playerId: 'host-uuid-123' 
      }, (response) => {
        if (response.error) {
          console.error('❌ Host failed to join:', response.error);
          reject(new Error(response.error));
        } else {
          console.log('✅ Host joined room successfully');
          hostJoined = true;
          checkAndProceed();
        }
      });
    }

    // Step 3: Second player joins the room
    function joinAsPlayer() {
      console.log('\n👤 Player joining room...');
      
      playerSocket.emit('joinRoom', { 
        roomId: TEST_ROOM_ID, 
        playerId: 'player-uuid-456' 
      }, (response) => {
        if (response.error) {
          console.error('❌ Player failed to join:', response.error);
          reject(new Error(response.error));
        } else {
          console.log('✅ Player joined room successfully');
          playerJoined = true;
          checkAndProceed();
        }
      });
    }

    // Step 4: Start the game
    function startGame() {
      console.log('\n🎮 Starting game...');
      
      // Listen for game started event
      hostSocket.on('gameStarted', (data) => {
        console.log('✅ Game started event received!');
        console.log('Game Phase:', data.gameState?.gamePhase);
        console.log('Players:', data.gameState?.players?.length);
        
        if (data.gameState?.gamePhase === 'playing') {
          console.log('\n🎉 SUCCESS: Game successfully transitioned to playing phase!');
          cleanup();
          resolve(true);
        } else {
          console.log('\n❌ FAILED: Game did not transition to playing phase');
          cleanup();
          reject(new Error('Game did not start properly'));
        }
      });

      playerSocket.on('gameStarted', (data) => {
        console.log('✅ Player also received game started event');
      });

      // Emit start game event
      hostSocket.emit('startGame', { roomId: TEST_ROOM_ID }, (response) => {
        if (response?.error) {
          console.error('❌ Failed to start game:', response.error);
          cleanup();
          reject(new Error(response.error));
        } else {
          console.log('✅ Start game request sent successfully');
        }
      });
    }

    function cleanup() {
      console.log('\n🧹 Cleaning up connections...');
      hostSocket.disconnect();
      playerSocket.disconnect();
    }

    // Error handling
    hostSocket.on('error', (error) => {
      console.error('❌ Host socket error:', error);
      cleanup();
      reject(error);
    });

    playerSocket.on('error', (error) => {
      console.error('❌ Player socket error:', error);
      cleanup();
      reject(error);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      console.log('\n⏰ Test timed out');
      cleanup();
      reject(new Error('Test timed out'));
    }, 10000);
  });
}

// Run the test
if (require.main === module) {
  testStartGame()
    .then(() => {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testStartGame };