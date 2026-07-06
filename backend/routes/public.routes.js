const express = require('express');
const router = express.Router();
const { checkByCourseCode, getAllPublished } = require('../controllers/public.controller');
const {
  listDocuments,
  downloadDocument,
  searchDocument,
} = require('../controllers/timetableDocument.controller');

// No protect/authorize middleware on this router - intentionally public.
router.get('/check', checkByCourseCode);
router.get('/timetable', getAllPublished);

router.get('/timetable-documents', listDocuments);
router.get('/timetable-documents/:category/download', downloadDocument);
router.get('/timetable-documents/:category/search', searchDocument);

module.exports = router;
