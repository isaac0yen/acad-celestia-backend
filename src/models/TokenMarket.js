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
  currentValue: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'current_value'
  },
  totalSupply: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'total_supply'
  },
  liquidityPool: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'liquidity_pool'
  },
  lastUpdated: {
    type: DataTypes.DATE,
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
