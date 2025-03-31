const { TokenMarket, Wallet, TokenBalance, Transaction, User } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

class TokenMarketService {
  /**
   * Process a token buy or sell transaction
   * @param {number} userId - User ID
   * @param {string} transactionType - 'buy' or 'sell'
   * @param {number} amount - Amount of tokens to buy/sell
   * @param {string} institutionCode - Institution code
   * @returns {Object} Transaction result
   */
  async processTransaction(userId, transactionType, amount, institutionCode) {
    const t = await sequelize.transaction();
    
    try {
      // Validate input
      if (amount <= 0) {
        throw new Error('Amount must be greater than zero');
      }
      
      // Get user's wallet
      const wallet = await Wallet.findOne({
        where: { userId },
        transaction: t
      });
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      
      // Get token market
      const tokenMarket = await TokenMarket.findOne({
        where: { institutionCode },
        transaction: t
      });
      
      if (!tokenMarket) {
        throw new Error('Token market not found for this institution');
      }
      
      // Calculate transaction details
      const tokenValue = tokenMarket.currentValue;
      let transactionCost = 0;
      let newTokenValue = 0;
      let fee = 0;
      
      // Apply transaction limits
      const MAX_TRANSACTION_AMOUNT = 1000; // Maximum tokens per transaction
      const MIN_TRANSACTION_AMOUNT = 1; // Minimum tokens per transaction
      const MAX_WALLET_BALANCE = 10000; // Maximum wallet balance
      
      if (amount < MIN_TRANSACTION_AMOUNT) {
        throw new Error(`Minimum transaction amount is ${MIN_TRANSACTION_AMOUNT} tokens`);
      }
      
      if (amount > MAX_TRANSACTION_AMOUNT) {
        throw new Error(`Maximum transaction amount is ${MAX_TRANSACTION_AMOUNT} tokens`);
      }
      
      // Calculate transaction cost and fees
      if (transactionType === 'buy') {
        // Calculate cost with a 1% fee
        fee = tokenValue * amount * 0.01;
        transactionCost = (tokenValue * amount) + fee;
        
        // Check if user has enough balance
        if (wallet.balance < transactionCost) {
          throw new Error('Insufficient balance');
        }
        
        // Check if resulting balance exceeds maximum allowed
        if ((wallet.balance - transactionCost + wallet.stakedBalance) > MAX_WALLET_BALANCE) {
          throw new Error(`Maximum wallet balance of ${MAX_WALLET_BALANCE} would be exceeded`);
        }
        
        // Update wallet balance
        wallet.balance -= transactionCost;
        wallet.stakedBalance += amount;
        
        // Update token market
        // Buying tokens increases value slightly (capped at 5%)
        const valueIncreasePercentage = Math.min(0.05, (amount / tokenMarket.totalSupply) * 0.5);
        newTokenValue = tokenValue * (1 + valueIncreasePercentage);
        tokenMarket.currentValue = newTokenValue;
        tokenMarket.totalSupply += amount;
        tokenMarket.liquidityPool += transactionCost;
      } else if (transactionType === 'sell') {
        // Check if user has enough tokens
        if (wallet.stakedBalance < amount) {
          throw new Error('Insufficient tokens');
        }
        
        // Calculate proceeds with a 1.5% fee (slightly higher than buy fee)
        fee = tokenValue * amount * 0.015;
        transactionCost = (tokenValue * amount) - fee;
        
        // Update wallet balance
        wallet.stakedBalance -= amount;
        wallet.balance += transactionCost;
        
        // Update token market
        // Selling tokens decreases value slightly (capped at 5%)
        const valueDecreasePercentage = Math.min(0.05, (amount / tokenMarket.totalSupply) * 0.5);
        newTokenValue = tokenValue * (1 - valueDecreasePercentage);
        tokenMarket.currentValue = newTokenValue;
        tokenMarket.totalSupply -= amount;
        tokenMarket.liquidityPool -= transactionCost;
      } else {
        throw new Error('Invalid transaction type');
      }
      
      // Save wallet changes
      await wallet.save({ transaction: t });
      
      // Save token market changes
      tokenMarket.lastUpdated = new Date();
      await tokenMarket.save({ transaction: t });
      
      // Create transaction record
      const transaction = await Transaction.create({
        userId,
        walletId: wallet.id,
        transactionType,
        amount,
        fee,
        status: 'completed',
        metadata: {
          tokenValue,
          newTokenValue,
          institutionCode,
          transactionCost
        }
      }, { transaction: t });
      
      // Commit transaction
      await t.commit();
      
      return {
        success: true,
        transaction,
        wallet,
        tokenValue: newTokenValue,
        message: `Tokens ${transactionType === 'buy' ? 'purchased' : 'sold'} successfully`
      };
    } catch (error) {
      // Rollback transaction on error
      await t.rollback();
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Get market statistics for a specific institution
   * @param {string} institutionCode - Institution code
   * @returns {Object} Market statistics
   */
  async getMarketStats(institutionCode) {
    try {
      const tokenMarket = await TokenMarket.findOne({
        where: { institutionCode }
      });
      
      if (!tokenMarket) {
        return {
          success: false,
          message: 'Token market not found for this institution'
        };
      }
      
      // Get transaction history for price chart
      const recentTransactions = await Transaction.findAll({
        where: {
          tokenCode: institutionCode,
          transactionType: {
            [Op.in]: ['buy', 'sell', 'swap']
          }
        },
        order: [['createdAt', 'DESC']],
        limit: 50
      });
      
      // Format price chart data
      const priceChartData = recentTransactions.map(tx => ({
        timestamp: tx.createdAt,
        price: tx.tokenPrice || 0
      })).reverse();
      
      // Calculate market stats
      const marketStats = {
        institutionCode: tokenMarket.institutionCode,
        institutionName: tokenMarket.institutionName,
        institutionType: tokenMarket.institutionType,
        currentValue: tokenMarket.currentValue,
        change24h: tokenMarket.change24h,
        volume24h: tokenMarket.volume24h,
        marketCap: tokenMarket.marketCap,
        circulatingSupply: tokenMarket.circulatingSupply,
        totalSupply: tokenMarket.totalSupply,
        lastUpdated: tokenMarket.lastUpdated
      };
      
      return {
        success: true,
        marketStats,
        priceChartData
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Get user's token balances
   * @param {number} userId - User ID
   * @returns {Object} Token balances with values
   */
  async getUserTokenBalances(userId) {
    try {
      const tokenBalances = await TokenBalance.findAll({
        where: { userId },
        include: [{
          model: TokenMarket,
          attributes: ['institutionName', 'currentValue', 'change24h']
        }]
      });
      
      // Calculate total value in Naira
      let totalValue = 0;
      const formattedBalances = tokenBalances.map(balance => {
        const value = balance.balance * balance.TokenMarket.currentValue;
        totalValue += value;
        
        return {
          institutionCode: balance.institutionCode,
          institutionName: balance.TokenMarket.institutionName,
          balance: balance.balance,
          currentValue: balance.TokenMarket.currentValue,
          change24h: balance.TokenMarket.change24h,
          value
        };
      });
      
      return {
        success: true,
        tokenBalances: formattedBalances,
        totalValue
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Get market insights for all institutions
   * @returns {Object} Market insights
   */
  async getMarketInsights() {
    try {
      const tokenMarkets = await TokenMarket.findAll({
        order: [
          ['volume24h', 'DESC']
        ],
        limit: 20
      });
      
      const topGainers = [...tokenMarkets].sort((a, b) => b.change24h - a.change24h).slice(0, 5);
      const topLosers = [...tokenMarkets].sort((a, b) => a.change24h - b.change24h).slice(0, 5);
      const mostActive = tokenMarkets.slice(0, 5); // Already sorted by volume
      
      const insights = {
        topGainers: topGainers.map(token => ({
          institutionCode: token.institutionCode,
          institutionName: token.institutionName,
          currentValue: token.currentValue,
          change24h: token.change24h
        })),
        topLosers: topLosers.map(token => ({
          institutionCode: token.institutionCode,
          institutionName: token.institutionName,
          currentValue: token.currentValue,
          change24h: token.change24h
        })),
        mostActive: mostActive.map(token => ({
          institutionCode: token.institutionCode,
          institutionName: token.institutionName,
          currentValue: token.currentValue,
          volume24h: token.volume24h
        })),
        marketOverview: {
          totalMarketCap: tokenMarkets.reduce((sum, token) => sum + token.marketCap, 0),
          totalVolume24h: tokenMarkets.reduce((sum, token) => sum + token.volume24h, 0),
          averageChange24h: tokenMarkets.reduce((sum, token) => sum + token.change24h, 0) / tokenMarkets.length
        }
      };
      
      return {
        success: true,
        insights
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Update market statistics for all tokens
   * This should be run periodically to update 24h changes
   * @returns {Object} Result of the operation
   */
  async updateMarketStats() {
    const t = await sequelize.transaction();
    
    try {
      // Get all token markets
      const tokenMarkets = await TokenMarket.findAll({
        transaction: t
      });
      
      const now = new Date();
      const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      
      // Update each token market
      for (const tokenMarket of tokenMarkets) {
        // Get 24h volume from transactions
        const volume24h = await Transaction.sum('amount', {
          where: {
            tokenCode: tokenMarket.institutionCode,
            transactionType: {
              [Op.in]: ['buy', 'sell', 'swap']
            },
            createdAt: {
              [Op.gte]: yesterday
            }
          },
          transaction: t
        }) || 0;
        
        // Get previous day's value from transactions
        const oldestTransaction = await Transaction.findOne({
          where: {
            tokenCode: tokenMarket.institutionCode,
            transactionType: {
              [Op.in]: ['buy', 'sell', 'swap']
            },
            createdAt: {
              [Op.between]: [yesterday, now]
            }
          },
          order: [['createdAt', 'ASC']],
          transaction: t
        });
        
        // Calculate 24h change
        let change24h = 0;
        if (oldestTransaction && oldestTransaction.tokenPrice) {
          const oldValue = oldestTransaction.tokenPrice;
          change24h = ((tokenMarket.currentValue - oldValue) / oldValue) * 100;
        }
        
        // Update token market
        tokenMarket.volume24h = volume24h;
        tokenMarket.change24h = change24h;
        tokenMarket.marketCap = tokenMarket.currentValue * tokenMarket.circulatingSupply;
        tokenMarket.lastUpdated = now;
        
        await tokenMarket.save({ transaction: t });
      }
      
      await t.commit();
      
      return {
        success: true,
        message: `Successfully updated market stats for ${tokenMarkets.length} tokens`
      };
    } catch (error) {
      await t.rollback();
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Initialize a new token market for an institution
   * @param {string} institutionCode - Institution code
   * @param {number} initialValue - Initial token value
   * @param {number} initialSupply - Initial token supply
   * @returns {Object} New token market
   */
  async initializeMarket(institutionCode, initialValue = 1.0, initialSupply = 1000000) {
    try {
      // Check if market already exists
      const existingMarket = await TokenMarket.findOne({
        where: { institutionCode }
      });
      
      if (existingMarket) {
        return {
          success: false,
          message: 'Token market already exists for this institution'
        };
      }
      
      // Create new token market
      const newMarket = await TokenMarket.create({
        institutionCode,
        currentValue: initialValue,
        totalSupply: initialSupply,
        liquidityPool: initialValue * initialSupply * 0.2, // 20% of total value as liquidity
        lastUpdated: new Date()
      });
      
      return {
        success: true,
        tokenMarket: newMarket,
        message: 'Token market initialized successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Process expired token holdings from challenges
   * This is meant to be run by a cron job
   * @returns {Object} Processing results
   */
  async processExpiredHoldings() {
    const t = await sequelize.transaction();
    
    try {
      // Get all users with challenges
      const users = await User.findAll({
        where: {
          metadata: {
            challenges: {
              [Op.ne]: null
            }
          }
        },
        transaction: t
      });
      
      let processedCount = 0;
      
      for (const user of users) {
        if (!user.metadata || !user.metadata.challenges) {
          continue;
        }
        
        const challenges = user.metadata.challenges;
        let updated = false;
        
        for (let i = 0; i < challenges.length; i++) {
          const challenge = challenges[i];
          
          // Only process hold challenges that are expired but not completed or processed
          if (challenge.type !== 'hold' || 
              challenge.status !== 'active' || 
              challenge.holdingProcessed === true) {
            continue;
          }
          
          // Check if challenge has expired
          const now = new Date();
          const endDate = new Date(challenge.endDate);
          
          if (now > endDate) {
            // Get user's wallet
            const wallet = await Wallet.findOne({
              where: { userId: user.id },
              transaction: t
            });
            
            if (wallet) {
              // Return staked tokens to user's balance if not already claimed
              const stakingAmount = challenge.stakingAmount || 0;
              wallet.balance += stakingAmount;
              await wallet.save({ transaction: t });
              
              // Create transaction record
              await Transaction.create({
                userId: user.id,
                walletId: wallet.id,
                transactionType: 'unstake',
                amount: stakingAmount,
                fee: 0,
                status: 'completed',
                metadata: {
                  challengeId: challenge.id,
                  institutionCode: challenge.institutionCode,
                  challengeType: challenge.type,
                  reason: 'expired_holding'
                }
              }, { transaction: t });
              
              // Mark challenge as processed
              challenge.holdingProcessed = true;
              challenge.status = 'expired';
              challenges[i] = challenge;
              updated = true;
              processedCount++;
            }
          }
        }
        
        // Save changes if any
        if (updated) {
          user.metadata.challenges = challenges;
          await user.save({ transaction: t });
        }
      }
      
      await t.commit();
      
      return {
        success: true,
        processed: processedCount,
        message: `Processed ${processedCount} expired token holdings`
      };
    } catch (error) {
      await t.rollback();
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = new TokenMarketService();