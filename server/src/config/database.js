/**
 * Database connection configuration
 */
const mongoose = require('mongoose');
const environment = require('./environment');
const logger = require('./logger');

/**
 * Connect to MongoDB with reliable connection handling
 * @returns {Promise<mongoose.Connection|null>} Mongoose connection object or null if connection fails
 */
const connectDatabase = async () => {
  try {
    // Use existing connection if already connected
    if (mongoose.connection.readyState === 1) {
      logger.info(`Using existing MongoDB connection: ${mongoose.connection.host}`);
      return mongoose.connection;
    }

    // Set connection options based on environment
    // Note: useNewUrlParser and useUnifiedTopology are deprecated in newer drivers
    const connectionOptions = {
      socketTimeoutMS: 45000,
      connectTimeoutMS: 45000,
      serverSelectionTimeoutMS: 45000,
      // Adding retryWrites to help with connection stability
      retryWrites: true,
      w: 'majority',
      // Set a longer heartbeatFrequencyMS to help with connection stability
      heartbeatFrequencyMS: 10000,
    };

    // Make sure we have a valid MongoDB URI
    const uri = process.env.MONGODB_URI || environment.mongodb.uri;
    if (!uri) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }

    // Log the attempt (without sensitive data)
    logger.info('Attempting MongoDB connection...');

    // Attempt connection - use process.env directly to avoid any mapping issues
    const conn = await mongoose.connect(uri, connectionOptions);
    
    // Set up connection event handlers for stability
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', { error: err.message });
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });
    
    logger.info(`MongoDB connected to: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    // Log connection failure with safe credentials handling
    logger.error(`MongoDB connection failed: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      code: error.code || 'N/A',
      name: error.name || 'N/A',
      uri: process.env.MONGODB_URI ? process.env.MONGODB_URI.split('@')[1] : 'undefined',
    });

    // Check if connection actually succeeded despite the error
    if (mongoose.connection.readyState === 1) {
      logger.warn('MongoDB connection error occurred but connection appears to be active.');
      return mongoose.connection;
    }
    
    // Return null to indicate connection failure without terminating the process
    return null;
  }
};

module.exports = connectDatabase;
