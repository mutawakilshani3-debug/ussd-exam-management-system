const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadProfilePicture } = require('../middleware/upload');
const controller = require('../controllers/profile.controller');

router.use(protect);
router.get('/', controller.getProfile);
router.put('/', controller.updateProfile);
router.post('/picture', uploadProfilePicture.single('picture'), controller.uploadPicture);

module.exports = router;
