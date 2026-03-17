/**
 * BillsAI Server - Main Entry Point
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');

// Import configuration
const environment = require('./config/environment');
const security = require('./config/security');
const connectDatabase = require('./config/database');
const logger = require('./config/logger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const billRoutes = require('./routes/billRoutes');
const supportRoutes = require('./routes/supportRoutes');
const waitlistRoutes = require('./routes/waitlistRoutes');
const businessRoutes = require('./routes/businessRoutes');
const businessClientRoutes = require('./routes/businessClientRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const businessBillRoutes = require('./routes/businessBillRoutes');
const businessInvoiceRoutes = require('./routes/businessInvoiceRoutes');
const businessDailyReportRoutes = require('./routes/businessDailyReportRoutes');
const businessMiscTransactionRoutes = require('./routes/businessMiscTransactionRoutes');
const businessSubscriptionRoutes = require('./routes/businessSubscriptionRoutes');
const businessSupportRoutes = require('./routes/businessSupportRoutes');
const splitRoutes = require('./routes/splitRoutes');
const splitBalanceRoutes = require('./routes/splitBalanceRoutes');




// Create Express app
const app = express();


// Trust proxy - needed for rate limiting behind CloudFront/ELB
// More secure configuration that only trusts AWS load balancers and CloudFront
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal', '127.0.0.1', '::1']);


// Make body-parser handle JSON requests except for the webhook endpoints
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    if (req.originalUrl === '/api/business/subscription/webhook' || 
        req.originalUrl === '/api/business/subscription/apple-webhook') {
      // Save the raw body for webhook verification
      req.rawBody = buf.toString();
    }
  }
}));

// Special handling for webhook endpoints - skip middleware that parses the body
app.use('/api/business/subscription/webhook', express.raw({type: 'application/json'}));
app.use('/api/business/subscription/apple-webhook', express.raw({type: 'application/json'}));

// Security middlewares

// Apply security middleware (helmet, rate limiting, etc.)
security.applySecurityMiddleware(app);

// Configure CORS based on environment
app.use(cors(security.cors));

// Body parser middlewares - increased limits for base64 images
app.use(express.json({ limit: '100mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// File upload middleware - for PDF processing
app.use(fileUpload({
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max file size
  abortOnLimit: true,
  createParentPath: true,
  useTempFiles: false, // We'll process files in memory
  debug: environment.isDevelopment, // Enable debug in development
}));

// Logging middleware - use detailed format in development, combined in production
if (environment.isDevelopment) {
  app.use(morgan('dev'));
} else {
  // In production, log HTTP requests through morgan and Winston
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Debug route to test API access
app.get('/api/debug', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Debug endpoint is working', routes: [
    '/api/auth',
    '/api/users',
    '/api/users/profile',
    '/api/bills',
    '/api/support',
    '/api/waitlist',
    '/api/business',
    '/api/business-reports',
    '/api/split',
    '/api/split/balances',
    '/api/split/balances/user/:otherUserId',
    '/api/split/balances/group/:groupId',
    '/api/split/contacts',
    '/api/split/groups',
    '/api/split/expenses',
    '/api/split/settlements',
    '/api/split/users',
    '/api/split/users/profile',
    '/api/split/users/contacts',
    

  ]});
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'BillsAI API server is running', 
    version: '1.0.0',
    availableRoutes: [
      '/api/auth',
      '/api/users',
      '/api/bills',
      '/api/support',
      '/api/waitlist',
      '/api/health',
      '/api/business',
      '/api/business/subscription',
      '/api/business-reports',
      '/api/business-reports/analytics',
      '/api/business/clients',
      '/api/split',
    ]
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/business/clients', businessClientRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/business/expenses', expenseRoutes);
app.use('/api/business/bills', businessBillRoutes);
app.use('/api/business/invoices', businessInvoiceRoutes);
app.use('/api/business/misc-transactions', businessMiscTransactionRoutes);
app.use('/api/business/subscription', businessSubscriptionRoutes);
app.use('/api/business/support', businessSupportRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/business-reports', businessDailyReportRoutes);
app.use('/api/split', splitRoutes);

// Debug route to test user profile route specifically
app.get('/api/test-profile', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Profile test endpoint working' });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// 404 handler - must come after all valid routes are defined
app.all('*', (req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot find ${req.originalUrl} on this server`,
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  // Log error details appropriately for the environment
  if (environment.isDevelopment) {
    logger.error('API Error:', { error: err, url: req.originalUrl, method: req.method });
  } else {
    // In production, log with less detail but still capture important info
    logger.error('API Error:', { 
      message: err.message, 
      url: req.originalUrl, 
      method: req.method,
      statusCode: err.statusCode || 500,
      // Include some context about the request but no sensitive data
      ip: req.ip,
      userId: req.user ? req.user.id : 'unauthenticated'
    });
  }

  // Default values
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  // Send response with appropriate error details based on environment
  res.status(statusCode).json({
    status,
    message: err.message || 'Something went wrong on the server',
    // Only include error stack in development
    ...(environment.isDevelopment ? { stack: err.stack } : {})
  });
});

// Start server and connect to MongoDB
const PORT = environment.server.port;

(async () => {
  try {
    // Start the server first - this ensures the API is available even if DB connection fails
    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${environment.server.env} mode on port ${PORT}`);
    });

    // Set up graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        mongoose.connection.close(false, () => {
          logger.info('MongoDB connection closed');
          process.exit(0);
        });
      });
    });
    
    // Log environment configuration
    logger.info('Environment check:', {
      nodeEnv: process.env.NODE_ENV,
      port: PORT,
      mongodbUriSet: !!process.env.MONGODB_URI,
    });

    // Connect to MongoDB
    const db = await connectDatabase();
    
    if (db) {
      logger.info('MongoDB connection successful - all features available');
    } else {
      logger.warn('MongoDB connection failed - running in LIMITED MODE');
      logger.warn('Database-dependent features will not function correctly');
    }
  } catch (error) {
    logger.error('Server initialization error:', {
      error: error.message,
      stack: error.stack,
    });
    
    // In development, terminate on critical errors
    // In production, attempt to continue operating with limited functionality
    if (!environment.isProduction) {
      logger.warn('Terminating server in development mode');
      process.exit(1);
    } else {
      logger.warn('Continuing in LIMITED MODE despite critical error');
    }
  }
})();

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { error: err.message, stack: err.stack });
  
  // In production mode, we'll keep the server running unless it's a critical error
  if (!environment.isProduction) {
    // Allow time for logs to be written before exiting in dev
    setTimeout(() => {
      logger.warn('Terminating due to uncaught exception in development mode');
      process.exit(1);
    }, 1000);
  } else {
    logger.warn('Uncaught exception in production mode. Attempting to continue operation.');
    // Don't exit in production to maintain uptime
  }
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', { 
    error: err ? err.message : 'Unknown rejection', 
    stack: err ? err.stack : 'No stack trace',
    time: new Date().toISOString(),
  });
  
  // In production, log but don't terminate to maintain uptime
  if (!environment.isProduction) {
    // Allow time for logs to be written before exiting in dev
    setTimeout(() => {
      logger.warn('Terminating due to unhandled promise rejection in development mode');
      process.exit(1);
    }, 1000);
  } else {
    logger.warn('Unhandled promise rejection in production mode. Attempting to continue operation.');
    // Don't exit in production to maintain uptime
  }
});
