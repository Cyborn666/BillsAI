/**
 * Authentication Controller
 */
const User = require('../models/userModel');
const BusinessUser = require('../models/businessUserModel');
const SplitUser = require('../models/splitUserModel');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService');
const sessionManager = require('../utils/sessionManager');

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
exports.register = async (req, res, next) => {
  try {
    // Basic validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Extract data based on account type
    const { accountType } = req.body;

    // COMPLETELY SEPARATE CONTROLLER PATHS
    // ===================================
    if (accountType === 'business') {
      // ===== BUSINESS USER PATH =====
      const { password, businessData } = req.body;

      // Validation for business registration
      if (!businessData) {
        return res.status(400).json({ message: 'Business data is required for business accounts' });
      }

      // Business-specific validations
      const requiredFields = ['businessName', 'businessEmail', 'taxId', 'businessType', 'industry'];
      const missingFields = requiredFields.filter(field => !businessData[field]);
      if (missingFields.length > 0) {
        return res.status(400).json({
          message: `Missing required business fields: ${missingFields.join(', ')}`,
        });
      }

      // Check if business email already exists in BusinessUser collection ONLY
      const businessUserExists = await BusinessUser.findOne({ email: businessData.businessEmail });
      if (businessUserExists) {
        return res.status(400).json({ message: 'Business email already exists' });
      }

      // Create a pure BusinessUser record - no connection to User model
      const businessUser = new BusinessUser({
        // Core auth fields
        email: businessData.businessEmail,
        password,

        // Business-specific fields
        businessName: businessData.businessName,
        businessEmail: businessData.businessEmail,
        taxId: businessData.taxId,
        businessType: businessData.businessType,
        industry: businessData.industry,
        phone: businessData.phone || '',
        businessDescription: businessData.businessDescription || '',
        address: businessData.address || {},
      });

      await businessUser.save();

       // Generate verification token
       const verificationToken = businessUser.generateEmailVerificationToken();
       await businessUser.save();
 
       // Send verification email to business user
       const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
       const verificationRoute = process.env.VERIFICATION_ROUTE || '/verify-email';
 
       // Use query parameter instead of path parameter for better compatibility with static websites
       let baseUrl;
       if (frontendUrl.endsWith('/') && verificationRoute.startsWith('/')) {
         baseUrl = `${frontendUrl}${verificationRoute.substring(1)}`;
       } else if (!frontendUrl.endsWith('/') && !verificationRoute.startsWith('/')) {
         baseUrl = `${frontendUrl}/${verificationRoute}`;
       } else {
         baseUrl = `${frontendUrl}${verificationRoute}`;
       }
       const verificationUrl = `${baseUrl}?token=${verificationToken}&accountType=business`;
       
       // Create business verification email with styled content
       const message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
          <div style="text-align: center; padding-bottom: 20px;">
            <svg width="120" height="60" viewBox="0 0 120 120" style="margin-bottom: 15px;">
              <rect width="120" height="120" rx="10" fill="black"/>
              <path d="M27.84 61.56C27.84 61.0693 27.6587 60.6 27.296 60.152C26.9333 59.6827 26.2933 59.416 25.376 59.352C24.7787 60.0773 24.0533 60.44 23.2 60.44C22.4747 60.44 21.856 60.184 21.344 59.672C20.832 59.16 20.576 58.5307 20.576 57.784C20.576 57.0373 20.832 56.408 21.344 55.896C21.856 55.384 22.4747 55.128 23.2 55.128C23.584 55.128 23.9573 55.2347 24.32 55.448C24.704 55.6613 25.0453 55.9173 25.344 56.216C25.8133 56.1947 26.176 56.12 26.432 55.992C26.688 55.864 26.8693 55.7147 26.976 55.544C27.104 55.352 27.1787 55.1387 27.2 54.904C27.2213 54.6693 27.232 54.4347 27.232 54.2V50.968C27.232 50.4347 27.0613 49.944 26.72 49.496C26.4 49.048 25.8453 48.824 25.056 48.824H18.368L18.336 69.944C18.336 70.3707 18.1333 70.7013 17.728 70.936C17.344 71.1493 16.9173 71.256 16.448 71.256C15.1893 71.256 14.56 70.744 14.56 69.72V47.512C14.56 46.744 14.752 46.232 15.136 45.976C15.5413 45.72 16.0213 45.592 16.576 45.592H25.856C26.4107 45.592 26.9973 45.6987 27.616 45.912C28.256 46.1253 28.8533 46.4133 29.408 46.776H29.376C29.9307 47.1813 30.336 47.7147 30.592 48.376C30.8693 49.0373 31.008 49.8053 31.008 50.68V54.296C31.008 55.1493 30.8267 55.8533 30.464 56.408C30.1013 56.9413 29.7173 57.368 29.312 57.688C29.5893 57.8587 29.856 58.04 30.112 58.232C30.368 58.4027 30.5813 58.5947 30.752 58.808C31.0293 59.1067 31.2427 59.4587 31.392 59.864C31.5627 60.2693 31.648 60.7493 31.648 61.304V65.88C31.648 67.6293 30.9653 68.92 29.6 69.752C28.9173 70.1787 28.2667 70.4987 27.648 70.712C27.0507 70.9253 26.4533 71.032 25.856 71.032H21.12C20.7573 71.032 20.4693 70.8827 20.256 70.584C20.064 70.2853 19.968 69.8907 19.968 69.4C19.968 68.3333 20.416 67.8 21.312 67.8H25.696C26.4853 67.8 27.04 67.576 27.36 67.128C27.68 66.68 27.84 66.1787 27.84 65.624V61.56ZM39.763 69.656C39.763 70.68 39.1763 71.192 38.003 71.192C36.8083 71.192 36.211 70.68 36.211 69.656V53.144C36.211 52.12 36.8083 51.608 38.003 51.608C39.1763 51.608 39.763 52.12 39.763 53.144V69.656ZM40.435 47.576C40.435 48.2587 40.2003 48.8347 39.731 49.304C39.2617 49.7733 38.6857 50.008 38.003 50.008C37.3203 50.008 36.7337 49.7733 36.243 49.304C35.7737 48.8347 35.539 48.2587 35.539 47.576C35.539 46.872 35.7737 46.2853 36.243 45.816C36.7337 45.3467 37.3203 45.112 38.003 45.112C38.6857 45.112 39.2617 45.3467 39.731 45.816C40.2003 46.2853 40.435 46.872 40.435 47.576ZM47.8575 69.752C47.8575 70.7547 47.2708 71.256 46.0975 71.256C44.9028 71.256 44.3055 70.7547 44.3055 69.752V46.808C44.3055 45.8053 44.9028 45.304 46.0975 45.304C47.2708 45.304 47.8575 45.8053 47.8575 46.808V69.752ZM55.92 69.752C55.92 70.7547 55.3333 71.256 54.16 71.256C52.9653 71.256 52.368 70.7547 52.368 69.752V46.808C52.368 45.8053 52.9653 45.304 54.16 45.304C55.3333 45.304 55.92 45.8053 55.92 46.808V69.752ZM70.7345 59.8C71.2678 59.8 71.8332 59.928 72.4305 60.184C73.0492 60.4187 73.6252 60.7173 74.1585 61.08H74.1265C74.6812 61.4853 75.1078 62.008 75.4065 62.648C75.7052 63.288 75.8545 64.056 75.8545 64.952V65.912C75.8545 67.6613 75.2785 68.952 74.1265 69.784C73.5718 70.2107 73.0065 70.52 72.4305 70.712C71.8545 70.904 71.2892 71 70.7345 71H65.2945C64.7398 71 64.1745 70.904 63.5985 70.712C63.0225 70.52 62.4572 70.2107 61.9025 69.784C60.7505 68.9733 60.1745 67.6827 60.1745 65.912V65.528C60.1745 64.6107 60.7612 64.1627 61.9345 64.184C63.1292 64.184 63.7265 64.632 63.7265 65.528V65.88C63.7265 66.392 63.8865 66.872 64.2065 67.32C64.5265 67.768 65.0918 67.992 65.9025 67.992H70.1265C70.9372 67.992 71.5025 67.768 71.8225 67.32C72.1425 66.872 72.3025 66.392 72.3025 65.88V64.984C72.3025 64.7067 72.2598 64.44 72.1745 64.184C72.1105 63.928 71.9932 63.704 71.8225 63.512C71.6518 63.2987 71.4278 63.128 71.1505 63C70.8732 62.872 70.5318 62.808 70.1265 62.808H65.4545C64.3665 62.808 63.2252 62.424 62.0305 61.656C60.8998 60.9307 60.3345 59.6827 60.3345 57.912V56.824C60.3345 55.9707 60.4838 55.224 60.7825 54.584C61.0812 53.9227 61.5078 53.3893 62.0625 52.984H62.0305C62.5638 52.6213 63.1292 52.3227 63.7265 52.088C64.3238 51.8533 64.8998 51.736 65.4545 51.736H70.5745C71.1292 51.736 71.6945 51.8533 72.2705 52.088C72.8678 52.3227 73.4438 52.6213 73.9985 52.984H73.9665C74.5212 53.3893 74.9478 53.9227 75.2465 54.584C75.5452 55.224 75.6945 55.9707 75.6945 56.824V57.112C75.6945 57.56 75.5452 57.8907 75.2465 58.104C74.9478 58.296 74.5105 58.4027 73.9345 58.424C72.7612 58.4453 72.1745 58.008 72.1745 57.112V56.856C72.1745 56.3227 72.0038 55.8427 71.6625 55.416C71.3425 54.968 70.7878 54.744 69.9985 54.744H66.0305C65.2412 54.744 64.6758 54.968 64.3345 55.416C64.0145 55.8427 63.8545 56.3227 63.8545 56.856V57.624C63.8545 58.1787 64.0145 58.68 64.3345 59.128C64.6758 59.576 65.2412 59.8 66.0305 59.8H70.7345ZM88.726 48.728L81.718 70.232V70.2C81.59 70.52 81.4087 70.7867 81.174 71C80.9607 71.192 80.694 71.288 80.374 71.288C80.2033 71.288 80.0327 71.2667 79.862 71.224C79.7127 71.2027 79.5527 71.1707 79.382 71.128H79.414C78.198 70.744 77.75 70.0613 78.07 69.08L85.366 46.904C85.4727 46.5627 85.654 46.2747 85.91 46.04C86.1873 45.8053 86.5073 45.6667 86.87 45.624C87.2327 45.56 87.5847 45.5173 87.926 45.496C88.2673 45.4533 88.534 45.432 88.726 45.432C88.918 45.432 89.1847 45.4533 89.526 45.496C89.8673 45.5173 90.2193 45.5493 90.582 45.592C90.8807 45.6347 91.1687 45.7947 91.446 46.072C91.7447 46.3493 91.9687 46.6267 92.118 46.904C93.3127 50.5733 94.518 54.2747 95.734 58.008C96.9713 61.72 98.1873 65.4107 99.382 69.08C99.6807 70.0613 99.2327 70.744 98.038 71.128C97.8673 71.1707 97.7073 71.2027 97.558 71.224C97.43 71.2667 97.2807 71.288 97.11 71.288C96.8113 71.288 96.534 71.192 96.278 71C96.0433 70.7867 95.8727 70.52 95.766 70.2V70.232L88.726 48.728ZM91.126 63.32C91.126 64.0027 90.8807 64.5893 90.39 65.08C89.9207 65.5493 89.3447 65.784 88.662 65.784C87.9793 65.784 87.4033 65.5493 86.934 65.08C86.4647 64.5893 86.23 64.0027 86.23 63.32C86.23 62.6373 86.4647 62.0613 86.934 61.592C87.4033 61.1013 87.9793 60.856 88.662 60.856C89.3447 60.856 89.9207 61.1013 90.39 61.592C90.8807 62.0613 91.126 62.6373 91.126 63.32ZM106.184 69.656C106.184 70.68 105.544 71.192 104.264 71.192C103.005 71.192 102.376 70.68 102.376 69.656V46.968C102.376 45.944 103.005 45.432 104.264 45.432C105.544 45.432 106.184 45.944 106.184 46.968V69.656Z" fill="white"/>
            </svg>
            <h1 style="color: #2563EB; margin-bottom: 10px;">Welcome to BillsAI Business</h1>
            <h2 style="color: #4B5563; margin-top: 0;">Email Verification</h2>
          </div>
          
          <p style="color: #4B5563; font-size: 16px; line-height: 1.5;">Thank you for registering your business with BillsAI! We're excited to help your business manage finances more efficiently.</p>
          
          <p style="color: #4B5563; font-size: 16px; line-height: 1.5;">To complete your registration and access all business features, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" target="_blank" style="background-color: #2563EB; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-size: 16px;">Verify Business Account</a>
          </div>
          
          <p style="color: #4B5563; font-size: 14px;">This link will expire in 24 hours. If you did not create a business account with BillsAI, please ignore this email.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e4e4e4; color: #9CA3AF; font-size: 12px;">
            <p>© ${new Date().getFullYear()} BillsAI. All rights reserved.</p>
            <p>If you have any questions, please contact our business support team at business-support@billsai.org</p>
          </div>
        </div>
      `;

       // Setup email options
       const mailOptions = {
         to: businessUser.email,
         subject: 'BillsAI Business - Verify Your Email',
         html: message,
       };

       try {
         await sendEmail(mailOptions);
       } catch (error) {
         //console.error('Error sending verification email:', error);
       }
       

      // Return business user data
      return res.status(201).json({
        message: 'Business account registered successfully',
        user: {
          id: businessUser._id,
          email: businessUser.businessEmail,
          fullName: businessUser.businessName,
          role: 'business',
          accountType: 'business',
        },
      });
    }

    // ===== PERSONAL USER PATH =====
    else {
      // Extract personal user fields
      const { email, password, fullName, username } = req.body;

      // Personal user validations
      if (!email || !password || !fullName) {
        return res.status(400).json({ message: 'Email, password and full name are required for personal accounts' });
      }

      // Check if personal user email exists in User collection ONLY
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Check username if provided
      if (username) {
        const usernameExists = await User.findOne({ username });
        if (usernameExists) {
          return res.status(400).json({ message: 'Username already taken' });
        }
      }

      // Create a pure User record for personal accounts
      const user = new User({
        email,
        password,
        fullName,
        username,
        role: 'user', // Explicitly set role for personal accounts
      });

      // Generate verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();
      
      // Automatically create a split profile for this user
      try {
        const splitUser = await SplitUser.create({
          userId: user._id,
          displayName: user.fullName || user.username,
          email: user.email,
          phone: user.phone || '',
          avatar: user.avatarId || '',
        });
        
        console.log(`Split profile automatically created for new user ${user._id}:`, splitUser);
      } catch (splitError) {
        // Log the error but don't stop the registration process
        console.error(`Failed to create split profile for new user ${user._id}:`, splitError);
      }

      // Send verification email
      const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
      const verificationRoute = process.env.VERIFICATION_ROUTE || '/verify-email';

      // Format URL properly
      let baseUrl;
      if (frontendUrl.endsWith('/') && verificationRoute.startsWith('/')) {
        baseUrl = `${frontendUrl}${verificationRoute.substring(1)}`;
      } else if (!frontendUrl.endsWith('/') && !verificationRoute.startsWith('/')) {
        baseUrl = `${frontendUrl}/${verificationRoute}`;
      } else {
        baseUrl = `${frontendUrl}${verificationRoute}`;
      }
      const verificationUrl = `${baseUrl}?token=${verificationToken}&accountType=personal`;

      const message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
          <div style="text-align: center; padding-bottom: 20px;">
            <svg width="120" height="60" viewBox="0 0 120 120" style="margin-bottom: 15px;">
              <rect width="120" height="120" rx="10" fill="black"/>
              <path d="M27.84 61.56C27.84 61.0693 27.6587 60.6 27.296 60.152C26.9333 59.6827 26.2933 59.416 25.376 59.352C24.7787 60.0773 24.0533 60.44 23.2 60.44C22.4747 60.44 21.856 60.184 21.344 59.672C20.832 59.16 20.576 58.5307 20.576 57.784C20.576 57.0373 20.832 56.408 21.344 55.896C21.856 55.384 22.4747 55.128 23.2 55.128C23.584 55.128 23.9573 55.2347 24.32 55.448C24.704 55.6613 25.0453 55.9173 25.344 56.216C25.8133 56.1947 26.176 56.12 26.432 55.992C26.688 55.864 26.8693 55.7147 26.976 55.544C27.104 55.352 27.1787 55.1387 27.2 54.904C27.2213 54.6693 27.232 54.4347 27.232 54.2V50.968C27.232 50.4347 27.0613 49.944 26.72 49.496C26.4 49.048 25.8453 48.824 25.056 48.824H18.368L18.336 69.944C18.336 70.3707 18.1333 70.7013 17.728 70.936C17.344 71.1493 16.9173 71.256 16.448 71.256C15.1893 71.256 14.56 70.744 14.56 69.72V47.512C14.56 46.744 14.752 46.232 15.136 45.976C15.5413 45.72 16.0213 45.592 16.576 45.592H25.856C26.4107 45.592 26.9973 45.6987 27.616 45.912C28.256 46.1253 28.8533 46.4133 29.408 46.776H29.376C29.9307 47.1813 30.336 47.7147 30.592 48.376C30.8693 49.0373 31.008 49.8053 31.008 50.68V54.296C31.008 55.1493 30.8267 55.8533 30.464 56.408C30.1013 56.9413 29.7173 57.368 29.312 57.688C29.5893 57.8587 29.856 58.04 30.112 58.232C30.368 58.4027 30.5813 58.5947 30.752 58.808C31.0293 59.1067 31.2427 59.4587 31.392 59.864C31.5627 60.2693 31.648 60.7493 31.648 61.304V65.88C31.648 67.6293 30.9653 68.92 29.6 69.752C28.9173 70.1787 28.2667 70.4987 27.648 70.712C27.0507 70.9253 26.4533 71.032 25.856 71.032H21.12C20.7573 71.032 20.4693 70.8827 20.256 70.584C20.064 70.2853 19.968 69.8907 19.968 69.4C19.968 68.3333 20.416 67.8 21.312 67.8H25.696C26.4853 67.8 27.04 67.576 27.36 67.128C27.68 66.68 27.84 66.1787 27.84 65.624V61.56ZM39.763 69.656C39.763 70.68 39.1763 71.192 38.003 71.192C36.8083 71.192 36.211 70.68 36.211 69.656V53.144C36.211 52.12 36.8083 51.608 38.003 51.608C39.1763 51.608 39.763 52.12 39.763 53.144V69.656ZM40.435 47.576C40.435 48.2587 40.2003 48.8347 39.731 49.304C39.2617 49.7733 38.6857 50.008 38.003 50.008C37.3203 50.008 36.7337 49.7733 36.243 49.304C35.7737 48.8347 35.539 48.2587 35.539 47.576C35.539 46.872 35.7737 46.2853 36.243 45.816C36.7337 45.3467 37.3203 45.112 38.003 45.112C38.6857 45.112 39.2617 45.3467 39.731 45.816C40.2003 46.2853 40.435 46.872 40.435 47.576ZM47.8575 69.752C47.8575 70.7547 47.2708 71.256 46.0975 71.256C44.9028 71.256 44.3055 70.7547 44.3055 69.752V46.808C44.3055 45.8053 44.9028 45.304 46.0975 45.304C47.2708 45.304 47.8575 45.8053 47.8575 46.808V69.752ZM55.92 69.752C55.92 70.7547 55.3333 71.256 54.16 71.256C52.9653 71.256 52.368 70.7547 52.368 69.752V46.808C52.368 45.8053 52.9653 45.304 54.16 45.304C55.3333 45.304 55.92 45.8053 55.92 46.808V69.752ZM70.7345 59.8C71.2678 59.8 71.8332 59.928 72.4305 60.184C73.0492 60.4187 73.6252 60.7173 74.1585 61.08H74.1265C74.6812 61.4853 75.1078 62.008 75.4065 62.648C75.7052 63.288 75.8545 64.056 75.8545 64.952V65.912C75.8545 67.6613 75.2785 68.952 74.1265 69.784C73.5718 70.2107 73.0065 70.52 72.4305 70.712C71.8545 70.904 71.2892 71 70.7345 71H65.2945C64.7398 71 64.1745 70.904 63.5985 70.712C63.0225 70.52 62.4572 70.2107 61.9025 69.784C60.7505 68.9733 60.1745 67.6827 60.1745 65.912V65.528C60.1745 64.6107 60.7612 64.1627 61.9345 64.184C63.1292 64.184 63.7265 64.632 63.7265 65.528V65.88C63.7265 66.392 63.8865 66.872 64.2065 67.32C64.5265 67.768 65.0918 67.992 65.9025 67.992H70.1265C70.9372 67.992 71.5025 67.768 71.8225 67.32C72.1425 66.872 72.3025 66.392 72.3025 65.88V64.984C72.3025 64.7067 72.2598 64.44 72.1745 64.184C72.1105 63.928 71.9932 63.704 71.8225 63.512C71.6518 63.2987 71.4278 63.128 71.1505 63C70.8732 62.872 70.5318 62.808 70.1265 62.808H65.4545C64.3665 62.808 63.2252 62.424 62.0305 61.656C60.8998 60.9307 60.3345 59.6827 60.3345 57.912V56.824C60.3345 55.9707 60.4838 55.224 60.7825 54.584C61.0812 53.9227 61.5078 53.3893 62.0625 52.984H62.0305C62.5638 52.6213 63.1292 52.3227 63.7265 52.088C64.3238 51.8533 64.8998 51.736 65.4545 51.736H70.5745C71.1292 51.736 71.6945 51.8533 72.2705 52.088C72.8678 52.3227 73.4438 52.6213 73.9985 52.984H73.9665C74.5212 53.3893 74.9478 53.9227 75.2465 54.584C75.5452 55.224 75.6945 55.9707 75.6945 56.824V57.112C75.6945 57.56 75.5452 57.8907 75.2465 58.104C74.9478 58.296 74.5105 58.4027 73.9345 58.424C72.7612 58.4453 72.1745 58.008 72.1745 57.112V56.856C72.1745 56.3227 72.0038 55.8427 71.6625 55.416C71.3425 54.968 70.7878 54.744 69.9985 54.744H66.0305C65.2412 54.744 64.6758 54.968 64.3345 55.416C64.0145 55.8427 63.8545 56.3227 63.8545 56.856V57.624C63.8545 58.1787 64.0145 58.68 64.3345 59.128C64.6758 59.576 65.2412 59.8 66.0305 59.8H70.7345ZM88.726 48.728L81.718 70.232V70.2C81.59 70.52 81.4087 70.7867 81.174 71C80.9607 71.192 80.694 71.288 80.374 71.288C80.2033 71.288 80.0327 71.2667 79.862 71.224C79.7127 71.2027 79.5527 71.1707 79.382 71.128H79.414C78.198 70.744 77.75 70.0613 78.07 69.08L85.366 46.904C85.4727 46.5627 85.654 46.2747 85.91 46.04C86.1873 45.8053 86.5073 45.6667 86.87 45.624C87.2327 45.56 87.5847 45.5173 87.926 45.496C88.2673 45.4533 88.534 45.432 88.726 45.432C88.918 45.432 89.1847 45.4533 89.526 45.496C89.8673 45.5173 90.2193 45.5493 90.582 45.592C90.8807 45.6347 91.1687 45.7947 91.446 46.072C91.7447 46.3493 91.9687 46.6267 92.118 46.904C93.3127 50.5733 94.518 54.2747 95.734 58.008C96.9713 61.72 98.1873 65.4107 99.382 69.08C99.6807 70.0613 99.2327 70.744 98.038 71.128C97.8673 71.1707 97.7073 71.2027 97.558 71.224C97.43 71.2667 97.2807 71.288 97.11 71.288C96.8113 71.288 96.534 71.192 96.278 71C96.0433 70.7867 95.8727 70.52 95.766 70.2V70.232L88.726 48.728ZM91.126 63.32C91.126 64.0027 90.8807 64.5893 90.39 65.08C89.9207 65.5493 89.3447 65.784 88.662 65.784C87.9793 65.784 87.4033 65.5493 86.934 65.08C86.4647 64.5893 86.23 64.0027 86.23 63.32C86.23 62.6373 86.4647 62.0613 86.934 61.592C87.4033 61.1013 87.9793 60.856 88.662 60.856C89.3447 60.856 89.9207 61.1013 90.39 61.592C90.8807 62.0613 91.126 62.6373 91.126 63.32ZM106.184 69.656C106.184 70.68 105.544 71.192 104.264 71.192C103.005 71.192 102.376 70.68 102.376 69.656V46.968C102.376 45.944 103.005 45.432 104.264 45.432C105.544 45.432 106.184 45.944 106.184 46.968V69.656Z" fill="white"/>
            </svg>
            <h1 style="color: #2563EB; margin-bottom: 10px;">Welcome to BillsAI</h1>
            <h2 style="color: #4B5563; margin-top: 0;">Email Verification</h2>
          </div>
          
          <p style="color: #4B5563; font-size: 16px; line-height: 1.5;">Thank you for registering with BillsAI! We're excited to help you manage your bills more efficiently.</p>
          
          <p style="color: #4B5563; font-size: 16px; line-height: 1.5;">To complete your registration and access all features, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" target="_blank" style="background-color: #2563EB; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-size: 16px;">Verify My Email</a>
          </div>
          
          <p style="color: #4B5563; font-size: 14px;">This link will expire in 24 hours. If you did not create an account with BillsAI, please ignore this email.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e4e4e4; color: #9CA3AF; font-size: 12px;">
            <p>© ${new Date().getFullYear()} BillsAI. All rights reserved.</p>
            <p>If you have any questions, please contact our support team at support@billsai.org</p>
          </div>
        </div>
      `;

      const mailOptions = {
        to: user.email,
        subject: 'BillsAI - Verify Your Email',
        html: message,
      };

      try {
        await sendEmail(mailOptions);
      } catch (error) {
        //console.error('Error sending verification email:', error);
      }

      // Return personal user data
      return res.status(201).json({
        message: 'User registered successfully. Please check your email to verify your account.',
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          username: user.username,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          accountType: 'personal',
        },
      });
    }
  } catch (error) {
     //console.error('Registration failed:', error);
     return res.status(500).json({ message: 'Server error during registration', error: error.message });

  }
};

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
exports.login = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, username, accountType } = req.body;
    
    // Require accountType for security - prevent user type mixups
    if (!accountType) {
      return res.status(400).json({
        message: 'Account type is required (business or personal)',
      });
    }
    
    // Validate accountType
    if (accountType !== 'business' && accountType !== 'personal') {
      return res.status(400).json({
        message: 'Invalid account type. Must be "business" or "personal"',
      });
    }
    
    //console.log('Login credentials:', req.body);
    
    // Check if user exists - can login with either email or username
    let user;
    let isBusinessUser = accountType === 'business';

    if (email) {
      // Check ONLY the appropriate model based on account type
      if (isBusinessUser) {
        user = await BusinessUser.findOne({ email }).select('+password');
      } else {
        user = await User.findOne({ email }).select('+password');
      }
    } else if (username && !isBusinessUser) {
      // Username login only for personal accounts
      user = await User.findOne({ username }).select('+password');
    } else {
      return res.status(400).json({
        message: 'Email or username is required',
      });
    }

    if (!user) {
      return res.status(401).json({
        message: 'Account not found. The account may have been deleted or the email address is incorrect.',
        errorType: 'account_not_found',
      });
    }

    // Check password match
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid credentials',
        errorType: 'invalid_credentials',
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      // Generate a new verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      return res.status(401).json({
        message: 'Email not verified. Please check your email for a verification link.',
        errorType: 'email_not_verified',
        verificationRequired: true,
      });
    }
    
    // Create a new session with session limiting
    const sessionInfo = await sessionManager.createSession(user, req);
    
    // Generate token with session ID included
    const token = user.generateAuthToken();
    
    // Add session data for frontend
    const activeSessions = sessionManager.getActiveSessions(user);
    const currentDevice = {
      sessionId: sessionInfo.sessionId,
      device: sessionInfo.device,
      browser: sessionInfo.browser,
      os: sessionInfo.os,
      isCurrentDevice: true
    };
    
    // Determine userData to return based on account type
    let userData = {};
    if (isBusinessUser) {
      userData = {
        id: user._id,
        email: user.email,
        businessName: user.businessName,
        businessEmail: user.businessEmail,
        accountType: 'business',
        isEmailVerified: user.isEmailVerified,
        role: user.role || 'business',
        profileCompleted: user.profileCompleted || false,
        currentSession: currentDevice,
        activeSessions: activeSessions,
        maxSessions: user.maxSessions || 5
      };
    } else {
      userData = {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        username: user.username,
        accountType: 'personal',
        isEmailVerified: user.isEmailVerified,
        role: user.role || 'user',
        currentSession: currentDevice,
        activeSessions: activeSessions,
        maxSessions: user.maxSessions || 3
      };
    } 
    
    // Check if we reached the max sessions limit and had to remove older sessions
    const sessionCountWarning = user.activeSessions.length >= (user.maxSessions - 1) ? 
      `You have reached ${user.activeSessions.length} out of ${user.maxSessions} allowed active sessions.` : null;
    
    return res.status(200).json({
      token,
      user: userData,
      sessionId: sessionInfo.sessionId,  // Include sessionId for verification
      sessionCountWarning
    });
  } catch (error) {
    //console.error('Login failed:', error);
    next(error);
  }
};

