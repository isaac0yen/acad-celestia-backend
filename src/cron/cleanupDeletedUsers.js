const { User, Wallet } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Cleanup deleted users and their related data
 * This function will:
 * 1. Find all users with DELETED status and deletedAt date older than 30 days
 * 2. Delete all related data in other tables
 * 3. Finally delete the user record
 */
const cleanupDeletedUsers = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting cleanup of deleted users...');
    
    // Find users marked as DELETED with deletedAt older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const deletedUsers = await User.findAll({
      where: {
        status: 'DELETED',
        deletedAt: {
          [Op.lt]: thirtyDaysAgo
        }
      },
      transaction
    });
    
    console.log(`Found ${deletedUsers.length} deleted users to clean up`);
    
    // Process each deleted user
    for (const user of deletedUsers) {
      console.log(`Cleaning up user ID: ${user.id}`);
      
      // Delete wallet records
      await Wallet.destroy({
        where: { userId: user.id },
        transaction
      });
      
      // Delete the user record
      await user.destroy({ transaction });
      
      console.log(`User ID: ${user.id} and all related data deleted`);
    }
    
    await transaction.commit();
    console.log('Deleted users cleanup completed successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('Error during deleted users cleanup:', error);
  }
};

module.exports = cleanupDeletedUsers;
