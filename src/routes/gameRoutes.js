const express = require('express');
const { body } = require('express-validator');
const GameController = require('../controllers/GameController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/games/play:
 *   post:
 *     summary: Play a game
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - game_type
 *               - stake_amount
 *             properties:
 *               game_type:
 *                 type: string
 *                 enum: [coin_flip, dice_roll, number_guess]
 *               stake_amount:
 *                 type: number
 *                 format: float
 *     responses:
 *       200:
 *         description: Game result
 */
router.post('/games/play', [
  authenticate,
  body('game_type').isIn(['coin_flip', 'dice_roll', 'number_guess']).withMessage('Invalid game type'),
  body('stake_amount').isFloat({ min: 0.01 }).withMessage('Stake amount must be a positive number')
], GameController.playGame);

/**
 * @swagger
 * /api/games/history:
 *   get:
 *     summary: Get user's game history
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of games to return
 *     responses:
 *       200:
 *         description: User's game history
 */
router.get('/games/history', authenticate, GameController.getGameHistory);

module.exports = router;
