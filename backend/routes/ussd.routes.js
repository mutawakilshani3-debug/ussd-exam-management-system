const express = require('express');
const router = express.Router();
const { handleUssd } = require('../controllers/ussd.controller');

// Africa's Talking posts here - no auth (AT itself isn't an authenticated user)
router.post('/', handleUssd);

module.exports = router;
