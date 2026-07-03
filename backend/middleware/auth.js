const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

/**
 * protect: verifies the JWT from the Authorization header and attaches
 * the authenticated user (minus password) to req.user.
 */
async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await pool.query(
      `SELECT id, full_name, email, phone, role, programme_id, level, index_number,
              staff_id, profile_picture, is_verified, is_active
       FROM users WHERE id = ? LIMIT 1`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    if (!rows[0].is_active) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated.' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired, please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Not authorized, invalid token.' });
  }
}

/**
 * authorize: restricts a route to one or more roles.
 * Usage: authorize('admin'), authorize('admin', 'examiner')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user ? req.user.role : 'unknown'}' is not permitted to access this resource.`,
      });
    }
    next();
  };
}

module.exports = { protect, authorize };
