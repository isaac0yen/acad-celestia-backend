const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TokenBalance = sequelize.define('TokenBalance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  institutionCode: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'institution_code'
  },
  balance: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at'
  }
}, {
  tableName: 'token_balances',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'institution_code']
    }
  ]
});

module.exports = TokenBalance;