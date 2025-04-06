// src/pages/api/auth/google.js
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';
 
// Configure the Google client
const googleClient = new OAuth2Client({
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET
});

// Configure HTTP agent to ignore SSL certificate errors (only for development)
const httpAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV === 'production' // Only verify SSL in production
});

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

// Check if email is in admin list
function isAdminEmail(email) {
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || [];
  return adminEmails.includes(email.toLowerCase());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { tokenId } = req.body;

    if (!tokenId) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Verify token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokenId,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      httpAgent // Added http agent to handle SSL issues
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Read DB
    const db = readDB();
    if (!db) {
      return res.status(500).json({ message: 'Database error' });
    }

    // Check if user exists
    let user = db.googleUsers.find(user => user.email === email);
    const isAdmin = isAdminEmail(email);
    
    if (user) {
      // Update existing user
      user.name = name;
      user.picture = picture;
      user.lastLogin = new Date().toISOString();
      
      // Update role if needed
      if (isAdmin && user.role !== 'admin') {
        user.role = 'admin';
      }
      
      // Find user index and update in array
      const index = db.googleUsers.findIndex(u => u.id === user.id);
      if (index !== -1) {
        db.googleUsers[index] = user;
      }
    } else {
      // Create new user
      user = {
        id: uuidv4(),
        email,
        name,
        picture,
        role: isAdmin ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      
      // Initialize googleUsers array if it doesn't exist
      if (!db.googleUsers) {
        db.googleUsers = [];
      }
      
      db.googleUsers.push(user);
    }
    
    // Save to DB
    writeDB(db);

    // Generate token
    const token = jwt.sign(
      { id: user.id, provider: 'google' },
      process.env.JWT_SECRET || 'jwt-secret',
      { expiresIn: '7d' }
    );
    
    res.status(200).json({
      message: 'Google login successful',
      user,
      token
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Server error during Google login' });
  }
}