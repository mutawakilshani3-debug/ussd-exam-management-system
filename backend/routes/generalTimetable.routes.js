const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadGeneralTimetableFile } = require('../middleware/upload');
const ctrl = require('../controllers/generalTimetable.controller');

// Public - students search by course code, no login needed
router.get('/public/search', ctrl.searchByCourses);

// Admin - manage the master timetable
router.get('/', protect, authorize('admin'), ctrl.list);
router.post('/import', protect, authorize('admin'), ctrl.bulkImport);
router.post('/upload', protect, authorize('admin'), uploadGeneralTimetableFile.single('file'), ctrl.uploadFile);
router.post('/', protect, authorize('admin'), ctrl.create);
router.put('/:id', protect, authorize('admin'), ctrl.update);
router.delete('/:id', protect, authorize('admin'), ctrl.remove);
router.delete('/', protect, authorize('admin'), ctrl.removeAll);

module.exports = router;
