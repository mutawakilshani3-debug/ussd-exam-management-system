const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { generate } = require('../controllers/report.controller');

// e.g. GET /api/reports/students/pdf, /api/reports/timetable/excel
router.get('/:type/:format', protect, authorize('admin'), generate);

module.exports = router;
