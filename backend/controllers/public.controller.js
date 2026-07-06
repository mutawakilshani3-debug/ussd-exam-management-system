const { pool } = require('../config/db');

// GET /api/public/check?courseCode=DIT202
// Intentionally has no auth middleware - mirrors a USSD-style course-code check
// that any student can use without logging in.
async function checkByCourseCode(req, res, next) {
  try {
    const { courseCode } = req.query;
    if (!courseCode || !courseCode.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a course code.' });
    }

    const [rows] = await pool.query(
      `SELECT c.code AS course_code, c.name AS course_name, c.level, c.semester,
              p.name AS programme_name,
              t.exam_date, t.exam_day, t.venue, t.start_time, t.end_time,
              ex.full_name AS examiner_name, iv.full_name AS invigilator_name
       FROM courses c
       JOIN programmes p ON p.id = c.programme_id
       LEFT JOIN exam_timetable t ON t.course_id = c.id AND t.status = 'published'
       LEFT JOIN users ex ON ex.id = t.examiner_id
       LEFT JOIN users iv ON iv.id = t.invigilator_id
       WHERE c.code = ?
       LIMIT 1`,
      [courseCode.trim().toUpperCase()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No course found with that code.' });
    }

    const result = rows[0];

    if (!result.exam_date) {
      return res.json({
        success: true,
        published: false,
        message: 'This course exists but its exam has not been published yet.',
        data: { course_code: result.course_code, course_name: result.course_name },
      });
    }

    res.json({ success: true, published: true, data: result });
  } catch (err) {
    next(err);
  }
}

// GET /api/public/timetable?level=200&semester=1
async function getAllPublished(req, res, next) {
  try {
    const { level, semester } = req.query;

    let query = `
      SELECT c.code AS course_code, c.name AS course_name, c.level, c.semester,
             p.name AS programme_name,
             t.exam_date, t.exam_day, t.venue, t.start_time, t.end_time
      FROM exam_timetable t
      JOIN courses c ON c.id = t.course_id
      JOIN programmes p ON p.id = c.programme_id
      WHERE t.status = 'published'
    `;
    const params = [];

    if (level) { query += ' AND c.level = ?'; params.push(level); }
    if (semester) { query += ' AND c.semester = ?'; params.push(semester); }

    query += ' ORDER BY t.exam_date, t.start_time';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { checkByCourseCode, getAllPublished };

