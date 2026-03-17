#!/bin/bash
# Script to prepare BillsAI server for AWS Elastic Beanstalk deployment
set -e

# Display banner
echo "===================================="
echo "BillsAI Server - AWS Deployment Prep"
echo "===================================="

# Create deployment directory
DEPLOY_DIR="./build-eb"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy necessary files (excluding those in .ebignore)
echo "📦 Copying application files..."
rsync -av --exclude-from='.ebignore' . $DEPLOY_DIR/

# Ensure production environment
echo "⚙️ Setting up production environment..."
cp .env.production $DEPLOY_DIR/.env.production

# Install production dependencies only
echo "📚 Installing production dependencies..."
cd $DEPLOY_DIR
npm install --production

# Clean up unnecessary files
echo "🧹 Cleaning up..."
rm -rf .git .gitignore

echo "✅ Deployment package created successfully at $DEPLOY_DIR"
echo "To deploy to AWS Elastic Beanstalk:"
echo "1. cd $DEPLOY_DIR"
echo "2. eb init (first time only)"
echo "3. eb create billsai-prod (first time) or eb deploy (for updates)"
