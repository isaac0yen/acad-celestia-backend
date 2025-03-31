const { Wallet, Transaction, TokenBalance, TokenMarket, sequelize } = require('../models');

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

      // Get token balances for the user
      const tokenBalances = await TokenBalance.findAll({
        where: { userId: req.user.id }
      });

      res.status(200).json({
        wallet,
        tokenBalances
      });
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
      const page = parseInt(req.query.page) || 1;
      const offset = (page - 1) * limit;
      const transactionType = req.query.type; // Optional filter by transaction type
      const institutionCode = req.query.institutionCode; // Optional filter by institution
      
      const where = { userId: req.user.id };
      
      // Add filters if provided
      if (transactionType) {
        where.transactionType = transactionType;
      }
      
      if (institutionCode) {
        where.metadata = { institutionCode };
      }
      
      // Get transactions with pagination
      const { count, rows } = await Transaction.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      res.status(200).json({
        transactions: rows,
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
   * Get wallet summary with statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getWalletSummary(req, res) {
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
      
      // Get token balances
      const tokenBalances = await TokenBalance.findAll({
        where: { userId: req.user.id }
      });
      
      // Get transaction statistics
      const transactionStats = await Transaction.findAll({
        attributes: [
          'transactionType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('amount')), 'total']
        ],
        where: { userId: req.user.id },
        group: ['transactionType']
      });
      
      // Calculate total value of holdings
      let totalValue = wallet.balance;
      const holdings = [];
      
      for (const tokenBalance of tokenBalances) {
        // Fetch current token value
        const tokenMarket = await TokenMarket.findOne({
          where: { institutionCode: tokenBalance.institutionCode }
        });
        
        if (tokenMarket) {
          const tokenValue = tokenBalance.balance * tokenMarket.currentValue;
          totalValue += tokenValue;
          
          holdings.push({
            institutionCode: tokenBalance.institutionCode,
            balance: tokenBalance.balance,
            value: tokenValue,
            currentPrice: tokenMarket.currentValue
          });
        }
      }
      
      res.status(200).json({
        wallet: {
          id: wallet.id,
          balance: wallet.balance,
          stakedBalance: wallet.stakedBalance
        },
        holdings,
        totalValue,
        transactionStats
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message
      });
    }
  }

  /**
   * Get wallet summary data for dashboard
   * @param {string} userId - User ID
   * @returns {Object} Wallet summary data
   */
  async getWalletSummaryData(userId) {
    try {
      const wallet = await Wallet.findOne({
        where: { userId }
      });

      if (!wallet) {
        return {
          balance: 0,
          stakedBalance: 0,
          totalValue: 0,
          tokenCount: 0
        };
      }
      
      // Get token balances
      const tokenBalances = await TokenBalance.findAll({
        where: { userId }
      });
      
      // Calculate total value of holdings
      let totalValue = wallet.balance;
      let totalTokens = 0;
      
      for (const tokenBalance of tokenBalances) {
        // Fetch current token value
        const tokenMarket = await TokenMarket.findOne({
          where: { institutionCode: tokenBalance.institutionCode }
        });
        
        if (tokenMarket) {
          totalValue += tokenBalance.balance * tokenMarket.currentValue;
          totalTokens += tokenBalance.balance;
        }
      }
      
      // Get recent performance (last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const recentTransactions = await Transaction.findAll({
        where: {
          userId,
          createdAt: {
            [sequelize.Op.gte]: oneWeekAgo
          }
        }
      });
      
      // Calculate net change in last 7 days
      const netChange = recentTransactions.reduce((sum, transaction) => {
        if (transaction.transactionType === 'buy' || transaction.transactionType === 'reward') {
          return sum + transaction.amount;
        } else if (transaction.transactionType === 'sell' || transaction.transactionType === 'stake') {
          return sum - transaction.amount;
        }
        return sum;
      }, 0);
      
      return {
        balance: wallet.balance,
        stakedBalance: wallet.stakedBalance,
        totalValue,
        tokenCount: totalTokens,
        weeklyChange: netChange,
        weeklyChangePercentage: totalValue > 0 ? (netChange / totalValue) * 100 : 0,
        holdingsCount: tokenBalances.length
      };
    } catch (error) {
      console.error('Error getting wallet summary data:', error);
      return {
        balance: 0,
        stakedBalance: 0,
        totalValue: 0,
        tokenCount: 0
      };
    }
  }
  
  /**
   * Get recent transactions data for dashboard
   * @param {string} userId - User ID
   * @param {number} limit - Number of transactions to return
   * @returns {Array} Recent transactions
   */
  async getRecentTransactionsData(userId, limit = 5) {
    try {
      const transactions = await Transaction.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit
      });
      
      return transactions.map(transaction => ({
        id: transaction.id,
        type: transaction.transactionType,
        amount: transaction.amount,
        date: transaction.createdAt,
        status: transaction.status,
        metadata: transaction.metadata
      }));
    } catch (error) {
      console.error('Error getting recent transactions data:', error);
      return [];
    }
  }
  
  /**
   * Get portfolio analysis for user
   * @param {string} userId - User ID
   * @returns {Object} Portfolio analysis data
   */
  async getPortfolioAnalysis(userId) {
    try {
      const wallet = await Wallet.findOne({
        where: { userId }
      });

      if (!wallet) {
        return {
          success: false,
          message: 'Wallet not found'
        };
      }
      
      // Get token balances
      const tokenBalances = await TokenBalance.findAll({
        where: { userId }
      });
      
      // Get all token markets for price data
      const tokenMarkets = await TokenMarket.findAll();
      const marketMap = tokenMarkets.reduce((map, market) => {
        map[market.institutionCode] = market;
        return map;
      }, {});
      
      // Calculate portfolio breakdown
      const holdings = [];
      let totalValue = wallet.balance;
      
      for (const tokenBalance of tokenBalances) {
        const market = marketMap[tokenBalance.institutionCode];
        
        if (market) {
          const value = tokenBalance.balance * market.currentValue;
          totalValue += value;
          
          holdings.push({
            institutionCode: tokenBalance.institutionCode,
            balance: tokenBalance.balance,
            value,
            currentPrice: market.currentValue,
            priceChangePercentage24h: market.priceChangePercentage24h || 0,
            lastUpdated: market.lastUpdated
          });
        }
      }
      
      // Sort holdings by value (descending)
      holdings.sort((a, b) => b.value - a.value);
      
      // Calculate allocation percentages
      const portfolioAllocation = holdings.map(holding => ({
        ...holding,
        percentage: (holding.value / totalValue) * 100
      }));
      
      // Add cash allocation
      portfolioAllocation.push({
        institutionCode: 'CASH',
        balance: wallet.balance,
        value: wallet.balance,
        percentage: (wallet.balance / totalValue) * 100
      });
      
      // Get historical performance (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const historicalTransactions = await Transaction.findAll({
        where: {
          userId,
          createdAt: {
            [sequelize.Op.gte]: thirtyDaysAgo
          }
        },
        order: [['createdAt', 'ASC']]
      });
      
      // Generate daily balance chart data
      const dailyBalanceData = [];
      const dateMap = new Map();
      
      // Group transactions by date
      historicalTransactions.forEach(transaction => {
        const date = transaction.createdAt.toISOString().split('T')[0];
        
        if (!dateMap.has(date)) {
          dateMap.set(date, []);
        }
        
        dateMap.get(date).push(transaction);
      });
      
      // Calculate running balance
      let runningBalance = totalValue;
      const dates = Array.from(dateMap.keys()).sort();
      
      for (const date of dates) {
        const transactions = dateMap.get(date);
        
        // Calculate net change for the day
        const netChange = transactions.reduce((sum, transaction) => {
          if (transaction.transactionType === 'buy' || transaction.transactionType === 'reward') {
            return sum - transaction.amount;
          } else if (transaction.transactionType === 'sell' || transaction.transactionType === 'unstake') {
            return sum + transaction.amount;
          }
          return sum;
        }, 0);
        
        runningBalance -= netChange;
        
        dailyBalanceData.push({
          date,
          balance: runningBalance
        });
      }
      
      return {
        success: true,
        wallet: {
          balance: wallet.balance,
          stakedBalance: wallet.stakedBalance
        },
        totalValue,
        portfolioAllocation,
        historicalPerformance: dailyBalanceData,
        diversificationScore: Math.min(portfolioAllocation.length * 10, 100) // Simple diversification score
      };
    } catch (error) {
      console.error('Error getting portfolio analysis:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Get activity history for user
   * @param {string} userId - User ID
   * @param {number} limit - Number of activities to return
   * @param {number} page - Page number
   * @returns {Object} Activity history data
   */
  async getActivityHistory(userId, limit = 20, page = 1) {
    try {
      const offset = (page - 1) * limit;
      
      // Get transactions with pagination
      const { count, rows } = await Transaction.findAndCountAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });
      
      // Format activity data
      const activities = rows.map(transaction => {
        let activityType = transaction.transactionType;
        let description = '';
        
        switch (transaction.transactionType) {
          case 'buy':
            description = `Purchased tokens worth ${transaction.amount}`;
            break;
          case 'sell':
            description = `Sold tokens for ${transaction.amount}`;
            break;
          case 'stake':
            description = `Staked tokens worth ${transaction.amount}`;
            break;
          case 'unstake':
            description = `Unstaked tokens worth ${transaction.amount}`;
            break;
          case 'reward':
            description = `Received reward of ${transaction.amount}`;
            break;
          default:
            description = `Transaction of ${transaction.amount}`;
        }
        
        if (transaction.metadata && transaction.metadata.institutionCode) {
          description += ` for ${transaction.metadata.institutionCode}`;
        }
        
        return {
          id: transaction.id,
          type: activityType,
          description,
          amount: transaction.amount,
          date: transaction.createdAt,
          status: transaction.status,
          metadata: transaction.metadata
        };
      });
      
      return {
        success: true,
        activities,
        pagination: {
          total: count,
          page,
          pageSize: limit,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('Error getting activity history:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = new WalletController();