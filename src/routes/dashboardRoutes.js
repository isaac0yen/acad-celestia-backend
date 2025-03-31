const express = require('express');
const router = express.Router();
const TokenMarketController = require('../controllers/TokenMarketController');
const WalletController = require('../controllers/WalletController');
const GameController = require('../controllers/GameController');
const { User } = require('../models');

// Dashboard home - aggregates data from various sources
router.get('/home', async (req, res) => {
  try {
    // Get user's wallet summary
    const walletSummary = await WalletController.getWalletSummaryData(req.user.id);
    
    // Get market stats for user's institution
    const marketStats = await TokenMarketController.getMarketStatsData(req.user.institutionCode);
    
    // Get user's active challenges
    const challenges = await GameController.getChallengesData(req.user.id);
    
    // Get recent transactions
    const recentTransactions = await WalletController.getRecentTransactionsData(req.user.id, 5);
    
    // Get educational tips (simulated for now)
    const educationalTips = [
      {
        id: 1,
        title: 'Understanding Market Volatility',
        content: 'Market volatility refers to the rate at which the price of assets increases or decreases...',
        category: 'market'
      },
      {
        id: 2,
        title: 'Diversification Strategies',
        content: 'Diversification is a risk management strategy that mixes a variety of investments...',
        category: 'strategy'
      }
    ];
    
    // Get leaderboard data
    const leaderboard = await GameController.getLeaderboardData(req.user.institutionCode, 'week', 5);
    
    res.json({
      success: true,
      data: {
        walletSummary,
        marketStats,
        challenges,
        recentTransactions,
        educationalTips,
        leaderboard
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Portfolio details
router.get('/portfolio', async (req, res) => {
  try {
    const portfolioData = await WalletController.getPortfolioAnalysis(req.user.id);
    
    res.json({
      success: true,
      data: portfolioData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Market insights
router.get('/market-insights', async (req, res) => {
  try {
    const marketInsights = await TokenMarketController.getMarketInsights();
    
    res.json({
      success: true,
      data: marketInsights
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Activity history
router.get('/activity', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const activityData = await WalletController.getActivityHistory(req.user.id, page, limit);
    
    res.json({
      success: true,
      data: activityData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Learning resources
router.get('/learning', async (req, res) => {
  try {
    // Get user's selected topics (from user metadata)
    const user = await User.findByPk(req.user.id);
    const selectedTopics = user.metadata?.learningTopics || ['basics', 'investing', 'market'];
    
    // Simulated learning resources
    const learningResources = [
      {
        id: 1,
        title: 'Introduction to Financial Markets',
        content: 'This course covers the basics of financial markets...',
        category: 'basics',
        difficulty: 'beginner'
      },
      {
        id: 2,
        title: 'Advanced Investment Strategies',
        content: 'Learn about advanced investment strategies...',
        category: 'investing',
        difficulty: 'advanced'
      },
      {
        id: 3,
        title: 'Market Analysis Techniques',
        content: 'This guide covers various market analysis techniques...',
        category: 'market',
        difficulty: 'intermediate'
      }
    ].filter(resource => selectedTopics.includes(resource.category));
    
    res.json({
      success: true,
      data: {
        selectedTopics,
        resources: learningResources
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;