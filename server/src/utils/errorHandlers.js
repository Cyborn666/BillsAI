/**
 * Error Handler Utilities
 */
const AppError = require('./appError');

/**
 * Handle API errors and return appropriate responses
 */
exports.handleApiError = (res, error) => {
  //console.error('API Error:', error);
  
  // Check if it's an instance of our AppError
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
    });
  }
  
  // Handle Mongoose validation errors
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(val => val.message);
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors,
    });
  }
  
  // Handle duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      status: 'error',
      message: `Duplicate value for ${field}. Please use another value.`,
    });
  }
  
  // For all other errors, return a generic error response
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong. Please try again later.',
  });
};
