const express = require('express');
const waitlistController = require('../controllers/waitlistController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

// Public routes
router.post('/', waitlistController.addToWaitlist);
router.get('/check/:email', waitlistController.checkWaitlistStatus);

// Protected routes (admin only)
router.use(authMiddleware.protect, adminMiddleware);
router.get('/', waitlistController.getAllWaitlistEntries);
router.get('/:id', waitlistController.getWaitlistEntry);
router.patch('/:id', waitlistController.updateWaitlistStatus);

module.exports = router;
