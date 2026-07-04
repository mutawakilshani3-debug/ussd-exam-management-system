const { pool } = require('../config/db');
const logActivity = require('../utils/logActivity');
const { notifyMany } = require('../utils/notify');
const sendEmail = require('../utils/sendEmail');
const sendSms = require('../utils/sendSms');

const BASE_SELECT = `
  SELECT t.id, t.exam_date, t.exam_day, t.venue, t.start_time, t.end_time, t.status,
         c.id AS course_id, c.code AS course_code, c.name AS course_name, c.level, c.semester,
         p.id AS programme_id, p.name AS programme_name,
         ex.id AS examiner_id, ex.full_name AS examiner_name,
         iv.id AS invigilator_id, iv.full_name AS invigilator_name
  FROM exam_timetable t
  JOIN courses c ON c.id = t.course_id
  JOIN programmes p ON p.id = c.programme_id
  LEFT JOIN users ex ON ex.id = t.examiner_id
  LEFT JOIN users iv ON iv.id = t.invigilator_id
`;

// GET /api/timetable  (role-aware: students only see published exams for their programme/level)
async function list(req, res, next) {
  try {
    const { search = '', status, date, programmeId, level, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions = ['1=1'];
    const params = [];

    if (req.user.role === 'student') {
      conditions.push('t.status = "published"');
      if (req.user.programme_id) {
        conditions.push('c.programme_id = ?');
        params.push(req.user.programme_id);
      }
      if (req.user.level) {
        conditions.push('c.level = ?');
        params.push(req.user.level);
      }
    } else if (req.user.role === 'examiner') {
      conditions.push('t.examiner_id = ?');
      params.push(req.user.id);
    } else if (req.user.role === 'invigilator') {
      conditions.push('t.invigilator_id = ?');
      params.push(req.user.id);
    } else {
      // admin: optional filters
      if (status) {
        conditions.push('t.status = ?');
        params.push(status);
      }
      if (programmeId) {
        conditions.push('c.programme_id = ?');
        params.push(programmeId);
      }
      if (level) {
        conditions.push('c.level = ?');
        params.push(level);
      }
    }

    if (search) {
      conditions.push('(c.code LIKE ? OR c.name LIKE ? OR t.venue LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (date) {
      conditions.push('t.exam_date = ?');
      params.push(date);
    }

    const where = conditions.join(' AND ');

    const [rows] = await pool.query(
      `${BASE_SELECT} WHERE ${where} ORDER BY t.exam_date ASC, t.start_time ASC LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM exam_timetable t JOIN courses c ON c.id = t.course_id WHERE ${where}`,
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
}

async function getOne(req, res, next) {
  try {
    const [rows] = await pool.query(`${BASE_SELECT} WHERE t.id = ? LIMIT 1`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Timetable entry not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

// POST /api/timetable  - Admin creates; Examiner can propose (status stays draft)
async function create(req, res, next) {
  try {
    const { courseId, examDate, examDay, venue, startTime, endTime, examinerId, invigilatorId } = req.body;

    if (!courseId || !examDate || !examDay || !venue || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'courseId, examDate, examDay, venue, startTime and endTime are required.' });
    }

    // Basic venue/time clash detection.
    const [clashes] = await pool.query(
      `SELECT id FROM exam_timetable
       WHERE venue = ? AND exam_date = ? AND status != 'archived'
       AND ((start_time < ? AND end_time > ?) OR (start_time >= ? AND start_time < ?))`,
      [venue, examDate, endTime, startTime, startTime, endTime]
    );
    if (clashes.length > 0) {
      return res.status(409).json({ success: false, message: 'This venue is already booked for an overlapping time on that date.' });
    }

    const status = req.user.role === 'admin' ? (req.body.status || 'draft') : 'draft';

    const [result] = await pool.query(
      `INSERT INTO exam_timetable (course_id, exam_date, exam_day, venue, start_time, end_time, examiner_id, invigilator_id, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [courseId, examDate, examDay, venue, startTime, endTime, examinerId || null, invigilatorId || null, status, req.user.id]
    );

    await logActivity(req.user.id, 'CREATE_TIMETABLE', `Created timetable entry #${result.insertId}`, req);
    res.status(201).json({ success: true, message: 'Timetable entry created.', data: { id: result.insertId } });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { examDate, examDay, venue, startTime, endTime, examinerId, invigilatorId, courseId } = req.body;

    const [result] = await pool.query(
      `UPDATE exam_timetable SET
         course_id = COALESCE(?, course_id), exam_date = COALESCE(?, exam_date),
         exam_day = COALESCE(?, exam_day), venue = COALESCE(?, venue),
         start_time = COALESCE(?, start_time), end_time = COALESCE(?, end_time),
         examiner_id = ?, invigilator_id = ?
       WHERE id = ?`,
      [courseId, examDate, examDay, venue, startTime, endTime, examinerId || null, invigilatorId || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Timetable entry not found.' });

    await logActivity(req.user.id, 'UPDATE_TIMETABLE', `Updated timetable entry #${req.params.id}`, req);
    res.json({ success: true, message: 'Timetable entry updated.' });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const [result] = await pool.query('DELETE FROM exam_timetable WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Timetable entry not found.' });

    await logActivity(req.user.id, 'DELETE_TIMETABLE', `Deleted timetable entry #${req.params.id}`, req);
    res.json({ success: true, message: 'Timetable entry deleted.' });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/timetable/:id/publish
async function publish(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, c.programme_id, c.level, c.code, c.name FROM exam_timetable t
       JOIN courses c ON c.id = t.course_id WHERE t.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Timetable entry not found.' });

        await pool.query('UPDATE exam_timetable SET status = "published" WHERE id = ?', [req.params.id]);

    const entry = rows[0];
    const [students] = await pool.query(
      'SELECT id, full_name, email, phone FROM users WHERE role = "student" AND programme_id = ? AND level = ?',
      [entry.programme_id, entry.level]
    );

    const message = `${entry.code} - ${entry.name} has been scheduled on ${entry.exam_date} at ${entry.venue}, ${entry.start_time}-${entry.end_time}.`;

    await notifyMany(
      students.map((s) => s.id),
      'New exam timetable published',
      message
    );

    // Best-effort email + SMS delivery. Failures are logged but never block the publish action.
    await Promise.all(
      students.map(async (student) => {
        await sendEmail({
          to: student.email,
          subject: 'New Exam Timetable Published',
          html: `<p>Hello ${student.full_name},</p><p>${message}</p>`,
        }).catch((err) => console.error(`Email failed for ${student.email}:`, err.message));

        await sendSms(student.phone, `Exam Alert: ${message}`).catch((err) =>
          console.error(`SMS failed for ${student.phone}:`, err.message)
        );
      })
    );

    await logActivity(req.user.id, 'PUBLISH_TIMETABLE', `Published timetable entry #${req.params.id}`, req);
    res.json({
      success: true,
      message: `Timetable entry published. ${students.length} student(s) notified in-app, by email, and by SMS.`,
    });

  } catch (err) {
    next(err);
  }
}

// PATCH /api/timetable/:id/archive
async function archive(req, res, next) {
  try {
    const [result] = await pool.query('UPDATE exam_timetable SET status = "archived" WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Timetable entry not found.' });

    await logActivity(req.user.id, 'ARCHIVE_TIMETABLE', `Archived timetable entry #${req.params.id}`, req);
    res.json({ success: true, message: 'Timetable entry archived.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove, publish, archive };
