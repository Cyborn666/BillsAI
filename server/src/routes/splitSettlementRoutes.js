/**
 * Split Settlement Routes - For expense splitting functionality
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createSettlement,
  getSettlementHistory,
  getSettlementsWithUser,
  getSettlement,
  cancelSettlement
} = require('../controllers/splitSettlementController');

// All routes are protected
router.use(protect);

// Settlement routes
router.route('/')
  .post(createSettlement)
  .get(getSettlementHistory);

// Specific settlement routes
router.route('/:id')
  .get(getSettlement);

// Cancel settlement (admin only)
router.route('/:id/cancel')
  .put(cancelSettlement);

// Get settlements with specific user
router.get('/user/:userId', getSettlementsWithUser);

module.exports = router;
