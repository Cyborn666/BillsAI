/**
 * Business Invoice Controller
 * Handles all invoice-related business logic
 */
const BusinessInvoice = require('../models/businessInvoiceModel');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Create new business invoice
 * @route   POST /api/business/invoices
 * @access  Private
 */
const createBusinessInvoice = asyncHandler(async (req, res) => {
  const {
    invoiceNumber,
    client,
    issueDate,
    dueDate,
    items,
    subtotal,
    taxRate,
    taxAmount,
    discount,
    total,
    notes,
    termsAndConditions,
    status,
    isRecurring,
    recurringPeriod,
    nextInvoiceDate,
  } = req.body;

  // Get user ID from authenticated user
  const userId = req.user.id;

  // Create invoice
  const invoice = await BusinessInvoice.create({
    invoiceNumber,
    client,
    issueDate,
    dueDate,
    items,
    subtotal,
    taxAmount,
    taxRate,
    discount,
    total,
    notes,
    termsAndConditions,
    status,
    isRecurring,
    recurringPeriod,
    nextInvoiceDate,
    userId,
  });

  if (invoice) {
    res.status(201).json(invoice);
  } else {
    res.status(400);
    throw new Error('Invalid invoice data');
  }
});

/**
 * @desc    Get all business invoices
 * @route   GET /api/business/invoices
 * @access  Private
 */
const getBusinessInvoices = asyncHandler(async (req, res) => {
  // Get user ID from authenticated user
  const userId = req.user.id;

  // Set up filter
  const filter = { userId };
  
  // Add status filter if provided
  if (req.query.status) {
    filter.status = req.query.status;
  }
  
  // Only keeping status filtering in the backend
  // All other filtering including search will be done on frontend

  // Get invoices
  const invoices = await BusinessInvoice.find(filter).sort({ issueDate: -1 });

  res.status(200).json(invoices);
});

/**
 * @desc    Get business invoice by ID
 * @route   GET /api/business/invoices/:id
 * @access  Private
 */
const getBusinessInvoiceById = asyncHandler(async (req, res) => {
  // Get user ID from authenticated user
  const userId = req.user.id;

  const invoice = await BusinessInvoice.findOne({
    _id: req.params.id,
    userId,
  });

  if (invoice) {
    res.status(200).json(invoice);
  } else {
    res.status(404);
    throw new Error('Invoice not found');
  }
});

/**
 * @desc    Update business invoice
 * @route   PUT /api/business/invoices/:id
 * @access  Private
 */
const updateBusinessInvoice = asyncHandler(async (req, res) => {
  // Get user ID from authenticated user
  const userId = req.user.id;

  // Find invoice
  const invoice = await BusinessInvoice.findOne({
    _id: req.params.id,
    userId,
  });

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  // Format the data properly for MongoDB
  const {
    invoiceNumber,
    client,
    issueDate,
    dueDate,
    items,
    subtotal,
    taxRate,
    taxAmount,
    discount,
    total,
    notes,
    terms,
    status
  } = req.body;
  
  // Format items to match the schema
  const formattedItems = items?.map(item => ({
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    total: Number(item.total)
  })) || [];
  
  // Update invoice fields
  const updatedInvoice = await BusinessInvoice.findByIdAndUpdate(
    req.params.id,
    { 
      invoiceNumber,
      client,
      issueDate,
      dueDate,
      items: formattedItems,
      subtotal: Number(subtotal),
      taxRate: Number(taxRate),
      taxAmount: Number(taxAmount),
      discount: Number(discount),
      total: Number(total),
      notes,
      terms,
      status
    },
    { new: true, runValidators: true }
  );

  res.status(200).json(updatedInvoice);
});

/**
 * @desc    Delete business invoice
 * @route   DELETE /api/business/invoices/:id
 * @access  Private
 */
