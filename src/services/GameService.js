const { Game, Wallet, Transaction } = require('../models');
const TokenMarketService = require('./TokenMarketService');

class GameService {
  /**
   * Create and process a new game
   * @param {number} userId - User ID
   * @param {string} gameType - Game type (coin_flip, dice_roll, number_guess)
   * @param {number} stakeAmount - Amount to stake
   * @param {string} institutionCode - Institution code
   * @returns {Promise<Object>} Game result
   */
  async createGame(userId, gameType, stakeAmount, institutionCode) {
    try {
      // Get user's wallet
      const wallet = await Wallet.findOne({
        where: { userId }
      });

      if (!wallet || wallet.balance < stakeAmount) {
        return { success: false, message: 'Insufficient balance' };
      }

      // Process game logic
      const result = this._processGame(gameType);
      
      // Create game record
      const game = await Game.create({
        userId,
        gameType,
        stakeAmount,
        result: result.outcome,
        metadata: {
          details: result.details,
          institutionCode
        }
      });

      // Update wallet based on game result
      if (result.outcome === 'won') {
        // Winner gets double the stake
        wallet.balance += stakeAmount;
      } else {
        // Loser loses their stake
        wallet.balance -= stakeAmount;
      }
      
      await wallet.save();

      // Record transaction
      await Transaction.create({
        userId,
        walletId: wallet.id,
        transactionType: 'game',
        amount: stakeAmount,
        status: 'completed',
        metadata: {
          gameId: game.id,
          gameType,
          result: result.outcome,
          institutionCode
        }
      });

      // Update token market
      const market = await TokenMarketService.getTokenMarket(institutionCode);
      if (market) {
        await TokenMarketService.adjustTokenValue(market, 'game', stakeAmount);
      }

      return {
        success: true,
        message: `Game completed - You ${result.outcome}!`,
        details: result.details,
        newBalance: wallet.balance
      };
    } catch (error) {
      console.error('Game processing error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Process different game types
   * @param {string} gameType - Game type
   * @returns {Object} Game result
   */
  _processGame(gameType) {
    switch (gameType) {
      case 'coin_flip':
        return this._coinFlip();
      case 'dice_roll':
        return this._diceRoll();
      case 'number_guess':
        return this._numberGuess();
      default:
        throw new Error('Invalid game type');
    }
  }

  /**
   * Simple coin flip game
   * @returns {Object} Game result
   */
  _coinFlip() {
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const outcome = result === 'heads' ? 'won' : 'lost';
    
    return {
      outcome,
      details: {
        game: 'coin_flip',
        result
      }
    };
  }

  /**
   * Dice roll game - win on 6
   * @returns {Object} Game result
   */
  _diceRoll() {
    const roll = Math.floor(Math.random() * 6) + 1;
    const outcome = roll === 6 ? 'won' : 'lost';
    
    return {
      outcome,
      details: {
        game: 'dice_roll',
        roll
      }
    };
  }

  /**
   * Number guessing game
   * @returns {Object} Game result
   */
  _numberGuess() {
    const target = Math.floor(Math.random() * 10) + 1;
    const guess = Math.floor(Math.random() * 10) + 1;
    const outcome = guess === target ? 'won' : 'lost';
    
    return {
      outcome,
      details: {
        game: 'number_guess',
        target,
        guess
      }
    };
  }

  /**
   * Get user's game history
   * @param {number} userId - User ID
   * @param {number} limit - Maximum number of games to return
   * @returns {Promise<Array>} Game history
   */
  async getUserGames(userId, limit = 10) {
    return await Game.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit
    });
  }
}

module.exports = new GameService();
