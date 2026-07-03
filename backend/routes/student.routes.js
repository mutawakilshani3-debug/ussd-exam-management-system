const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const makeUserController = require('../controllers/user.controller');

const controller = makeUserController('student');

// All student management routes are admin-only.
router.use(protect, authorize('admin'));

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.patch('/:id/status', controller.toggleStatus);
router.post('/:id/reset-password', controller.resetPassword);

module.exports = router;
