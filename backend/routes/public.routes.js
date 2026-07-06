const express = require('express');
const router = express.Router();
const { checkByCourseCode, getAllPublished } = require('../controllers/public.controller');

// No protect/authorize middleware on this router - intentionally public.
router.get('/check', checkByCourseCode);
router.get('/timetable', getAllPublished);

module.exports = router;
