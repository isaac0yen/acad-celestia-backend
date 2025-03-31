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
    type: DataTypes.ENUM('deposit', 'withdraw', 'buy', 'sell', 'swap', 'send', 'stake', 'unstake', 'game'),
    allowNull: false,
    field: 'transaction_type'
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: 'Amount in Naira or token units depending on transaction type'
  },
  tokenCode: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'token_code',
    comment: 'Institution code for the token involved in the transaction'
  },
  tokenAmount: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'token_amount',
    comment: 'Amount of tokens involved in the transaction'
  },
  tokenPrice: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'token_price',
    comment: 'Price of token at the time of transaction in Naira'
  },
  targetTokenCode: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'target_token_code',
    comment: 'For swap transactions, the target token code'
  },
  targetTokenAmount: {
    type: DataTypes.FLOAT,
    allowNull: true,
    field: 'target_token_amount',
    comment: 'For swap transactions, the amount of target tokens'
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
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at'
  }
}, {
  tableName: 'transactions',
  timestamps: true
});

module.exports = Transaction;
