/**
 * Split Group Routes - For expense splitting functionality
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createSplitGroup,
  getSplitGroups,
  getSplitGroup,
  updateSplitGroup,
  addGroupMembers,
  removeGroupMember,
  updateMemberRole,
  deleteSplitGroup
} = require('../controllers/splitGroupController');

// All routes are protected
router.use(protect);

// Group management routes
router.route('/')
  .post(createSplitGroup)
  .get(getSplitGroups);

// Specific group routes
router.route('/:id')
  .get(getSplitGroup)
  .put(updateSplitGroup)
  .delete(deleteSplitGroup);

// Group member management
router.route('/:id/members')
  .post(addGroupMembers);

router.route('/:id/members/:memberId')
  .delete(removeGroupMember);

router.route('/:id/members/:memberId/role')
  .put(updateMemberRole);

module.exports = router;
