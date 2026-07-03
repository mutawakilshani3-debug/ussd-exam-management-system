const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { adminStats } = require('../controllers/dashboard.controller');

router.get('/admin', protect, authorize('admin'), adminStats);

module.exports = router;
