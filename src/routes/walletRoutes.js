const express = require('express');
const WalletController = require('../controllers/WalletController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/me/wallet:
 *   get:
 *     summary: Get user's wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's wallet
 *       404:
 *         description: Wallet not found
 */
router.get('/me/wallet', authenticate, WalletController.getWallet);

/**
 * @swagger
 * /api/me/transactions:
 *   get:
 *     summary: Get user's transaction history
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of transactions to return
 *     responses:
 *       200:
 *         description: User's transaction history
 */
router.get('/me/transactions', authenticate, WalletController.getTransactions);

module.exports = router;
