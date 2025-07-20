/**
 * Comprehensive test script to verify all fixes for the joinRoom and gamePhase issues
 * Tests: duplicate joins, room capacity, player matching, gamePhase transitions
 */

const io = require('socket.io-client');

// Configuration
const BACKEND_URL = 'http://localhost:3000';

class GameTester {
  constructor() {
    this.sockets = [];
    this.testResults = [];
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

  async createRoom(hostName = 'TestHost') {
    try {
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(`${BACKEND_URL}/api/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: hostName,
          maxPlayers: 4,
          aiPlayers: 0
        })
      });

      const data = await response.json();
      if (data.roomId) {
        this.log(`Room created: ${data.roomId} with host: ${data.playerId}`);
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

  async startGame(socket, roomId, expectedResult = 'success') {
    return new Promise((resolve, reject) => {
      let gameStartedReceived = false;
      
      // Listen for gameStarted event
      socket.on('gameStarted', (data) => {
        gameStartedReceived = true;
        this.log(`Game started event received! GamePhase: ${data.gameState?.gamePhase}`);
        
        if (data.gameState?.gamePhase === 'playing') {
          this.log('✅ SUCCESS: Game successfully transitioned to playing phase!', 'success');
          resolve(data);
        } else {
          this.log('❌ FAILED: Game did not transition to playing phase', 'error');
          reject(new Error('Game did not start properly'));
        }
      });

      const timeout = setTimeout(() => {
        if (!gameStartedReceived) {
          reject(new Error('Start game timeout - no gameStarted event received'));
        }
      }, 5000);

      socket.emit('startGame', { roomId }, (response) => {
        if (expectedResult === 'success') {
          if (response?.error) {
            clearTimeout(timeout);
            this.log(`Start game error: ${response.error}`, 'error');
            reject(new Error(response.error));
          } else {
            this.log('Start game request sent successfully');
            // Don't resolve here, wait for gameStarted event
          }
        } else {
          clearTimeout(timeout);
          if (response?.error) {
            this.log(`Expected start game error: ${response.error}`, 'success');
            resolve(response);
          } else {
            this.log('Expected start game to fail but it succeeded', 'error');
            reject(new Error('Expected start game to fail'));
          }
        }
      });
    });
  }

  async testDuplicateJoinPrevention() {
    this.log('\n🧪 Testing duplicate join prevention...');
    
    try {
      // Create room and get host info
      const { roomId, hostId } = await this.createRoom('DuplicateTestHost');
      
      // Create two sockets for the same player
      const socket1 = await this.createSocket('Socket1');
      const socket2 = await this.createSocket('Socket2');
      
      // First join should succeed
      await this.joinRoom(socket1, roomId, hostId, 'success');
      
      // Second join with same player ID should fail
      await this.joinRoom(socket2, roomId, hostId, 'error');
      
      this.log('✅ Duplicate join prevention test PASSED', 'success');
      return true;
    } catch (error) {
      this.log(`❌ Duplicate join prevention test FAILED: ${error.message}`, 'error');
      return false;
    }
  }

  async testRoomCapacityLimits() {
    this.log('\n🧪 Testing room capacity limits...');
    
    try {
      // Create room with max 4 players
      const { roomId, hostId } = await this.createRoom('CapacityTestHost');
      
      // Create sockets for host + 3 additional players
      const hostSocket = await this.createSocket('HostSocket');
      const player2Socket = await this.createSocket('Player2Socket');
      const player3Socket = await this.createSocket('Player3Socket');
      const player4Socket = await this.createSocket('Player4Socket');
      const player5Socket = await this.createSocket('Player5Socket');
      
      // Join players one by one
      await this.joinRoom(hostSocket, roomId, hostId, 'success');
      await this.joinRoom(player2Socket, roomId, 'player2-uuid', 'success');
      await this.joinRoom(player3Socket, roomId, 'player3-uuid', 'success');
      await this.joinRoom(player4Socket, roomId, 'player4-uuid', 'success');
      
      // 5th player should be rejected
      await this.joinRoom(player5Socket, roomId, 'player5-uuid', 'error');
      
      this.log('✅ Room capacity limits test PASSED', 'success');
      return true;
    } catch (error) {
      this.log(`❌ Room capacity limits test FAILED: ${error.message}`, 'error');
      return false;
    }
  }

  async testGamePhaseTransition() {
    this.log('\n🧪 Testing gamePhase transition...');
    
    try {
      // Create room
      const { roomId, hostId } = await this.createRoom('GamePhaseTestHost');
      
      // Create sockets for host and one player
      const hostSocket = await this.createSocket('HostSocket');
      const playerSocket = await this.createSocket('PlayerSocket');
      
      // Join both players
      await this.joinRoom(hostSocket, roomId, hostId, 'success');
      await this.joinRoom(playerSocket, roomId, 'player2-uuid', 'success');
      
      // Host starts the game
      await this.startGame(hostSocket, roomId, 'success');
      
      this.log('✅ GamePhase transition test PASSED', 'success');
      return true;
    } catch (error) {
      this.log(`❌ GamePhase transition test FAILED: ${error.message}`, 'error');
      return false;
    }
  }

  async testNonHostStartGame() {
    this.log('\n🧪 Testing non-host start game prevention...');
    
    try {
      // Create room
      const { roomId, hostId } = await this.createRoom('NonHostTestHost');
      
      // Create sockets
      const hostSocket = await this.createSocket('HostSocket');
      const playerSocket = await this.createSocket('PlayerSocket');
      
      // Join both players
      await this.joinRoom(hostSocket, roomId, hostId, 'success');
      await this.joinRoom(playerSocket, roomId, 'player2-uuid', 'success');
      
      // Non-host tries to start game (should fail)
      await this.startGame(playerSocket, roomId, 'error');
      
      this.log('✅ Non-host start game prevention test PASSED', 'success');
      return true;
    } catch (error) {
      this.log(`❌ Non-host start game prevention test FAILED: ${error.message}`, 'error');
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

  async runAllTests() {
    this.log('🚀 Starting comprehensive game tests...\n');
    
    const tests = [
      { name: 'Duplicate Join Prevention', fn: () => this.testDuplicateJoinPrevention() },
      { name: 'Room Capacity Limits', fn: () => this.testRoomCapacityLimits() },
      { name: 'GamePhase Transition', fn: () => this.testGamePhaseTransition() },
      { name: 'Non-Host Start Game Prevention', fn: () => this.testNonHostStartGame() }
    ];

    const results = [];
    
    for (const test of tests) {
      try {
        const result = await test.fn();
        results.push({ name: test.name, passed: result });
        
        // Clean up between tests
        this.cleanup();
        
        // Wait a bit between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        this.log(`Test ${test.name} threw an error: ${error.message}`, 'error');
        results.push({ name: test.name, passed: false });
        this.cleanup();
      }
    }

    // Final results
    this.log('\n📊 TEST RESULTS:');
    results.forEach(result => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      this.log(`${status}: ${result.name}`);
    });

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    
    this.log(`\n🏁 Overall: ${passedCount}/${totalCount} tests passed`);
    
    return passedCount === totalCount;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new GameTester();
  
  tester.runAllTests()
    .then((allPassed) => {
      if (allPassed) {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
      } else {
        console.log('\n💥 Some tests failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error.message);
      tester.cleanup();
      process.exit(1);
    });
}

module.exports = { GameTester };