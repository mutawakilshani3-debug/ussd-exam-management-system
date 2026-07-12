const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const sendSms = require('../utils/sendSms');
const logActivity = require('../utils/logActivity');

const PASSWORD_MIN_LENGTH = 8;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function isStrongPassword(pw) {
  return (
    pw.length >= PASSWORD_MIN_LENGTH &&
    /[A-Z]/.test(pw) &&
    /[a-z]/.test(pw) &&
    /[0-9]/.test(pw)
  );
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueRefreshToken(userId) {
  const refreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, tokenHash, expiresAt]
  );

  return refreshToken;
}

/**
 * POST /api/auth/register
 * Students only. Public endpoint.
 */
async function register(req, res, next) {
  try {
    const { fullName, email, phone, password, confirmPassword, programmeId, level, indexNumber } = req.body;

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.',
      });
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1',
      [email, phone]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email or phone number is already registered.' });
    }

    const hashed = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, phone, password, role, programme_id, level, index_number, is_verified)
       VALUES (?, ?, ?, ?, 'student', ?, ?, ?, 0)`,
      [fullName, email, phone, hashed, programmeId || null, level || null, indexNumber || null]
    );

    await logActivity(result.insertId, 'REGISTER', 'Student self-registered', req);

    // Fire-and-forget welcome SMS - don't block or fail registration if SMS fails
    sendSms(
      phone,
      `Welcome to MUTA, ${fullName.split(' ')[0]}! Your account has been created successfully. Sign in anytime to check your exam timetable.`
    ).catch((err) => console.error('Welcome SMS failed:', err.message));

    const accessToken = generateAccessToken(result.insertId, 'student');
    const refreshToken = await issueRefreshToken(result.insertId);

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token: accessToken,
      refreshToken,
      user: { id: result.insertId, fullName, email, role: 'student' },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated. Contact the administrator.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = await issueRefreshToken(user.id);
    await logActivity(user.id, 'LOGIN', null, req);

    delete user.password;

    res.json({ success: true, message: 'Login successful.', token: accessToken, refreshToken, user });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 * Public endpoint - exchanges a valid refresh token for a new access token.
 */
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required.' });
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const [rows] = await pool.query(
      `SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0 AND expires_at > NOW() LIMIT 1`,
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token. Please log in again.' });
    }

    const [userRows] = await pool.query(
      'SELECT id, role, is_active FROM users WHERE id = ? LIMIT 1',
      [rows[0].user_id]
    );

    if (userRows.length === 0 || !userRows[0].is_active) {
      return res.status(401).json({ success: false, message: 'Account unavailable. Please log in again.' });
    }

    const newAccessToken = generateAccessToken(userRows[0].id, userRows[0].role);
    res.json({ success: true, token: newAccessToken });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Revokes the provided refresh token (if any) and logs the activity.
 */
async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const tokenHash = hashRefreshToken(refreshToken);
      await pool.query('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?', [tokenHash]);
    }
    await logActivity(req.user.id, 'LOGOUT', null, req);
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const [rows] = await pool.query('SELECT id, full_name, phone FROM users WHERE email = ? LIMIT 1', [email]);

    if (rows.length === 0) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const user = rows[0];
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, hashedToken, expiresAt]
    );

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;
    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html: `<p>Hello ${user.full_name},</p><p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });

    if (user.phone) {
      sendSms(
        user.phone,
        `MUTA: A password reset was requested for your account. Check your email for the reset link. If this wasn't you, ignore this message.`
      ).catch((err) => console.error('Password reset SMS failed:', err.message));
    }

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password/:token
 * Also revokes all existing refresh tokens for the user, forcing re-login everywhere.
 */
async function resetPassword(req, res, next) {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const [rows] = await pool.query(
      `SELECT * FROM password_reset_tokens
       WHERE token = ? AND used = 0 AND expires_at > NOW() LIMIT 1`,
      [hashedToken]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'This reset link is invalid or has expired.' });
    }

    const resetRecord = rows[0];
    const hashed = await bcrypt.hash(password, 12);

    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, resetRecord.user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [resetRecord.id]);
    await pool.query('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', [resetRecord.user_id]);
    await logActivity(resetRecord.user_id, 'PASSWORD_RESET', null, req);

    res.json({ success: true, message: 'Password has been reset. You can now log in.' });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/auth/change-password
 * Requires authentication. Also revokes all existing refresh tokens.
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match.' });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.',
      });
    }

    const [rows] = await pool.query('SELECT password FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    const match = await bcrypt.compare(currentPassword, rows[0].password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?', [hashed, req.user.id]);
    await pool.query('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', [req.user.id]);
    await logActivity(req.user.id, 'PASSWORD_CHANGED', null, req);

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 */
async function getMe(req, res) {
  res.json({ success: true, user: req.user });
}

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  refresh,
};