/**
 * Logout user (single device)
 * @route POST /api/auth/logout
 * @access Private
 */
exports.logout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const sessionId = req.body.sessionId;
    const accountType = req.body.accountType || req.user.accountType;
    
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }
    
    let user = null;
    if (accountType === 'business') {
      user = await BusinessUser.findById(userId);
    } else {
      user = await User.findById(userId);
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const success = await sessionManager.removeSession(user, sessionId);
    
    if (success) {
      return res.status(200).json({ message: 'Logout successful' });
    } else {
      return res.status(400).json({ message: 'Session not found or already expired' });
    }
  } catch (error) {
    //console.error('Logout failed:', error);
    next(error);
  }
};

/**
 * Logout from all devices
 * @route POST /api/auth/logout-all
 * @access Private
 */
exports.logoutAll = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const keepCurrentSession = req.body.keepCurrentSession === true;
    const currentSessionId = req.body.sessionId;
    const accountType = req.body.accountType || req.user.accountType;
    
    let user = null;
    if (accountType === 'business') {
      user = await BusinessUser.findById(userId);
    } else {
      user = await User.findById(userId);
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const removedCount = await sessionManager.removeAllSessions(
      user, 
      keepCurrentSession ? currentSessionId : null
    );
    
    return res.status(200).json({
      message: `Successfully logged out from ${removedCount} devices`,
      remainingSessionCount: user.activeSessions.length
    });
  } catch (error) {
    //console.error('Logout all failed:', error);
    next(error);
  }
};

