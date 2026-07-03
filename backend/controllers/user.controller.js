/**
 * Shared controller factory for managing users of a specific role
 * (student, examiner, invigilator). Used by student/examiner/invigilator
 * routes so admin gets full CRUD + search + activate/deactivate + reset
 * password for each, without duplicating the same logic three times.
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../config/db');
const logActivity = require('../utils/logActivity');
const { createNotification } = require('../utils/notify');
const sendEmail = require('../utils/sendEmail');

function makeUserController(role) {
  return {
    // GET /api/{role}s?search=&page=&limit=&programmeId=&level=&status=
    async list(req, res, next) {
      try {
        const { search = '', page = 1, limit = 20, programmeId, level, status } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const conditions = ['role = ?'];
        const params = [role];

        if (search) {
          conditions.push('(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)');
          params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (programmeId) {
          conditions.push('programme_id = ?');
          params.push(programmeId);
        }
        if (level) {
          conditions.push('level = ?');
          params.push(level);
        }
        if (status === 'active') conditions.push('is_active = 1');
        if (status === 'inactive') conditions.push('is_active = 0');

        const whereClause = conditions.join(' AND ');

        const [rows] = await pool.query(
          `SELECT id, full_name, email, phone, role, programme_id, level, index_number,
                  staff_id, profile_picture, is_active, is_verified, created_at
           FROM users WHERE ${whereClause}
           ORDER BY created_at DESC
           LIMIT ? OFFSET ?`,
          [...params, Number(limit), offset]
        );

        const [countRows] = await pool.query(
          `SELECT COUNT(*) AS total FROM users WHERE ${whereClause}`,
          params
        );

        res.json({
          success: true,
          data: rows,
          pagination: {
            total: countRows[0].total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(countRows[0].total / Number(limit)),
          },
        });
      } catch (err) {
        next(err);
      }
    },

    // GET /api/{role}s/:id
    async getOne(req, res, next) {
      try {
        const [rows] = await pool.query(
          `SELECT id, full_name, email, phone, role, programme_id, level, index_number,
                  staff_id, profile_picture, is_active, is_verified, created_at
           FROM users WHERE id = ? AND role = ? LIMIT 1`,
          [req.params.id, role]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: `${role} not found.` });
        res.json({ success: true, data: rows[0] });
      } catch (err) {
        next(err);
      }
    },

    // POST /api/{role}s
    async create(req, res, next) {
      try {
        const { fullName, email, phone, programmeId, level, indexNumber, staffId } = req.body;

        if (!fullName || !email || !phone) {
          return res.status(400).json({ success: false, message: 'Full name, email and phone are required.' });
        }

        const [existing] = await pool.query('SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1', [email, phone]);
        if (existing.length > 0) {
          return res.status(409).json({ success: false, message: 'Email or phone already in use.' });
        }

        const tempPassword = crypto.randomBytes(4).toString('hex') + 'A1';
        const hashed = await bcrypt.hash(tempPassword, 12);

        const [result] = await pool.query(
          `INSERT INTO users (full_name, email, phone, password, role, programme_id, level, index_number, staff_id, is_verified, must_change_password)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
          [fullName, email, phone, hashed, role, programmeId || null, level || null, indexNumber || null, staffId || null]
        );

        await logActivity(req.user.id, `CREATE_${role.toUpperCase()}`, `Created ${role} #${result.insertId}`, req);
        await createNotification(result.insertId, 'Account created', `Your ${role} account has been created. Please change your temporary password after logging in.`);
        await sendEmail({
          to: email,
          subject: 'Your account has been created',
          html: `<p>Hello ${fullName},</p><p>Your ${role} account has been created.</p><p>Email: ${email}<br/>Temporary password: ${tempPassword}</p><p>Please log in and change your password immediately.</p>`,
        });

        res.status(201).json({
          success: true,
          message: `${role} created successfully. Temporary password sent by email.`,
          data: { id: result.insertId, fullName, email, phone, role, tempPassword },
        });
      } catch (err) {
        next(err);
      }
    },

    // PUT /api/{role}s/:id
    async update(req, res, next) {
      try {
        const { fullName, email, phone, programmeId, level, indexNumber, staffId } = req.body;

        const [existing] = await pool.query('SELECT id FROM users WHERE id = ? AND role = ? LIMIT 1', [req.params.id, role]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: `${role} not found.` });

        await pool.query(
          `UPDATE users SET full_name = COALESCE(?, full_name), email = COALESCE(?, email),
             phone = COALESCE(?, phone), programme_id = ?, level = COALESCE(?, level),
             index_number = COALESCE(?, index_number), staff_id = COALESCE(?, staff_id)
           WHERE id = ?`,
          [fullName, email, phone, programmeId || null, level, indexNumber, staffId, req.params.id]
        );

        await logActivity(req.user.id, `UPDATE_${role.toUpperCase()}`, `Updated ${role} #${req.params.id}`, req);
        res.json({ success: true, message: `${role} updated successfully.` });
      } catch (err) {
        next(err);
      }
    },

    // DELETE /api/{role}s/:id
    async remove(req, res, next) {
      try {
        const [result] = await pool.query('DELETE FROM users WHERE id = ? AND role = ?', [req.params.id, role]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: `${role} not found.` });

        await logActivity(req.user.id, `DELETE_${role.toUpperCase()}`, `Deleted ${role} #${req.params.id}`, req);
        res.json({ success: true, message: `${role} deleted successfully.` });
      } catch (err) {
        next(err);
      }
    },

    // PATCH /api/{role}s/:id/status  { isActive: true|false }
    async toggleStatus(req, res, next) {
      try {
        const { isActive } = req.body;
        const [result] = await pool.query('UPDATE users SET is_active = ? WHERE id = ? AND role = ?', [
          isActive ? 1 : 0,
          req.params.id,
          role,
        ]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: `${role} not found.` });

        await logActivity(req.user.id, `TOGGLE_STATUS_${role.toUpperCase()}`, `Set is_active=${isActive} for #${req.params.id}`, req);
        res.json({ success: true, message: `${role} ${isActive ? 'activated' : 'deactivated'} successfully.` });
      } catch (err) {
        next(err);
      }
    },

    // POST /api/{role}s/:id/reset-password
    async resetPassword(req, res, next) {
      try {
        const [rows] = await pool.query('SELECT email, full_name FROM users WHERE id = ? AND role = ? LIMIT 1', [
          req.params.id,
          role,
        ]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: `${role} not found.` });

        const tempPassword = crypto.randomBytes(4).toString('hex') + 'A1';
        const hashed = await bcrypt.hash(tempPassword, 12);

        await pool.query('UPDATE users SET password = ?, must_change_password = 1 WHERE id = ?', [hashed, req.params.id]);
        await logActivity(req.user.id, `RESET_PASSWORD_${role.toUpperCase()}`, `Reset password for #${req.params.id}`, req);
        await sendEmail({
          to: rows[0].email,
          subject: 'Your password has been reset',
          html: `<p>Hello ${rows[0].full_name},</p><p>Your temporary password is: ${tempPassword}</p><p>Please log in and change it immediately.</p>`,
        });

        res.json({ success: true, message: 'Password reset. Temporary password sent by email.' });
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = makeUserController;
