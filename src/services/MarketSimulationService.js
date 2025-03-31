const { TokenMarket } = require('../models');
const { sequelize } = require('../config/database');

class MarketSimulationService {
  /**
   * Simulate market movements
   * This would typically be called by a cron job
   * @returns {Object} Simulation results
   */
  async simulateMarketMovements() {
    const t = await sequelize.transaction();
    
    try {
      const markets = await TokenMarket.findAll({ transaction: t });
      const results = [];
      
      for (const market of markets) {
        // Generate random movement based on market factors
        const volatility = this.calculateVolatility(market.institutionCode);
        const marketSentiment = this.calculateMarketSentiment();
        const randomFactor = this.getRandomFactor();
        
        // Calculate price change percentage
        // Limited to a realistic range (e.g., -5% to +5%)
        let priceChangePercentage = (volatility * marketSentiment * randomFactor);
        priceChangePercentage = Math.max(-5, Math.min(5, priceChangePercentage));
        
        // Apply price change
        const newValue = market.currentValue * (1 + (priceChangePercentage / 100));
        
        // Update market value
        market.currentValue = newValue;
        market.lastUpdated = new Date();
        await market.save({ transaction: t });
        
        results.push({
          institutionCode: market.institutionCode,
          oldValue: market.currentValue,
          newValue,
          priceChangePercentage
        });
      }
      
      await t.commit();
      
      return {
        success: true,
        results
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
   * Calculate market volatility
   * @param {string} institutionCode - Institution code
   * @returns {number} Volatility score
   */
  calculateVolatility(institutionCode) {
    // In a real implementation, this would be based on historical data
    // For now, we'll use a simple random volatility score
    return Math.random() * 2 + 0.5; // Returns 0.5 to 2.5
  }
  
  /**
   * Calculate market sentiment
   * @returns {number} Sentiment score (-1 to 1)
   */
  calculateMarketSentiment() {
    // In a real implementation, this could be based on external data
    // For now, we'll use a simple random sentiment
    return (Math.random() * 2) - 1; // Returns -1 to 1
  }
  
  /**
   * Get random factor for price movement
   * @returns {number} Random factor
   */
  getRandomFactor() {
    // Generate a random factor based on normal distribution
    // This creates more realistic price movements
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    
    const standardNormal = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    
    // Scale to a smaller range for more realistic movements
    return standardNormal * 0.5;
  }
  
  /**
   * Simulate news events that affect market
   * @returns {Object} Event results
   */
  async simulateNewsEvents() {
    const t = await sequelize.transaction();
    
    try {
      // Define possible news events
      const newsEvents = [
        { title: "Positive Academic Rankings", impact: 3.0, probability: 0.05 },
        { title: "Research Breakthrough", impact: 5.0, probability: 0.03 },
        { title: "Budget Cuts Announced", impact: -4.0, probability: 0.04 },
        { title: "Student Enrollment Increased", impact: 2.5, probability: 0.06 },
        { title: "Campus Expansion", impact: 3.5, probability: 0.03 },
        { title: "Faculty Strike", impact: -3.0, probability: 0.02 },
        { title: "New Partnership with Industry", impact: 4.0, probability: 0.04 },
        { title: "Sports Team Success", impact: 1.5, probability: 0.08 },
        { title: "Tuition Fee Increase", impact: -2.0, probability: 0.05 },
        { title: "Administrative Scandal", impact: -5.0, probability: 0.01 }
      ];
      
      // Determine if an event happens (10% chance overall)
      if (Math.random() > 0.1) {
        return {
          success: true,
          eventOccurred: false,
          message: "No significant news events today"
        };
      }
      
      // Select an event based on probability
      const random = Math.random();
      let cumulativeProbability = 0;
      let selectedEvent = null;
      
      for (const event of newsEvents) {
        cumulativeProbability += event.probability;
        if (random <= cumulativeProbability) {
          selectedEvent = event;
          break;
        }
      }
      
      if (!selectedEvent) {
        selectedEvent = newsEvents[0]; // Default to first event if none selected
      }
      
      // Apply event to all markets (or specific ones in a more advanced implementation)
      const markets = await TokenMarket.findAll({ transaction: t });
      const results = [];
      
      for (const market of markets) {
        // Apply impact with some randomness
        const impactVariation = (Math.random() * 0.4) + 0.8; // 80-120% of stated impact
        const finalImpact = selectedEvent.impact * impactVariation;
        
        // Calculate new value
        const newValue = market.currentValue * (1 + (finalImpact / 100));
        
        // Update market
        market.currentValue = newValue;
        market.lastUpdated = new Date();
        await market.save({ transaction: t });
        
        results.push({
          institutionCode: market.institutionCode,
          oldValue: market.currentValue,
          newValue,
          impactPercentage: finalImpact
        });
      }
      
      await t.commit();
      
      return {
        success: true,
        eventOccurred: true,
        event: selectedEvent,
        results,
        message: `News Event: ${selectedEvent.title}`
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
   * Apply market controls to prevent extreme volatility
   * @returns {Object} Control results
   */
  async applyMarketControls() {
    const t = await sequelize.transaction();
    
    try {
      const markets = await TokenMarket.findAll({ transaction: t });
      const results = [];
      
      for (const market of markets) {
        // Check for extreme price changes (e.g., more than 20% in a day)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // Get historical data
        // In a real implementation, this would come from a price history table
        // For now, we'll use a simulated approach
        const historicalValue = market.currentValue / (1 + (this.getRandomFactor() * 0.2));
        
        const priceChangePercent = ((market.currentValue - historicalValue) / historicalValue) * 100;
        
        // Apply circuit breakers if needed
        if (Math.abs(priceChangePercent) > 20) {
          // Reset to a more reasonable value
          const correctionFactor = 0.5; // Reduce extreme movement by 50%
          const excessChange = priceChangePercent - (Math.sign(priceChangePercent) * 20);
          const correctedChange = priceChangePercent - (excessChange * correctionFactor);
          
          const newValue = historicalValue * (1 + (correctedChange / 100));
          
          // Update market
          market.currentValue = newValue;
          market.lastUpdated = new Date();
          await market.save({ transaction: t });
          
          results.push({
            institutionCode: market.institutionCode,
            oldValue: market.currentValue,
            newValue,
            correction: `Circuit breaker activated: ${priceChangePercent.toFixed(2)}% → ${correctedChange.toFixed(2)}%`
          });
        } else {
          results.push({
            institutionCode: market.institutionCode,
            currentValue: market.currentValue,
            priceChangePercent,
            message: "No intervention needed"
          });
        }
      }
      
      await t.commit();
      
      return {
        success: true,
        results
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
   * Apply institution reputation factors to token markets
   * This is run weekly to adjust token values based on institution performance
   * @returns {Object} Results of the reputation factor application
   */
  async applyInstitutionReputationFactors() {
    const t = await sequelize.transaction();
    
    try {
      // In a real implementation, this would fetch reputation data from an external source
      // For now, we'll simulate reputation factors
      const reputationFactors = {
        // These are example institution codes
        'HARV': { factor: 1.02, reason: 'Strong research output' },
        'MIT': { factor: 1.015, reason: 'Industry partnerships' },
        'STAN': { factor: 1.01, reason: 'Alumni success' },
        'OXFD': { factor: 1.005, reason: 'Historical prestige' },
        'YALE': { factor: 0.995, reason: 'Declining enrollment' },
        'UCB': { factor: 0.99, reason: 'Budget issues' },
        // Default factor for institutions not specifically listed
        'DEFAULT': { factor: 1.0, reason: 'Neutral performance' }
      };
      
      const markets = await TokenMarket.findAll({ transaction: t });
      const results = [];
      
      for (const market of markets) {
        // Get reputation factor for this institution
        const repFactor = reputationFactors[market.institutionCode] || reputationFactors.DEFAULT;
        
        // Apply reputation factor to token value
        const oldValue = market.currentValue;
        const newValue = oldValue * repFactor.factor;
        
        // Update market
        market.currentValue = newValue;
        market.lastUpdated = new Date();
        await market.save({ transaction: t });
        
        // Record the change
        results.push({
          institutionCode: market.institutionCode,
          oldValue,
          newValue,
          changePercentage: ((newValue - oldValue) / oldValue) * 100,
          reason: repFactor.reason
        });
      }
      
      await t.commit();
      
      return {
        success: true,
        results,
        message: 'Institution reputation factors applied successfully'
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

module.exports = new MarketSimulationService();