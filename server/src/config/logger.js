/**
 * Logging Configuration
 * Uses Winston for advanced logging capabilities
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const environment = require('./environment');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: environment.isProduction ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'billsai-api' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ level, message, timestamp, ...metadata }) => {
            let metaStr = '';
            if (Object.keys(metadata).length > 0 && metadata.service !== 'billsai-api') {
              metaStr = JSON.stringify(metadata);
            }
            return `${timestamp} ${level}: ${message} ${metaStr}`.trim();
          }
        )
      ),
    }),
  ],
});

// Add file transports in production
if (environment.isProduction) {
  logger.add(
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );
  
  logger.add(
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );
  
  // Add a separate file for critical errors that require immediate attention
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, 'critical.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 3,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format((info) => info.critical ? info : false)()
      ),
    })
  );
}

// Export a simplified logging interface
module.exports = {
  info: (message, meta = {}) => logger.info(message, meta),
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  // Critical errors that require immediate attention (alerts, notifications, etc.)
  critical: (message, meta = {}) => logger.error(message, { ...meta, critical: true }),
  // Allow access to the winston logger directly if needed
  winston: logger,
};
