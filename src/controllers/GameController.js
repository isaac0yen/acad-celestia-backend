const GameService = require('../services/GameService');
const { User, Wallet, Game, sequelize } = require('../models');

class GameController {
  /**
   * Start a new challenge
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async startChallenge(req, res) {
    try {
      const { challengeType } = req.body;
      const userId = req.user.id;
      
      const result = await GameService.startChallenge(userId, challengeType, req.body);
      
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
   * Get all active challenges for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getChallenges(req, res) {
    try {
      const userId = req.user.id;
      
      // Get user data
      const user = await User.findByPk(userId);
      if (!user || !user.metadata || !user.metadata.challenges) {
        return res.status(200).json({ challenges: [] });
      }
      
      // Get challenges with progress information
      const challenges = user.metadata.challenges;
      const challengesWithProgress = [];
      
      for (const challenge of challenges) {
        const progress = await GameService.checkChallengeProgress(userId, challenge.id);
        
        challengesWithProgress.push({
          ...challenge,
          progress: progress.progress,
          isCompleted: progress.isCompleted
        });
      }
      
      res.status(200).json({ challenges: challengesWithProgress });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message
      });
    }
  }
  
  /**
   * Check progress of a specific challenge
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkChallengeProgress(req, res) {
    try {
      const { challengeId } = req.params;
      const userId = req.user.id;
      
      const result = await GameService.checkChallengeProgress(userId, challengeId);
      
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
  
  /**
   * Complete a challenge and claim reward
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async completeChallenge(req, res) {
    try {
      const { challengeId } = req.params;
      const userId = req.user.id;
      
      const result = await GameService.completeChallenge(userId, challengeId);
      
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
   * Get leaderboard data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getLeaderboard(req, res) {
    try {
      const { institutionCode } = req.params;
      const timeframe = req.query.timeframe || 'all'; // all, month, week
      
      // Get all wallets
      const wallets = await Wallet.findAll({
        include: [{
          model: User,
          attributes: ['id', 'name', 'institutionCode']
        }],
        order: [['stakedBalance', 'DESC']],
        limit: 10
      });
      
      // Format leaderboard data
      const leaderboard = wallets.map((wallet, index) => ({
        rank: index + 1,
        userId: wallet.userId,
        userName: wallet.User.name,
        institutionCode: wallet.User.institutionCode,
        balance: wallet.balance,
        stakedBalance: wallet.stakedBalance,
        totalValue: wallet.balance + wallet.stakedBalance
      }));
      
      res.status(200).json({ leaderboard });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message
      });
    }
  }

  /**
   * Play a game (coin flip, dice roll, etc.)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async playGame(req, res) {
    try {
      const { game_type, stake_amount } = req.body;
      const userId = req.user.id;
      
      const result = await GameService.playGame(userId, game_type, stake_amount);
      
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
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 10;
      const page = parseInt(req.query.page) || 1;
      const offset = (page - 1) * limit;
      
      // Get games with pagination
      const { count, rows } = await Game.findAndCountAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });
      
      res.status(200).json({
        games: rows,
        pagination: {
          total: count,
          page,
          pageSize: limit,
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message
      });
    }
  }
  
  /**
   * Get challenges data for dashboard
   * @param {string} userId - User ID
   * @returns {Object} Challenges data
   */
  async getChallengesData(userId) {
    try {
      // Get user data
      const user = await User.findByPk(userId);
      if (!user || !user.metadata || !user.metadata.challenges) {
        return {
          activeChallenges: [],
          completedChallenges: 0,
          totalRewards: 0
        };
      }
      
      // Get challenges with progress information
      const challenges = user.metadata.challenges;
      const activeChallenges = [];
      let completedChallenges = 0;
      let totalRewards = 0;
      
      for (const challenge of challenges) {
        const progress = await GameService.checkChallengeProgress(userId, challenge.id);
        
        if (challenge.status === 'completed') {
          completedChallenges++;
          totalRewards += challenge.reward || 0;
        } else if (challenge.status === 'active') {
          activeChallenges.push({
            id: challenge.id,
            type: challenge.type,
            title: challenge.title,
            description: challenge.description,
            progress: progress.progress,
            target: challenge.target,
            reward: challenge.reward,
            startDate: challenge.startDate,
            endDate: challenge.endDate
          });
        }
      }
      
      return {
        activeChallenges: activeChallenges.slice(0, 3), // Return only top 3 active challenges
        completedChallenges,
        totalRewards,
        hasActiveChallenges: activeChallenges.length > 0
      };
    } catch (error) {
      console.error('Error getting challenges data:', error);
      return {
        activeChallenges: [],
        completedChallenges: 0,
        totalRewards: 0
      };
    }
  }
  
  /**
   * Get leaderboard data for dashboard
   * @param {string} institutionCode - Institution code
   * @param {string} timeframe - Timeframe (all, month, week)
   * @returns {Array} Leaderboard data
   */
  async getLeaderboardData(institutionCode, timeframe = 'all') {
    try {
      // Define time constraints based on timeframe
      const where = {};
      
      if (timeframe !== 'all') {
        const date = new Date();
        if (timeframe === 'week') {
          date.setDate(date.getDate() - 7);
        } else if (timeframe === 'month') {
          date.setMonth(date.getMonth() - 1);
        }
        
        where.createdAt = {
          [sequelize.Op.gte]: date
        };
      }
      
      // Add institution filter if provided
      if (institutionCode) {
        where['$User.institutionCode$'] = institutionCode;
      }
      
      // Get all wallets
      const wallets = await Wallet.findAll({
        include: [{
          model: User,
          attributes: ['id', 'name', 'institutionCode'],
          required: true
        }],
        where,
        order: [['stakedBalance', 'DESC']],
        limit: 10
      });
      
      // Format leaderboard data
      return wallets.map((wallet, index) => ({
        rank: index + 1,
        userId: wallet.userId,
        userName: wallet.User.name,
        institutionCode: wallet.User.institutionCode,
        stakedBalance: wallet.stakedBalance,
        totalValue: wallet.balance + wallet.stakedBalance
      }));
    } catch (error) {
      console.error('Error getting leaderboard data:', error);
      return [];
    }
  }
}

module.exports = new GameController();