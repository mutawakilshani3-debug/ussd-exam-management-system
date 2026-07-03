const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/academic.controller');

router.get('/faculties', protect, controller.listFaculties);
router.post('/faculties', protect, authorize('admin'), controller.createFaculty);

router.get('/departments', protect, controller.listDepartments);
router.post('/departments', protect, authorize('admin'), controller.createDepartment);

router.get('/programmes', protect, controller.listProgrammes);
router.post('/programmes', protect, authorize('admin'), controller.createProgramme);

module.exports = router;
