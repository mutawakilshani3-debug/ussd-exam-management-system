const { pool } = require('../config/db');
const { parseSpreadsheet, parseNationalServicePdf } = require('../utils/timetableParsers');
const path = require('path');

/**
 * POST /api/national-service/upload
 * Admin only. Accepts CSV, Excel, or PDF.
 * CSV/Excel columns: index_no, surname, other_names, date_of_birth, course_of_study, qualification
 */
async function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    let rows = [];

    if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
      const raw = parseSpreadsheet(req.file.buffer);
      rows = raw.map((r) => ({
        index_no: r.course_code || r.index_no || '',
        surname: r.day || r.surname || '',
        other_names: r.start_time || r.other_names || '',
        date_of_birth: r.end_time || r.date_of_birth || '',
        course_of_study: r.venue || r.course_of_study || '',
        qualification: r.lecturer || r.qualification || '',
      }));
      // Note: if uploading a dedicated CSV, use headers: index_no, surname, other_names, date_of_birth, course_of_study, qualification
    } else if (ext === '.pdf') {
      rows = await parseNationalServicePdf(req.file.buffer);
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported file type.' });
    }

    rows = rows.filter((r) => r.index_no && r.surname);

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid records could be extracted from this file.' });
    }

    const replaceAll = req.query.replaceAll === 'true';

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      if (replaceAll) {
        await conn.query('DELETE FROM national_service_records');
      }
      for (const r of rows) {
        await conn.query(
          `INSERT INTO national_service_records (index_no, surname, other_names, date_of_birth, course_of_study, qualification)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            r.index_no.trim().slice(0, 20),
            r.surname.trim().slice(0, 100),
            (r.other_names || '').trim().slice(0, 150),
            (r.date_of_birth || '').trim().slice(0, 20),
            (r.course_of_study || '').trim().slice(0, 200),
            (r.qualification || '').trim().slice(0, 30),
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

    res.json({ success: true, message: `Imported ${rows.length} record(s) from ${req.file.originalname}.` });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/national-service/list
 * Admin only.
 */
async function list(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM national_service_records ORDER BY surname LIMIT 3000');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/national-service
 * Admin only.
 */
async function removeAll(req, res, next) {
  try {
    await pool.query('DELETE FROM national_service_records');
    res.json({ success: true, message: 'All records cleared.' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/national-service/public/search?indexNo=20240212023
 * Public. No login needed.
 */
async function searchByIndex(req, res, next) {
  try {
    const { indexNo } = req.query;
    if (!indexNo || !indexNo.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter your index number.' });
    }

    const [rows] = await pool.query(
      'SELECT index_no, surname, other_names, date_of_birth, course_of_study, qualification, service_year FROM national_service_records WHERE index_no = ? LIMIT 1',
      [indexNo.trim()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No record found for that index number. Please check and try again.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/national-service/debug-parse
 * Admin only. TEMPORARY diagnostic endpoint - returns the raw text pdf-parse
 * extracts from the uploaded file, so we can see its actual structure and
 * tune the parsing regex. Remove this route once parsing is confirmed working.
 */
async function debugParse(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(req.file.buffer);
    res.json({ success: true, textSample: data.text.slice(0, 3000) });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadFile, list, removeAll, searchByIndex, debugParse };
