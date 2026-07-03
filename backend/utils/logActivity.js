const { pool } = require('../config/db');

async function logActivity(userId, action, details = null, req = null) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [userId, action, details, ip]
    );
  } catch (err) {
    // Never let logging failures break the main request flow.
    console.error('Failed to log activity:', err.message);
  }
}

module.exports = logActivity;
