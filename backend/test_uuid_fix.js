/**
 * Test script to reproduce and verify the UUID/ID mismatch issue fix
 * This script simulates the exact scenario described in the issue logs
 */

const io = require('socket.io-client');

// Configuration
const BACKEND_URL = 'http://localhost:3000';
const TEST_PLAYER_UUID = 'c7c1cece-1e4f-48d4-af3c-4f3cff91e2d3';
const TEST_PLAYER_NAME = 'TestPlayer';

class UUIDFixTester {
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

  async createRoomWithUUID(playerUUID, playerName) {
    try {
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(`${BACKEND_URL}/api/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: playerName,
          playerUUID: playerUUID,
          maxPlayers: 4,
          aiPlayers: 1 // Add one AI player like in the logs
        })
      });

      const data = await response.json();
      if (data.roomId) {
        this.log(`Room created: ${data.roomId} with host UUID: ${data.playerId}`);
        return { roomId: data.roomId, hostId: data.playerId };
      } else {
        throw new Error(`Failed to create room: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      this.log(`Error creating room: ${error.message}`, 'error');
      throw error;
    }
  }

  async joinRoom(socket, roomId, playerId, expectedResult = 'success') {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join room timeout'));
      }, 5000);

      socket.emit('joinRoom', { roomId, playerId }, (response) => {
        clearTimeout(timeout);
        
        if (expectedResult === 'success') {
          if (response.error) {
            this.log(`Unexpected join error: ${response.error}`, 'error');
            reject(new Error(response.error));
          } else {
            this.log(`Successfully joined room ${roomId} as ${playerId}`);
            this.log(`Room now has ${response.roomData.players.length} players:`);
            response.roomData.players.forEach(player => {
              this.log(`  - ID: ${player.id}, UUID: ${player.uuid}, Name: ${player.name}, AI: ${player.isAI}`);
            });
            resolve(response);
          }
        } else {
          if (response.error) {
            this.log(`Expected join error received: ${response.error}`, 'success');
            resolve(response);
          } else {
            this.log(`Expected join to fail but it succeeded`, 'error');
            reject(new Error('Expected join to fail'));
          }
        }
      });
    });
  }

  async testUUIDConsistency() {
    this.log('\n🧪 Testing UUID consistency fix...');
    
    try {
      // Step 1: Create room with specific UUID (simulating frontend room creation)
      this.log('\n📝 Step 1: Creating room with UUID via API...');
      const { roomId, hostId } = await this.createRoomWithUUID(TEST_PLAYER_UUID, TEST_PLAYER_NAME);
      
      // Verify that the returned hostId matches the provided UUID
      if (hostId !== TEST_PLAYER_UUID) {
        throw new Error(`Host ID mismatch! Expected: ${TEST_PLAYER_UUID}, Got: ${hostId}`);
      }
      this.log(`✅ Host ID correctly matches provided UUID: ${hostId}`);
      
      // Step 2: Create socket connection and join room (simulating frontend socket join)
      this.log('\n🔌 Step 2: Connecting socket and joining room...');
      const socket = await this.createSocket('PlayerSocket');
      
      // First join attempt - should find existing player
      this.log('\n👤 Step 3: First join attempt (should find existing player)...');
      const firstJoinResponse = await this.joinRoom(socket, roomId, TEST_PLAYER_UUID, 'success');
      
      // Verify no duplicate players were created
      const playersAfterFirstJoin = firstJoinResponse.roomData.players;
      const humanPlayers = playersAfterFirstJoin.filter(p => !p.isAI);
      
      if (humanPlayers.length !== 1) {
        throw new Error(`Expected 1 human player after first join, got ${humanPlayers.length}`);
      }
      
      const hostPlayer = humanPlayers[0];
      if (hostPlayer.id !== TEST_PLAYER_UUID || hostPlayer.uuid !== TEST_PLAYER_UUID) {
        throw new Error(`Player ID/UUID mismatch! ID: ${hostPlayer.id}, UUID: ${hostPlayer.uuid}`);
      }
      
      this.log(`✅ First join successful - no duplicate player created`);
      
      // Step 4: Disconnect and reconnect (simulating page refresh)
      this.log('\n🔄 Step 4: Disconnecting and reconnecting...');
      socket.disconnect();
      
      // Wait a moment for disconnect to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const socket2 = await this.createSocket('ReconnectSocket');
      
      // Second join attempt - should still find existing player, not create duplicate
      this.log('\n👤 Step 5: Second join attempt (should find existing player, not create duplicate)...');
      const secondJoinResponse = await this.joinRoom(socket2, roomId, TEST_PLAYER_UUID, 'success');
      
      // Verify still no duplicate players
      const playersAfterSecondJoin = secondJoinResponse.roomData.players;
      const humanPlayersAfterReconnect = playersAfterSecondJoin.filter(p => !p.isAI);
      
      if (humanPlayersAfterReconnect.length !== 1) {
        throw new Error(`Expected 1 human player after reconnect, got ${humanPlayersAfterReconnect.length}. Players: ${JSON.stringify(playersAfterSecondJoin.map(p => ({id: p.id, uuid: p.uuid, name: p.name, isAI: p.isAI})))}`);
      }
      
      const reconnectedPlayer = humanPlayersAfterReconnect[0];
      if (reconnectedPlayer.id !== TEST_PLAYER_UUID || reconnectedPlayer.uuid !== TEST_PLAYER_UUID) {
        throw new Error(`Player ID/UUID mismatch after reconnect! ID: ${reconnectedPlayer.id}, UUID: ${reconnectedPlayer.uuid}`);
      }
      
      this.log(`✅ Second join successful - no duplicate player created on reconnect`);
      this.log(`✅ UUID consistency test PASSED!`, 'success');
      
      return true;
    } catch (error) {
      this.log(`❌ UUID consistency test FAILED: ${error.message}`, 'error');
      return false;
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
    this.log('🚀 Starting UUID consistency test...\n');
    
    try {
      const result = await this.testUUIDConsistency();
      return result;
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      return false;
    } finally {
      this.cleanup();
    }
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  const tester = new UUIDFixTester();
  
  tester.runTest()
    .then((passed) => {
      if (passed) {
        console.log('\n🎉 UUID consistency test passed!');
        process.exit(0);
      } else {
        console.log('\n💥 UUID consistency test failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Test suite crashed:', error.message);
      tester.cleanup();
      process.exit(1);
    });
}

module.exports = { UUIDFixTester };