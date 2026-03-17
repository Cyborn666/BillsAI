/**
 * Security Configuration
 * Centralizes security-related settings and middleware configurations
 */
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const environment = require('./environment');

// Helmet configuration for secure headers
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", ...(environment.isProduction ? ['https://api.billsai.org'] : ['http://localhost:5002'])],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'", 'data:'],
    },
  },
  // Force HTTPS in production
  hsts: environment.isProduction ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  } : false,
};

// Rate limiting configuration
const rateLimitConfig = {
  windowMs: environment.rateLimit.windowMs,
  max: environment.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
};

// CORS configuration
const corsConfig = {
  origin: environment.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With', 'X-Account-Type'],
  credentials: true,
  maxAge: 86400, // Cache preflight requests for 24 hours
};

// Export security configurations
module.exports = {
  helmet: helmetConfig,
  rateLimit: rateLimitConfig,
  cors: corsConfig,
  
  // Apply security middleware to Express app
  applySecurityMiddleware: (app) => {
    // Apply helmet middleware
    app.use(helmet(helmetConfig));
    
    // Create and apply rate limiter
    const apiLimiter = rateLimit(rateLimitConfig);
    app.use('/api', apiLimiter);
    
    // More strict rate limits for authentication routes
    const authLimiter = rateLimit({
      ...rateLimitConfig,
      windowMs: 60 * 60 * 1000, // 1 hour
      max: environment.isProduction ? 20 : 100, // 20 attempts per hour in production
      message: 'Too many login attempts, please try again after an hour',
    });
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/reset-password/:token', authLimiter); // Updated to match route with token parameter
    app.use('/api/auth/register', authLimiter);
    
    // Add additional production security measures
    if (environment.isProduction) {
      // Prevent clickjacking attacks
      app.use((req, res, next) => {
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Download-Options', 'noopen');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
      });
    }
    
    return app;
  },
};
