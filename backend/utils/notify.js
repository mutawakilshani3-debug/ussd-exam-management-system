const { pool } = require('../config/db');

async function createNotification(userId, title, message) {
  await pool.query(
    'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
    [userId, title, message]
  );
}

async function notifyMany(userIds, title, message) {
  if (!userIds.length) return;
  const values = userIds.map((id) => [id, title, message]);
  await pool.query('INSERT INTO notifications (user_id, title, message) VALUES ?', [values]);
}

module.exports = { createNotification, notifyMany };
