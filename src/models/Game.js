const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Game = sequelize.define('Game', {
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
  gameType: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'game_type'
  },
  stakeAmount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'stake_amount'
  },
  result: {
    type: DataTypes.STRING,
    allowNull: false
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'game_data'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'games',
  timestamps: true,
  updatedAt: false
});

module.exports = Game;