const deleteBusinessInvoice = asyncHandler(async (req, res) => {
  // Get user ID from authenticated user
  const userId = req.user.id;

  // Find invoice
  const invoice = await BusinessInvoice.findOne({
    _id: req.params.id,
    userId,
  });

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  await invoice.deleteOne();

  res.status(200).json({ id: req.params.id });
});

/**
 * @desc    Add payment to business invoice
 * @route   POST /api/business/invoices/:id/payments
 * @access  Private
 */
const addInvoicePayment = asyncHandler(async (req, res) => {
  // Get user ID from authenticated user
  const userId = req.user.id;

  // Find invoice
  const invoice = await BusinessInvoice.findOne({
    _id: req.params.id,
    userId,
  });

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  // Add payment
  invoice.payments.push(req.body);
  
  // Check if payment completes the invoice
  const totalPayments = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
  if (totalPayments >= invoice.total) {
    invoice.status = 'paid';
  }

  await invoice.save();

  res.status(200).json(invoice);
});

/**
 * @desc    Get invoice stats
 * @route   GET /api/business/invoices/stats
 * @access  Private
 */
const getInvoiceStats = asyncHandler(async (req, res) => {
  // Get user ID from authenticated user
  const userId = req.user.id;

  // Set up filter
  const filter = { userId };
  
  // Add date filters if provided
  if (req.query.startDate) {
    filter.issueDate = { $gte: new Date(req.query.startDate) };
  }
  
  if (req.query.endDate) {
    filter.issueDate = filter.issueDate || {};
    filter.issueDate.$lte = new Date(req.query.endDate);
  }

  // Get total counts
  const totalInvoices = await BusinessInvoice.countDocuments(filter);
  
  // Get counts by status
  const statusCounts = await BusinessInvoice.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  
  // Get total amounts
  const totals = await BusinessInvoice.aggregate([
    { $match: filter },
    { 
      $group: { 
        _id: null, 
        totalAmount: { $sum: '$total' },
        totalPaid: { 
          $sum: { 
            $reduce: { 
              input: '$payments', 
              initialValue: 0, 
              in: { $add: ['$$value', '$$this.amount'] } 
            } 
          } 
        },
      } 
    },
  ]);

  // Format status counts
  const formattedStatusCounts = statusCounts.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});

  res.status(200).json({
    totalInvoices,
    statusCounts: formattedStatusCounts,
    totalAmount: totals.length > 0 ? totals[0].totalAmount : 0,
    totalPaid: totals.length > 0 ? totals[0].totalPaid : 0,
    totalOutstanding: totals.length > 0 ? totals[0].totalAmount - totals[0].totalPaid : 0,
  });
});

/**
 * @desc    Send invoice reminder
 * @route   POST /api/business/invoices/:id/remind
 * @access  Private
 */
const sendInvoiceReminder = asyncHandler(async (req, res) => {
  // Get user ID from authenticated user
  const userId = req.user.id;

  // Find invoice
  const invoice = await BusinessInvoice.findOne({
    _id: req.params.id,
    userId,
  });

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  // Add reminder
  invoice.remindersSent.push({
    date: new Date(),
    method: req.body.method || 'email',
  });

  await invoice.save();

  // In a real application, we would send an actual email or SMS here
  // For now, we'll just return success

  res.status(200).json({
    success: true,
    message: 'Reminder sent successfully',
    invoice,
  });
});



/**
 * @desc    Parse PDF invoice and extract structured data with AI
 * @route   POST /api/business/invoices/parse-pdf
 * @access  Private/Business
 */
