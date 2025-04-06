// server.js
import { Server } from "socket.io";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'db/data.json');

// Ensure database directory exists
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

// Default quiz configuration
const DEFAULT_QUIZ = {
  questions: [
    {
      question: "What is the capital of France?",
      answers: ["London", "Paris", "Berlin", "Madrid"],
      solution: 1,
      cooldown: 5,
      time: 15
    }
  ]
};

const PORT = process.env.PORT || 5505;

// Configure Socket.IO
const io = new Server({
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

console.log(`Socket server running on port ${PORT}`);
io.listen(PORT);

// Socket connection handler
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Check room availability
  socket.on("player:checkRoom", (roomId) => {
    console.log("Checking room:", roomId);
    
    const db = readDB();
    const gameInstance = db.gameInstances.find(
      instance => instance.pinCode === roomId && 
      (instance.status === 'waiting' || instance.status === 'created')
    );
    
    if (gameInstance) {
      socket.emit("game:successRoom", roomId);
    } else {
      socket.emit("game:errorMessage", "Room not found or game already started");
    }
  });

  socket.on("player:join", (data) => {
    console.log("Player join request:", data);
    
    const db = readDB();
    
    // Log all game instances for debugging
    console.log("All Game Instances:", db.gameInstances);
    
    // Find game instance with more flexible matching
    const gameInstance = db.gameInstances.find(
      instance => 
        (instance.pinCode === data.gamePin || instance.gamePin === data.gamePin) && 
        ['waiting', 'created', 'lobby'].includes(instance.status)
    );
  
    if (!gameInstance) {
      console.error(`No game instance found for PIN: ${data.gamePin}`);
      socket.emit("player:join-response", {
        success: false,
        message: "Game room not found or already started"
      });
      return;
    }
  
    // Find associated game
    const game = db.games.find(g => g.id === gameInstance.quizId);
  
    if (!game) {
      console.error(`No game found for QuizId: ${gameInstance.quizId}`);
      socket.emit("player:join-response", {
        success: false,
        message: "Associated game not found"
      });
      return;
    }
  
    // Check for duplicate username
    const isDuplicateUsername = (gameInstance.players || []).some(
      player => player.username === data.username
    );
  
    if (isDuplicateUsername) {
      socket.emit("player:join-response", {
        success: false,
        message: "Username already exists in this game"
      });
      return;
    }
  
    // Create new player
    const newPlayer = {
      id: socket.id,
      username: data.username,
      score: 0,
      answers: []
    };
  
    // Update game instance
    gameInstance.players = gameInstance.players || [];
    gameInstance.players.push(newPlayer);
    gameInstance.status = 'waiting';
  
    // Update database
    const instanceIndex = db.gameInstances.findIndex(
      instance => instance.pinCode === data.gamePin || instance.gamePin === data.gamePin
    );
    
    if (instanceIndex !== -1) {
      db.gameInstances[instanceIndex] = gameInstance;
      writeDB(db);
    }
  
    // Join socket room
    socket.join(data.gamePin);
  
    // Respond to player with full game details
    socket.emit("player:join-response", {
      success: true,
      gameInstance: {
        pinCode: gameInstance.pinCode || gameInstance.gamePin,
        title: game.title,
        questions: game.questions,
        players: gameInstance.players
      }
    });
  
    // Notify other players in the room
    socket.to(data.gamePin).emit("manager:newPlayer", newPlayer);
  
    console.log(`Player ${data.username} joined game ${data.gamePin}`);
  });

  socket.on("manager:hostRoom", (data) => {
    console.log("Hosting room with data:", data);
    
    const db = readDB();
    
    // Log all games for debugging
    console.log("All Games:", db.games);
    
    // Decode the token to get the host ID
    let hostId;
    try {
      const decoded = jwt.verify(data.token, process.env.JWT_SECRET || 'jwt-secret');
      hostId = decoded.id;
      console.log("Decoded Host ID:", hostId);
    } catch (error) {
      console.error("Token verification error:", error);
    }
  
    // Find the game associated with this host
    const hostGame = db.games.find(game => 
      game.createdBy === hostId || 
      // Fallback to the first game if no specific game found
      (db.games.length > 0 ? db.games[0] : null)
    );
    
    console.log("Found Host Game:", hostGame);
  
    if (!hostGame) {
      console.error("No game found for host:", hostId);
      socket.emit("manager:hostError", "No game found. Please create a quiz first.");
      return;
    }
  
    // Check for existing game with this PIN
    const existingGame = db.gameInstances.find(
      instance => instance.pinCode === data.pin || instance.gamePin === data.pin
    );
  
    if (existingGame) {
      socket.emit("manager:hostingRoom", existingGame.pinCode || existingGame.gamePin);
      return;
    }
  
    // Create new game instance with host's questions
    const newGameInstance = {
      id: uuidv4(),
      quizId: hostGame.id,
      gamePin: data.pin,
      pinCode: data.pin, // Add both for compatibility
      hostId: hostId || 'unknown',
      status: 'created',
      players: [],
      questions: hostGame.questions,
      title: hostGame.title,
      createdAt: new Date().toISOString()
    };
  
    // Add to database
    db.gameInstances.push(newGameInstance);
    writeDB(db);
  
    // Join room and emit events
    socket.join(data.pin);
    socket.emit("manager:hostingRoom", data.pin);
    socket.emit("game:status", {
      name: "SHOW_ROOM",
      data: {
        text: "Waiting for players to join...",
        inviteCode: data.pin,
        title: hostGame.title
      }
    });
  
    console.log(`Room created with PIN: ${data.pin}, Quiz: ${hostGame.title}`);
  });

  // Disconnect handler
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});