/**
 * Environment Configuration
 * Centralizes environment-specific settings
 */
const path = require('path');
const dotenv = require('dotenv');

// Load the appropriate .env file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : process.env.NODE_ENV === 'test'
    ? '.env.test'
    : '.env';

const envPath = path.resolve(process.cwd(), envFile);
dotenv.config({ path: envPath });

// Determine if we're in production environment
const isProduction = process.env.NODE_ENV === 'production';

// Centralized environment configuration
const environment = {
  // Environment detection
  isProduction,
  isDevelopment: process.env.NODE_ENV === 'development' || !process.env.NODE_ENV,
  isTest: process.env.NODE_ENV === 'test',

  // Server configuration
  server: {
    port: process.env.PORT || 5002,
    env: process.env.NODE_ENV || 'development',
  },

  // Frontend URLs
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  verificationRoute: process.env.VERIFICATION_ROUTE || '/verify-email',

  // CORS settings
  corsOrigins: process.env.NODE_ENV === 'production'
    ? ['https://billsai.org', 'https://www.billsai.org', 'https://api.billsai.org','http://billsai-env.eba-kqudkcms.us-east-2.elasticbeanstalk.com/', /\.billsai\.org$/, /\.elasticbeanstalk\.com$/]
    : '*',

  // Email settings
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    username: process.env.EMAIL_USERNAME,
    password: process.env.EMAIL_PASSWORD,
    fromName: process.env.EMAIL_FROM_NAME || 'BillsAI',
    fromEmail: process.env.EMAIL_FROM_EMAIL || 'billsaiorg@gmail.com',
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // stricter limits in production
  },
  
  // MongoDB settings
  mongodb: {
    uri: process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
};

module.exports = environment;
