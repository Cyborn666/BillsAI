/**
 * Split User Routes - For expense splitting functionality
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createSplitUserProfile,
  getSplitUserProfile,
  updateSplitUserProfile,
  searchSplitUsers,
  getRecentContacts,
  updateRecentContact
} = require('../controllers/splitUserController');

// All routes are protected
router.use(protect);

// Split user profile routes
router.route('/profile')
  .post(createSplitUserProfile)
  .get(getSplitUserProfile)
  .put(updateSplitUserProfile);

// Search users
router.get('/search', searchSplitUsers);

// Recent contacts
router.route('/contacts')
  .get(getRecentContacts)
  .post(updateRecentContact);

module.exports = router;
