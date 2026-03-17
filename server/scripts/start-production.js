/**
 * Production Server Startup Script
 *
 * This script loads the appropriate environment variables and
 * starts the server in production mode with proper error handling
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Set environment to production
process.env.NODE_ENV = 'production';

// Path to .env.production file
const envPath = path.join(__dirname, '..', '.env.production');

// Check if essential environment variables are already set
const hasRequiredEnvVars = process.env.MONGODB_URI && process.env.JWT_SECRET;

// Load from .env.production file only if it exists and we don't have required vars
if (!hasRequiredEnvVars) {
  if (fs.existsSync(envPath)) {
    //console.log(`📂 Loading environment variables from: ${envPath}`);
    require('dotenv').config({ path: envPath });
  } else {
    //console.log('⚠️ No .env.production file found. Using environment variables from AWS.');
    
    // Check if the essential variables are now set
    if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
      //console.error('❌ Essential environment variables (MONGODB_URI, JWT_SECRET) are missing.');
      //console.error('Please set these in your AWS Elastic Beanstalk configuration.');
      process.exit(1);
    }
  }
}

// Display startup info
//console.log('⚙️  Starting BillsAI server in production mode...');
//console.log(`📂 Using environment variables from: ${envPath}`);

// Start the server with PM2 if available, otherwise use node
const isUsingPM2 = process.env.PM2_HOME || false;

if (isUsingPM2) {
  //console.log('🚀 Starting with PM2 process manager...');
} else {
  //console.log('🚀 Starting with Node directly (Consider using PM2 for production)');
}

// Run the server
let server = spawn('node', ['../src/index.js'], {
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: 'inherit',
  cwd: __dirname
});

// Handle server errors
server.on('error', (err) => {
  //console.error('❌ Failed to start server:', err);
  process.exit(1);
});

// Handle server exit
server.on('exit', (code, signal) => {
  if (code !== 0) {
    //console.error(`❌ Server process exited with code ${code} and signal ${signal}`);
    // In production, we'll restart the server after a brief pause instead of exiting
    if (process.env.NODE_ENV === 'production') {
      //console.log('💡 Attempting to restart server in 2 seconds...');
      setTimeout(() => {
        const newServer = spawn('node', ['../src/index.js'], {
          env: { ...process.env, NODE_ENV: 'production' },
          stdio: 'inherit',
          cwd: __dirname
        });
        // Update the server reference
        server = newServer;
      }, 2000);
    } else {
      process.exit(code);
    }
  }
});

// Handle process termination signals
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => {
    //console.log(`\n🛑 Received ${signal}, gracefully shutting down...`);
    server.kill(signal);
    // Allow some time for cleanup
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });
});
