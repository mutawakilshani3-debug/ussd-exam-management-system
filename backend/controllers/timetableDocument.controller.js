const { pool } = require('../config/db');
const pdfParse = require('pdf-parse');

const CATEGORIES = ['general', 'morning', 'afternoon'];

// POST /api/admin/timetable-documents/:category  (admin only)
async function uploadDocument(req, res, next) {
  try {
    const { category } = req.params;
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category.' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a PDF file.' });
    }

    let extractedText = '';
    try {
      const parsed = await pdfParse(req.file.buffer);
      extractedText = parsed.text || '';
    } catch (parseErr) {
      console.error('PDF parse error:', parseErr);
      // Continue anyway - document still gets stored, just without search support
    }

    await pool.query(
      `INSERT INTO timetable_documents (category, file_name, file_data, file_size, extracted_text, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         file_name = VALUES(file_name),
         file_data = VALUES(file_data),
         file_size = VALUES(file_size),
         extracted_text = VALUES(extracted_text),
         uploaded_by = VALUES(uploaded_by),
         uploaded_at = CURRENT_TIMESTAMP`,
      [category, req.file.originalname, req.file.buffer, req.file.size, extractedText, req.user.id]
    );

    res.json({ success: true, message: `${category} timetable uploaded successfully.` });
  } catch (err) {
    next(err);
  }
}

// GET /api/public/timetable-documents  (list what's available, no auth)
async function listDocuments(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT category, file_name, file_size, uploaded_at FROM timetable_documents`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/public/timetable-documents/:category/download  (no auth)
async function downloadDocument(req, res, next) {
  try {
    const { category } = req.params;
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category.' });
    }

    const [rows] = await pool.query(
      `SELECT file_name, file_data FROM timetable_documents WHERE category = ? LIMIT 1`,
      [category]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No document uploaded for this category yet.' });
    }

    const doc = rows[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.file_name}"`);
    res.send(doc.file_data);
  } catch (err) {
    next(err);
  }
}

// GET /api/public/timetable-documents/:category/search?courseCode=DIT202  (no auth)
async function searchDocument(req, res, next) {
  try {
    const { category } = req.params;
    const { courseCode } = req.query;

    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category.' });
    }
    if (!courseCode || !courseCode.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a course code.' });
    }

    const [rows] = await pool.query(
      `SELECT extracted_text, file_name, uploaded_at FROM timetable_documents WHERE category = ? LIMIT 1`,
      [category]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No document uploaded for this category yet.' });
    }

    const { extracted_text, file_name, uploaded_at } = rows[0];
    const code = courseCode.trim().toUpperCase();

    // Split into lines and find any line containing the course code
    const lines = extracted_text.split('\n');
    const matches = lines.filter((line) => line.toUpperCase().includes(code));

    if (matches.length === 0) {
      return res.json({
        success: true,
        found: false,
        message: `No entries found for "${code}" in the ${category} timetable.`,
      });
    }

    res.json({
      success: true,
      found: true,
      category,
      file_name,
      uploaded_at,
      matches,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadDocument, listDocuments, downloadDocument, searchDocument };
