const { Wallet, Transaction, User, TokenBalance, TokenMarket } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

class GameService {
  /**
   * Start a new investment challenge
   * @param {number} userId - User ID
   * @param {string} challengeType - Type of challenge
   * @param {Object} params - Challenge parameters
   * @returns {Object} Challenge result
   */
  async startChallenge(userId, challengeType, params = {}) {
    const t = await sequelize.transaction();
    
    try {
      // Get user's wallet
      const wallet = await Wallet.findOne({
        where: { userId },
        transaction: t
      });
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      
      // Set up challenge
      let challenge;
      let stakingAmount = 0;
      
      switch (challengeType) {
        case 'diversification':
          // Challenge: Invest in at least 3 different institution tokens
          challenge = {
            type: challengeType,
            goal: 'Invest in at least 3 different institution tokens',
            reward: 50, // Reward amount
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            status: 'active'
          };
          break;
          
        case 'hold':
          // Challenge: Hold a token for a specified period without selling
          stakingAmount = parseFloat(params.amount) || 100;
          const institutionCode = params.institutionCode;
          
          if (!institutionCode) {
            throw new Error('Institution code is required');
          }
          
          // Check if token market exists
          const tokenMarket = await TokenMarket.findOne({
            where: { institutionCode },
            transaction: t
          });
          
          if (!tokenMarket) {
            throw new Error('Token market not found');
          }
          
          // Check if user has enough balance
          if (wallet.balance < stakingAmount) {
            throw new Error('Insufficient balance');
          }
          
          // Update wallet balance
          wallet.balance -= stakingAmount;
          await wallet.save({ transaction: t });
          
          challenge = {
            type: challengeType,
            goal: `Hold ${stakingAmount} tokens for 30 days`,
            reward: stakingAmount * 0.05, // 5% return
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            status: 'active',
            institutionCode,
            stakingAmount
          };
          
          // Create transaction record
          await Transaction.create({
            userId,
            walletId: wallet.id,
            transactionType: 'stake',
            amount: stakingAmount,
            fee: 0,
            status: 'completed',
            metadata: {
              challengeId: challenge.id,
              institutionCode,
              challengeType
            }
          }, { transaction: t });
          
          break;
          
        case 'market_timing':
          // Challenge: Buy low and sell high within a time period
          challenge = {
            type: challengeType,
            goal: 'Achieve 10% profit through well-timed trades',
            reward: 100,
            startDate: new Date(),
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
            status: 'active',
            initialValue: wallet.balance
          };
          break;
          
        default:
          throw new Error('Invalid challenge type');
      }
      
      // Store challenge in user's metadata
      const user = await User.findByPk(userId, { transaction: t });
      if (!user) {
        throw new Error('User not found');
      }
      
      // Initialize challenges array if it doesn't exist
      const userMetadata = user.metadata || {};
      if (!userMetadata.challenges) {
        userMetadata.challenges = [];
      }
      
      // Add challenge to challenges array
      challenge.id = Date.now().toString();
      userMetadata.challenges.push(challenge);
      
      // Update user metadata
      user.metadata = userMetadata;
      await user.save({ transaction: t });
      
      await t.commit();
      
      return {
        success: true,
        challenge,
        message: 'Challenge started successfully'
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
   * Check challenge progress
   * @param {number} userId - User ID
   * @param {string} challengeId - Challenge ID
   * @returns {Object} Challenge progress
   */
  async checkChallengeProgress(userId, challengeId) {
    try {
      // Get user data
      const user = await User.findByPk(userId);
      if (!user || !user.metadata || !user.metadata.challenges) {
        throw new Error('User or challenges not found');
      }
      
      // Find the challenge
      const challenge = user.metadata.challenges.find(c => c.id === challengeId);
      if (!challenge) {
        throw new Error('Challenge not found');
      }
      
      // Get wallet for progress calculation
      const wallet = await Wallet.findOne({ where: { userId } });
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      
      let progress = 0;
      let isCompleted = false;
      
      switch (challenge.type) {
        case 'diversification':
          // Check how many different tokens the user has
          const tokenBalances = await TokenBalance.findAll({
            where: { userId, balance: { [Op.gt]: 0 } }
          });
          
          const uniqueInstitutions = new Set(tokenBalances.map(tb => tb.institutionCode));
          progress = (uniqueInstitutions.size / 3) * 100; // 3 is the goal
          isCompleted = uniqueInstitutions.size >= 3;
          break;
          
        case 'hold':
          // Check if the holding period has passed
          const now = new Date();
          const endDate = new Date(challenge.endDate);
          
          if (now >= endDate) {
            isCompleted = true;
            progress = 100;
          } else {
            // Calculate progress based on time elapsed
            const totalDuration = endDate - new Date(challenge.startDate);
            const elapsed = now - new Date(challenge.startDate);
            progress = (elapsed / totalDuration) * 100;
          }
          break;
          
        case 'market_timing':
          // Calculate profit percentage
          const currentValue = wallet.balance;
          const initialValue = challenge.initialValue;
          const profitPercentage = ((currentValue - initialValue) / initialValue) * 100;
          
          progress = Math.min(100, profitPercentage * 10); // 10% profit is the goal
          isCompleted = profitPercentage >= 10;
          break;
      }
      
      return {
        success: true,
        challenge,
        progress: Math.round(progress),
        isCompleted,
        message: isCompleted ? 'Challenge completed!' : 'Challenge in progress'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Complete a challenge and claim rewards
   * @param {number} userId - User ID
   * @param {string} challengeId - Challenge ID
   * @returns {Object} Reward result
   */
  async completeChallenge(userId, challengeId) {
    const t = await sequelize.transaction();
    
    try {
      // Get user data
      const user = await User.findByPk(userId, { transaction: t });
      if (!user || !user.metadata || !user.metadata.challenges) {
        throw new Error('User or challenges not found');
      }
      
      // Find the challenge
      const challengeIndex = user.metadata.challenges.findIndex(c => c.id === challengeId);
      if (challengeIndex === -1) {
        throw new Error('Challenge not found');
      }
      
      const challenge = user.metadata.challenges[challengeIndex];
      
      // Check if challenge is completed
      const progress = await this.checkChallengeProgress(userId, challengeId);
      if (!progress.isCompleted) {
        throw new Error('Challenge is not completed yet');
      }
      
      // Check if challenge is already claimed
      if (challenge.status === 'completed') {
        throw new Error('Challenge reward already claimed');
      }
      
      // Get wallet for reward
      const wallet = await Wallet.findOne({
        where: { userId },
        transaction: t
      });
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      
      // Process reward
      const reward = challenge.reward;
      wallet.balance += reward;
      await wallet.save({ transaction: t });
      
      // Update challenge status
      challenge.status = 'completed';
      challenge.completedDate = new Date();
      user.metadata.challenges[challengeIndex] = challenge;
      await user.save({ transaction: t });
      
      // Create transaction record
      await Transaction.create({
        userId,
        walletId: wallet.id,
        transactionType: 'game',
        amount: reward,
        fee: 0,
        status: 'completed',
        metadata: {
          challengeId,
          challengeType: challenge.type,
          reward
        }
      }, { transaction: t });
      
      await t.commit();
      
      return {
        success: true,
        reward,
        message: `Challenge completed! You earned ${reward} tokens.`
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
   * Process all active challenges for all users
   * This is meant to be run by a cron job
   * @returns {Object} Processing results
   */
  async processActiveChallenges() {
    const t = await sequelize.transaction();
    
    try {
      // Get all users with active challenges
      const users = await User.findAll({
        where: {
          metadata: {
            challenges: {
              [Op.ne]: null
            }
          }
        },
        transaction: t
      });
      
      let processedCount = 0;
      let completedCount = 0;
      let expiredCount = 0;
      
      for (const user of users) {
        if (!user.metadata || !user.metadata.challenges) {
          continue;
        }
        
        const challenges = user.metadata.challenges;
        let updated = false;
        
        for (let i = 0; i < challenges.length; i++) {
          const challenge = challenges[i];
          
          // Skip already completed challenges
          if (challenge.status !== 'active') {
            continue;
          }
          
          processedCount++;
          
          // Check if challenge has expired
          const now = new Date();
          const endDate = new Date(challenge.endDate);
          
          if (now > endDate) {
            // For 'hold' type challenges, auto-complete if expired
            if (challenge.type === 'hold') {
              // Auto-complete the challenge
              const result = await this.completeChallenge(user.id, challenge.id);
              if (result.success) {
                completedCount++;
              }
            } else {
              // Mark as expired for other challenge types
              challenge.status = 'expired';
              challenges[i] = challenge;
              updated = true;
              expiredCount++;
            }
          } else {
            // Check if challenge is completed but not claimed
            const progress = await this.checkChallengeProgress(user.id, challenge.id);
            if (progress.isCompleted) {
              // For now, just mark as ready to claim
              challenge.readyToClaim = true;
              challenges[i] = challenge;
              updated = true;
            }
          }
        }
        
        // Save changes if any
        if (updated) {
          user.metadata.challenges = challenges;
          await user.save({ transaction: t });
        }
      }
      
      await t.commit();
      
      return {
        success: true,
        processed: processedCount,
        completed: completedCount,
        expired: expiredCount,
        message: `Processed ${processedCount} challenges: ${completedCount} completed, ${expiredCount} expired`
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
   * Update challenge rewards based on market conditions
   * This is meant to be run by a cron job
   * @returns {Object} Update results
   */
  async updateChallengeRewards() {
    const t = await sequelize.transaction();
    
    try {
      // Get all users with active challenges
      const users = await User.findAll({
        where: {
          metadata: {
            challenges: {
              [Op.ne]: null
            }
          }
        },
        transaction: t
      });
      
      let updatedCount = 0;
      
      for (const user of users) {
        if (!user.metadata || !user.metadata.challenges) {
          continue;
        }
        
        const challenges = user.metadata.challenges;
        let updated = false;
        
        for (let i = 0; i < challenges.length; i++) {
          const challenge = challenges[i];
          
          // Only update active challenges
          if (challenge.status !== 'active') {
            continue;
          }
          
          // Update rewards based on challenge type
          switch (challenge.type) {
            case 'hold':
              // For hold challenges, adjust reward based on token value changes
              if (challenge.institutionCode) {
                const tokenMarket = await TokenMarket.findOne({
                  where: { institutionCode: challenge.institutionCode },
                  transaction: t
                });
                
                if (tokenMarket) {
                  // Calculate new reward based on current token value
                  const originalReward = challenge.stakingAmount * 0.05; // Original 5% return
                  const marketFactor = Math.max(0.8, Math.min(1.2, tokenMarket.currentValue / 1.0)); // Limit to 20% adjustment
                  const newReward = originalReward * marketFactor;
                  
                  // Only update if reward changes by more than 1%
                  if (Math.abs(newReward - challenge.reward) / challenge.reward > 0.01) {
                    challenge.reward = newReward;
                    challenges[i] = challenge;
                    updated = true;
                    updatedCount++;
                  }
                }
              }
              break;
              
            case 'diversification':
            case 'market_timing':
              // For other challenges, we could adjust rewards based on difficulty
              // For now, just a small random adjustment to simulate market conditions
              const adjustmentFactor = 0.95 + (Math.random() * 0.1); // 0.95 to 1.05
              const newReward = challenge.reward * adjustmentFactor;
              
              // Only update if reward changes by more than 1%
              if (Math.abs(newReward - challenge.reward) / challenge.reward > 0.01) {
                challenge.reward = newReward;
                challenges[i] = challenge;
                updated = true;
                updatedCount++;
              }
              break;
          }
        }
        
        // Save changes if any
        if (updated) {
          user.metadata.challenges = challenges;
          await user.save({ transaction: t });
        }
      }
      
      await t.commit();
      
      return {
        success: true,
        updated: updatedCount,
        message: `Updated rewards for ${updatedCount} challenges`
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
   * Play a game (coin flip, dice roll, etc.)
   * @param {number} userId - User ID
   * @param {string} gameType - Type of game
   * @param {number} stakeAmount - Amount to stake
   * @returns {Object} Game result
   */
  async playGame(userId, gameType, stakeAmount) {
    const t = await sequelize.transaction();
    
    try {
      // Get user's wallet
      const wallet = await Wallet.findOne({
        where: { userId },
        transaction: t
      });
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      
      // Check if user has enough balance
      if (wallet.balance < stakeAmount) {
        throw new Error('Insufficient balance');
      }
      
      // Deduct stake amount
      wallet.balance -= stakeAmount;
      
      // Determine game outcome
      let result;
      let winAmount = 0;
      
      switch (gameType) {
        case 'coin_flip':
          // 50% chance to win, 2x payout
          result = Math.random() < 0.5;
          if (result) {
            winAmount = stakeAmount * 2;
          }
          break;
          
        case 'dice_roll':
          // Roll 1-6, win if roll > 4 (33.33% chance), 3x payout
          const roll = Math.floor(Math.random() * 6) + 1;
          result = roll > 4;
          if (result) {
            winAmount = stakeAmount * 3;
          }
          break;
          
        case 'number_guess':
          // Guess a number 1-10, 10% chance, 10x payout
          const number = Math.floor(Math.random() * 10) + 1;
          const userGuess = Math.floor(Math.random() * 10) + 1; // Simulated user guess
          result = number === userGuess;
          if (result) {
            winAmount = stakeAmount * 10;
          }
          break;
          
        default:
          throw new Error('Invalid game type');
      }
      
      // Update wallet with winnings if any
      if (winAmount > 0) {
        wallet.balance += winAmount;
      }
      
      await wallet.save({ transaction: t });
      
      // Create transaction record
      const transaction = await Transaction.create({
        userId,
        walletId: wallet.id,
        transactionType: 'game',
        amount: result ? winAmount : -stakeAmount,
        fee: 0,
        status: 'completed',
        metadata: {
          gameType,
          stakeAmount,
          result,
          winAmount
        }
      }, { transaction: t });
      
      await t.commit();
      
      return {
        success: true,
        result,
        stakeAmount,
        winAmount,
        newBalance: wallet.balance,
        message: result ? 'You won!' : 'You lost. Try again!'
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
   * Get user's game history
   * @param {number} userId - User ID
   * @param {number} limit - Maximum number of records to return
   * @returns {Object} Game history
   */
  async getGameHistory(userId, limit = 10) {
    try {
      const transactions = await Transaction.findAll({
        where: {
          userId,
          transactionType: 'game'
        },
        order: [['createdAt', 'DESC']],
        limit
      });
      
      return {
        success: true,
        history: transactions.map(t => ({
          id: t.id,
          date: t.createdAt,
          gameType: t.metadata.gameType,
          stakeAmount: t.metadata.stakeAmount,
          result: t.metadata.result,
          winAmount: t.metadata.winAmount,
          amount: t.amount
        }))
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = new GameService();