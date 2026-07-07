const { pool } = require('../config/db');

async function getPublicSettings(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
    const settings = {};
    rows.forEach((r) => { settings[r.setting_key] = r.setting_value === '1'; });
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const updates = req.body; // e.g. { show_register_link: true, show_check_exam_link: false }
    const keys = Object.keys(updates);

    if (keys.length === 0) {
      return res.status(400).json({ success: false, message: 'No settings provided.' });
    }

    for (const key of keys) {
      await pool.query(
        'UPDATE settings SET setting_value = ? WHERE setting_key = ?',
        [updates[key] ? '1' : '0', key]
      );
    }

    res.json({ success: true, message: 'Settings updated.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPublicSettings, updateSettings };
