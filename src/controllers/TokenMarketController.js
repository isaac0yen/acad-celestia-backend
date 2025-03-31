const TokenMarketService = require('../services/TokenMarketService');

class TokenMarketController {
  /**
   * Buy tokens
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async buyTokens(req, res) {
    try {
      const { amount } = req.body;
      const userId = req.user.id;
      const institutionCode = req.user.institutionCode;

      const result = await TokenMarketService.processTransaction(
        userId,
        'buy',
        parseFloat(amount),
        institutionCode
      );

      if (!result.success) {
        return res.status(400).json({
          status: false,
          message: result.message
        });
      }

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message
      });
    }
  }

  /**
   * Sell tokens
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async sellTokens(req, res) {
    try {
      const { amount } = req.body;
      const userId = req.user.id;
      const institutionCode = req.user.institutionCode;

      const result = await TokenMarketService.processTransaction(
        userId,
        'sell',
        parseFloat(amount),
        institutionCode
      );

      if (!result.success) {
        return res.status(400).json({
          status: false,
          message: result.message
        });
      }

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message
      });
    }
  }

  /**
   * Get token market statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getMarketStats(req, res) {
    try {
      const { institutionCode } = req.params;

      const result = await TokenMarketService.getMarketStats(institutionCode);

      if (!result.success) {
        return res.status(404).json({
          status: false,
          message: result.message
        });
      }

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message
      });
    }
  }
}

module.exports = new TokenMarketController();
