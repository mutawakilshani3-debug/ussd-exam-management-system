const { pool } = require('../config/db');
const logActivity = require('../utils/logActivity');

// GET /api/courses?search=&programmeId=&level=&semester=&page=&limit=
async function list(req, res, next) {
  try {
    const { search = '', programmeId, level, semester, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions = ['1=1'];
    const params = [];

    if (search) {
      conditions.push('(c.code LIKE ? OR c.name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (programmeId) {
      conditions.push('c.programme_id = ?');
      params.push(programmeId);
    }
    if (level) {
      conditions.push('c.level = ?');
      params.push(level);
    }
    if (semester) {
      conditions.push('c.semester = ?');
      params.push(semester);
    }

    const where = conditions.join(' AND ');

    const [rows] = await pool.query(
      `SELECT c.*, p.name AS programme_name
       FROM courses c
       LEFT JOIN programmes p ON p.id = c.programme_id
       WHERE ${where}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM courses c WHERE ${where}`, params);

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
}

async function getOne(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, p.name AS programme_name FROM courses c
       LEFT JOIN programmes p ON p.id = c.programme_id WHERE c.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Course not found.' });

    const [examiners] = await pool.query(
      `SELECT u.id, u.full_name, u.email FROM course_examiners ce
       JOIN users u ON u.id = ce.examiner_id WHERE ce.course_id = ?`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...rows[0], examiners } });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { code, name, programmeId, level, semester, examinerIds = [] } = req.body;
    if (!code || !name || !programmeId || !level || !semester) {
      return res.status(400).json({ success: false, message: 'code, name, programmeId, level and semester are required.' });
    }

    const [result] = await pool.query(
      'INSERT INTO courses (code, name, programme_id, level, semester) VALUES (?, ?, ?, ?, ?)',
      [code, name, programmeId, level, semester]
    );

    if (examinerIds.length > 0) {
      const values = examinerIds.map((eid) => [result.insertId, eid]);
      await pool.query('INSERT INTO course_examiners (course_id, examiner_id) VALUES ?', [values]);
    }

    await logActivity(req.user.id, 'CREATE_COURSE', `Created course ${code}`, req);
    res.status(201).json({ success: true, message: 'Course created successfully.', data: { id: result.insertId } });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { code, name, programmeId, level, semester } = req.body;
    const [result] = await pool.query(
      `UPDATE courses SET code = COALESCE(?, code), name = COALESCE(?, name),
       programme_id = COALESCE(?, programme_id), level = COALESCE(?, level), semester = COALESCE(?, semester)
       WHERE id = ?`,
      [code, name, programmeId, level, semester, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Course not found.' });

    await logActivity(req.user.id, 'UPDATE_COURSE', `Updated course #${req.params.id}`, req);
    res.json({ success: true, message: 'Course updated successfully.' });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const [result] = await pool.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Course not found.' });

    await logActivity(req.user.id, 'DELETE_COURSE', `Deleted course #${req.params.id}`, req);
    res.json({ success: true, message: 'Course deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/courses/mine - for logged-in examiner
async function myCourses(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT c.* FROM courses c
       JOIN course_examiners ce ON ce.course_id = c.id
       WHERE ce.examiner_id = ? ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove, myCourses };
