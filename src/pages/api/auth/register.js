// src/pages/api/auth/register.js
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = path.join(process.cwd(), 'server/db/data.json');

// Ensure the DB exists
function ensureDBExists() {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
  
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      users: [],
      googleUsers: [],
      games: [],
      gameInstances: [],
      scores: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
  }
}

// Read DB
function readDB() {
  ensureDBExists();
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return null;
  }
}

// Write to DB
function writeDB(data) {
  ensureDBExists();
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing to database:', error);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { username, email, password, confirmPassword } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Read DB
    const db = readDB();
    if (!db) {
      return res.status(500).json({ message: 'Database error' });
    }

    // Check if user exists
    if (db.users.some(user => user.email === email)) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    if (db.users.some(user => user.username === username)) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Create user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const userId = uuidv4();
    const newUser = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    // Add to DB
    db.users.push(newUser);
    writeDB(db);

    // Generate token
    const token = jwt.sign(
      { id: userId },
      process.env.JWT_SECRET || 'jwt-secret',
      { expiresIn: '7d' }
    );

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      message: 'User registered successfully',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
}