const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const courseController = require('../controllers/course.controller');

router.use(protect);

router.get('/mine', authorize('examiner'), courseController.myCourses);
router.get('/', courseController.list);
router.get('/:id', courseController.getOne);
router.post('/', authorize('admin'), courseController.create);
router.put('/:id', authorize('admin'), courseController.update);
router.delete('/:id', authorize('admin'), courseController.remove);

module.exports = router;
