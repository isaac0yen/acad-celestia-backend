const axios = require('axios');
const { TokenMarket } = require('../models');
const { sequelize } = require('../config/database');

class InstitutionService {
  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'https://api.acadcelestia.com';
  }

  /**
   * Fetch institutions from external API
   * @returns {Array} List of institutions
   */
  async getInstitutions() {
    try {
      const response = await axios.get(`${this.baseUrl}/services/institutions`);
      
      if (!response.data || !response.data.status) {
        throw new Error('Failed to fetch institutions');
      }
      
      return response.data.data;
    } catch (error) {
      throw new Error(`${error.message}`);
    }
  }

  /**
   * Populate the TokenMarket table with institutions
   * @returns {Object} Result of the operation
   */
  async populateTokenMarkets() {
    const t = await sequelize.transaction();
    
    try {
      // Fetch institutions from API
      const institutions = await this.getInstitutions();
      
      if (!institutions || !institutions.length) {
        throw new Error('No institutions found');
      }
      
      console.log(`Found ${institutions.length} institutions`);
      
      // Create token markets for each institution
      const createdTokens = [];
      const updatedTokens = [];
      
      for (const institution of institutions) {
        if (!institution.short_name) {
          console.log(`Skipping institution without short_name: ${institution.name}`);
          continue;
        }
        
        // Check if token market already exists
        const existingToken = await TokenMarket.findOne({
          where: { institutionCode: institution.short_name },
          transaction: t
        });
        
        if (existingToken) {
          // Update existing token market
          existingToken.institutionName = institution.name;
          existingToken.institutionType = institution.type;
          await existingToken.save({ transaction: t });
          updatedTokens.push(existingToken);
        } else {
          // Create new token market
          const newToken = await TokenMarket.create({
            institutionCode: institution.short_name,
            institutionName: institution.name,
            institutionType: institution.type,
            currentValue: 1.0, // Initial value in Naira
            totalSupply: 1000000.0, // Initial supply
            circulatingSupply: 0.0, // No tokens in circulation yet
            liquidityPool: 100000.0, // Initial liquidity pool
            marketCap: 0.0, // Initial market cap
            volume24h: 0.0, // Initial 24h volume
            change24h: 0.0, // Initial 24h change
            lastUpdated: new Date()
          }, { transaction: t });
          
          createdTokens.push(newToken);
        }
      }
      
      await t.commit();
      
      return {
        success: true,
        message: `Successfully processed ${institutions.length} institutions. Created ${createdTokens.length} new tokens, updated ${updatedTokens.length} existing tokens.`,
        created: createdTokens.length,
        updated: updatedTokens.length
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
   * Get all token markets
   * @returns {Array} List of token markets
   */
  async getAllTokenMarkets() {
    try {
      const tokenMarkets = await TokenMarket.findAll({
        order: [['currentValue', 'DESC']]
      });
      
      return tokenMarkets;
    } catch (error) {
      throw new Error(`Failed to get token markets: ${error.message}`);
    }
  }

  /**
   * Get token market by institution code
   * @param {string} institutionCode - Institution code
   * @returns {Object} Token market
   */
  async getTokenMarket(institutionCode) {
    try {
      const tokenMarket = await TokenMarket.findOne({
        where: { institutionCode }
      });
      
      if (!tokenMarket) {
        throw new Error(`Token market not found for institution code: ${institutionCode}`);
      }
      
      return tokenMarket;
    } catch (error) {
      throw new Error(`Failed to get token market: ${error.message}`);
    }
  }
}

module.exports = new InstitutionService();
