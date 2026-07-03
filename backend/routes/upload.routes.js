const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadBulkFile } = require('../middleware/upload');
const controller = require('../controllers/upload.controller');

router.use(protect, authorize('admin'));

router.get('/:type/template', controller.downloadTemplate);
router.post('/:type/preview', uploadBulkFile.single('file'), controller.preview);
router.post('/:type/import', controller.importFile);

module.exports = router;
