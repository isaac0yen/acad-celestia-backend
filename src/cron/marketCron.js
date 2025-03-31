const cron = require('node-cron');
const MarketSimulationService = require('../services/MarketSimulationService');
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

  // Run market simulation - Every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('Running market simulation');
    try {
      await MarketSimulationService.simulateMarketMovements();
      console.log('Market simulation completed');
    } catch (error) {
      console.error('Error running market simulation', { error: error.message });
    }
  });

  // Update market trends - Every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Updating market trends');
    try {
      await MarketSimulationService.updateMarketTrends();
      console.log('Market trends updated');
    } catch (error) {
      console.error('Error updating market trends', { error: error.message });
    }
  });

  // Generate market events - Every 4 hours
  cron.schedule('0 */4 * * *', async () => {
    console.log('Generating market events');
    try {
      await MarketSimulationService.generateMarketEvents();
      console.log('Market events generated');
    } catch (error) {
      console.error('Error generating market events', { error: error.message });
    }
  });

  // Process market events - Every hour
  cron.schedule('30 * * * *', async () => {
    console.log('Processing market events');
    try {
      await MarketSimulationService.processMarketEvents();
      console.log('Market events processed');
    } catch (error) {
      console.error('Error processing market events', { error: error.message });
    }
  });

  // Update token values - Every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('Updating token values');
    try {
      await MarketSimulationService.updateTokenValues();
      console.log('Token values updated');
    } catch (error) {
      console.error('Error updating token values', { error: error.message });
    }
  });

  // Calculate market statistics - Once a day at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Calculating market statistics');
    try {
      await MarketSimulationService.calculateMarketStatistics();
      console.log('Market statistics calculated');
    } catch (error) {
      console.error('Error calculating market statistics', { error: error.message });
    }
  });

  // Adjust token supply and demand - Every 2 hours
  cron.schedule('0 */2 * * *', async () => {
    console.log('Adjusting token supply and demand');
    try {
      await MarketSimulationService.adjustTokenSupplyDemand();
      console.log('Token supply and demand adjusted');
    } catch (error) {
      console.error('Error adjusting token supply and demand', { error: error.message });
    }
  });

  // Update institution performance metrics - Once a day at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('Updating institution performance metrics');
    try {
      await MarketSimulationService.updateInstitutionPerformance();
      console.log('Institution performance metrics updated');
    } catch (error) {
      console.error('Error updating institution performance metrics', { error: error.message });
    }
  });

  console.log('Market cron jobs initialized');
}

module.exports = initializeCronJobs;