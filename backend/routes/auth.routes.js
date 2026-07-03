const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
} = require('../controllers/auth.controller');

router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().withMessage('A valid email is required.'),
    body('phone').notEmpty().withMessage('Phone number is required.'),
    body('fullName').trim().notEmpty().withMessage('Full name is required.'),
  ],
  validate,
  register
);

router.post(
  '/login',
  authLimiter,
  [body('email').isEmail().withMessage('A valid email is required.'), body('password').notEmpty()],
  validate,
  login
);

router.post('/logout', protect, logout);
router.post('/forgot-password', authLimiter, [body('email').isEmail()], validate, forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPassword);
router.put('/change-password', protect, changePassword);
router.get('/me', protect, getMe);

module.exports = router;
