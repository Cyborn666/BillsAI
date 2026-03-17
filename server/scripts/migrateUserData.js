/**
 * Migration script to update existing users with missing fullName field
 * This script finds all users without a fullName and generates it from email
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/userModel');

// Connect to MongoDB
const migrateUserData = async () => {
  try {
    //console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    //console.log('Connected to MongoDB successfully');

    // Find all users where fullName does not exist or is empty
    const usersToUpdate = await User.find({ 
      $or: [
        { fullName: { $exists: false } },
        { fullName: '' },
        { fullName: null }
      ]
    });

    //console.log(`Found ${usersToUpdate.length} users that need fullName updates`);

    // Update users with missing fullName
    let updatedCount = 0;
    for (const user of usersToUpdate) {
      if (user.email) {
        // Generate fullName from email (username part)
        const username = user.email.split('@')[0];
        // Convert to title case by capitalizing first letter of each word
        user.fullName = username
          .split(/[._-]/) // Split by common email username separators
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        
        await user.save();
        updatedCount++;
        //console.log(`Updated user ${user.email} with fullName: ${user.fullName}`);
      } else {
        //console.log(`Skipping user with ID ${user._id} - no email available`);
      }
    }

    //console.log(`Migration completed. Updated ${updatedCount}/${usersToUpdate.length} users.`);
  } catch (error) {
    //console.error('Migration failed:', error);
  } finally {
    // Close database connection
    await mongoose.disconnect();
    //console.log('Disconnected from MongoDB');
  }
};

// Run the migration
migrateUserData();
