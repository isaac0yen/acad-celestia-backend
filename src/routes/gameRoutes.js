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

/**
 * @swagger
 * /api/challenges/start:
 *   post:
 *     summary: Start a new challenge
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - challengeType
 *             properties:
 *               challengeType:
 *                 type: string
 *                 enum: [diversification, hold, market_timing]
 *               amount:
 *                 type: number
 *                 format: float
 *               institutionCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Challenge started
 *       400:
 *         description: Invalid request
 */
router.post('/challenges/start', [
  authenticate,
  body('challengeType').isIn(['diversification', 'hold', 'market_timing']).withMessage('Invalid challenge type'),
  body('amount').optional().isFloat({ min: 1 }).withMessage('Amount must be a positive number'),
  body('institutionCode').optional().isString().withMessage('Institution code must be a string')
], GameController.startChallenge);

/**
 * @swagger
 * /api/challenges:
 *   get:
 *     summary: Get all active challenges for the user
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active challenges
 */
router.get('/challenges', authenticate, GameController.getChallenges);

/**
 * @swagger
 * /api/challenges/{challengeId}/progress:
 *   get:
 *     summary: Check progress of a specific challenge
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: challengeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Challenge ID
 *     responses:
 *       200:
 *         description: Challenge progress
 *       404:
 *         description: Challenge not found
 */
router.get('/challenges/:challengeId/progress', authenticate, GameController.checkChallengeProgress);

/**
 * @swagger
 * /api/challenges/{challengeId}/complete:
 *   post:
 *     summary: Complete a challenge and claim reward
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: challengeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Challenge ID
 *     responses:
 *       200:
 *         description: Challenge completed and reward claimed
 *       400:
 *         description: Challenge cannot be completed
 */
router.post('/challenges/:challengeId/complete', authenticate, GameController.completeChallenge);

/**
 * @swagger
 * /api/leaderboard:
 *   get:
 *     summary: Get global leaderboard
 *     tags: [Leaderboard]
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [all, month, week]
 *           default: all
 *         description: Timeframe for leaderboard
 *     responses:
 *       200:
 *         description: Leaderboard data
 */
router.get('/leaderboard', GameController.getLeaderboard);

/**
 * @swagger
 * /api/leaderboard/{institutionCode}:
 *   get:
 *     summary: Get institution-specific leaderboard
 *     tags: [Leaderboard]
 *     parameters:
 *       - in: path
 *         name: institutionCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Institution code
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [all, month, week]
 *           default: all
 *         description: Timeframe for leaderboard
 *     responses:
 *       200:
 *         description: Leaderboard data
 */
router.get('/leaderboard/:institutionCode', GameController.getLeaderboard);

module.exports = router;
