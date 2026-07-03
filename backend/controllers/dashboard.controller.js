const { pool } = require('../config/db');

// GET /api/dashboard/admin
async function adminStats(req, res, next) {
  try {
    const [[students]] = await pool.query('SELECT COUNT(*) AS total FROM users WHERE role = "student"');
    const [[examiners]] = await pool.query('SELECT COUNT(*) AS total FROM users WHERE role = "examiner"');
    const [[invigilators]] = await pool.query('SELECT COUNT(*) AS total FROM users WHERE role = "invigilator"');
    const [[courses]] = await pool.query('SELECT COUNT(*) AS total FROM courses');
    const [[timetables]] = await pool.query('SELECT COUNT(*) AS total FROM exam_timetable');
    const [[upcoming]] = await pool.query(
      'SELECT COUNT(*) AS total FROM exam_timetable WHERE exam_date >= CURDATE() AND status = "published"'
    );
    const [[today]] = await pool.query(
      'SELECT COUNT(*) AS total FROM exam_timetable WHERE exam_date = CURDATE() AND status = "published"'
    );

    const [recentActivity] = await pool.query(
      `SELECT al.id, al.action, al.details, al.created_at, u.full_name, u.role
       FROM activity_logs al LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC LIMIT 15`
    );

    const [studentsByProgramme] = await pool.query(
      `SELECT p.name AS programme, COUNT(*) AS total
       FROM users u JOIN programmes p ON p.id = u.programme_id
       WHERE u.role = 'student' GROUP BY p.name`
    );

    const [examsByDay] = await pool.query(
      `SELECT exam_day, COUNT(*) AS total FROM exam_timetable GROUP BY exam_day`
    );

    const [examsByVenue] = await pool.query(
      `SELECT venue, COUNT(*) AS total FROM exam_timetable GROUP BY venue ORDER BY total DESC LIMIT 10`
    );

    const [invigilatorWorkload] = await pool.query(
      `SELECT u.full_name, COUNT(*) AS total FROM exam_timetable t
       JOIN users u ON u.id = t.invigilator_id GROUP BY u.full_name ORDER BY total DESC LIMIT 10`
    );

    const [examinerWorkload] = await pool.query(
      `SELECT u.full_name, COUNT(*) AS total FROM exam_timetable t
       JOIN users u ON u.id = t.examiner_id GROUP BY u.full_name ORDER BY total DESC LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        totals: {
          students: students.total,
          examiners: examiners.total,
          invigilators: invigilators.total,
          courses: courses.total,
          timetables: timetables.total,
          upcomingExams: upcoming.total,
          todaysExams: today.total,
        },
        recentActivity,
        charts: { studentsByProgramme, examsByDay, examsByVenue, invigilatorWorkload, examinerWorkload },
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { adminStats };
