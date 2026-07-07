const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getPublicSettings, updateSettings } = require('../controllers/settings.controller');

router.get('/', getPublicSettings); // public - anyone can read current settings
router.put('/', protect, authorize('admin'), updateSettings); // admin only - can change

module.exports = router;
