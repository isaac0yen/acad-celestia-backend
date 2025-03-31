const TokenMarketService = require('../services/TokenMarketService');
const { TokenMarket } = require('../models');

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
  
  /**
   * Get market stats data for dashboard
   * @param {string} institutionCode - Institution code
   * @returns {Object} Market stats data
   */
  async getMarketStatsData(institutionCode) {
    try {
      const result = await TokenMarketService.getMarketStats(institutionCode);
      
      if (!result.success) {
        return {
          currentValue: 0,
          priceChangePercentage24h: 0,
          marketCap: 0,
          totalSupply: 0,
          volatility: 0
        };
      }
      
      return {
        currentValue: result.marketStats.currentValue,
        priceChangePercentage24h: result.marketStats.priceChangePercentage24h,
        marketCap: result.marketStats.marketCap,
        totalSupply: result.marketStats.totalSupply,
        volatility: result.marketStats.volatility,
        chartData: result.priceChartData.slice(0, 10) // Only return the most recent 10 data points
      };
    } catch (error) {
      console.error('Error getting market stats data:', error);
      return {
        currentValue: 0,
        priceChangePercentage24h: 0,
        marketCap: 0,
        totalSupply: 0,
        volatility: 0
      };
    }
  }
  
  /**
   * Get market insights for all institutions
   * @returns {Object} Market insights data
   */
  async getMarketInsights() {
    try {
      // Get all token markets
      const markets = await TokenMarket.findAll({
        order: [['currentValue', 'DESC']]
      });
      
      // Format insights data
      const insights = markets.map(market => ({
        institutionCode: market.institutionCode,
        currentValue: market.currentValue,
        totalSupply: market.totalSupply,
        marketCap: market.currentValue * market.totalSupply,
        lastUpdated: market.lastUpdated
      }));
      
      // Calculate market trends
      const topPerformers = insights.slice(0, 3);
      const bottomPerformers = [...insights].sort((a, b) => a.currentValue - b.currentValue).slice(0, 3);
      
      // Calculate market average
      const marketAverage = insights.reduce((sum, market) => sum + market.currentValue, 0) / insights.length;
      
      return {
        success: true,
        insights,
        topPerformers,
        bottomPerformers,
        marketAverage,
        totalMarketCap: insights.reduce((sum, market) => sum + market.marketCap, 0)
      };
    } catch (error) {
      console.error('Error getting market insights:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = new TokenMarketController();
