const express = require('express');
const router = express.Router();
const { checkByCourseCode } = require('../controllers/public.controller');

// No protect/authorize middleware on this router - intentionally public.
router.get('/check', checkByCourseCode);

module.exports = router;
