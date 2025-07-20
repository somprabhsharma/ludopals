/**
 * Test script to reproduce the "Need at least 2 players" error
 * This script creates a room with 1 human + 1 AI player and tries to start the game
 */

const io = require('socket.io-client');

// Configuration
const BACKEND_URL = 'http://localhost:3000';

class StartGameTester {
  constructor() {
    this.sockets = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async createSocket(name = 'TestSocket') {
    const socket = io(BACKEND_URL);
    this.sockets.push({ socket, name });
    
    return new Promise((resolve, reject) => {
      socket.on('connect', () => {
        this.log(`${name} connected with ID: ${socket.id}`);
        resolve(socket);
      });
      
      socket.on('error', (error) => {
        this.log(`${name} error: ${error}`, 'error');
        reject(error);
      });
      
      setTimeout(() => {
        reject(new Error(`${name} connection timeout`));
      }, 5000);
    });
  }

  async createRoomWithAI(hostName = 'TestHost', hostUUID = 'test-host-uuid') {
    try {
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(`${BACKEND_URL}/api/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: hostName,
          playerUUID: hostUUID,
          maxPlayers: 4,
          aiPlayers: 1 // Create room with 1 AI player
        })
      });

      const data = await response.json();
      if (data.roomId) {
        this.log(`Room created: ${data.roomId} with host: ${data.playerId}`);
        this.log(`Room should have 1 human + 1 AI = 2 total players`);
        return { roomId: data.roomId, hostId: data.playerId };
      } else {
        throw new Error(`Failed to create room: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      this.log(`Error creating room: ${error.message}`, 'error');
      throw error;
    }
  }

  async joinRoom(socket, roomId, playerId) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join room timeout'));
      }, 5000);

      socket.emit('joinRoom', { roomId, playerId }, (response) => {
        clearTimeout(timeout);
        
        if (response.error) {
          this.log(`Join room error: ${response.error}`, 'error');
          reject(new Error(response.error));
        } else {
          this.log(`Successfully joined room ${roomId} as ${playerId}`);
          
          // Log detailed player information
          const players = response.roomData.players;
          this.log(`Room now has ${players.length} total players:`);
          players.forEach((player, index) => {
            this.log(`  ${index + 1}. ${player.name} (ID: ${player.id}, AI: ${player.isAI}, Host: ${player.isHost})`);
          });
          
          const humanPlayers = players.filter(p => !p.isAI);
          const aiPlayers = players.filter(p => p.isAI);
          this.log(`Human players: ${humanPlayers.length}, AI players: ${aiPlayers.length}`);
          
          resolve(response);
        }
      });
    });
  }

  async startGame(socket, roomId) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Start game timeout'));
      }, 5000);

      socket.emit('startGame', { roomId }, (response) => {
        clearTimeout(timeout);
        
        if (response?.error) {
          this.log(`Start game error: ${response.error}`, 'error');
          resolve({ success: false, error: response.error });
        } else {
          this.log('Start game request successful', 'success');
          resolve({ success: true });
        }
      });
    });
  }

  async testStartGameIssue() {
    this.log('\n🧪 Testing Start Game issue with 1 human + 1 AI player...');
    
    try {
      // Step 1: Create room with 1 human + 1 AI player
      this.log('\n📝 Step 1: Creating room with 1 AI player...');
      const { roomId, hostId } = await this.createRoomWithAI('TestHost', 'test-host-uuid');
      
      // Step 2: Host joins the room
      this.log('\n🏠 Step 2: Host joining room...');
      const hostSocket = await this.createSocket('HostSocket');
      const joinResponse = await this.joinRoom(hostSocket, roomId, hostId);
      
      // Step 3: Verify room state
      this.log('\n🔍 Step 3: Verifying room state...');
      const totalPlayers = joinResponse.roomData.players.length;
      const humanPlayers = joinResponse.roomData.players.filter(p => !p.isAI).length;
      const aiPlayers = joinResponse.roomData.players.filter(p => p.isAI).length;
      
      this.log(`Total players: ${totalPlayers}`);
      this.log(`Human players: ${humanPlayers}`);
      this.log(`AI players: ${aiPlayers}`);
      
      // Step 4: Frontend logic check
      this.log('\n🖥️ Step 4: Frontend validation check...');
      const frontendWouldEnable = totalPlayers >= 2;
      this.log(`Frontend would ${frontendWouldEnable ? 'ENABLE' : 'DISABLE'} Start Game button (roomData.players.length >= 2: ${totalPlayers >= 2})`);
      
      // Step 5: Try to start the game
      this.log('\n🎮 Step 5: Attempting to start game...');
      const startResult = await this.startGame(hostSocket, roomId);
      
      // Step 6: Analyze results
      this.log('\n📊 Step 6: Results Analysis...');
      if (frontendWouldEnable && !startResult.success) {
        this.log('🎯 ISSUE REPRODUCED!', 'warning');
        this.log(`Frontend shows ${totalPlayers} players and would enable Start Game button`, 'warning');
        this.log(`Backend rejects with: "${startResult.error}"`, 'warning');
        this.log(`Backend only counts ${humanPlayers} human players, needs 2`, 'warning');
        return { reproduced: true, error: startResult.error };
      } else if (frontendWouldEnable && startResult.success) {
        this.log('✅ No issue - game started successfully', 'success');
        return { reproduced: false };
      } else {
        this.log('❓ Unexpected result', 'warning');
        return { reproduced: false, unexpected: true };
      }
      
    } catch (error) {
      this.log(`❌ Test failed: ${error.message}`, 'error');
      return { reproduced: false, error: error.message };
    }
  }

  cleanup() {
    this.log('\n🧹 Cleaning up connections...');
    this.sockets.forEach(({ socket, name }) => {
      socket.disconnect();
      this.log(`${name} disconnected`);
    });
    this.sockets = [];
  }

  async runTest() {
    this.log('🚀 Starting Start Game issue reproduction test...\n');
    
    try {
      const result = await this.testStartGameIssue();
      return result;
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      return { reproduced: false, error: error.message };
    } finally {
      this.cleanup();
    }
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  const tester = new StartGameTester();
  
  tester.runTest()
    .then((result) => {
      if (result.reproduced) {
        console.log('\n🎯 Issue successfully reproduced!');
        console.log(`Error: ${result.error}`);
        process.exit(0);
      } else {
        console.log('\n❓ Issue not reproduced or unexpected result');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Test suite crashed:', error.message);
      tester.cleanup();
      process.exit(1);
    });
}

module.exports = { StartGameTester };