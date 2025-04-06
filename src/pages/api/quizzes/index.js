// src/pages/api/quizzes/index.js
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = path.join(process.cwd(), 'server/db/data.json');

// Read DB
function readDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(data);
    }
    return { users: [], googleUsers: [], games: [], gameInstances: [], scores: [] };
  } catch (error) {
    console.error('Error reading database:', error);
    return null;
  }
}

// Write to DB
function writeDB(data) {
  try {
    const dirPath = path.dirname(DB_PATH);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
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
  // Handle POST request to create a new quiz
  if (req.method === 'POST') {
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
      return res.status(403).json({ message: 'Admin privileges required to create quizzes' });
    }
    
    try {
      const { title, description, category, isPublic, questions } = req.body;
      
      // Basic validation
      if (!title || !description || !questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: 'Invalid quiz data' });
      }
      
      // Create the quiz
      const quiz = {
        id: uuidv4(),
        title,
        description,
        category: category || 'General',
        isPublic: !!isPublic,
        questions,
        createdBy: decoded.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save to DB
      if (!db.games) db.games = [];
      db.games.push(quiz);
      writeDB(db);
      
      return res.status(201).json(quiz);
    } catch (error) {
      console.error('Error creating quiz:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
  
  // Handle GET request to fetch quizzes
  else if (req.method === 'GET') {
    try {
      const db = readDB();
      if (!db) {
        return res.status(500).json({ message: 'Database error' });
      }
      
      const quizzes = db.games || [];
      
      // If no authorization, return only public quizzes
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const publicQuizzes = quizzes.filter(quiz => quiz.isPublic);
        return res.status(200).json(publicQuizzes);
      }
      
      // Verify token
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      if (!decoded) {
        const publicQuizzes = quizzes.filter(quiz => quiz.isPublic);
        return res.status(200).json(publicQuizzes);
      }
      
      // For admin users, return all quizzes
      if (isAdmin(decoded.id, db)) {
        return res.status(200).json(quizzes);
      }
      
      // For regular users, return public quizzes and their own quizzes
      const filteredQuizzes = quizzes.filter(
        quiz => quiz.isPublic || quiz.createdBy === decoded.id
      );
      
      return res.status(200).json(filteredQuizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
  
  // Handle other HTTP methods
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}