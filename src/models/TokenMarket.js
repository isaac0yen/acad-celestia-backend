const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TokenMarket = sequelize.define('TokenMarket', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  institutionCode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    field: 'institution_code'
  },
  institutionName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'institution_name'
  },
  institutionType: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'institution_type'
  },
  currentValue: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0,
    field: 'current_value',
    comment: 'Current value in Naira (NGN)'
  },
  totalSupply: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1000000.0,
    field: 'total_supply'
  },
  circulatingSupply: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
    field: 'circulating_supply'
  },
  liquidityPool: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 100000.0,
    field: 'liquidity_pool'
  },
  marketCap: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
    field: 'market_cap'
  },
  volume24h: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
    field: 'volume_24h'
  },
  change24h: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
    field: 'change_24h'
  },
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_updated'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'token_markets',
  timestamps: true,
  updatedAt: false
});

module.exports = TokenMarket;
