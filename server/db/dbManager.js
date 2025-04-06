import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Define database path
const DB_PATH = path.join(process.cwd(), 'server/db/data.json');

// Initialize database if it doesn't exist
function initializeDb() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      users: [
        {
          id: "admin-001",
          email: "admin@rahoot.com",
          username: "admin",
          password: bcrypt.hashSync("admin123", 10),
          role: "admin",
          createdAt: new Date().toISOString()
        }
      ],
      googleUsers: [],
      sessions: [],
      games: [],
      gameInstances: [],
      scores: []
    };
    
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
  }
}

// Read database
function readDb() {
  initializeDb();
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return null;
  }
}

// Write to database
function writeDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing to database:', error);
    return false;
  }
}

// User Service
export const userService = {
  // Get all users (admin only)
  getAllUsers() {
    const db = readDb();
    return db.users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  },
  
  // Find user by ID
  findById(id) {
    const db = readDb();
    return db.users.find(user => user.id === id);
  },
  
  // Find user by email
  findByEmail(email) {
    const db = readDb();
    return db.users.find(user => user.email === email);
  },
  
  // Find user by username
  findByUsername(username) {
    const db = readDb();
    return db.users.find(user => user.username === username);
  },
  
  // Find Google user by email
  findGoogleUserByEmail(email) {
    const db = readDb();
    return db.googleUsers.find(user => user.email === email);
  },
  
  // Create a new user
  createUser(userData) {
    const db = readDb();
    const newUser = {
      id: uuidv4(),
      ...userData,
      password: bcrypt.hashSync(userData.password, 10),
      role: userData.role || 'user',
      createdAt: new Date().toISOString()
    };
    
    db.users.push(newUser);
    writeDb(db);
    
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },
  
  // Create or update a Google user
  upsertGoogleUser(profile) {
    const db = readDb();
    let user = db.googleUsers.find(user => user.email === profile.email);
    
    if (user) {
      // Update existing user
      user = {
        ...user,
        name: profile.name,
        picture: profile.picture,
        lastLogin: new Date().toISOString()
      };
      
      const index = db.googleUsers.findIndex(u => u.id === user.id);
      db.googleUsers[index] = user;
    } else {
      // Create new user
      user = {
        id: uuidv4(),
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        role: 'user',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      
      db.googleUsers.push(user);
    }
    
    writeDb(db);
    return user;
  },
  
  // Verify password
  verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  }
};

