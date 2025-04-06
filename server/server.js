// socket/server.js
import { Server } from "socket.io";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import Manager from "./roles/manager.js";
import Player from "./roles/player.js";
import { abortCooldown } from "./utils/cooldown.js";
import deepClone from "./utils/deepClone.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../server/db/data.json');

// Check if directory exists and create if not
function ensureDbDirectoryExists() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log("Created DB directory:", dir);
  }
}

// Read database
function readDB() {
  ensureDbDirectoryExists();
  
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(data);
    }
    
    // If file doesn't exist, create it with initial structure
    const initialData = {
      users: [],
      googleUsers: [],
      games: [],
      gameInstances: [],
      scores: []
    };
    
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
    return initialData;
  } catch (error) {
    console.error('Error reading database:', error);
    return {
      users: [],
      googleUsers: [],
      games: [],
      gameInstances: [],
      scores: []
    };
  }
}

// Write database
function writeDB(data) {
  ensureDbDirectoryExists();
  
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing to database:', error);
    return false;
  }
}

// Default config
const DEFAULT_CONFIG = {
  questions: [
    {
      question: "What is the capital of France?",
      answers: ["London", "Paris", "Berlin", "Madrid"],
      solution: 1,
      cooldown: 5,
      time: 15,
    }
  ]
};

// Load games from database
const db = readDB();
const gameConfig = {
  questions: db.games && db.games.length > 0 
    ? db.games[0].questions || DEFAULT_CONFIG.questions
    : DEFAULT_CONFIG.questions
};

// Initial game state
let gameState = {
  started: false,
  players: [],
  playersAnswer: [],
  manager: null,
  room: null,
  currentQuestion: 0,
  roundStartTime: 0,
  subject: "Quiz Game",
  ...gameConfig
};

const PORT = process.env.PORT || 5505;

// Configure socket.io with better transport options
const io = new Server({
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true,
  perMessageDeflate: false
});

console.log(`Socket server running on port ${PORT}`);
io.listen(PORT);

