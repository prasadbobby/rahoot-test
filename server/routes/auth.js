// routes/auth.js
import express from 'express'
import { userService, sessionService } from '../db/dbHandler.js'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'

const router = express.Router()
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

// Secret for JWT tokens
const JWT_SECRET = process.env.JWT_SECRET || 'rahoot-secret-key'

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' })
    }

    // Check if user already exists
    if (userService.findByEmail(email)) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    if (userService.findByUsername(username)) {
      return res.status(400).json({ error: 'Username already taken' })
    }

    // Create new user
    const user = userService.createUser({ username, email, password })
    
    // Create session and JWT
    const token = sessionService.createSession(user.id)
    const jwtToken = jwt.sign({ sessionToken: token }, JWT_SECRET, { expiresIn: '7d' })

    res.json({ 
      token: jwtToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'An error occurred during registration' })
  }
})

// Login with email and password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    
    // Find user by email
    const user = userService.findByEmail(email)
    
    if (!user || !userService.verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Create session and JWT
    const token = sessionService.createSession(user.id)
    const jwtToken = jwt.sign({ sessionToken: token }, JWT_SECRET, { expiresIn: '7d' })

    res.json({ 
      token: jwtToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'An error occurred during login' })
  }
})

// Google Sign-in
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body
    
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    })
    
    const payload = ticket.getPayload()
    const { email, name, picture } = payload
    
    // Create or update Google user
    const user = userService.upsertGoogleUser({ email, name, picture })
    
    // Create session and JWT
    const sessionToken = sessionService.createSession(user.id, 'google')
    const jwtToken = jwt.sign({ sessionToken }, JWT_SECRET, { expiresIn: '7d' })
    
    res.json({ 
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Google sign-in error:', error)
    res.status(500).json({ error: 'An error occurred during Google sign-in' })
  }
})

// Logout
router.post('/logout', (req, res) => {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET)
        sessionService.deleteSession(decoded.sessionToken)
      } catch (err) {
        // Invalid token, continue with logout anyway
      }
    }
    
    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'An error occurred during logout' })
  }
})

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }
    
    const token = authHeader.substring(7)
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      const session = sessionService.getSession(decoded.sessionToken)
      
      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' })
      }
      
      // Find user based on session type
      let user
      if (session.userType === 'google') {
        user = userService.findGoogleUserById(session.userId)
      } else {
        user = userService.findById(session.userId)
      }
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' })
      }
      
      // Return user without password
      const { password, ...userWithoutPassword } = user
      res.json({ user: userWithoutPassword })
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' })
    }
  } catch (error) {
    console.error('Get current user error:', error)
    res.status(500).json({ error: 'An error occurred while fetching user data' })
  }
})

export default router