import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = path.join(process.cwd(), 'server/db/data.json');
const googleClient = new OAuth2Client(
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// Helper functions for DB operations
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

function isAdminEmail(email) {
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || [];
  return adminEmails.includes(email.toLowerCase());
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ message: 'Authorization code required' });
  }

  try {
    // Exchange auth code for tokens
    const { tokens } = await googleClient.getToken({
      code,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
    });

    // Verify ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    });

    const { email, name, picture } = ticket.getPayload();
    
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
      
      db.googleUsers.push(user);
    }
    
    writeDB(db);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, provider: 'google' },
      process.env.JWT_SECRET || 'jwt-secret',
      { expiresIn: '7d' }
    );

    // Redirect back to client with auth data
    res.redirect(`/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
  } catch (error) {
    console.error('Google auth error:', error);
    res.redirect('/auth/login?error=GoogleAuthFailed');
  }
}