const TokenMarketService = require('../services/TokenMarketService');
const InstitutionService = require('../services/InstitutionService');
const { TokenMarket, Wallet, TokenBalance, Transaction, User } = require('../models');
const { sequelize } = require('../config/database');

class TokenMarketController {
  /**
   * Buy tokens with Naira
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async buyTokens(req, res) {
    const t = await sequelize.transaction();
    
    try {
      const { amount, institutionCode } = req.body;
      const userId = req.user.id;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }
      
      if (!institutionCode) {
        return res.status(400).json({
          success: false,
          message: 'Institution code is required'
        });
      }
      
      // Get user's wallet
      const wallet = await Wallet.findOne({
        where: { userId },
        transaction: t
      });
      
      if (!wallet) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }
      
      // Check if user has enough balance
      if (wallet.nairaBalance < amount) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }
      
      // Get token market
      const tokenMarket = await TokenMarket.findOne({
        where: { institutionCode },
        transaction: t
      });
      
      if (!tokenMarket) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Token not found'
        });
      }
      
      // Calculate token amount based on current value
      const tokenAmount = amount / tokenMarket.currentValue;
      
      // Update user's wallet
      wallet.nairaBalance -= amount;
      await wallet.save({ transaction: t });
      
      // Update or create token balance
      let tokenBalance = await TokenBalance.findOne({
        where: { userId, institutionCode },
        transaction: t
      });
      
      if (tokenBalance) {
        tokenBalance.balance += tokenAmount;
        await tokenBalance.save({ transaction: t });
      } else {
        tokenBalance = await TokenBalance.create({
          userId,
          institutionCode,
          balance: tokenAmount
        }, { transaction: t });
      }
      
      // Update token market
      tokenMarket.circulatingSupply += tokenAmount;
      tokenMarket.volume24h += amount;
      
      // Adjust token value based on buy pressure (simple algorithm)
      // Ensure liquidityPool is not too small to avoid division issues
      const effectiveLiquidityPool = Math.max(tokenMarket.liquidityPool, 1000); // Minimum 1000 to avoid extreme impacts
      
      // Calculate price impact with a reasonable cap
      const rawPriceImpact = (amount / effectiveLiquidityPool) * 0.01; // 1% impact per liquidityPool ratio
      const maxPriceImpact = 0.05; // Maximum 5% price impact per transaction
      const priceImpact = Math.min(rawPriceImpact, maxPriceImpact);
      
      // Apply the capped price impact
      tokenMarket.currentValue = tokenMarket.currentValue * (1 + priceImpact);
      console.log('Current value:', tokenMarket.currentValue);
      tokenMarket.marketCap = tokenMarket.currentValue * tokenMarket.circulatingSupply;
      tokenMarket.lastUpdated = new Date();
      
      await tokenMarket.save({ transaction: t });
      
      // Create transaction record
      await Transaction.create({
        userId,
        walletId: wallet.id,
        transactionType: 'buy',
        amount,
        tokenCode: institutionCode,
        tokenAmount,
        tokenPrice: tokenMarket.currentValue,
        fee: 0,
        status: 'completed',
        metadata: {
          institutionName: tokenMarket.institutionName,
          priceImpact
        }
      }, { transaction: t });
      
      await t.commit();
      
      return res.status(200).json({
        success: true,
        message: `Successfully bought ${tokenAmount.toFixed(6)} ${institutionCode} tokens`,
        data: {
          tokenAmount,
          tokenPrice: tokenMarket.currentValue,
          nairaAmount: amount,
          remainingBalance: wallet.nairaBalance
        }
      });
    } catch (error) {
      await t.rollback();
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Sell tokens for Naira
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async sellTokens(req, res) {
    const t = await sequelize.transaction();
    
    try {
      const { tokenAmount, institutionCode } = req.body;
      const userId = req.user.id;
      
      if (!tokenAmount || tokenAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid token amount'
        });
      }
      
      if (!institutionCode) {
        return res.status(400).json({
          success: false,
          message: 'Institution code is required'
        });
      }
      
      // Get user's token balance
      const tokenBalance = await TokenBalance.findOne({
        where: { userId, institutionCode },
        transaction: t
      });
      
      if (!tokenBalance || tokenBalance.balance < tokenAmount) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Insufficient token balance'
        });
      }
      
      // Get token market
      const tokenMarket = await TokenMarket.findOne({
        where: { institutionCode },
        transaction: t
      });
      
      if (!tokenMarket) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Token not found'
        });
      }
      
      // Calculate Naira amount based on current value
      const nairaAmount = tokenAmount * tokenMarket.currentValue;
      
      // Get user's wallet
      const wallet = await Wallet.findOne({
        where: { userId },
        transaction: t
      });
      
      if (!wallet) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }
      
      // Update user's wallet
      wallet.nairaBalance += nairaAmount;
      await wallet.save({ transaction: t });
      
      // Update token balance
      tokenBalance.balance -= tokenAmount;
      await tokenBalance.save({ transaction: t });
      
      // Update token market
      tokenMarket.circulatingSupply -= tokenAmount;
      tokenMarket.volume24h += nairaAmount;
      
      // Adjust token value based on sell pressure (simple algorithm)
      const effectiveLiquidityPool = Math.max(tokenMarket.liquidityPool, 1000); // Minimum 1000 to avoid extreme impacts
      
      // Calculate price impact with a reasonable cap
      const rawPriceImpact = (nairaAmount / effectiveLiquidityPool) * 0.01; // 1% impact per liquidityPool ratio
      const maxPriceImpact = 0.05; // Maximum 5% price impact per transaction
      const priceImpact = Math.min(rawPriceImpact, maxPriceImpact);
      
      // Apply the capped price impact
      tokenMarket.currentValue = tokenMarket.currentValue * (1 - priceImpact);
      tokenMarket.marketCap = tokenMarket.currentValue * tokenMarket.circulatingSupply;
      tokenMarket.lastUpdated = new Date();
      
      await tokenMarket.save({ transaction: t });
      
      // Create transaction record
      await Transaction.create({
        userId,
        walletId: wallet.id,
        transactionType: 'sell',
        amount: nairaAmount,
        tokenCode: institutionCode,
        tokenAmount,
        tokenPrice: tokenMarket.currentValue,
        fee: 0,
        status: 'completed',
        metadata: {
          institutionName: tokenMarket.institutionName,
          priceImpact
        }
      }, { transaction: t });
      
      await t.commit();
      
      return res.status(200).json({
        success: true,
        message: `Successfully sold ${tokenAmount.toFixed(6)} ${institutionCode} tokens for ${nairaAmount.toFixed(2)} Naira`,
        data: {
          tokenAmount,
          tokenPrice: tokenMarket.currentValue,
          nairaAmount,
          remainingTokenBalance: tokenBalance.balance,
          nairaBalance: wallet.nairaBalance
        }
      });
    } catch (error) {
      await t.rollback();
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Swap tokens between institutions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async swapTokens(req, res) {
    const t = await sequelize.transaction();
    
    try {
      const { sourceTokenCode, targetTokenCode, sourceTokenAmount } = req.body;
      const userId = req.user.id;
      
      if (!sourceTokenCode || !targetTokenCode || !sourceTokenAmount || sourceTokenAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid swap parameters'
        });
      }
      
      if (sourceTokenCode === targetTokenCode) {
        return res.status(400).json({
          success: false,
          message: 'Cannot swap tokens with the same institution code'
        });
      }
      
      // Get source token balance
      const sourceTokenBalance = await TokenBalance.findOne({
        where: { userId, institutionCode: sourceTokenCode },
        transaction: t
      });
      
      if (!sourceTokenBalance || sourceTokenBalance.balance < sourceTokenAmount) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Insufficient source token balance'
        });
      }
      
      // Get source token market
      const sourceTokenMarket = await TokenMarket.findOne({
        where: { institutionCode: sourceTokenCode },
        transaction: t
      });
      
      if (!sourceTokenMarket) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Source token not found'
        });
      }
      
      // Get target token market
      const targetTokenMarket = await TokenMarket.findOne({
        where: { institutionCode: targetTokenCode },
        transaction: t
      });
      
      if (!targetTokenMarket) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Target token not found'
        });
      }
      
      // Calculate intermediate Naira value
      const nairaValue = sourceTokenAmount * sourceTokenMarket.currentValue;
      
      // Apply swap fee (0.5%)
      const swapFee = nairaValue * 0.005;
      const nairaValueAfterFee = nairaValue - swapFee;
      
      // Calculate target token amount
      const targetTokenAmount = nairaValueAfterFee / targetTokenMarket.currentValue;
      
      // Get user's wallet for the fee
      const wallet = await Wallet.findOne({
        where: { userId },
        transaction: t
      });
      
      if (!wallet) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }
      
      // Update source token balance
      sourceTokenBalance.balance -= sourceTokenAmount;
      await sourceTokenBalance.save({ transaction: t });
      
      // Update or create target token balance
      let targetTokenBalance = await TokenBalance.findOne({
        where: { userId, institutionCode: targetTokenCode },
        transaction: t
      });
      
      if (targetTokenBalance) {
        targetTokenBalance.balance += targetTokenAmount;
        await targetTokenBalance.save({ transaction: t });
      } else {
        targetTokenBalance = await TokenBalance.create({
          userId,
          institutionCode: targetTokenCode,
          balance: targetTokenAmount
        }, { transaction: t });
      }
      
      // Update source token market
      sourceTokenMarket.circulatingSupply -= sourceTokenAmount;
      sourceTokenMarket.volume24h += nairaValue;
      
      // Adjust source token value based on sell pressure
      const effectiveLiquidityPool = Math.max(sourceTokenMarket.liquidityPool, 1000); // Minimum 1000 to avoid extreme impacts
      
      // Calculate price impact with a reasonable cap
      const rawPriceImpact = (nairaValue / effectiveLiquidityPool) * 0.01; // 1% impact per liquidityPool ratio
      const maxPriceImpact = 0.05; // Maximum 5% price impact per transaction
      const sourcePriceImpact = Math.min(rawPriceImpact, maxPriceImpact);
      
      // Apply the capped price impact
      sourceTokenMarket.currentValue = sourceTokenMarket.currentValue * (1 - sourcePriceImpact);
      sourceTokenMarket.marketCap = sourceTokenMarket.currentValue * sourceTokenMarket.circulatingSupply;
      sourceTokenMarket.lastUpdated = new Date();
      
      await sourceTokenMarket.save({ transaction: t });
      
      // Update target token market
      targetTokenMarket.circulatingSupply += targetTokenAmount;
      targetTokenMarket.volume24h += nairaValueAfterFee;
      
      // Adjust target token value based on buy pressure
      const effectiveTargetLiquidityPool = Math.max(targetTokenMarket.liquidityPool, 1000); // Minimum 1000 to avoid extreme impacts
      
      // Calculate price impact with a reasonable cap
      const rawTargetPriceImpact = (nairaValueAfterFee / effectiveTargetLiquidityPool) * 0.01; // 1% impact per liquidityPool ratio
      const targetPriceImpact = Math.min(rawTargetPriceImpact, maxPriceImpact);
      
      // Apply the capped price impact
      targetTokenMarket.currentValue = targetTokenMarket.currentValue * (1 + targetPriceImpact);
      targetTokenMarket.marketCap = targetTokenMarket.currentValue * targetTokenMarket.circulatingSupply;
      targetTokenMarket.lastUpdated = new Date();
      
      await targetTokenMarket.save({ transaction: t });
      
      // Create transaction record
      await Transaction.create({
        userId,
        walletId: wallet.id,
        transactionType: 'swap',
        amount: nairaValue,
        tokenCode: sourceTokenCode,
        tokenAmount: sourceTokenAmount,
        tokenPrice: sourceTokenMarket.currentValue,
        targetTokenCode,
        targetTokenAmount,
        fee: swapFee,
        status: 'completed',
        metadata: {
          sourceInstitutionName: sourceTokenMarket.institutionName,
          targetInstitutionName: targetTokenMarket.institutionName,
          sourcePriceImpact,
          targetPriceImpact
        }
      }, { transaction: t });
      
      await t.commit();
      
      return res.status(200).json({
        success: true,
        message: `Successfully swapped ${sourceTokenAmount.toFixed(6)} ${sourceTokenCode} for ${targetTokenAmount.toFixed(6)} ${targetTokenCode}`,
        data: {
          sourceTokenAmount,
          sourceTokenCode,
          sourceTokenPrice: sourceTokenMarket.currentValue,
          targetTokenAmount,
          targetTokenCode,
          targetTokenPrice: targetTokenMarket.currentValue,
          nairaValue,
          swapFee,
          remainingSourceBalance: sourceTokenBalance.balance,
          newTargetBalance: targetTokenBalance.balance
        }
      });
    } catch (error) {
      await t.rollback();
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Deposit Naira to wallet
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async depositNaira(req, res) {
    const t = await sequelize.transaction();
    
    try {
      const { amount } = req.body;
      const userId = req.user.id;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }
      
      // Get user's wallet
      const wallet = await Wallet.findOne({
        where: { userId },
        transaction: t
      });
      
      if (!wallet) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }
      
      // Update wallet balance
      wallet.nairaBalance += amount;
      await wallet.save({ transaction: t });
      
      // Create transaction record
      await Transaction.create({
        userId,
        walletId: wallet.id,
        transactionType: 'deposit',
        amount,
        fee: 0,
        status: 'completed',
        metadata: {
          method: 'direct' // This could be 'bank', 'card', etc.
        }
      }, { transaction: t });
      
      await t.commit();
      
      return res.status(200).json({
        success: true,
        message: `Successfully deposited ${amount.toFixed(2)} Naira to your wallet`,
        data: {
          amount,
          newBalance: wallet.nairaBalance
        }
      });
    } catch (error) {
      await t.rollback();
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Withdraw Naira from wallet
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async withdrawNaira(req, res) {
    const t = await sequelize.transaction();
    
    try {
      const { amount } = req.body;
      const userId = req.user.id;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }
      
      // Get user's wallet
      const wallet = await Wallet.findOne({
        where: { userId },
        transaction: t
      });
      
      if (!wallet) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }
      
      // Check if user has enough balance
      if (wallet.nairaBalance < amount) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }
      
      // Update wallet balance
      wallet.nairaBalance -= amount;
      await wallet.save({ transaction: t });
      
      // Create transaction record
      await Transaction.create({
        userId,
        walletId: wallet.id,
        transactionType: 'withdraw',
        amount,
        fee: 0,
        status: 'completed',
        metadata: {
          method: 'direct' // This could be 'bank', 'card', etc.
        }
      }, { transaction: t });
      
      await t.commit();
      
      return res.status(200).json({
        success: true,
        message: `Successfully withdrew ${amount.toFixed(2)} Naira from your wallet`,
        data: {
          amount,
          remainingBalance: wallet.nairaBalance
        }
      });
    } catch (error) {
      await t.rollback();
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Get all token markets
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllTokenMarkets(req, res) {
    try {
      const tokenMarkets = await InstitutionService.getAllTokenMarkets();
      
      return res.status(200).json({
        success: true,
        data: tokenMarkets
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Get token market by institution code
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTokenMarket(req, res) {
    try {
      const { institutionCode } = req.params;
      
      if (!institutionCode) {
        return res.status(400).json({
          success: false,
          message: 'Institution code is required'
        });
      }
      
      const tokenMarket = await InstitutionService.getTokenMarket(institutionCode);
      
      return res.status(200).json({
        success: true,
        data: tokenMarket
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Get user's token balances
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserTokenBalances(req, res) {
    try {
      const userId = req.user.id;
      
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
      
      return res.status(200).json({
        success: true,
        data: {
          tokenBalances: formattedBalances,
          totalValue
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Populate token markets from institutions API
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async populateTokenMarkets(req, res) {
    try {
      const result = await InstitutionService.populateTokenMarkets();
      
      return res.status(200).json({
        success: result.success,
        message: result.message,
        data: {
          created: result.created,
          updated: result.updated
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  /**
   * Get market stats for a specific institution
   * @param {string} institutionCode - Institution code
   * @returns {Object} Market stats
   */
  async getMarketStatsData(institutionCode) {
    try {
      const tokenMarket = await TokenMarket.findOne({
        where: { institutionCode }
      });
      
      if (!tokenMarket) {
        throw new Error(`Token market not found for institution code: ${institutionCode}`);
      }
      
      return {
        institutionCode: tokenMarket.institutionCode,
        institutionName: tokenMarket.institutionName,
        currentValue: tokenMarket.currentValue,
        change24h: tokenMarket.change24h,
        volume24h: tokenMarket.volume24h,
        marketCap: tokenMarket.marketCap,
        circulatingSupply: tokenMarket.circulatingSupply,
        totalSupply: tokenMarket.totalSupply,
        lastUpdated: tokenMarket.lastUpdated
      };
    } catch (error) {
      throw new Error(`Failed to get market stats: ${error.message}`);
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
      
      return insights;
    } catch (error) {
      throw new Error(`Failed to get market insights: ${error.message}`);
    }
  }
}

module.exports = new TokenMarketController();
