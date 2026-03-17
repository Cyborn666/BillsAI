/**
 * Business Daily Report Routes
 * Defines API routes for business daily reports
 */
const express = require('express');
const router = express.Router();
const { 
  createDailyReport,
  getAllDailyReports,
  getDailyReport,
  updateDailyReport,
  deleteDailyReport,
  getDailyReportAnalytics,
} = require('../controllers/businessDailyReportController');
const { protect } = require('../middleware/authMiddleware');
const { checkFreeResourceLimit } = require('../middleware/freeResourceLimitMiddleware');

// Apply authentication middleware to all routes
router.use(protect);

// Daily report routes
router.route('/')
  .post(checkFreeResourceLimit('reports'), createDailyReport)
  .get(getAllDailyReports);

// Analytics routes
router.get('/analytics', getDailyReportAnalytics);

// Individual daily report routes
router.route('/:id')
  .get(getDailyReport)
  .put(updateDailyReport)
  .delete(deleteDailyReport);

module.exports = router;
