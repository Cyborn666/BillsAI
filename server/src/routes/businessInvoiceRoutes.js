/**
 * Business Invoice Routes
 * Defines API routes for business invoices
 */
const express = require('express');
const router = express.Router();
const { 
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
} = require('../controllers/businessInvoiceController');
const { protect } = require('../middleware/authMiddleware');
const { checkFreeResourceLimit } = require('../middleware/freeResourceLimitMiddleware');

// Apply authentication middleware to all routes
router.use(protect);

// Invoice routes
router.route('/')
  .post(checkFreeResourceLimit('invoices'), createBusinessInvoice)
  .get(getBusinessInvoices);

// Invoice stats route
router.get('/stats', getInvoiceStats);

// Individual invoice routes
router.route('/:id')
  .get(getBusinessInvoiceById)
  .put(updateBusinessInvoice)
  .delete(deleteBusinessInvoice);

// Invoice status update route (specialized endpoint for swipe actions)
router.patch('/:id/status', updateInvoiceStatus);

// Invoice payment route
router.post('/:id/payments', addInvoicePayment);

// Invoice reminder route
router.post('/:id/remind', sendInvoiceReminder);

// PDF parsing route
router.post('/parse-pdf', parseInvoicePDF);

module.exports = router;
