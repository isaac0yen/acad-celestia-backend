const User = require('./User');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const TokenMarket = require('./TokenMarket');
const Game = require('./Game');
const VerificationCode = require('./VerificationCode');

// Define associations
User.hasOne(Wallet, { foreignKey: 'userId', as: 'wallet' });
Wallet.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Game, { foreignKey: 'userId', as: 'games' });
Game.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(VerificationCode, { foreignKey: 'userId', as: 'verificationCodes' });
VerificationCode.belongsTo(User, { foreignKey: 'userId' });

Wallet.hasMany(Transaction, { foreignKey: 'walletId', as: 'transactions' });
Transaction.belongsTo(Wallet, { foreignKey: 'walletId' });

module.exports = {
  User,
  Wallet,
  Transaction,
  TokenMarket,
  Game,
  VerificationCode
};
