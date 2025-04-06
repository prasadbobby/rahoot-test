// server/server.js
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

// Active game rooms
const activeGames = new Map();

// Calculate points based on response time
function calculatePoints(timeElapsed, maxTime) {
  // Convert to seconds
  const timeElapsedSeconds = timeElapsed / 1000;
  const maxPoints = 1000;
  
  // Ensure time is valid
  if (timeElapsedSeconds >= maxTime || timeElapsedSeconds < 0) {
    return 0;
  }
  
  // Points decrease linearly with time
  const timeRatio = 1 - (timeElapsedSeconds / maxTime);
  return Math.round(maxPoints * timeRatio);
}

// Handle when a question timer ends
function handleQuestionEnd(gamePin) {
  const game = activeGames.get(gamePin);
  if (!game) return;
  
  // Clear the timer
  if (game.questionTimer) {
    clearTimeout(game.questionTimer);
    game.questionTimer = null;
  }
  
  const question = game.questions[game.currentQuestion];
  
  // Calculate results
  const correctAnswers = game.playersAnswer?.filter(a => a.answer === question.solution) || [];
  const incorrectAnswers = game.playersAnswer?.filter(a => a.answer !== question.solution) || [];
  
  // Update player scores
  game.players.forEach(player => {
    const playerAnswer = game.playersAnswer?.find(a => a.id === player.id);
    
    if (playerAnswer) {
      if (playerAnswer.answer === question.solution) {
        player.score += playerAnswer.points;
      }
    }
  });
  
  // Create results object
  const responses = {};
  game.playersAnswer?.forEach(pa => {
    responses[pa.answer] = (responses[pa.answer] || 0) + 1;
  });
  
  // Send results to host
  io.to(game.hostId).emit("game:status", {
    name: "SHOW_RESPONSES",
    data: {
      question: question.question,
      responses: responses,
      correct: question.solution,
      answers: question.answers,
      image: question.image
    }
  });
  
  // Send individual results to players
  game.players.forEach(player => {
    const playerAnswer = game.playersAnswer?.find(a => a.id === player.id);
    const isCorrect = playerAnswer?.answer === question.solution;
    const pointsEarned = isCorrect ? playerAnswer.points : 0;
    
    // Sort players by score to determine rank
    const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
    const rank = sortedPlayers.findIndex(p => p.id === player.id) + 1;
    const aheadPlayer = rank > 1 ? sortedPlayers[rank - 2] : null;
    
    io.to(player.id).emit("game:status", {
      name: "SHOW_RESULT",
      data: {
        correct: isCorrect,
        message: isCorrect ? "Correct!" : "Incorrect",
        points: pointsEarned,
        myPoints: player.score,
        rank,
        aheadOfMe: aheadPlayer?.username
      }
    });
  });
  
  // Reset for next question
  game.playersAnswer = [];
}

