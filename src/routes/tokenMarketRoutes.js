const express = require('express');
const { body, param } = require('express-validator');
const TokenMarketController = require('../controllers/TokenMarketController');
const { authenticate } = require('../middleware/auth');
const { checkUserStatus } = require('../middleware/checkUserStatus');

const router = express.Router();

/**
 * @swagger
 * /api/token/buy:
 *   post:
 *     summary: Buy tokens with Naira
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
 *               - institutionCode
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *               institutionCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transaction completed
 */
router.post('/token/buy', [
  authenticate,
  checkUserStatus,
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('institutionCode').isString().notEmpty().withMessage('Institution code is required')
], TokenMarketController.buyTokens);

/**
 * @swagger
 * /api/token/sell:
 *   post:
 *     summary: Sell tokens for Naira
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
 *               - tokenAmount
 *               - institutionCode
 *             properties:
 *               tokenAmount:
 *                 type: number
 *                 format: float
 *               institutionCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transaction completed
 */
router.post('/token/sell', [
  authenticate,
  checkUserStatus,
  body('tokenAmount').isFloat({ min: 0.000001 }).withMessage('Token amount must be a positive number'),
  body('institutionCode').isString().notEmpty().withMessage('Institution code is required')
], TokenMarketController.sellTokens);

/**
 * @swagger
 * /api/token/swap:
 *   post:
 *     summary: Swap tokens between institutions
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
 *               - sourceTokenCode
 *               - targetTokenCode
 *               - sourceTokenAmount
 *             properties:
 *               sourceTokenCode:
 *                 type: string
 *               targetTokenCode:
 *                 type: string
 *               sourceTokenAmount:
 *                 type: number
 *                 format: float
 *     responses:
 *       200:
 *         description: Swap completed
 */
router.post('/token/swap', [
  authenticate,
  checkUserStatus,
  body('sourceTokenCode').isString().notEmpty().withMessage('Source token code is required'),
  body('targetTokenCode').isString().notEmpty().withMessage('Target token code is required'),
  body('sourceTokenAmount').isFloat({ min: 0.000001 }).withMessage('Source token amount must be a positive number')
], TokenMarketController.swapTokens);

/**
 * @swagger
 * /api/wallet/deposit:
 *   post:
 *     summary: Deposit Naira to wallet
 *     tags: [Wallet]
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
 *         description: Deposit completed
 */
router.post('/wallet/deposit', [
  authenticate,
  checkUserStatus,
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number')
], TokenMarketController.depositNaira);

/**
 * @swagger
 * /api/wallet/withdraw:
 *   post:
 *     summary: Withdraw Naira from wallet
 *     tags: [Wallet]
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
 *         description: Withdrawal completed
 */
router.post('/wallet/withdraw', [
  authenticate,
  checkUserStatus,
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number')
], TokenMarketController.withdrawNaira);

/**
 * @swagger
 * /api/token/markets:
 *   get:
 *     summary: Get all token markets
 *     tags: [Token Market]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of token markets
 */
router.get('/token/markets', [
  authenticate,
  checkUserStatus
], TokenMarketController.getAllTokenMarkets);

/**
 * @swagger
 * /api/token/market/{institutionCode}:
 *   get:
 *     summary: Get token market by institution code
 *     tags: [Token Market]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: institutionCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token market details
 */
router.get('/token/market/:institutionCode', [
  authenticate,
  checkUserStatus,
  param('institutionCode').isString().notEmpty().withMessage('Institution code is required')
], TokenMarketController.getTokenMarket);

/**
 * @swagger
 * /api/token/balances:
 *   get:
 *     summary: Get user's token balances
 *     tags: [Token Market]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's token balances
 */
router.get('/token/balances', [
  authenticate,
  checkUserStatus
], TokenMarketController.getUserTokenBalances);


module.exports = router;
