/**
 * Split Routes - Main router file for all expense splitting functionality
 */
const express = require('express');
const router = express.Router();

// Import all split-related routes
const splitUserRoutes = require('./splitUserRoutes');
const splitGroupRoutes = require('./splitGroupRoutes');
const splitExpenseRoutes = require('./splitExpenseRoutes');
const splitBalanceRoutes = require('./splitBalanceRoutes');
const splitSettlementRoutes = require('./splitSettlementRoutes');

// Register routes with their respective prefixes
router.use('/users', splitUserRoutes);
router.use('/groups', splitGroupRoutes);
router.use('/expenses', splitExpenseRoutes);
router.use('/balances', splitBalanceRoutes);
router.use('/settlements', splitSettlementRoutes);

module.exports = router;
