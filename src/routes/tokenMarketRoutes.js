const express = require('express');
const { body } = require('express-validator');
const TokenMarketController = require('../controllers/TokenMarketController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/token/buy:
 *   post:
 *     summary: Buy tokens
 *     tags: [Token Market]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *     responses:
 *       200:
 *         description: Transaction completed
 */
router.post('/token/buy', [
  authenticate,
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number')
], TokenMarketController.buyTokens);

/**
 * @swagger
 * /api/token/sell:
 *   post:
 *     summary: Sell tokens
 *     tags: [Token Market]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *     responses:
 *       200:
 *         description: Transaction completed
 */
router.post('/token/sell', [
  authenticate,
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number')
], TokenMarketController.sellTokens);

/**
 * @swagger
 * /api/token/market/{institution_code}:
 *   get:
 *     summary: Get token market statistics
 *     tags: [Token Market]
 *     parameters:
 *       - in: path
 *         name: institution_code
 *         required: true
 *         schema:
 *           type: string
 *         description: Institution code
 *     responses:
 *       200:
 *         description: Market statistics
 *       404:
 *         description: Market not found
 */
router.get('/token/market/:institutionCode', TokenMarketController.getMarketStats);

module.exports = router;
