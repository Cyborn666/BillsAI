/**
 * Business Miscellaneous Transaction Routes
 * Defines API routes for business miscellaneous transactions
 */
const express = require('express');
const businessMiscTransactionController = require('../controllers/businessMiscTransactionController');
const { protect } = require('../middleware/authMiddleware');
const { checkFreeResourceLimit } = require('../middleware/freeResourceLimitMiddleware');

const router = express.Router();

// Routes for miscellaneous transactions
router
  .route('/')
  .get(protect, businessMiscTransactionController.getAllMiscTransactions)
  .post(protect, checkFreeResourceLimit('expenses'), businessMiscTransactionController.createMiscTransaction);

router
  .route('/:id')
  .get(protect, businessMiscTransactionController.getMiscTransactionById)
  .patch(protect, businessMiscTransactionController.updateMiscTransaction)
  .delete(protect, businessMiscTransactionController.deleteMiscTransaction);

// Stats route
router.get('/stats', protect, businessMiscTransactionController.getMiscTransactionStats);

module.exports = router;
