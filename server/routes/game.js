// routes/game.js
import express from 'express'
import { gameService, scoreService } from '../db/dbHandler.js'
import { authenticate, authorizeAdmin } from '../middleware/auth.js'

const router = express.Router()

// Create a new game (admin only)
router.post('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { subject, questions } = req.body
    
    if (!subject || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Valid subject and questions are required' })
    }
    
    const game = gameService.createGame(req.user.id, subject, questions)
    res.json(game)
  } catch (error) {
    console.error('Create game error:', error)
    res.status(500).json({ error: 'An error occurred while creating the game' })
  }
})

// Get all games for the current user
router.get('/my-games', authenticate, async (req, res) => {
  try {
    const games = gameService.getGamesByHost(req.user.id)
    res.json(games)
  } catch (error) {
    console.error('Get games error:', error)
    res.status(500).json({ error: 'An error occurred while fetching games' })
  }
})

// Get a game by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const game = gameService.getGame(req.params.id)
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' })
    }
    
    // Only allow access to the host or admin
    if (game.hostId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    res.json(game)
  } catch (error) {
    console.error('Get game error:', error)
    res.status(500).json({ error: 'An error occurred while fetching the game' })
  }
})

// Update game status
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body
    const game = gameService.getGame(req.params.id)
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' })
    }
    
    // Only allow the host or admin to update status
    if (game.hostId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    const updatedGame = gameService.updateGameStatus(req.params.id, status)
    res.json(updatedGame)
  } catch (error) {
    console.error('Update game status error:', error)
    res.status(500).json({ error: 'An error occurred while updating game status' })
  }
})

// Get game scores
router.get('/:id/scores', authenticate, async (req, res) => {
  try {
    const game = gameService.getGame(req.params.id)
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' })
    }
    
    const scores = scoreService.getScoresByGame(req.params.id)
    res.json(scores)
  } catch (error) {
    console.error('Get game scores error:', error)
    res.status(500).json({ error: 'An error occurred while fetching game scores' })
  }
})

// Add a score for a game
router.post('/:id/scores', async (req, res) => {
  try {
    const { userId, username, points } = req.body
    const game = gameService.getGame(req.params.id)
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' })
    }
    
    const score = scoreService.addScore(req.params.id, userId, username, points)
    res.json(score)
  } catch (error) {
    console.error('Add score error:', error)
    res.status(500).json({ error: 'An error occurred while adding the score' })
  }
})

// Get user game history
router.get('/user/:userId/history', authenticate, async (req, res) => {
  try {
    // Only allow the user to view their own history or admin to view any
    if (req.params.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    const history = scoreService.getUserGameHistory(req.params.userId)
    res.json(history)
  } catch (error) {
    console.error('Get user game history error:', error)
    res.status(500).json({ error: 'An error occurred while fetching game history' })
  }
})

export default router