// Session Service
export const sessionService = {
  // Create a session
  createSession(userId, userType = 'standard') {
    const db = readDb();
    const token = uuidv4();
    const session = {
      token,
      userId,
      userType,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
    
    db.sessions.push(session);
    writeDb(db);
    return token;
  },
  
  // Get session by token
  getSession(token) {
    const db = readDb();
    return db.sessions.find(session => 
      session.token === token && 
      new Date(session.expiresAt) > new Date()
    );
  },
  
  // Delete session
  deleteSession(token) {
    const db = readDb();
    db.sessions = db.sessions.filter(session => session.token !== token);
    writeDb(db);
  }
};

// Game Service
export const gameService = {
  // Create a new game template
  createGame(hostId, gameData) {
    const db = readDb();
    const gameId = uuidv4();
    const game = {
      id: gameId,
      hostId,
      title: gameData.title,
      description: gameData.description || '',
      category: gameData.category || 'General',
      isPublic: gameData.isPublic || false,
      questions: gameData.questions || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    db.games.push(game);
    writeDb(db);
    return game;
  },
  
  // Update game
  updateGame(gameId, gameData) {
    const db = readDb();
    const index = db.games.findIndex(game => game.id === gameId);
    
    if (index === -1) return null;
    
    const updatedGame = {
      ...db.games[index],
      ...gameData,
      updatedAt: new Date().toISOString()
    };
    
    db.games[index] = updatedGame;
    writeDb(db);
    return updatedGame;
  },
  
  // Delete game
  deleteGame(gameId) {
    const db = readDb();
    const gameExists = db.games.some(game => game.id === gameId);
    
    if (!gameExists) return false;
    
    db.games = db.games.filter(game => game.id !== gameId);
    writeDb(db);
    return true;
  },
  
  // Get game by ID
  getGame(gameId) {
    const db = readDb();
    return db.games.find(game => game.id === gameId);
  },
  
  // Get games by host
  getGamesByHost(hostId) {
    const db = readDb();
    return db.games.filter(game => game.hostId === hostId);
  },
  
  // Get public games
  getPublicGames() {
    const db = readDb();
    return db.games.filter(game => game.isPublic);
  },
  
  // Start a game instance
  startGameInstance(gameId, hostId) {
    const db = readDb();
    const game = db.games.find(game => game.id === gameId);
    
    if (!game) return null;
    
    const instanceId = uuidv4();
    const pinCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    
    const gameInstance = {
      id: instanceId,
      gameId,
      hostId,
      pinCode,
      status: 'waiting', // waiting, active, finished
      players: [],
      currentQuestion: -1,
      startedAt: new Date().toISOString(),
      finishedAt: null
    };
    
    db.gameInstances.push(gameInstance);
    writeDb(db);
    return gameInstance;
  },
  
  // Get game instance by PIN
  getGameInstanceByPin(pinCode) {
    const db = readDb();
    return db.gameInstances.find(instance => 
      instance.pinCode === pinCode && 
      instance.status !== 'finished'
    );
  },
  
  // Get game instance by ID
  getGameInstanceById(instanceId) {
    const db = readDb();
    return db.gameInstances.find(instance => instance.id === instanceId);
  },
  
  // Update game instance
  updateGameInstance(instanceId, updateData) {
    const db = readDb();
    const index = db.gameInstances.findIndex(instance => instance.id === instanceId);
    
    if (index === -1) return null;
    
    const updatedInstance = {
      ...db.gameInstances[index],
      ...updateData
    };
    
    db.gameInstances[index] = updatedInstance;
    writeDb(db);
    return updatedInstance;
  },
  
  // Add player to game instance
  addPlayerToGame(instanceId, player) {
    const db = readDb();
    const instance = db.gameInstances.find(instance => instance.id === instanceId);
    
    if (!instance || instance.status !== 'waiting') return null;
    
    // Check if player is already in the game
    if (instance.players.some(p => p.id === player.id)) {
      return instance;
    }
    
    instance.players.push({
      id: player.id,
      username: player.username || player.name,
      socketId: player.socketId,
      score: 0,
      answers: []
    });
    
    writeDb(db);
    return instance;
  },
  
  // Remove player from game
  removePlayerFromGame(instanceId, playerId) {
    const db = readDb();
    const instance = db.gameInstances.find(instance => instance.id === instanceId);
    
    if (!instance) return false;
    
    instance.players = instance.players.filter(player => player.id !== playerId);
    writeDb(db);
    return true;
  },
  
  // Add player answer
  addPlayerAnswer(instanceId, playerId, questionIndex, answer, responseTime) {
    const db = readDb();
    const instance = db.gameInstances.find(instance => instance.id === instanceId);
    
    if (!instance || instance.status !== 'active') return null;
    
    const playerIndex = instance.players.findIndex(player => player.id === playerId);
    if (playerIndex === -1) return null;
    
    const game = db.games.find(game => game.id === instance.gameId);
    if (!game) return null;
    
    const question = game.questions[questionIndex];
    if (!question) return null;
    
    const isCorrect = answer === question.correctAnswer;
    const maxPoints = 1000;
    const timeRatio = 1 - (responseTime / (question.timeLimit * 1000));
    const points = isCorrect ? Math.round(maxPoints * timeRatio) : 0;
    
    // Add answer to player's answers array
    instance.players[playerIndex].answers[questionIndex] = {
      answer,
      isCorrect,
      points,
      responseTime
    };
    
    // Update player's total score
    instance.players[playerIndex].score += points;
    
    writeDb(db);
    return instance.players[playerIndex];
  },
  
  // Finish game instance
  finishGameInstance(instanceId) {
    const db = readDb();
    const instance = db.gameInstances.find(instance => instance.id === instanceId);
    
    if (!instance) return null;
    
    instance.status = 'finished';
    instance.finishedAt = new Date().toISOString();
    
    // Save player scores to the scores collection
    const game = db.games.find(game => game.id === instance.gameId);
    
    instance.players.forEach(player => {
      db.scores.push({
        id: uuidv4(),
        gameId: instance.gameId,
        gameInstanceId: instanceId,
        playerId: player.id,
        playerName: player.username,
        score: player.score,
        gameTitle: game ? game.title : 'Unknown Game',
        timestamp: new Date().toISOString()
      });
    });
    
    writeDb(db);
    return instance;
  }
};

// Score Service
export const scoreService = {
  // Get player's game history
  getPlayerHistory(playerId) {
    const db = readDb();
    return db.scores
      .filter(score => score.playerId === playerId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },
  
  // Get top scores for a game
  getGameLeaderboard(gameId, limit = 10) {
    const db = readDb();
    return db.scores
      .filter(score => score.gameId === gameId)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },
  
  // Get all scores for a game instance
  getGameInstanceScores(instanceId) {
    const db = readDb();
    return db.scores.filter(score => score.gameInstanceId === instanceId);
  }
};