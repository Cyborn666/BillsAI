const nodemailer = require('nodemailer');

/**
 * Send email using Nodemailer
 * @param {Object} options - Email options
 * @param {String} options.email or options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.message or options.html - Email message (HTML or plain text)
 * @returns {Promise<void>}
 */
const sendEmail = async (options) => {
  try {
    // Ensure we have a valid from email address that works with Mailtrap
    const fromName = process.env.EMAIL_FROM_NAME || 'BillsAI';
    const fromEmail = process.env.EMAIL_FROM_ADDRESS || 'billsaiorg@gmail.com';
    const fromHeader = `${fromName} <${fromEmail}>`;
    
    // Create a transporter with Mailtrap Live SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'live.smtp.mailtrap.io',
      port: process.env.EMAIL_PORT || 587,
      secure: false, // false for 587 port
      requireTLS: true, // STARTTLS required
      auth: {
        user: process.env.EMAIL_USERNAME || 'apismtp@mailtrap.io',
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Define email options with explicit From header
    const mailOptions = {
      from: fromHeader,
      to: options.email || options.to, // Accept either email or to property
      subject: options.subject,
      html: options.message || options.html, // Accept either message or html property
    };
    
    // Validate that we have a recipient
    if (!mailOptions.to) {
      throw new Error('No recipients defined - email or to property is required');
    }

    //console.log('Attempting to send email to:', mailOptions.to);
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    //console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    //console.error('Email send error:', error);
    throw error;
  }
};

module.exports = {
  sendEmail,
};