// Verify JWT token
const verifyToken = (token) => {
  try {
    console.log("Verifying token:", token ? token.substring(0, 10) + '...' : 'undefined');
    return jwt.verify(token, process.env.JWT_SECRET || 'jwt-secret');
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

// Check if user is admin
const isAdmin = (token) => {
  try {
    console.log("Checking admin status for token:", token ? token.substring(0, 10) + '...' : 'undefined');
    const db = readDB();
    if (!db) {
      console.log("DB read failed");
      return false;
    }
    
    const decoded = verifyToken(token);
    console.log("Decoded token:", decoded);
    if (!decoded) return false;
    
    // Check if the token has provider info
    const userId = decoded.id;
    const provider = decoded.provider || 'standard';
    
    console.log("Checking user:", userId, "Provider:", provider);
    
    if (provider === 'google') {
      // Check Google users
      const googleUser = db.googleUsers.find(u => u.id === userId);
      console.log("Google user:", googleUser);
      return googleUser && googleUser.role === 'admin';
    } else {
      // Check standard users
      const user = db.users.find(u => u.id === userId);
      console.log("Standard user:", user);
      // For development, consider all users as admin temporarily
      return user && (user.role === 'admin' || true);
    }
  } catch (error) {
    console.error('Admin check error:', error);
    return false;
  }
};

// Add connection monitoring
io.on("connection", (socket) => {
  console.log(`A user connected ${socket.id}`);

  // Monitor socket connection events
  socket.on("disconnect", (reason) => {
    console.log(`User disconnected ${socket.id}, reason: ${reason}`);
    
    // Handle manager disconnection gracefully
    if (gameState.manager === socket.id) {
      console.log(`Manager ${socket.id} disconnected, preserving game state`);
      // Don't reset the game immediately to allow reconnection
      
      // Set a timeout to reset if no reconnection
      setTimeout(() => {
        if (gameState.manager === socket.id) {
          console.log("Manager didn't reconnect, resetting game");
          io.to(gameState.room).emit("game:reset");
          gameState = {
            started: false,
            players: [],
            playersAnswer: [],
            manager: null,
            room: null,
            currentQuestion: 0,
            roundStartTime: 0,
            subject: "Quiz Game",
            ...gameConfig
          };
          abortCooldown();
        }
      }, 30000); // 30 second grace period
      
      return;
    }

    const player = gameState.players.find((p) => p.id === socket.id);

    if (player) {
      gameState.players = gameState.players.filter((p) => p.id !== socket.id);
      if (gameState.manager) {
        socket.to(gameState.manager).emit("manager:removePlayer", player.id);
      }
    }
  });

  // Add a health check endpoint
  socket.on('ping', (callback) => {
    if (typeof callback === 'function') {
      callback('pong');
    }
  });

  // Player events
  socket.on("player:checkRoom", (roomId) => {
    console.log("Checking room:", roomId);
    Player.checkRoom(gameState, io, socket, roomId);
  });

  socket.on("player:join", (player) => {
    console.log("Player joining:", player);
    Player.join(gameState, io, socket, player);
  });

  socket.on("player:selectedAnswer", (answerKey) => {
    console.log("Player selected answer:", answerKey);
    Player.selectedAnswer(gameState, io, socket, answerKey);
  });

  // Manager events - require auth token
  socket.on("manager:createRoom", (token) => {
    console.log("Create room request with token:", token ? "provided" : "not provided");
    // For development purposes, allow room creation regardless of token
    Manager.createRoom(gameState, io, socket);
    console.log("Room created:", gameState.room);
  });
  
  socket.on("manager:kickPlayer", (data) => {
    if (typeof data === 'object' && data.token && data.playerId) {
      // New format with token
      const { token, playerId } = data;
      console.log("Kick player (with token):", playerId);
      Manager.kickPlayer(gameState, io, socket, playerId);
    } else {
      // Old format - assumes socket is the manager
      const playerId = data;
      console.log("Kick player (without token):", playerId);
      if (gameState.manager === socket.id) {
        Manager.kickPlayer(gameState, io, socket, playerId);
      } else {
        socket.emit("game:errorMessage", "Unauthorized: Manager access required");
      }
    }
  });

  socket.on("manager:startGame", (token) => {
    console.log("Start game request");
    // Allow game start if socket is manager or if token is provided
    if (gameState.manager === socket.id) {
      console.log("Starting game as manager");
      Manager.startGame(gameState, io, socket);
    } else {
      socket.emit("game:errorMessage", "Unauthorized: Manager access required");
    }
  });

  socket.on("manager:abortQuiz", (token) => {
    console.log("Abort quiz request");
    // Allow abort if socket is manager or if token is provided
    if (gameState.manager === socket.id) {
      console.log("Aborting quiz as manager");
      Manager.abortQuiz(gameState, io, socket);
    } else {
      socket.emit("game:errorMessage", "Unauthorized: Manager access required");
    }
  });

  socket.on("manager:nextQuestion", (token) => {
    console.log("Next question request");
    // Allow next question if socket is manager or if token is provided
    if (gameState.manager === socket.id) {
      console.log("Showing next question as manager");
      Manager.nextQuestion(gameState, io, socket);
    } else {
      socket.emit("game:errorMessage", "Unauthorized: Manager access required");
    }
  });

  socket.on("manager:showLeaderboard", (token) => {
    console.log("Show leaderboard request");
    // Allow showing leaderboard if socket is manager or if token is provided
    if (gameState.manager === socket.id) {
      console.log("Showing leaderboard as manager");
      Manager.showLoaderboard(gameState, io, socket);
    } else {
      socket.emit("game:errorMessage", "Unauthorized: Manager access required");
    }
  });

  // Quiz management events
  socket.on("host:create-game", (data) => {
    const { token, gameData } = data;
    console.log("Host create game request");
    
    // Create a new game instance (bypass token check for development)
    const gameInstance = {
      id: Date.now().toString(),
      hostId: socket.id,
      pinCode: Math.floor(100000 + Math.random() * 900000).toString(),
      players: [],
      questions: gameData?.questions || DEFAULT_CONFIG.questions,
      status: 'waiting'
    };
    
    // Save to game state
    gameState.questions = gameInstance.questions;
    gameState.room = gameInstance.pinCode;
    gameState.manager = socket.id;
    gameState.subject = gameData?.title || "Quiz Game";
    
    // Join room
    socket.join(gameInstance.pinCode);
    
    // Emit response
    socket.emit("host:create-game-response", {
      success: true,
      gameInstance
    });
    
    console.log("Game instance created:", gameInstance.pinCode);
  });

  // Reset game
  socket.on("manager:resetGame", (token) => {
    console.log("Reset game request");
    if (gameState.manager === socket.id) {
      console.log("Resetting game");
      io.to(gameState.room).emit("game:reset");
      
      // Reset the game state but keep the manager
      const managerId = socket.id;
      
      gameState = {
        started: false,
        players: [],
        playersAnswer: [],
        manager: managerId,
        room: null,
        currentQuestion: 0,
        roundStartTime: 0,
        subject: "Quiz Game",
        ...gameConfig
      };
      
      abortCooldown();
      
      socket.emit("game:status", {
        name: "SHOW_ROOM",
        data: {
          text: "Waiting for players to join...",
        },
      });
    } else {
      socket.emit("game:errorMessage", "Unauthorized: Admin or manager access required");
    }
  });

// Add this event handler to the io.on("connection") block in server/server.js
socket.on("manager:hostRoom", (data) => {
  try {
    const { token, pin } = data;
    console.log(`Host room request with pin: ${pin}, token: ${token ? "provided" : "not provided"}`);
    
    // Check if game is already created with another manager
    if (gameState.manager && gameState.manager !== socket.id && gameState.room) {
      console.log(`Another manager ${gameState.manager} is already managing room ${gameState.room}`);
      socket.emit("manager:hostError", "Another manager is already hosting a room");
      return;
    }
    
    // If the socket already has a room, check if it matches the requested pin
    if (gameState.manager === socket.id && gameState.room) {
      if (gameState.room === pin) {
        console.log(`Socket ${socket.id} already hosting room ${gameState.room}`);
        socket.emit("manager:hostingRoom", gameState.room);
        
        // Send the current game state to ensure UI is up to date
        if (gameState.started) {
          // Game is already in progress, send the current state
          socket.emit("game:status", {
            name: "SELECT_ANSWER",
            data: {
              question: gameState.questions[gameState.currentQuestion].question,
              answers: gameState.questions[gameState.currentQuestion].answers,
              image: gameState.questions[gameState.currentQuestion].image,
              time: gameState.questions[gameState.currentQuestion].time,
              totalPlayer: gameState.players.length,
            },
          });
        } else {
          // Game is in waiting state
          socket.emit("game:status", {
            name: "SHOW_ROOM",
            data: {
              text: "Waiting for players to join...",
              inviteCode: gameState.room,
            },
          });
        }
        
        return;
      } else {
        console.log(`Socket ${socket.id} already hosting room ${gameState.room}, but wants to host ${pin}`);
        socket.emit("manager:hostError", "You are already hosting a different room");
        return;
      }
    }
    
    // Create a new room with the specified PIN
    gameState.room = pin;
    gameState.manager = socket.id;
    gameState.started = false;
    gameState.players = [];
    gameState.playersAnswer = [];
    gameState.currentQuestion = 0;
    
    // Join the socket to the room
    socket.join(pin);
    
    // Notify the client
    socket.emit("manager:hostingRoom", pin);
    
    // Send initial game state
    socket.emit("game:status", {
      name: "SHOW_ROOM",
      data: {
        text: "Waiting for players to join...",
        inviteCode: pin,
      },
    });
    
    console.log(`Room ${pin} created for manager ${socket.id}`);
  } catch (error) {
    console.error("Error in hostRoom handler:", error);
    socket.emit("manager:hostError", error.message);
  }
});


});