/**
 * Get active sessions
 * @route GET /api/auth/sessions
 * @access Private
 */
exports.getSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const accountType = req.user.accountType;
    
    let user = null;
    if (accountType === 'business') {
      user = await BusinessUser.findById(userId);
    } else {
      user = await User.findById(userId);
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const sessions = sessionManager.getActiveSessions(user);
    const currentSessionId = req.user.sessionId;
    
    // Mark current session
    const mappedSessions = sessions.map(session => ({
      ...session,
      isCurrentDevice: session.id === currentSessionId
    }));
    
    return res.status(200).json({
      sessions: mappedSessions,
      maxSessions: user.maxSessions,
      currentSessionId
    });
  } catch (error) {
    //console.error('Get sessions failed:', error);
    next(error);
  }
};

/**
 * Get current user
 * @route GET /api/auth/me
 * @access Private
 */
exports.getCurrentUser = async (req, res, next) => {
  try {
    // Check if the user is a business user or regular user based on accountType from token
    let user;
    let userData = {};

    if (req.user.accountType === 'business') {
      // Business user
      user = await BusinessUser.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ message: 'Business user not found' });
      }

      // Get sessions data
      const activeSessions = sessionManager.getActiveSessions(user);

      userData = {
        id: user._id,
        email: user.email || '',
        fullName: user.businessName || '',
        businessName: user.businessName || '',
        businessEmail: user.businessEmail || '',
        role: 'business',
        accountType: 'business',
        isEmailVerified: user.isEmailVerified || false,
        profileCompleted: user.profileCompleted || false,
        activeSessions: activeSessions,
        maxSessions: user.maxSessions || 5
      };
    } else {
      // Regular user
      user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get sessions data
      const activeSessions = sessionManager.getActiveSessions(user);

      userData = {
        id: user._id,
        email: user.email || '',
        fullName: user.fullName || '',
        username: user.username || '',
        role: user.role || 'user',
        accountType: 'personal',
        isEmailVerified: user.isEmailVerified || false,
        activeSessions: activeSessions,
        maxSessions: user.maxSessions || 3
      };
    }

    res.status(200).json({
      user: userData,
    });
  } catch (error) {
    next(error);
    //console.error('Get current user failed:', error);
  }
};

