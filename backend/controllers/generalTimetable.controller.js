const { pool } = require('../config/db');
const { parseSpreadsheet, parsePdf } = require('../utils/timetableParsers');
const path = require('path');
const notifyAllStudents = require('../utils/notifyStudents');

const DAY_ORDER = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };

function sortRows(rows) {
  return rows.sort((a, b) => {
    const dayDiff = (DAY_ORDER[a.day] || 99) - (DAY_ORDER[b.day] || 99);
    if (dayDiff !== 0) return dayDiff;
    return a.start_time.localeCompare(b.start_time);
  });
}

/**
 * POST /api/general-timetable/import
 * Body: { rows: [{ course_code, day, start_time, end_time, venue, lecturer }], replaceAll: true|false }
 * Admin only. Bulk-loads a new semester's timetable from JSON.
 */
async function bulkImport(req, res, next) {
  try {
    const { rows, replaceAll } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows provided.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (replaceAll) {
        await conn.query('DELETE FROM general_timetable');
      }

      for (const r of rows) {
        if (!r.course_code || !r.day || !r.start_time || !r.end_time || !r.venue) continue;
        await conn.query(
          `INSERT INTO general_timetable (course_code, day, start_time, end_time, venue, lecturer, academic_year, semester)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.course_code.trim().toUpperCase().slice(0, 30),
            r.day.trim(),
            r.start_time.trim(),
            r.end_time.trim(),
            r.venue.trim().slice(0, 200),
            r.lecturer ? r.lecturer.trim().slice(0, 500) : null,
            r.academic_year || '2025/2026',
            r.semester || 'Semester 2',
          ]
        );
      }

      await conn.commit();
      res.json({ success: true, message: `Imported ${rows.length} row(s).` });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/general-timetable
 * Admin only. Full list for the management page.
 */
async function list(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM general_timetable ORDER BY day, start_time LIMIT 2000');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/general-timetable
 * Admin only. Add a single entry.
 */
async function create(req, res, next) {
  try {
    const { course_code, day, start_time, end_time, venue, lecturer, academic_year, semester } = req.body;
    if (!course_code || !day || !start_time || !end_time || !venue) {
      return res.status(400).json({ success: false, message: 'Course code, day, start/end time, and venue are required.' });
    }
    const [result] = await pool.query(
      `INSERT INTO general_timetable (course_code, day, start_time, end_time, venue, lecturer, academic_year, semester)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        course_code.trim().toUpperCase().slice(0, 30),
        day,
        start_time,
        end_time,
        venue.slice(0, 200),
        lecturer ? lecturer.slice(0, 500) : null,
        academic_year || '2025/2026',
        semester || 'Semester 2',
      ]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/general-timetable/:id
 * Admin only.
 */
async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { course_code, day, start_time, end_time, venue, lecturer } = req.body;
    await pool.query(
      `UPDATE general_timetable SET course_code = ?, day = ?, start_time = ?, end_time = ?, venue = ?, lecturer = ? WHERE id = ?`,
      [
        course_code.trim().toUpperCase().slice(0, 30),
        day,
        start_time,
        end_time,
        venue.slice(0, 200),
        lecturer ? lecturer.slice(0, 500) : null,
        id,
      ]
    );
    res.json({ success: true, message: 'Entry updated.' });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/general-timetable/:id
 * Admin only.
 */
async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM general_timetable WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Entry deleted.' });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/general-timetable
 * Admin only. Wipes the whole table (e.g. before a fresh semester import).
 */
async function removeAll(req, res, next) {
  try {
    await pool.query('DELETE FROM general_timetable');
    res.json({ success: true, message: 'All entries cleared.' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/general-timetable/public/search?courses=DIT202,DMG202,DIT206
 * Public. Returns matching entries sorted by day/time.
 */
async function searchByCourses(req, res, next) {
  try {
    const { courses } = req.query;
    if (!courses) {
      return res.status(400).json({ success: false, message: 'Please provide at least one course code.' });
    }

    const codes = courses
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    if (codes.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one valid course code.' });
    }

    const placeholders = codes.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT course_code, day, start_time, end_time, venue, lecturer
       FROM general_timetable WHERE course_code IN (${placeholders})`,
      codes
    );

    const found = new Set(rows.map((r) => r.course_code));
    const notFound = codes.filter((c) => !found.has(c));

    res.json({ success: true, data: sortRows(rows), notFound });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/general-timetable/upload
 * Admin only. Accepts a CSV, Excel, or PDF file and imports it.
 * Query param ?replaceAll=true wipes existing data first.
 */
async function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    let rows = [];

    if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
      rows = parseSpreadsheet(req.file.buffer);
    } else if (ext === '.pdf') {
      rows = await parsePdf(req.file.buffer);
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported file type.' });
    }

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid rows could be extracted from this file. Please check the format.',
      });
    }

    const replaceAll = req.query.replaceAll === 'true';

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      if (replaceAll) {
        await conn.query('DELETE FROM general_timetable');
      }
      for (const r of rows) {
        await conn.query(
          `INSERT INTO general_timetable (course_code, day, start_time, end_time, venue, lecturer)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            r.course_code.toUpperCase().slice(0, 30),
            r.day,
            r.start_time,
            r.end_time,
            r.venue.slice(0, 200),
            r.lecturer ? r.lecturer.slice(0, 500) : null,
          ]
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    notifyAllStudents(
      'MUTA: A new school timetable has been uploaded. Check "Build My Timetable" in the app for your updated schedule.'
    ).catch((err) => console.error('Timetable notify failed:', err.message));

    res.json({ success: true, message: `Imported ${rows.length} row(s) from ${req.file.originalname}.` });
  } catch (err) {
    next(err);
  }
}

module.exports = { bulkImport, list, create, update, remove, removeAll, searchByCourses, uploadFile };
