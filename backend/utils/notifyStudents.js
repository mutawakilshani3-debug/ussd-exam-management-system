const { pool } = require('../config/db');
const sendSms = require('./sendSms');

/**
 * Sends the given message to every active student with a phone number on
 * file. Fire-and-forget by design - individual send failures are logged,
 * not thrown, so one bad number never blocks the rest of the batch.
 */
async function notifyAllStudents(message) {
  try {
    const [rows] = await pool.query(
      `SELECT phone FROM users WHERE role = 'student' AND is_active = 1 AND phone IS NOT NULL AND phone != ''`
    );

    for (const row of rows) {
      sendSms(row.phone, message).catch((err) =>
        console.error(`Bulk SMS failed for ${row.phone}:`, err.message)
      );
    }

    return rows.length;
  } catch (err) {
    console.error('notifyAllStudents failed:', err.message);
    return 0;
  }
}

module.exports = notifyAllStudents;
