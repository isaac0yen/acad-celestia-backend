const { TokenMarket, Wallet, Transaction, User } = require('../models');
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
          metadata: {
            institutionCode
          }
        },
        order: [['createdAt', 'DESC']],
        limit: 50
      });
      
      // Calculate market volatility (standard deviation of price changes)
      let volatility = 0;
      if (recentTransactions.length > 1) {
        const priceChanges = [];
        for (let i = 0; i < recentTransactions.length - 1; i++) {
          const currentPrice = recentTransactions[i].metadata.newTokenValue;
          const previousPrice = recentTransactions[i + 1].metadata.newTokenValue;
          if (currentPrice && previousPrice) {
            const percentChange = ((currentPrice - previousPrice) / previousPrice) * 100;
            priceChanges.push(percentChange);
          }
        }
        
        if (priceChanges.length > 0) {
          const mean = priceChanges.reduce((sum, val) => sum + val, 0) / priceChanges.length;
          volatility = Math.sqrt(
            priceChanges.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / priceChanges.length
          );
        }
      }
      
      // Calculate 24-hour price change
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oldestTransaction = await Transaction.findOne({
        where: {
          metadata: {
            institutionCode
          },
          createdAt: {
            [Op.gte]: twentyFourHoursAgo
          }
        },
        order: [['createdAt', 'ASC']]
      });
      
      let priceChange24h = 0;
      let priceChangePercentage24h = 0;
      
      if (oldestTransaction && oldestTransaction.metadata.tokenValue) {
        const oldPrice = oldestTransaction.metadata.tokenValue;
        priceChange24h = tokenMarket.currentValue - oldPrice;
        priceChangePercentage24h = (priceChange24h / oldPrice) * 100;
      }
      
      // Format data for price chart
      const priceChartData = recentTransactions.map(transaction => ({
        timestamp: transaction.createdAt,
        price: transaction.metadata.newTokenValue || transaction.metadata.tokenValue,
        type: transaction.transactionType
      })).reverse();
      
      return {
        success: true,
        marketStats: {
          currentValue: tokenMarket.currentValue,
          totalSupply: tokenMarket.totalSupply,
          liquidityPool: tokenMarket.liquidityPool,
          lastUpdated: tokenMarket.lastUpdated,
          priceChange24h,
          priceChangePercentage24h,
          volatility,
          marketCap: tokenMarket.currentValue * tokenMarket.totalSupply
        },
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