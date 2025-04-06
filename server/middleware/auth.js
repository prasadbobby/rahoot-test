// middleware/auth.js
import jwt from 'jsonwebtoken'
import { sessionService, userService } from '../db/dbHandler.js'

const JWT_SECRET = process.env.JWT_SECRET || 'rahoot-secret-key'

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
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
    
    // Set user in request
    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export const authorizeAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}