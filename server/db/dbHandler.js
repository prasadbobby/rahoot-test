// db/dbHandler.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.join(__dirname, 'db.json')

// Initialize the database if it doesn't exist
function initializeDb() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      users: [
        {
          id: "1",
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
      scores: []
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2))
  }
}

// Read the database
function readDb() {
  initializeDb()
  const data = fs.readFileSync(DB_PATH, 'utf8')
  return JSON.parse(data)
}

// Write to the database
function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

// User management
const userService = {
  // Find a user by email
  findByEmail(email) {
    const db = readDb()
    return db.users.find(user => user.email === email)
  },

  // Find a user by username
  findByUsername(username) {
    const db = readDb()
    return db.users.find(user => user.username === username)
  },

  // Find a Google user by email
  findGoogleUserByEmail(email) {
    const db = readDb()
    return db.googleUsers.find(user => user.email === email)
  },

  // Create a new user
  createUser(userData) {
    const db = readDb()
    const newUser = {
      id: uuidv4(),
      ...userData,
      password: bcrypt.hashSync(userData.password, 10),
      role: 'user',
      createdAt: new Date().toISOString()
    }
    db.users.push(newUser)
    writeDb(db)
    return { ...newUser, password: undefined }
  },

  // Create or update a Google user
  upsertGoogleUser(profile) {
    const db = readDb()
    const existingUser = db.googleUsers.find(user => user.email === profile.email)
    
    if (existingUser) {
      // Update existing user
      Object.assign(existingUser, {
        name: profile.name,
        picture: profile.picture,
        lastLogin: new Date().toISOString()
      })
      writeDb(db)
      return existingUser
    } else {
      // Create new user
      const newUser = {
        id: uuidv4(),
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        role: 'user',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      }
      db.googleUsers.push(newUser)
      writeDb(db)
      return newUser
    }
  },

  // Verify a user's password
  verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword)
  }
}

// Session management
const sessionService = {
  // Create a session
  createSession(userId, userType = 'standard') {
    const db = readDb()
    const token = uuidv4()
    const session = {
      token,
      userId,
      userType, // 'standard' or 'google'
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    }
    db.sessions.push(session)
    writeDb(db)
    return token
  },

  // Get a session by token
  getSession(token) {
    const db = readDb()
    return db.sessions.find(session => 
      session.token === token && 
      new Date(session.expiresAt) > new Date()
    )
  },

  // Delete a session
  deleteSession(token) {
    const db = readDb()
    db.sessions = db.sessions.filter(session => session.token !== token)
    writeDb(db)
  }
}

// Game management
const gameService = {
  // Create a new game
  createGame(hostId, subject, questions) {
    const db = readDb()
    const gameId = uuidv4()
    const game = {
      id: gameId,
      hostId,
      subject,
      questions,
      createdAt: new Date().toISOString(),
      status: 'created',
      pinCode: Math.floor(100000 + Math.random() * 900000).toString() // 6-digit code
    }
    db.games.push(game)
    writeDb(db)
    return game
  },

  // Find a game by PIN code
  findGameByPin(pin) {
    const db = readDb()
    return db.games.find(game => game.pinCode === pin)
  },

  // Get a game by ID
  getGame(id) {
    const db = readDb()
    return db.games.find(game => game.id === id)
  },

  // Update game status
  updateGameStatus(id, status) {
    const db = readDb()
    const game = db.games.find(game => game.id === id)
    if (game) {
      game.status = status
      game.endedAt = status === 'completed' ? new Date().toISOString() : undefined
      writeDb(db)
      return game
    }
    return null
  },

  // Get games by host
  getGamesByHost(hostId) {
    const db = readDb()
    return db.games.filter(game => game.hostId === hostId)
  }
}

// Score management
const scoreService = {
  // Add a score for a user in a game
  addScore(gameId, userId, username, points) {
    const db = readDb()
    const score = {
      id: uuidv4(),
      gameId,
      userId,
      username,
      points,
      timestamp: new Date().toISOString()
    }
    db.scores.push(score)
    writeDb(db)
    return score
  },

  // Get scores for a game
  getScoresByGame(gameId) {
    const db = readDb()
    return db.scores.filter(score => score.gameId === gameId)
  },

  // Get scores for a user
  getScoresByUser(userId) {
    const db = readDb()
    return db.scores.filter(score => score.userId === userId)
  },

  // Get user's game history with details
  getUserGameHistory(userId) {
    const db = readDb()
    const userScores = db.scores.filter(score => score.userId === userId)
    
    return userScores.map(score => {
      const game = db.games.find(game => game.id === score.gameId)
      return {
        ...score,
        gameSubject: game ? game.subject : 'Unknown',
        gameDate: game ? game.createdAt : null,
        questionsCount: game ? game.questions.length : 0
      }
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }
}

export {
  userService,
  sessionService,
  gameService,
  scoreService
}