const express = require('express');
const router = express.Router();
const businessClientController = require('../controllers/businessClientController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, businessClientController.getBusinessClients);
router.post('/', protect, businessClientController.addBusinessClient);
router.delete('/:clientId', protect, businessClientController.deleteBusinessClient);

module.exports = router;
