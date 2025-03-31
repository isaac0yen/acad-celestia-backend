const cron = require('node-cron');
const cleanupDeletedUsers = require('./cleanupDeletedUsers');
const marketCron = require('./marketCron');
const GameService = require('../services/GameService');

/**
 * Initialize all cron jobs
 */
const initCronJobs = () => {
  // Run cleanupDeletedUsers every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running scheduled task: Cleanup Deleted Users');
    await cleanupDeletedUsers();
  });

  // Process active challenges every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled task: Process Active Challenges');
    try {
      await GameService.processActiveChallenges();
      console.log('Completed processing active challenges');
    } catch (error) {
      console.error('Error processing active challenges:', error);
    }
  });

  // Update challenge rewards based on market conditions every day at 1 AM
  cron.schedule('0 1 * * *', async () => {
    console.log('Running scheduled task: Update Challenge Rewards');
    try {
      await GameService.updateChallengeRewards();
      console.log('Completed updating challenge rewards');
    } catch (error) {
      console.error('Error updating challenge rewards:', error);
    }
  });

  // Initialize market simulation cron jobs
  marketCron();
  
  console.log('Cron jobs initialized');
};

module.exports = {
  initCronJobs
};
