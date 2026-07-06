const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadBulkFile, uploadTimetablePdf } = require('../middleware/upload');
const controller = require('../controllers/upload.controller');
const timetableDocController = require('../controllers/timetableDocument.controller');

router.use(protect, authorize('admin'));

router.get('/:type/template', controller.downloadTemplate);
router.post('/:type/preview', uploadBulkFile.single('file'), controller.preview);
router.post('/:type/import', controller.importFile);

router.post('/timetable-documents/:category', uploadTimetablePdf.single('file'), timetableDocController.uploadDocument);

module.exports = router;
