const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('Transaction', {
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
  walletId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'wallet_id',
    references: {
      model: 'wallets',
      key: 'id'
    }
  },
  transactionType: {
    type: DataTypes.ENUM('buy', 'sell', 'send', 'stake', 'unstake', 'game'),
    allowNull: false,
    field: 'transaction_type'
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  fee: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'transaction_data'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'transactions',
  timestamps: true,
  updatedAt: false
});

module.exports = Transaction;
