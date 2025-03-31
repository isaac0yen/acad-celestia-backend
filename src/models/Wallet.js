const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Wallet = sequelize.define('Wallet', {
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
  nairaBalance: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
    allowNull: false,
    field: 'naira_balance',
    comment: 'User balance in Nigerian Naira (NGN)'
  },
  stakedBalance: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
    allowNull: false,
    field: 'staked_balance'
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
  tableName: 'wallets',
  timestamps: true
});

module.exports = Wallet;
