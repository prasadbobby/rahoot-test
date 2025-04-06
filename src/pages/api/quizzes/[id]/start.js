// src/pages/api/quizzes/[id]/start.js
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = path.join(process.cwd(), 'server/db/data.json');

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
    
    return {
      users: [],
      googleUsers: [],
      games: [],
      gameInstances: [],
      scores: []
    };
  } catch (error) {
    console.error('Error reading database:', error);
    return null;
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

// Verify JWT
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'jwt-secret');
  } catch (error) {
    return null;
  }
}

// Check if user is admin
function isAdmin(userId, db) {
  // Check standard users
  const user = db.users.find(u => u.id === userId);
  if (user && user.role === 'admin') return true;
  
  // Check Google users
  const googleUser = db.googleUsers.find(u => u.id === userId);
  if (googleUser && googleUser.role === 'admin') return true;
  
  return false;
}

export default async function handler(req, res) {
  // Only handle POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token required' });
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  
  // Read DB
  const db = readDB();
  if (!db) {
    return res.status(500).json({ message: 'Database error' });
  }
  
  // Verify admin privileges
  if (!isAdmin(decoded.id, db)) {
    return res.status(403).json({ message: 'Admin privileges required to host quizzes' });
  }
  
  try {
    // Get quiz ID from URL
    const { id } = req.query;
    
    // Find the quiz
    const quiz = db.games.find(g => g.id === id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    // Generate a PIN code for the game
    const gamePin = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Create a game instance
    const gameInstance = {
      id: uuidv4(),
      quizId: id,
      hostId: decoded.id,
      gamePin,
      title: quiz.title,
      questions: quiz.questions,
      status: 'waiting',
      players: [],
      createdAt: new Date().toISOString()
    };
    
    // Save game instance to DB
    if (!db.gameInstances) {
      db.gameInstances = [];
    }
    db.gameInstances.push(gameInstance);
    writeDB(db);
    
    // Return the game PIN
    return res.status(200).json({ 
      message: 'Game started successfully', 
      gamePin,
      gameInstance
    });
  } catch (error) {
    console.error('Error starting game:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}