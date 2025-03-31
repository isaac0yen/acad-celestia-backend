const GameService = require('../services/GameService');

class GameController {
  /**
   * Play a game
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async playGame(req, res) {
    try {
      const { game_type, stake_amount } = req.body;
      const userId = req.user.id;
      const institutionCode = req.user.institutionCode;

      const result = await GameService.createGame(
        userId,
        game_type,
        parseFloat(stake_amount),
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
   * Get user's game history
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGameHistory(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const userId = req.user.id;

      const games = await GameService.getUserGames(userId, limit);

      res.status(200).json(games);
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message
      });
    }
  }
}

module.exports = new GameController();
