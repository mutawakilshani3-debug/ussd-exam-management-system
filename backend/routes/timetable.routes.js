const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const timetableController = require('../controllers/timetable.controller');

router.use(protect);

router.get('/', timetableController.list);
router.get('/:id', timetableController.getOne);
router.post('/', authorize('admin', 'examiner'), timetableController.create);
router.put('/:id', authorize('admin', 'examiner'), timetableController.update);
router.delete('/:id', authorize('admin'), timetableController.remove);
router.patch('/:id/publish', authorize('admin'), timetableController.publish);
router.patch('/:id/archive', authorize('admin'), timetableController.archive);

module.exports = router;
