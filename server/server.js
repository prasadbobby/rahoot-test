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

const io = new Server({
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

console.log(`Socket server running on port ${PORT}`);
io.listen(PORT);

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'jwt-secret');
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

// Check if user is admin
const isAdmin = (token) => {
  try {
    const db = readDB();
    if (!db) return false;
    
    const decoded = verifyToken(token);
    if (!decoded) return false;
    
    // Check if the token has provider info
    const userId = decoded.id;
    const provider = decoded.provider || 'standard';
    
    if (provider === 'google') {
      // Check Google users
      const googleUser = db.googleUsers.find(u => u.id === userId);
      return googleUser && googleUser.role === 'admin';
    } else {
      // Check standard users
      const user = db.users.find(u => u.id === userId);
      return user && user.role === 'admin';
    }
  } catch (error) {
    console.error('Admin check error:', error);
    return false;
  }
};

io.on("connection", (socket) => {
  console.log(`A user connected ${socket.id}`);

  // Player events
  socket.on("player:checkRoom", (roomId) =>
    Player.checkRoom(gameState, io, socket, roomId)
  );

  socket.on("player:join", (player) =>
    Player.join(gameState, io, socket, player)
  );

  socket.on("player:selectedAnswer", (answerKey) =>
    Player.selectedAnswer(gameState, io, socket, answerKey)
  );

  // Manager events - require auth token
  socket.on("manager:createRoom", (token) => {
    // Verify admin access
    if (isAdmin(token)) {
      Manager.createRoom(gameState, io, socket);
    } else {
      socket.emit("game:errorMessage", "Unauthorized: Admin access required");
    }
  });
  
  socket.on("manager:kickPlayer", (data) => {
    if (typeof data === 'object' && data.token && data.playerId) {
      // New format with token
      const { token, playerId } = data;
      if (isAdmin(token)) {
        Manager.kickPlayer(gameState, io, socket, playerId);
      } else {
        socket.emit("game:errorMessage", "Unauthorized: Admin access required");
      }
    } else {
      // Old format - assumes socket is the manager
      const playerId = data;
      if (gameState.manager === socket.id) {
        Manager.kickPlayer(gameState, io, socket, playerId);
      } else {
        socket.emit("game:errorMessage", "Unauthorized: Manager access required");
      }
    }
  });

  socket.on("manager:startGame", (token) => {
    // Verify admin access if token provided, otherwise check socket
    if (token) {
      if (isAdmin(token)) {
        Manager.startGame(gameState, io, socket);
      } else {
        socket.emit("game:errorMessage", "Unauthorized: Admin access required");
      }
    } else if (gameState.manager === socket.id) {
      Manager.startGame(gameState, io, socket);
    } else {
      socket.emit("game:errorMessage", "Unauthorized: Manager access required");
    }
  });

  socket.on("manager:abortQuiz", (token) => {
    // Verify admin access if token provided, otherwise check socket
    if (token) {
      if (isAdmin(token)) {
        Manager.abortQuiz(gameState, io, socket);
      } else {
        socket.emit("game:errorMessage", "Unauthorized: Admin access required");
      }
    } else if (gameState.manager === socket.id) {
      Manager.abortQuiz(gameState, io, socket);
    } else {
      socket.emit("game:errorMessage", "Unauthorized: Manager access required");
    }
  });

  socket.on("manager:nextQuestion", (token) => {
    // Verify admin access if token provided, otherwise check socket
    if (token) {
      if (isAdmin(token)) {
        Manager.nextQuestion(gameState, io, socket);
      } else {
        socket.emit("game:errorMessage", "Unauthorized: Admin access required");
      }
    } else if (gameState.manager === socket.id) {
      Manager.nextQuestion(gameState, io, socket);
    } else {
      socket.emit("game:errorMessage", "Unauthorized: Manager access required");
    }
  });

  socket.on("manager:showLeaderboard", (token) => {
    // Verify admin access if token provided, otherwise check socket
    if (token) {
      if (isAdmin(token)) {
        Manager.showLoaderboard(gameState, io, socket);
      } else {
        socket.emit("game:errorMessage", "Unauthorized: Admin access required");
      }
    } else if (gameState.manager === socket.id) {
      Manager.showLoaderboard(gameState, io, socket);
    } else {
      socket.emit("game:errorMessage", "Unauthorized: Manager access required");
    }
  });

  // Quiz management events
  socket.on("host:create-game", (data) => {
    const { token, gameData } = data;
    
    // Verify admin access
    if (isAdmin(token)) {
      // Create a new game instance
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
    } else {
      socket.emit("host:create-game-response", {
        success: false,
        message: "Unauthorized: Admin access required"
      });
    }
  });

  // Reset game
  socket.on("manager:resetGame", (token) => {
    if (isAdmin(token) || gameState.manager === socket.id) {
      console.log("Reset game");
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

  socket.on("disconnect", () => {
    console.log(`User disconnected ${socket.id}`);
    if (gameState.manager === socket.id) {
      console.log("Manager disconnected, resetting game");
      io.to(gameState.room).emit("game:reset");
      gameState.started = false;
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
});