const parseInvoicePDF = asyncHandler(async (req, res) => {
  // Check for file upload
  if (!req.files || !req.files.invoice) {
    return res.status(400).json({ message: 'Please upload a PDF invoice file' });
  }

  const invoiceFile = req.files.invoice;

  // Validate file type
  if (!invoiceFile.mimetype.includes('pdf')) {
    return res.status(400).json({ message: 'Please upload a valid PDF file' });
  }

  try {
    // Read PDF content
    const pdfBuffer = invoiceFile.data;
    //console.log(`Processing PDF file: ${invoiceFile.name}, size: ${pdfBuffer.length} bytes`);
    
    // Parse PDF using pdf-parse library
    const pdfjs = require('pdf-parse');
    const pdfData = await pdfjs(pdfBuffer);
    
    // Extract text from PDF
    const extractedText = pdfData.text;
    //console.log(`Extracted ${extractedText.length} characters from PDF`);
    
    if (!extractedText || extractedText.trim().length < 50) {
      return res.status(400).json({ 
        message: 'Could not extract sufficient text from the PDF. Please try another file.' 
      });
    }
    
    // Send text to OpenAI for structured extraction
    const openai = require('openai');
    const openaiClient = new openai.OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Define the prompt for invoice data extraction
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant trained to extract structured invoice data from text. ' +
            'Extract the following fields where available: vendorName, invoiceNumber, issueDate, dueDate, ' +
            'items (array of {description, quantity, unitPrice, amount}), subtotal, tax (percentage and amount), ' +
            'discount (percentage and amount), totalAmount, clientName, clientAddress, clientEmail, notes.'
        },
        {
          role: 'user',
          content: `Extract structured invoice data from this PDF text:\n\n${extractedText}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });
    
    // Parse the response
    const aiResponseText = response.choices[0].message.content;
    let parsedData;
    
    try {
      // Try to parse JSON directly
      parsedData = JSON.parse(aiResponseText);
    } catch (parseError) {
      // If direct parsing fails, try to extract JSON from text response
      const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/m);
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0]);
        } catch (error) {
          //console.error('Failed to extract JSON from AI response');
          throw new Error('Invalid response format from AI service');
        }
      } else {
        //console.error('No JSON found in AI response');
        throw new Error('Invalid response format from AI service');
      }
    }
    
    //console.log('Successfully extracted structured invoice data');
    
    // Normalize date formats if they exist
    if (parsedData.issueDate) {
      try {
        const issueDate = new Date(parsedData.issueDate);
        if (!isNaN(issueDate.getTime())) {
          // Format as ISO string which is consistently parseable
          parsedData.issueDate = issueDate.toISOString().split('T')[0];
        }
      } catch (e) {
        //console.log('Could not normalize issueDate format');
      }
    }
    
    if (parsedData.dueDate) {
      try {
        const dueDate = new Date(parsedData.dueDate);
        if (!isNaN(dueDate.getTime())) {
          // Format as ISO string which is consistently parseable
          parsedData.dueDate = dueDate.toISOString().split('T')[0];
        }
      } catch (e) {
        //console.log('Could not normalize dueDate format');
      }
    }
    
    // Return the structured invoice data with normalized dates
    return res.status(200).json(parsedData);
  } catch (error) {
    //console.error('Error parsing PDF:', error);
    return res.status(500).json({ 
      message: 'Failed to process PDF invoice', 
      error: error.message 
    });
  }
});

/**
 * @desc    Update invoice status only
 * @route   PATCH /api/business/invoices/:id/status
 * @access  Private
 */
const updateInvoiceStatus = asyncHandler(async (req, res) => {
  // Get user ID from authenticated user
  const userId = req.user.id;
  const { status } = req.body;

  // Validate status parameter exists
  if (!status) {
    res.status(400);
    throw new Error('Status is required');
  }

  // Find invoice
  const invoice = await BusinessInvoice.findOne({
    _id: req.params.id,
    userId,
  });

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  // Update just the status field - much more efficient than updating the entire document
  const updatedInvoice = await BusinessInvoice.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );

  res.status(200).json(updatedInvoice);
});

module.exports = {
  createBusinessInvoice,
  getBusinessInvoices,
  getBusinessInvoiceById,
  updateBusinessInvoice,
  deleteBusinessInvoice,
  addInvoicePayment,
  getInvoiceStats,
  sendInvoiceReminder,
  parseInvoicePDF,
  updateInvoiceStatus
};
