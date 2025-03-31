const { Wallet, Transaction } = require('../models');

class WalletController {
  /**
   * Get user's wallet
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getWallet(req, res) {
    try {
      const wallet = await Wallet.findOne({
        where: { userId: req.user.id }
      });

      if (!wallet) {
        return res.status(404).json({
          status: false,
          message: 'Wallet not found'
        });
      }

      res.status(200).json(wallet);
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message
      });
    }
  }

  /**
   * Get user's transaction history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTransactions(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      
      const transactions = await Transaction.findAll({
        where: { userId: req.user.id },
        order: [['createdAt', 'DESC']],
        limit
      });

      res.status(200).json(transactions);
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message
      });
    }
  }
}

module.exports = new WalletController();