/**
 * Verify email with token
 * @route GET /api/auth/verify-email/:token
 * @access Public
 */
exports.verifyEmail = async (req, res, next) => {
  try {
    // Get token from either path parameter or query parameter
    const token = req.params.token || req.query.token;
    

    const accountType = req.query.accountType;

    if (!token) {
      return res.status(400).json({
        message: 'Verification token is required',
      });
    }
    
    // Require accountType for security - prevent user type mixups
    if (!accountType) {
      return res.status(400).json({
        message: 'Account type is required (business or personal)',
      });
    }
    
    // Validate accountType
    if (accountType !== 'business' && accountType !== 'personal') {
      return res.status(400).json({
        message: 'Invalid account type. Must be "business" or "personal"',
      });
    }

    // Hash the token from the URL
    const emailVerificationToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with the token in ONLY the appropriate model
    let user = null;
    
    if (accountType === 'business') {
      // Check only BusinessUser model
      user = await BusinessUser.findOne({
        emailVerificationToken,
        emailVerificationExpire: { $gt: Date.now() },
      });
    } else {
      // Check only User model
      user = await User.findOne({
        emailVerificationToken,
        emailVerificationExpire: { $gt: Date.now() },
      });
    }

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired verification token',
      });
    }

    // Set user as verified and remove verification token fields
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    res.status(200).json({
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend verification email
 * @route POST /api/auth/resend-verification
 * @access Public
 */
exports.resendVerificationEmail = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, accountType } = req.body;

     // Require accountType for security - prevent user type mixups
     if (!accountType) {
      return res.status(400).json({
        message: 'Account type is required (business or personal)',
      });
    }

    
     // Validate accountType
     if (accountType !== 'business' && accountType !== 'personal') {
      return res.status(400).json({
        message: 'Invalid account type. Must be "business" or "personal"',
      });
    }
    

    // Find user by email in ONLY the appropriate model based on account type
    let user = null;
    
    if (accountType === 'business') {
      // Look ONLY in business users
      user = await BusinessUser.findOne({ email });
    } else {
      // Look ONLY in regular users
      user = await User.findOne({ email });
    }

    if (!user) {
      // For security reasons, don't reveal that the user doesn't exist
      return res.status(200).json({
        message: 'If your email exists in our system, a verification link will be sent.',
      });
    }

    // If user is already verified, no need to resend
    if (user.isEmailVerified) {
      return res.status(400).json({
        message: 'Email is already verified. Please login.',
      });
    }

    // Generate new verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    const verificationRoute = process.env.VERIFICATION_ROUTE || '/verify-email';

    // Use query parameter instead of path parameter for better compatibility with static websites
    let baseUrl;
    if (frontendUrl.endsWith('/') && verificationRoute.startsWith('/')) {
      baseUrl = `${frontendUrl}${verificationRoute.substring(1)}`;
    } else if (!frontendUrl.endsWith('/') && !verificationRoute.startsWith('/')) {
      baseUrl = `${frontendUrl}/${verificationRoute}`;
    } else {
      baseUrl = `${frontendUrl}${verificationRoute}`;
    }
    const verificationUrl = `${baseUrl}?token=${verificationToken}`;

    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
        <div style="text-align: center; padding-bottom: 20px;">
          <svg width="120" height="60" viewBox="0 0 120 120" style="margin-bottom: 15px;">
            <rect width="120" height="120" rx="10" fill="black"/>
            <path d="M27.84 61.56C27.84 61.0693 27.6587 60.6 27.296 60.152C26.9333 59.6827 26.2933 59.416 25.376 59.352C24.7787 60.0773 24.0533 60.44 23.2 60.44C22.4747 60.44 21.856 60.184 21.344 59.672C20.832 59.16 20.576 58.5307 20.576 57.784C20.576 57.0373 20.832 56.408 21.344 55.896C21.856 55.384 22.4747 55.128 23.2 55.128C23.584 55.128 23.9573 55.2347 24.32 55.448C24.704 55.6613 25.0453 55.9173 25.344 56.216C25.8133 56.1947 26.176 56.12 26.432 55.992C26.688 55.864 26.8693 55.7147 26.976 55.544C27.104 55.352 27.1787 55.1387 27.2 54.904C27.2213 54.6693 27.232 54.4347 27.232 54.2V50.968C27.232 50.4347 27.0613 49.944 26.72 49.496C26.4 49.048 25.8453 48.824 25.056 48.824H18.368L18.336 69.944C18.336 70.3707 18.1333 70.7013 17.728 70.936C17.344 71.1493 16.9173 71.256 16.448 71.256C15.1893 71.256 14.56 70.744 14.56 69.72V47.512C14.56 46.744 14.752 46.232 15.136 45.976C15.5413 45.72 16.0213 45.592 16.576 45.592H25.856C26.4107 45.592 26.9973 45.6987 27.616 45.912C28.256 46.1253 28.8533 46.4133 29.408 46.776H29.376C29.9307 47.1813 30.336 47.7147 30.592 48.376C30.8693 49.0373 31.008 49.8053 31.008 50.68V54.296C31.008 55.1493 30.8267 55.8533 30.464 56.408C30.1013 56.9413 29.7173 57.368 29.312 57.688C29.5893 57.8587 29.856 58.04 30.112 58.232C30.368 58.4027 30.5813 58.5947 30.752 58.808C31.0293 59.1067 31.2427 59.4587 31.392 59.864C31.5627 60.2693 31.648 60.7493 31.648 61.304V65.88C31.648 67.6293 30.9653 68.92 29.6 69.752C28.9173 70.1787 28.2667 70.4987 27.648 70.712C27.0507 70.9253 26.4533 71.032 25.856 71.032H21.12C20.7573 71.032 20.4693 70.8827 20.256 70.584C20.064 70.2853 19.968 69.8907 19.968 69.4C19.968 68.3333 20.416 67.8 21.312 67.8H25.696C26.4853 67.8 27.04 67.576 27.36 67.128C27.68 66.68 27.84 66.1787 27.84 65.624V61.56ZM39.763 69.656C39.763 70.68 39.1763 71.192 38.003 71.192C36.8083 71.192 36.211 70.68 36.211 69.656V53.144C36.211 52.12 36.8083 51.608 38.003 51.608C39.1763 51.608 39.763 52.12 39.763 53.144V69.656ZM40.435 47.576C40.435 48.2587 40.2003 48.8347 39.731 49.304C39.2617 49.7733 38.6857 50.008 38.003 50.008C37.3203 50.008 36.7337 49.7733 36.243 49.304C35.7737 48.8347 35.539 48.2587 35.539 47.576C35.539 46.872 35.7737 46.2853 36.243 45.816C36.7337 45.3467 37.3203 45.112 38.003 45.112C38.6857 45.112 39.2617 45.3467 39.731 45.816C40.2003 46.2853 40.435 46.872 40.435 47.576ZM47.8575 69.752C47.8575 70.7547 47.2708 71.256 46.0975 71.256C44.9028 71.256 44.3055 70.7547 44.3055 69.752V46.808C44.3055 45.8053 44.9028 45.304 46.0975 45.304C47.2708 45.304 47.8575 45.8053 47.8575 46.808V69.752ZM55.92 69.752C55.92 70.7547 55.3333 71.256 54.16 71.256C52.9653 71.256 52.368 70.7547 52.368 69.752V46.808C52.368 45.8053 52.9653 45.304 54.16 45.304C55.3333 45.304 55.92 45.8053 55.92 46.808V69.752ZM70.7345 59.8C71.2678 59.8 71.8332 59.928 72.4305 60.184C73.0492 60.4187 73.6252 60.7173 74.1585 61.08H74.1265C74.6812 61.4853 75.1078 62.008 75.4065 62.648C75.7052 63.288 75.8545 64.056 75.8545 64.952V65.912C75.8545 67.6613 75.2785 68.952 74.1265 69.784C73.5718 70.2107 73.0065 70.52 72.4305 70.712C71.8545 70.904 71.2892 71 70.7345 71H65.2945C64.7398 71 64.1745 70.904 63.5985 70.712C63.0225 70.52 62.4572 70.2107 61.9025 69.784C60.7505 68.9733 60.1745 67.6827 60.1745 65.912V65.528C60.1745 64.6107 60.7612 64.1627 61.9345 64.184C63.1292 64.184 63.7265 64.632 63.7265 65.528V65.88C63.7265 66.392 63.8865 66.872 64.2065 67.32C64.5265 67.768 65.0918 67.992 65.9025 67.992H70.1265C70.9372 67.992 71.5025 67.768 71.8225 67.32C72.1425 66.872 72.3025 66.392 72.3025 65.88V64.984C72.3025 64.7067 72.2598 64.44 72.1745 64.184C72.1105 63.928 71.9932 63.704 71.8225 63.512C71.6518 63.2987 71.4278 63.128 71.1505 63C70.8732 62.872 70.5318 62.808 70.1265 62.808H65.4545C64.3665 62.808 63.2252 62.424 62.0305 61.656C60.8998 60.9307 60.3345 59.6827 60.3345 57.912V56.824C60.3345 55.9707 60.4838 55.224 60.7825 54.584C61.0812 53.9227 61.5078 53.3893 62.0625 52.984H62.0305C62.5638 52.6213 63.1292 52.3227 63.7265 52.088C64.3238 51.8533 64.8998 51.736 65.4545 51.736H70.5745C71.1292 51.736 71.6945 51.8533 72.2705 52.088C72.8678 52.3227 73.4438 52.6213 73.9985 52.984H73.9665C74.5212 53.3893 74.9478 53.9227 75.2465 54.584C75.5452 55.224 75.6945 55.9707 75.6945 56.824V57.112C75.6945 57.56 75.5452 57.8907 75.2465 58.104C74.9478 58.296 74.5105 58.4027 73.9345 58.424C72.7612 58.4453 72.1745 58.008 72.1745 57.112V56.856C72.1745 56.3227 72.0038 55.8427 71.6625 55.416C71.3425 54.968 70.7878 54.744 69.9985 54.744H66.0305C65.2412 54.744 64.6758 54.968 64.3345 55.416C64.0145 55.8427 63.8545 56.3227 63.8545 56.856V57.624C63.8545 58.1787 64.0145 58.68 64.3345 59.128C64.6758 59.576 65.2412 59.8 66.0305 59.8H70.7345ZM88.726 48.728L81.718 70.232V70.2C81.59 70.52 81.4087 70.7867 81.174 71C80.9607 71.192 80.694 71.288 80.374 71.288C80.2033 71.288 80.0327 71.2667 79.862 71.224C79.7127 71.2027 79.5527 71.1707 79.382 71.128H79.414C78.198 70.744 77.75 70.0613 78.07 69.08L85.366 46.904C85.4727 46.5627 85.654 46.2747 85.91 46.04C86.1873 45.8053 86.5073 45.6667 86.87 45.624C87.2327 45.56 87.5847 45.5173 87.926 45.496C88.2673 45.4533 88.534 45.432 88.726 45.432C88.918 45.432 89.1847 45.4533 89.526 45.496C89.8673 45.5173 90.2193 45.5493 90.582 45.592C90.8807 45.6347 91.1687 45.7947 91.446 46.072C91.7447 46.3493 91.9687 46.6267 92.118 46.904C93.3127 50.5733 94.518 54.2747 95.734 58.008C96.9713 61.72 98.1873 65.4107 99.382 69.08C99.6807 70.0613 99.2327 70.744 98.038 71.128C97.8673 71.1707 97.7073 71.2027 97.558 71.224C97.43 71.2667 97.2807 71.288 97.11 71.288C96.8113 71.288 96.534 71.192 96.278 71C96.0433 70.7867 95.8727 70.52 95.766 70.2V70.232L88.726 48.728ZM91.126 63.32C91.126 64.0027 90.8807 64.5893 90.39 65.08C89.9207 65.5493 89.3447 65.784 88.662 65.784C87.9793 65.784 87.4033 65.5493 86.934 65.08C86.4647 64.5893 86.23 64.0027 86.23 63.32C86.23 62.6373 86.4647 62.0613 86.934 61.592C87.4033 61.1013 87.9793 60.856 88.662 60.856C89.3447 60.856 89.9207 61.1013 90.39 61.592C90.8807 62.0613 91.126 62.6373 91.126 63.32ZM106.184 69.656C106.184 70.68 105.544 71.192 104.264 71.192C103.005 71.192 102.376 70.68 102.376 69.656V46.968C102.376 45.944 103.005 45.432 104.264 45.432C105.544 45.432 106.184 45.944 106.184 46.968V69.656Z" fill="white"/>
          </svg>
          <h1 style="color: #2563EB; margin-bottom: 10px;">BillsAI Account Verification</h1>
          <h2 style="color: #4B5563; margin-top: 0;">Email Verification Request</h2>
        </div>
        
        <p style="color: #4B5563; font-size: 16px; line-height: 1.5;">You recently requested a new verification link for your BillsAI account.</p>
        
        <p style="color: #4B5563; font-size: 16px; line-height: 1.5;">To verify your email address and activate your account, please click the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" target="_blank" style="background-color: #2563EB; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-size: 16px;">Verify My Email</a>
        </div>
        
        <p style="color: #4B5563; font-size: 14px;">This link will expire in 24 hours. If you did not request this verification link, please ignore this email.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e4e4e4; color: #9CA3AF; font-size: 12px;">
          <p>© ${new Date().getFullYear()} BillsAI. All rights reserved.</p>
          <p>If you have any questions, please contact our support team at support@billsai.org</p>
        </div>
      </div>
    `;

    const mailOptions = {
      to: user.email,
      subject: 'BillsAI - Verify Your Email',
      html: message,
    };

    try {
      await sendEmail(mailOptions);
    } catch (error) {
      //console.error('Error sending verification email:', error);
      // Continue even if email fails
    }

    res.status(200).json({
      message: 'If your email exists in our system, a verification link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot password
 * @route POST /api/auth/forgot-password
 * @access Public
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email, accountType } = req.body;

    // Require accountType for security - prevent user type mixups
    if (!accountType) {
      return res.status(400).json({
        message: 'Account type is required (business or personal)',
      });
    }
    
    // Validate accountType
    if (accountType !== 'business' && accountType !== 'personal') {
      return res.status(400).json({
        message: 'Invalid account type. Must be "business" or "personal"',
      });
    }
    
    // Check ONLY the appropriate model based on account type
    let user = null;
    let isBusinessUser = accountType === 'business';

    if (isBusinessUser) {
      // Check only BusinessUser model for business accounts
      user = await BusinessUser.findOne({ email });
    } else {
      // Check only User model for personal accounts
      user = await User.findOne({ email });
    }

    if (!user) {
      // For security reasons, don't reveal if user exists or not
      return res.status(200).json({
        message: 'If your email exists in our system, a password reset link will be sent.',
      });
    }

    // Get reset token - this method is available on both User and BusinessUser models
    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Set account type in the reset URL for password recovery flow
    const userType = isBusinessUser ? 'business' : 'personal';

    // Create reset URL with account type
    const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    const resetPasswordRoute = process.env.RESET_PASSWORD_ROUTE || '/reset-password';

    // Use query parameter instead of path parameter for better compatibility with static websites
    let baseUrl;
    if (frontendUrl.endsWith('/') && resetPasswordRoute.startsWith('/')) {
      baseUrl = `${frontendUrl}${resetPasswordRoute.substring(1)}`;
    } else if (!frontendUrl.endsWith('/') && !resetPasswordRoute.startsWith('/')) {
      baseUrl = `${frontendUrl}/${resetPasswordRoute}`;
    } else {
      baseUrl = `${frontendUrl}${resetPasswordRoute}`;
    }
    const resetUrl = `${baseUrl}?token=${resetToken}&accountType=${userType}`;

    // Create email message with professional styling
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
        <div style="text-align: center; padding-bottom: 20px;">
          <svg width="120" height="60" viewBox="0 0 120 120" style="margin-bottom: 15px;">
            <rect width="120" height="120" rx="10" fill="black"/>
            <path d="M27.84 61.56C27.84 61.0693 27.6587 60.6 27.296 60.152C26.9333 59.6827 26.2933 59.416 25.376 59.352C24.7787 60.0773 24.0533 60.44 23.2 60.44C22.4747 60.44 21.856 60.184 21.344 59.672C20.832 59.16 20.576 58.5307 20.576 57.784C20.576 57.0373 20.832 56.408 21.344 55.896C21.856 55.384 22.4747 55.128 23.2 55.128C23.584 55.128 23.9573 55.2347 24.32 55.448C24.704 55.6613 25.0453 55.9173 25.344 56.216C25.8133 56.1947 26.176 56.12 26.432 55.992C26.688 55.864 26.8693 55.7147 26.976 55.544C27.104 55.352 27.1787 55.1387 27.2 54.904C27.2213 54.6693 27.232 54.4347 27.232 54.2V50.968C27.232 50.4347 27.0613 49.944 26.72 49.496C26.4 49.048 25.8453 48.824 25.056 48.824H18.368L18.336 69.944C18.336 70.3707 18.1333 70.7013 17.728 70.936C17.344 71.1493 16.9173 71.256 16.448 71.256C15.1893 71.256 14.56 70.744 14.56 69.72V47.512C14.56 46.744 14.752 46.232 15.136 45.976C15.5413 45.72 16.0213 45.592 16.576 45.592H25.856C26.4107 45.592 26.9973 45.6987 27.616 45.912C28.256 46.1253 28.8533 46.4133 29.408 46.776H29.376C29.9307 47.1813 30.336 47.7147 30.592 48.376C30.8693 49.0373 31.008 49.8053 31.008 50.68V54.296C31.008 55.1493 30.8267 55.8533 30.464 56.408C30.1013 56.9413 29.7173 57.368 29.312 57.688C29.5893 57.8587 29.856 58.04 30.112 58.232C30.368 58.4027 30.5813 58.5947 30.752 58.808C31.0293 59.1067 31.2427 59.4587 31.392 59.864C31.5627 60.2693 31.648 60.7493 31.648 61.304V65.88C31.648 67.6293 30.9653 68.92 29.6 69.752C28.9173 70.1787 28.2667 70.4987 27.648 70.712C27.0507 70.9253 26.4533 71.032 25.856 71.032H21.12C20.7573 71.032 20.4693 70.8827 20.256 70.584C20.064 70.2853 19.968 69.8907 19.968 69.4C19.968 68.3333 20.416 67.8 21.312 67.8H25.696C26.4853 67.8 27.04 67.576 27.36 67.128C27.68 66.68 27.84 66.1787 27.84 65.624V61.56ZM39.763 69.656C39.763 70.68 39.1763 71.192 38.003 71.192C36.8083 71.192 36.211 70.68 36.211 69.656V53.144C36.211 52.12 36.8083 51.608 38.003 51.608C39.1763 51.608 39.763 52.12 39.763 53.144V69.656ZM40.435 47.576C40.435 48.2587 40.2003 48.8347 39.731 49.304C39.2617 49.7733 38.6857 50.008 38.003 50.008C37.3203 50.008 36.7337 49.7733 36.243 49.304C35.7737 48.8347 35.539 48.2587 35.539 47.576C35.539 46.872 35.7737 46.2853 36.243 45.816C36.7337 45.3467 37.3203 45.112 38.003 45.112C38.6857 45.112 39.2617 45.3467 39.731 45.816C40.2003 46.2853 40.435 46.872 40.435 47.576ZM47.8575 69.752C47.8575 70.7547 47.2708 71.256 46.0975 71.256C44.9028 71.256 44.3055 70.7547 44.3055 69.752V46.808C44.3055 45.8053 44.9028 45.304 46.0975 45.304C47.2708 45.304 47.8575 45.8053 47.8575 46.808V69.752ZM55.92 69.752C55.92 70.7547 55.3333 71.256 54.16 71.256C52.9653 71.256 52.368 70.7547 52.368 69.752V46.808C52.368 45.8053 52.9653 45.304 54.16 45.304C55.3333 45.304 55.92 45.8053 55.92 46.808V69.752ZM70.7345 59.8C71.2678 59.8 71.8332 59.928 72.4305 60.184C73.0492 60.4187 73.6252 60.7173 74.1585 61.08H74.1265C74.6812 61.4853 75.1078 62.008 75.4065 62.648C75.7052 63.288 75.8545 64.056 75.8545 64.952V65.912C75.8545 67.6613 75.2785 68.952 74.1265 69.784C73.5718 70.2107 73.0065 70.52 72.4305 70.712C71.8545 70.904 71.2892 71 70.7345 71H65.2945C64.7398 71 64.1745 70.904 63.5985 70.712C63.0225 70.52 62.4572 70.2107 61.9025 69.784C60.7505 68.9733 60.1745 67.6827 60.1745 65.912V65.528C60.1745 64.6107 60.7612 64.1627 61.9345 64.184C63.1292 64.184 63.7265 64.632 63.7265 65.528V65.88C63.7265 66.392 63.8865 66.872 64.2065 67.32C64.5265 67.768 65.0918 67.992 65.9025 67.992H70.1265C70.9372 67.992 71.5025 67.768 71.8225 67.32C72.1425 66.872 72.3025 66.392 72.3025 65.88V64.984C72.3025 64.7067 72.2598 64.44 72.1745 64.184C72.1105 63.928 71.9932 63.704 71.8225 63.512C71.6518 63.2987 71.4278 63.128 71.1505 63C70.8732 62.872 70.5318 62.808 70.1265 62.808H65.4545C64.3665 62.808 63.2252 62.424 62.0305 61.656C60.8998 60.9307 60.3345 59.6827 60.3345 57.912V56.824C60.3345 55.9707 60.4838 55.224 60.7825 54.584C61.0812 53.9227 61.5078 53.3893 62.0625 52.984H62.0305C62.5638 52.6213 63.1292 52.3227 63.7265 52.088C64.3238 51.8533 64.8998 51.736 65.4545 51.736H70.5745C71.1292 51.736 71.6945 51.8533 72.2705 52.088C72.8678 52.3227 73.4438 52.6213 73.9985 52.984H73.9665C74.5212 53.3893 74.9478 53.9227 75.2465 54.584C75.5452 55.224 75.6945 55.9707 75.6945 56.824V57.112C75.6945 57.56 75.5452 57.8907 75.2465 58.104C74.9478 58.296 74.5105 58.4027 73.9345 58.424C72.7612 58.4453 72.1745 58.008 72.1745 57.112V56.856C72.1745 56.3227 72.0038 55.8427 71.6625 55.416C71.3425 54.968 70.7878 54.744 69.9985 54.744H66.0305C65.2412 54.744 64.6758 54.968 64.3345 55.416C64.0145 55.8427 63.8545 56.3227 63.8545 56.856V57.624C63.8545 58.1787 64.0145 58.68 64.3345 59.128C64.6758 59.576 65.2412 59.8 66.0305 59.8H70.7345ZM88.726 48.728L81.718 70.232V70.2C81.59 70.52 81.4087 70.7867 81.174 71C80.9607 71.192 80.694 71.288 80.374 71.288C80.2033 71.288 80.0327 71.2667 79.862 71.224C79.7127 71.2027 79.5527 71.1707 79.382 71.128H79.414C78.198 70.744 77.75 70.0613 78.07 69.08L85.366 46.904C85.4727 46.5627 85.654 46.2747 85.91 46.04C86.1873 45.8053 86.5073 45.6667 86.87 45.624C87.2327 45.56 87.5847 45.5173 87.926 45.496C88.2673 45.4533 88.534 45.432 88.726 45.432C88.918 45.432 89.1847 45.4533 89.526 45.496C89.8673 45.5173 90.2193 45.5493 90.582 45.592C90.8807 45.6347 91.1687 45.7947 91.446 46.072C91.7447 46.3493 91.9687 46.6267 92.118 46.904C93.3127 50.5733 94.518 54.2747 95.734 58.008C96.9713 61.72 98.1873 65.4107 99.382 69.08C99.6807 70.0613 99.2327 70.744 98.038 71.128C97.8673 71.1707 97.7073 71.2027 97.558 71.224C97.43 71.2667 97.2807 71.288 97.11 71.288C96.8113 71.288 96.534 71.192 96.278 71C96.0433 70.7867 95.8727 70.52 95.766 70.2V70.232L88.726 48.728ZM91.126 63.32C91.126 64.0027 90.8807 64.5893 90.39 65.08C89.9207 65.5493 89.3447 65.784 88.662 65.784C87.9793 65.784 87.4033 65.5493 86.934 65.08C86.4647 64.5893 86.23 64.0027 86.23 63.32C86.23 62.6373 86.4647 62.0613 86.934 61.592C87.4033 61.1013 87.9793 60.856 88.662 60.856C89.3447 60.856 89.9207 61.1013 90.39 61.592C90.8807 62.0613 91.126 62.6373 91.126 63.32ZM106.184 69.656C106.184 70.68 105.544 71.192 104.264 71.192C103.005 71.192 102.376 70.68 102.376 69.656V46.968C102.376 45.944 103.005 45.432 104.264 45.432C105.544 45.432 106.184 45.944 106.184 46.968V69.656Z" fill="white"/>
          </svg>
          <h1 style="color: #2563EB; margin-bottom: 10px;">BillsAI Password Reset</h1>
          <h2 style="color: #4B5563; margin-top: 0;">Secure Your Account</h2>
        </div>
        
        <p style="color: #4B5563; font-size: 16px; line-height: 1.5;">We received a request to reset the password for your BillsAI account.</p>
        
        <p style="color: #4B5563; font-size: 16px; line-height: 1.5;">To reset your password, please click the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" target="_blank" style="background-color: #2563EB; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-size: 16px;">Reset My Password</a>
        </div>
        
        <p style="color: #4B5563; font-size: 14px;">This password reset link is valid for 10 minutes only. After that, you'll need to request a new one.</p>
        
        <p style="color: #4B5563; font-size: 14px;"><strong>Security tip:</strong> If you didn't request this password reset, please secure your account by changing your password immediately.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e4e4e4; color: #9CA3AF; font-size: 12px;">
          <p>© ${new Date().getFullYear()} BillsAI. All rights reserved.</p>
          <p>If you have any questions, please contact our support team at support@billsai.org</p>
        </div>
      </div>
    `;

    // Setup email options
    const mailOptions = {
      to: user.email,
      subject: 'BillsAI - Password Reset',
      html: message,
    };

    try {
      // Send the email
      await sendEmail(mailOptions);
      
      res.status(200).json({
        message: 'Password reset email sent',
        resetUrl, // In production, you wouldn't return this in the response
      });
    } catch (error) {
      //console.error('Error sending password reset email:', error);
      
      // Reset the tokens if email sending fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      
      return res.status(500).json({
        message: 'Error sending password reset email',
        error: error.message
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password
 * @route POST /api/auth/reset-password/:token
 * @access Public
 */
exports.resetPassword = async (req, res, next) => {
  try {
    // Get hashed token from URL parameter (not request body)
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const { accountType ,} = req.body;


     // Require accountType for security - prevent user type mixups
     if (!accountType) {
      return res.status(400).json({
        message: 'Account type is required (business or personal)',
      });
    }
    
    // Validate accountType
    if (accountType !== 'business' && accountType !== 'personal') {
      return res.status(400).json({
        message: 'Invalid account type. Must be "business" or "personal"',
      });
    }
    
    // Check ONLY the appropriate model based on account type
    let user = null;
    
    if (accountType === 'business') {
      // Check only BusinessUser model for business accounts
      user = await BusinessUser.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
      });
    } else {
      // Check only User model for personal accounts
      user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
      });
    }

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset token',
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Generate JWT token
    const token = user.generateAuthToken();

    res.status(200).json({
      message: 'Password reset successful',
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update password
 * @route PUT /api/auth/update-password
 * @access Private
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id,accountType} = req.user;

    // Determine which model to use based on the user's role
    const UserModel = accountType === 'business' ? BusinessUser : User;

    // Find the user in the appropriate collection
    const user = await UserModel.findById(id).select('+password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Current password is incorrect',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate JWT token
    const token = user.generateAuthToken();

    res.status(200).json({
      message: 'Password updated successfully',
      token,
    });
  } catch (error) {
    //console.error('Error updating password:', error);
    next(error);
  }
};

/**
 * Verify email with token
 * @route GET /api/auth/verify-email/:token
 * @access Public
 */
exports.verifyEmail = async (req, res, next) => {
  try {
    // Get token from either path parameter or query parameter
    const token = req.params.token || req.query.token;
    

    const accountType = req.query.accountType;

    if (!token) {
      return res.status(400).json({
        message: 'Verification token is required',
      });
    }
    
    // Require accountType for security - prevent user type mixups
    if (!accountType) {
      return res.status(400).json({
        message: 'Account type is required (business or personal)',
      });
    }
    
    // Validate accountType
    if (accountType !== 'business' && accountType !== 'personal') {
      return res.status(400).json({
        message: 'Invalid account type. Must be "business" or "personal"',
      });
    }

    // Hash the token from the URL
    const emailVerificationToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with the token in ONLY the appropriate model
    let user = null;
    
    if (accountType === 'business') {
      // Check only BusinessUser model
      user = await BusinessUser.findOne({
        emailVerificationToken,
        emailVerificationExpire: { $gt: Date.now() },
      });
    } else {
      // Check only User model
      user = await User.findOne({
        emailVerificationToken,
        emailVerificationExpire: { $gt: Date.now() },
      });
    }

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired verification token',
      });
    }

    // Set user as verified and remove verification token fields
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    res.status(200).json({
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};
