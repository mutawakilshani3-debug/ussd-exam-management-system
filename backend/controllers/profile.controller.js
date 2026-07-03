const { pool } = require('../config/db');
const logActivity = require('../utils/logActivity');

async function getProfile(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.level, u.index_number,
              u.staff_id, u.profile_picture, u.created_at, p.name AS programme_name
       FROM users u LEFT JOIN programmes p ON p.id = u.programme_id
       WHERE u.id = ? LIMIT 1`,
      [req.user.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { fullName, phone } = req.body;
    await pool.query('UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone) WHERE id = ?', [
      fullName,
      phone,
      req.user.id,
    ]);
    await logActivity(req.user.id, 'UPDATE_PROFILE', null, req);
    res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    next(err);
  }
}

async function uploadPicture(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const relativePath = `/uploads/profile/${req.file.filename}`;
    await pool.query('UPDATE users SET profile_picture = ? WHERE id = ?', [relativePath, req.user.id]);
    await logActivity(req.user.id, 'UPLOAD_PROFILE_PICTURE', null, req);

    res.json({ success: true, message: 'Profile picture updated.', data: { profilePicture: relativePath } });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, uploadPicture };
