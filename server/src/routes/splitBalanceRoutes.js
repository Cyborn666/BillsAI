/**
 * Split Balance Routes - For expense splitting functionality
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getUserBalances,
  getBalanceWithUser,
  getGroupBalances,
  getSimplifiedBalances,
  getBalanceDetails
} = require('../controllers/splitBalanceController');

// All routes are protected
router.use(protect);

// User balance routes
router.get('/', getUserBalances);
router.get('/simplify', getSimplifiedBalances);
router.get('/user/:otherUserId', getBalanceWithUser);
router.get('/group/:groupId', getGroupBalances);
router.get('/details/:otherUserId', getBalanceDetails);

module.exports = router;
