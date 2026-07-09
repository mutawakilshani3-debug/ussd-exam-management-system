const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadGeneralTimetableFile } = require('../middleware/upload');
const ctrl = require('../controllers/nationalService.controller');

router.get('/public/search', ctrl.searchByIndex);

router.get('/', protect, authorize('admin'), ctrl.list);
router.post('/upload', protect, authorize('admin'), uploadGeneralTimetableFile.single('file'), ctrl.uploadFile);
router.delete('/', protect, authorize('admin'), ctrl.removeAll);

module.exports = router;