// Socket connection handler
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Check room availability
  socket.on("player:checkRoom", (roomId) => {
    console.log("Checking room:", roomId);
    
    // First check the in-memory active games
    const gameExists = activeGames.has(roomId);
    
    if (gameExists) {
      console.log(`Room ${roomId} found in active games`);
      socket.emit("game:successRoom", roomId);
      return;
    }
    
    // Then check the database
    const db = readDB();
    const gameInstance = db.gameInstances.find(
      instance => (instance.pinCode === roomId || instance.gamePin === roomId) && 
      ['waiting', 'created'].includes(instance.status)
    );
    
    if (gameInstance) {
      console.log(`Room ${roomId} found in database`);
      socket.emit("game:successRoom", roomId);
    } else {
      console.log(`Room ${roomId} not found`);
      socket.emit("game:errorMessage", "Game not found or already started");
    }
  });

  // Join a game
  socket.on("player:join", (data) => {
    console.log("Player join request:", data);
    
    // Get room ID from either format
    const roomId = data.room || data.gamePin;
    
    if (!roomId) {
      socket.emit("game:errorMessage", "Invalid game PIN");
      return;
    }
    
    // Create player object
    const player = {
      id: socket.id,
      username: data.username,
      score: 0,
      answers: []
    };
    
    // Check in-memory games first
    if (activeGames.has(roomId)) {
      const game = activeGames.get(roomId);
      
      // Check if game already started
      if (game.status !== 'waiting') {
        socket.emit("game:errorMessage", "Game has already started");
        return;
      }
      
      // Check for duplicate username
      if (game.players.some(p => p.username === player.username)) {
        socket.emit("game:errorMessage", "Username already exists");
        return;
      }
      
      // Add player to game
      game.players.push(player);
      
      // Join socket room
      socket.join(roomId);
      
      // Notify player
      socket.emit("game:successJoin");
      socket.emit("player:join-response", {
        success: true,
        gameInstance: {
          pinCode: roomId,
          title: game.title || "Quiz Game",
          questions: game.questions || []
        }
      });
      
      // IMPORTANT: Notify host about new player - make sure this is working
      console.log(`Notifying host ${game.hostId} about new player: ${player.username}`);
      const hostSocket = io.sockets.sockets.get(game.hostId);
      if (hostSocket) {
        hostSocket.emit("manager:newPlayer", player);
      } else {
        // Broadcast to the room in case host socket can't be found directly
        socket.to(roomId).emit("manager:newPlayer", player);
      }
      
      console.log(`Player ${player.username} joined game ${roomId}. Total players: ${game.players.length}`);
      return;
    }
    
    // If not in memory, check database
    const db = readDB();
    const gameInstance = db.gameInstances.find(
      instance => (instance.pinCode === roomId || instance.gamePin === roomId) && 
      ['waiting', 'created'].includes(instance.status)
    );
    
    if (!gameInstance) {
      socket.emit("game:errorMessage", "Game not found or already started");
      return;
    }
    
    // Check for duplicate username
    if (gameInstance.players && gameInstance.players.some(p => p.username === player.username)) {
      socket.emit("game:errorMessage", "Username already exists");
      return;
    }
    
    // Add player to game instance
    if (!gameInstance.players) {
      gameInstance.players = [];
    }
    
    gameInstance.players.push(player);
    
    // Update database
    const index = db.gameInstances.findIndex(
      instance => instance.pinCode === roomId || instance.gamePin === roomId
    );
    
    if (index !== -1) {
      db.gameInstances[index] = gameInstance;
      writeDB(db);
    }
    
    // Join socket room
    socket.join(roomId);
    
    // Notify player
    socket.emit("game:successJoin");
    
    // Also emit the newer format response for compatibility
    socket.emit("player:join-response", {
      success: true,
      gameInstance: {
        pinCode: roomId,
        title: gameInstance.title || "Quiz Game",
        questions: gameInstance.questions || []
      }
    });
    
    // Find and notify host
    if (gameInstance.hostId) {
      const hostSocket = io.sockets.sockets.get(gameInstance.hostId);
      if (hostSocket) {
        hostSocket.emit("manager:newPlayer", player);
      }
    }
    
    console.log(`Player ${player.username} joined game ${roomId}`);
  });

  // Host a game room
  socket.on("manager:hostRoom", (data) => {
    console.log("Hosting room:", data);
    
    const gamePin = data.pin || Math.floor(100000 + Math.random() * 900000).toString();
    
    // Create a new game in memory
    const game = {
      id: uuidv4(),
      hostId: socket.id,
      pinCode: gamePin,
      gamePin: gamePin,
      status: 'waiting',
      players: [],
      questions: DEFAULT_QUIZ.questions,
      title: "Quiz Game",
      createdAt: new Date().toISOString()
    };
    
    // Store in memory
    activeGames.set(gamePin, game);
    
    // Join socket room
    socket.join(gamePin);
    
    // Notify host
    socket.emit("manager:inviteCode", gamePin);
    socket.emit("manager:hostingRoom", gamePin);
    
    // Send initial game status
    socket.emit("game:status", {
      name: "SHOW_ROOM",
      data: {
        text: "Waiting for players to join...",
        inviteCode: gamePin,
        title: game.title
      }
    });
    
    console.log(`Game room created with PIN: ${gamePin}`);
    
    // Also save to database for persistence
    const db = readDB();
    db.gameInstances.push({
      ...game,
      hostId: game.hostId
    });
    writeDB(db);
  });

  // Start game
  socket.on("manager:startGame", () => {
    // Find game where this socket is the host
    let gamePin = null;
    let game = null;
    
    for (const [pin, g] of activeGames.entries()) {
      if (g.hostId === socket.id) {
        gamePin = pin;
        game = g;
        break;
      }
    }
    
    if (!game) {
      socket.emit("game:errorMessage", "You are not hosting any active games");
      return;
    }
    
    if (game.players.length === 0) {
      socket.emit("game:errorMessage", "Cannot start game with no players");
      return;
    }
    
    console.log(`Starting game ${gamePin}`);
    
    // Update game status
    game.status = 'active';
    game.currentQuestion = 0;
    
    // Send countdown to all players
    io.to(gamePin).emit("game:status", {
      name: "SHOW_START",
      data: {
        time: 3,
        subject: game.title || "Quiz Game"
      }
    });
    
    // Start first question after countdown
    setTimeout(() => {
      if (activeGames.has(gamePin)) {
        const currentGame = activeGames.get(gamePin);
        
        if (currentGame.status === 'active') {
          const question = currentGame.questions[0];
          
          io.to(gamePin).emit("game:status", {
            name: "SHOW_QUESTION",
            data: {
              question: question.question,
              image: question.image,
              cooldown: question.cooldown,
              currentQuestion: 0
            }
          });
          
          // After cooldown, show answer options
          setTimeout(() => {
            if (activeGames.has(gamePin)) {
              const updatedGame = activeGames.get(gamePin);
              
              if (updatedGame.status === 'active') {
                io.to(gamePin).emit("game:status", {
                  name: "SELECT_ANSWER",
                  data: {
                    question: question.question,
                    answers: question.answers,
                    image: question.image,
                    time: question.time,
                    totalPlayer: updatedGame.players.length
                  }
                });
                
                // Set a timer for when question ends
                updatedGame.questionTimer = setTimeout(() => {
                  handleQuestionEnd(gamePin);
                }, question.time * 1000);
              }
            }
          }, question.cooldown * 1000);
        }
      }
    }, 3000);
  });

  // Player submits answer
  socket.on("player:selectedAnswer", (answerKey) => {
    // Find which game this player is in
    let foundGame = null;
    let foundPin = null;
    
    for (const [pin, game] of activeGames.entries()) {
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        foundGame = game;
        foundPin = pin;
        
        // Add answer if not already answered
        if (!game.playersAnswer) {
          game.playersAnswer = [];
        }
        
        // Check if already answered
        if (game.playersAnswer.some(pa => pa.id === socket.id)) {
          return;
        }
        
        // Record answer
        const question = game.questions[game.currentQuestion];
        const timeElapsed = Date.now() - (game.roundStartTime || Date.now());
        const points = calculatePoints(timeElapsed, question.time * 1000);
        
        game.playersAnswer.push({
          id: socket.id,
          answer: answerKey,
          points: points
        });
        
        // Notify players of answer count
        io.to(foundPin).emit("game:playerAnswer", game.playersAnswer.length);
        
        // If all players have answered, end the question early
        if (game.playersAnswer.length >= game.players.length) {
          clearTimeout(game.questionTimer);
          handleQuestionEnd(foundPin);
        }
        
        break;
      }
    }
    
    if (!foundGame) {
      socket.emit("game:errorMessage", "You are not in an active game");
    }
  });

  // Next question
  socket.on("manager:nextQuestion", () => {
    // Find game where this socket is the host
    let gamePin = null;
    let game = null;
    
    for (const [pin, g] of activeGames.entries()) {
      if (g.hostId === socket.id) {
        gamePin = pin;
        game = g;
        break;
      }
    }
    
    if (!game) {
      socket.emit("game:errorMessage", "You are not hosting any active games");
      return;
    }
    
    // Advance to next question
    game.currentQuestion++;
    
    // Check if we've reached the end
    if (game.currentQuestion >= game.questions.length) {
      // Game over
      io.to(game.hostId).emit("game:status", {
        name: "FINISH",
        data: {
          subject: game.title || "Quiz Game",
          top: game.players.sort((a, b) => b.score - a.score).slice(0, 3)
        }
      });
      
      // Send final results to players
      io.to(gamePin).emit("game:status", {
        name: "SHOW_FINAL_RESULTS",
        data: {
          leaderboard: game.players.sort((a, b) => b.score - a.score),
          totalQuestions: game.questions.length,
          subject: game.title || "Quiz Game"
        }
      });
      
      return;
    }
    
    // Start next question
    const question = game.questions[game.currentQuestion];
    
    // Send question number update
    io.to(gamePin).emit("game:updateQuestion", {
      current: game.currentQuestion + 1,
      total: game.questions.length
    });
    
    // Show question preparation screen
    io.to(gamePin).emit("game:status", {
      name: "SHOW_PREPARED",
      data: {
        totalAnswers: question.answers.length,
        questionNumber: game.currentQuestion + 1
      }
    });
    
    // After preparation, show the question
    setTimeout(() => {
      if (activeGames.has(gamePin)) {
        io.to(gamePin).emit("game:status", {
          name: "SHOW_QUESTION",
          data: {
            question: question.question,
            image: question.image,
            cooldown: question.cooldown,
            currentQuestion: game.currentQuestion
          }
        });
        
        // After cooldown, show answer options
        setTimeout(() => {
          if (activeGames.has(gamePin)) {
            const updatedGame = activeGames.get(gamePin);
            
            if (updatedGame.status === 'active') {
              // Record start time for point calculation
              updatedGame.roundStartTime = Date.now();
              
              io.to(gamePin).emit("game:status", {
                name: "SELECT_ANSWER",
                data: {
                  question: question.question,
                  answers: question.answers,
                  image: question.image,
                  time: question.time,
                  totalPlayer: updatedGame.players.length
                }
              });
              
              // Set a timer for when question ends
              updatedGame.questionTimer = setTimeout(() => {
                handleQuestionEnd(gamePin);
              }, question.time * 1000);
            }
          }
        }, question.cooldown * 1000);
      }
    }, 2000);
  });

  // Show leaderboard
  socket.on("manager:showLeaderboard", () => {
    // Find game where this socket is the host
    let gamePin = null;
    let game = null;
    
    for (const [pin, g] of activeGames.entries()) {
      if (g.hostId === socket.id) {
        gamePin = pin;
        game = g;
        break;
      }
    }
    
    if (!game) {
      socket.emit("game:errorMessage", "You are not hosting any active games");
      return;
    }
    
    // Send leaderboard to host
    socket.emit("game:status", {
      name: "SHOW_LEADERBOARD",
      data: {
        leaderboard: game.players.sort((a, b) => b.score - a.score).slice(0, 5)
      }
    });
  });

  // Kick player
  socket.on("manager:kickPlayer", (playerId) => {
    // Find game where this socket is the host
    let gamePin = null;
    let game = null;
    
    for (const [pin, g] of activeGames.entries()) {
      if (g.hostId === socket.id) {
        gamePin = pin;
        game = g;
        break;
      }
    }
    
    if (!game) {
      socket.emit("game:errorMessage", "You are not hosting any active games");
      return;
    }
    
    // Find player
    const playerIndex = game.players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      socket.emit("game:errorMessage", "Player not found");
      return;
    }
    
    // Remove player
    const player = game.players[playerIndex];
    game.players.splice(playerIndex, 1);
    
    // Notify player
    io.to(playerId).emit("game:kick");
    
    // Notify host
    socket.emit("manager:playerKicked", playerId);
    
    console.log(`Player ${player.username} kicked from game ${gamePin}`);
  });

  // Reset game
  socket.on("manager:resetGame", () => {
    // Find game where this socket is the host
    let gamePin = null;
    
    for (const [pin, game] of activeGames.entries()) {
      if (game.hostId === socket.id) {
        gamePin = pin;
        break;
      }
    }
    
    if (!gamePin) {
      return;
    }
    
    // Remove game
    activeGames.delete(gamePin);
    
    // Notify players
    io.to(gamePin).emit("game:reset");
    
    console.log(`Game ${gamePin} reset by host`);
  });

  // Disconnect handler
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Check if this was a host
    for (const [pin, game] of activeGames.entries()) {
      if (game.hostId === socket.id) {
        // Notify players that game is over
        io.to(pin).emit("game:reset");
        
        // Remove game
        activeGames.delete(pin);
        
        console.log(`Game ${pin} ended due to host disconnect`);
        break;
      }
    }
    
    // Check if this was a player
    for (const [pin, game] of activeGames.entries()) {
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        // Remove player
        const player = game.players[playerIndex];
        game.players.splice(playerIndex, 1);
        
        // Notify host
        io.to(game.hostId).emit("manager:removePlayer", socket.id);
        
        console.log(`Player ${player.username} left game ${pin} due to disconnect`);
        break;
      }
    }
  });


// Get current players list for host
socket.on("manager:getPlayers", () => {
  // Find game where this socket is the host
  let hostGame = null;
  let gamePin = null;
  
  for (const [pin, game] of activeGames.entries()) {
    if (game.hostId === socket.id) {
      hostGame = game;
      gamePin = pin;
      break;
    }
  }
  
  if (!hostGame) {
    console.log("No active game found for host:", socket.id);
    return;
  }
  
  console.log(`Sending player list to host. Game: ${gamePin}, Players: ${hostGame.players.length}`);
  
  // Send each player individually to avoid race conditions
  hostGame.players.forEach(player => {
    socket.emit("manager:newPlayer", player);
  });
});

});