const cron = require('node-cron');
const TokenMarketService = require('../services/TokenMarketService');
const cleanupDeletedUsers = require('./cleanupDeletedUsers');

/**
 * Initialize all cron jobs
 */
function initializeCronJobs() {
  console.log('Initializing market cron jobs...');
  
  // Clean up deleted users - Run once a day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running cleanup job for deleted users');
    try {
      const result = await cleanupDeletedUsers();
      console.log('Cleanup job completed', { result });
    } catch (error) {
      console.error('Error running cleanup job', { error: error.message });
    }
  });

  // Update market statistics - Every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('Updating market statistics');
    try {
      await TokenMarketService.updateMarketStats();
      console.log('Market statistics updated');
    } catch (error) {
      console.error('Error updating market statistics', { error: error.message });
    }
  });

  // Fetch latest institution data - Every day at 1 AM
  cron.schedule('0 1 * * *', async () => {
    console.log('Fetching latest institution data');
    try {
      const InstitutionService = require('../services/InstitutionService');
      await InstitutionService.fetchAndUpdateInstitutions();
      console.log('Institution data updated');
    } catch (error) {
      console.error('Error fetching institution data', { error: error.message });
    }
  });

  console.log('All market cron jobs initialized');
}

module.exports = initializeCronJobs;