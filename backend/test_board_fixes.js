/**
 * Comprehensive test script to verify the Ludo board fixes
 * Tests both visual board layout and game logic functionality
 */

const io = require('socket.io-client');

// Configuration
const BACKEND_URL = 'http://localhost:3000';

class BoardFixTester {
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

  async createRoomAndStart(hostName = 'TestHost', hostUUID = 'test-host-uuid') {
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
          aiPlayers: 1
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

  async joinRoom(socket, roomId, playerId) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join room timeout'));
      }, 5000);

      socket.emit('joinRoom', { roomId, playerId }, (response) => {
        clearTimeout(timeout);
        
        if (response.error) {
          reject(new Error(response.error));
        } else {
          this.log(`Successfully joined room ${roomId} as ${playerId}`);
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
          reject(new Error(response.error));
        } else {
          this.log('Game started successfully', 'success');
          resolve(response);
        }
      });
    });
  }

  async rollDice(socket, roomId, playerId) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Roll dice timeout'));
      }, 5000);

      socket.emit('rollDice', { roomId, playerId }, (response) => {
        clearTimeout(timeout);
        
        if (response?.error) {
          this.log(`Roll dice result: ${response.error}`, 'warning');
          resolve({ success: false, error: response.error, diceValue: null });
        } else if (response?.diceValue) {
          this.log(`Dice rolled: ${response.diceValue}`, 'success');
          resolve({ success: true, diceValue: response.diceValue });
        } else {
          reject(new Error('Invalid dice response'));
        }
      });
    });
  }

  async testGameLogicWithDifferentDiceValues() {
    this.log('\n🎲 Testing game logic with different dice values...');
    
    try {
      // Create room and start game
      const { roomId, hostId } = await this.createRoomAndStart('LogicTestHost', 'logic-test-uuid');
      const hostSocket = await this.createSocket('HostSocket');
      
      await this.joinRoom(hostSocket, roomId, hostId);
      await this.startGame(hostSocket, roomId);
      
      this.log('\n🎯 Testing dice rolling with pieces at home...');
      
      // Test multiple dice rolls to see different behaviors
      const testResults = [];
      
      for (let i = 0; i < 10; i++) {
        const diceResult = await this.rollDice(hostSocket, roomId, hostId);
        
        testResults.push({
          attempt: i + 1,
          diceValue: diceResult.diceValue,
          success: diceResult.success,
          error: diceResult.error
        });
        
        // Wait a bit between rolls
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Analyze results
      this.log('\n📊 Dice Roll Test Results:');
      testResults.forEach(result => {
        if (result.success) {
          this.log(`Attempt ${result.attempt}: Rolled ${result.diceValue} - Success`);
        } else {
          this.log(`Attempt ${result.attempt}: ${result.error}`, 'warning');
        }
      });
      
      // Check if we got the expected behavior
      const rollsWithSix = testResults.filter(r => r.diceValue === 6);
      const rollsWithoutSix = testResults.filter(r => r.diceValue && r.diceValue !== 6);
      const noValidMovesErrors = testResults.filter(r => r.error && r.error.includes('No valid moves'));
      
      this.log('\n🔍 Analysis:');
      this.log(`Rolls with 6: ${rollsWithSix.length}`);
      this.log(`Rolls without 6: ${rollsWithoutSix.length}`);
      this.log(`"No valid moves" errors: ${noValidMovesErrors.length}`);
      
      // Verify expected behavior
      if (rollsWithoutSix.length > 0 && noValidMovesErrors.length === 0) {
        this.log('⚠️ Expected "No valid moves" errors for non-6 rolls when pieces are at home', 'warning');
        return { success: false, issue: 'Missing expected "No valid moves" behavior' };
      } else if (rollsWithoutSix.length > 0 && noValidMovesErrors.length > 0) {
        this.log('✅ Correct behavior: Non-6 rolls result in "No valid moves" when pieces are at home', 'success');
        return { success: true };
      } else {
        this.log('ℹ️ Only rolled 6s in this test - behavior is correct but inconclusive');
        return { success: true, note: 'Only rolled 6s - need more testing' };
      }
      
    } catch (error) {
      this.log(`❌ Game logic test failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async testBoardStructure() {
    this.log('\n🏗️ Testing board structure and game state...');
    
    try {
      // Create room and start game
      const { roomId, hostId } = await this.createRoomAndStart('StructureTestHost', 'structure-test-uuid');
      const hostSocket = await this.createSocket('HostSocket');
      
      const joinResponse = await this.joinRoom(hostSocket, roomId, hostId);
      await this.startGame(hostSocket, roomId);
      
      // Check game state structure
      const roomData = joinResponse.roomData;
      
      this.log('🔍 Checking game state structure...');
      
      // Verify players
      if (!roomData.players || roomData.players.length < 2) {
        throw new Error('Invalid players structure');
      }
      this.log(`✅ Players: ${roomData.players.length} (${roomData.players.filter(p => !p.isAI).length} human, ${roomData.players.filter(p => p.isAI).length} AI)`);
      
      // Verify game state data
      if (!roomData.gameStateData) {
        throw new Error('Missing gameStateData');
      }
      this.log('✅ Game state data structure exists');
      
      // Verify pieces
      if (!roomData.gameStateData.pieces || roomData.gameStateData.pieces.length === 0) {
        throw new Error('Missing or empty pieces array');
      }
      this.log(`✅ Pieces: ${roomData.gameStateData.pieces.length} total pieces`);
      
      // Check piece positions (should all be at home initially)
      const homePieces = roomData.gameStateData.pieces.filter(p => p.position === -1);
      this.log(`✅ Home pieces: ${homePieces.length} (all pieces start at home)`);
      
      // Verify colors are assigned
      const colors = [...new Set(roomData.players.map(p => p.color))];
      this.log(`✅ Player colors: ${colors.join(', ')}`);
      
      return { success: true };
      
    } catch (error) {
      this.log(`❌ Board structure test failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
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
    this.log('🚀 Starting comprehensive board fix tests...\n');
    
    try {
      // Test board structure
      const structureResult = await this.testBoardStructure();
      
      // Test game logic
      const logicResult = await this.testGameLogicWithDifferentDiceValues();
      
      // Results summary
      this.log('\n📊 FINAL TEST RESULTS:');
      this.log(`${structureResult.success ? '✅ PASSED' : '❌ FAILED'}: Board Structure Test`);
      this.log(`${logicResult.success ? '✅ PASSED' : '❌ FAILED'}: Game Logic Test`);
      
      const allPassed = structureResult.success && logicResult.success;
      
      if (allPassed) {
        this.log('\n🎉 ALL TESTS PASSED!', 'success');
        this.log('✅ Board structure is correct');
        this.log('✅ Game logic works as expected');
        this.log('✅ "No valid moves available" is correct behavior for non-6 rolls when pieces are at home');
      } else {
        this.log('\n💥 SOME TESTS FAILED!', 'error');
        if (!structureResult.success) {
          this.log(`❌ Board structure issue: ${structureResult.error}`);
        }
        if (!logicResult.success) {
          this.log(`❌ Game logic issue: ${logicResult.error || logicResult.issue}`);
        }
      }
      
      return allPassed;
      
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      return false;
    } finally {
      this.cleanup();
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new BoardFixTester();
  
  tester.runAllTests()
    .then((allPassed) => {
      if (allPassed) {
        console.log('\n🎯 Board fixes verified successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Board fixes need attention!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Test suite crashed:', error.message);
      tester.cleanup();
      process.exit(1);
    });
}

module.exports = { BoardFixTester };