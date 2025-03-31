/**
 * Script to populate token_markets table with institution data
 * 
 * Run with: node scripts/populate-tokens.js
 */

require('dotenv').config();
const axios = require('axios');
const { sequelize } = require('../src/config/database');
const { TokenMarket } = require('../src/models');

// Initial values for token markets
const INITIAL_TOKEN_VALUE = 100; // Initial token value in Naira
const INITIAL_TOTAL_SUPPLY = 1000000; // Initial total supply
const INITIAL_CIRCULATING_SUPPLY = 500000; // Initial circulating supply
const INITIAL_LIQUIDITY_POOL = 0; // Initial liquidity pool in Naira (50 million)

/**
 * Fetch institutions from API and populate token_markets table
 */
async function populateTokenMarkets() {
  try {
    console.log('Starting to populate token markets...');
    
    // Check if API_BASE_URL is set
    const baseUrl = process.env.NELF_API_BASE_URL || process.env.API_BASE_URL;
    if (!baseUrl) {
      throw new Error('API_BASE_URL or NELF_API_BASE_URL environment variable is not set');
    }
    
    console.log(`Fetching institutions from ${baseUrl}/services/institutions`);
    
    // Fetch institutions from API
    const response = await axios.get(`${baseUrl}/services/institutions`);
    
    if (!response.data || !response.data.status) {
      throw new Error('Failed to fetch institutions');
    }
    
    const institutions = response.data.data;
    console.log(`Fetched ${institutions.length} institutions`);
    
    // Start a transaction
    const t = await sequelize.transaction();
    
    try {
      // Process each institution
      for (const institution of institutions) {
        // Use short_name as institution_code
        const institutionCode = institution.short_name;
        
        if (!institutionCode) {
          console.warn(`Skipping institution with no short_name: ${institution.name}`);
          continue;
        }
        
        // Check if token market already exists
        const existingToken = await TokenMarket.findOne({
          where: { institutionCode },
          transaction: t
        });
        
        if (existingToken) {
          console.log(`Token market for ${institutionCode} already exists, updating...`);
          
          // Update existing token market
          await existingToken.update({
            institutionName: institution.name,
            institutionType: institution.type || 'University',
            lastUpdated: new Date()
          }, { transaction: t });
        } else {
          console.log(`Creating new token market for ${institutionCode}`);
          
          
          // Create new token market
          await TokenMarket.create({
            institutionCode,
            institutionName: institution.name,
            institutionType: institution.type || 'University',
            currentValue: INITIAL_TOKEN_VALUE,
            totalSupply: INITIAL_TOTAL_SUPPLY,
            circulatingSupply: INITIAL_CIRCULATING_SUPPLY,
            liquidityPool: INITIAL_LIQUIDITY_POOL,
            marketCap: INITIAL_TOKEN_VALUE * INITIAL_CIRCULATING_SUPPLY,
            volume24h: 0,
            change24h: 0,
            lastUpdated: new Date()
          }, { transaction: t });
        }
      }
      
      // Commit transaction
      await t.commit();
      console.log('Successfully populated token markets');
    } catch (error) {
      // Rollback transaction on error
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error populating token markets:', error.message);
    if (error.response) {
      console.error('API response error:', error.response.data);
    }
    process.exit(1);
  } finally {
    // Close database connection
    await sequelize.close();
    console.log('Database connection closed');
  }
}

// Run the script
populateTokenMarkets();
