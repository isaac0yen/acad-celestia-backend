const { TokenMarket, Wallet, Transaction } = require('../models');

class TokenMarketService {
  constructor() {
    this.volatilityConstant = 0.05; // k value for price adjustments
    this.dailyDecay = 0.001; // 0.1% daily decay for inactivity
    this.maxDailyChange = 0.10; // 10% max daily change
    this.transactionFee = 0.005; // 0.5% transaction fee
  }

  /**
   * Get token market for an institution
   * @param {string} institutionCode - Institution code
   * @returns {Promise<Object>} Token market
   */
  async getTokenMarket(institutionCode) {
    return await TokenMarket.findOne({
      where: { institutionCode }
    });
  }

  /**
   * Initialize a new token market for an institution
   * @param {string} institutionCode - Institution code
   * @param {number} initialSupply - Initial token supply
   * @param {number} initialValue - Initial token value
   * @param {number} initialLiquidity - Initial liquidity pool
   * @returns {Promise<Object>} Created token market
   */
  async initializeMarket(
    institutionCode,
    initialSupply = 1000000.0,
    initialValue = 1.0,
    initialLiquidity = 100000.0
  ) {
    return await TokenMarket.create({
      institutionCode,
      currentValue: initialValue,
      totalSupply: initialSupply,
      liquidityPool: initialLiquidity,
      lastUpdated: new Date()
    });
  }

  /**
   * Calculate price impact based on transaction size
   * @param {number} amount - Transaction amount
   * @param {number} totalSupply - Total token supply
   * @returns {number} Price impact
   */
  calculatePriceImpact(amount, totalSupply) {
    return (amount / totalSupply) * this.volatilityConstant;
  }

  /**
   * Apply daily decay to inactive markets
   * @param {Object} market - Token market
   * @returns {number} New token value after decay
   */
  applyDailyDecay(market) {
    if (market.lastUpdated) {
      const now = new Date();
      const lastUpdated = new Date(market.lastUpdated);
      const daysSinceUpdate = Math.floor((now - lastUpdated) / (1000 * 60 * 60 * 24));
      
      if (daysSinceUpdate > 0) {
        const decayFactor = Math.pow(1 - this.dailyDecay, daysSinceUpdate);
        market.currentValue *= decayFactor;
      }
    }
    return market.currentValue;
  }

  /**
   * Adjust token value based on market activity
   * @param {Object} market - Token market
   * @param {string} transactionType - Transaction type (buy/sell)
   * @param {number} amount - Transaction amount
   * @returns {Promise<number>} New token value
   */
  async adjustTokenValue(market, transactionType, amount) {
    // Apply daily decay
    this.applyDailyDecay(market);
    
    // Calculate price impact
    const priceImpact = this.calculatePriceImpact(amount, market.totalSupply);
    
    // Apply impact based on transaction type
    let newValue;
    if (transactionType === 'buy') {
      newValue = market.currentValue * (1 + priceImpact);
    } else if (transactionType === 'sell') {
      newValue = market.currentValue * (1 - priceImpact);
    } else {
      newValue = market.currentValue;
    }
    
    // Apply circuit breaker (max daily change)
    const maxValue = market.currentValue * (1 + this.maxDailyChange);
    const minValue = market.currentValue * (1 - this.maxDailyChange);
    newValue = Math.min(maxValue, Math.max(minValue, newValue));
    
    // Update market
    market.currentValue = newValue;
    market.lastUpdated = new Date();
    await market.save();
    
    return newValue;
  }

  /**
   * Process a token transaction
   * @param {number} userId - User ID
   * @param {string} transactionType - Transaction type (buy/sell)
   * @param {number} amount - Transaction amount
   * @param {string} institutionCode - Institution code
   * @returns {Promise<Object>} Transaction result
   */
  async processTransaction(userId, transactionType, amount, institutionCode) {
    try {
      // Get or initialize market
      let market = await this.getTokenMarket(institutionCode);
      if (!market) {
        market = await this.initializeMarket(institutionCode);
      }

      // Calculate transaction fee
      const fee = amount * this.transactionFee;
      const totalAmount = amount + fee;

      // Get user's wallet
      const wallet = await Wallet.findOne({
        where: { userId }
      });

      if (!wallet) {
        return { success: false, message: 'Wallet not found' };
      }

      // Validate transaction
      if (transactionType === 'sell' && wallet.balance < amount) {
        return { success: false, message: 'Insufficient balance' };
      }

      // Update market value
      const newValue = await this.adjustTokenValue(market, transactionType, amount);

      // Update wallet balance
      if (transactionType === 'buy') {
        wallet.balance += amount;
        market.liquidityPool += fee;
      } else { // sell
        wallet.balance -= amount;
        market.liquidityPool += fee;
      }
      
      await wallet.save();
      await market.save();

      // Record transaction
      const transaction = await Transaction.create({
        userId,
        walletId: wallet.id,
        transactionType,
        amount,
        fee,
        status: 'completed',
        metadata: {
          institutionCode,
          tokenValue: newValue
        }
      });

      return {
        success: true,
        message: 'Transaction completed',
        newBalance: wallet.balance,
        tokenValue: newValue,
        fee
      };
    } catch (error) {
      console.error('Transaction processing error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get market statistics for an institution
   * @param {string} institutionCode - Institution code
   * @returns {Promise<Object>} Market statistics
   */
  async getMarketStats(institutionCode) {
    try {
      const market = await this.getTokenMarket(institutionCode);
      if (!market) {
        return { success: false, message: 'Market not found' };
      }

      // Get recent transactions
      const recentTransactions = await Transaction.findAll({
        where: {
          metadata: {
            institutionCode
          }
        },
        order: [['createdAt', 'DESC']],
        limit: 100
      });

      // Calculate market statistics
      const totalVolume = recentTransactions.reduce((sum, t) => sum + t.amount, 0);
      const buyVolume = recentTransactions
        .filter(t => t.transactionType === 'buy')
        .reduce((sum, t) => sum + t.amount, 0);
      const sellVolume = recentTransactions
        .filter(t => t.transactionType === 'sell')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        success: true,
        currentValue: market.currentValue,
        totalSupply: market.totalSupply,
        liquidityPool: market.liquidityPool,
        '24hVolume': totalVolume,
        buyVolume,
        sellVolume
      };
    } catch (error) {
      console.error('Market stats error:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = new TokenMarketService();
