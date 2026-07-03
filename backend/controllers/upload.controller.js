const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../config/db');
const logActivity = require('../utils/logActivity');

const TEMPLATE_COLUMNS = {
  students: ['fullName', 'email', 'phone', 'indexNumber', 'programmeName', 'level'],
  examiners: ['fullName', 'email', 'phone', 'staffId'],
  invigilators: ['fullName', 'email', 'phone', 'staffId'],
};

function readRowsFromFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
}

// GET /api/uploads/:type/template  -> downloadable sample CSV
async function downloadTemplate(req, res) {
  const { type } = req.params;
  const columns = TEMPLATE_COLUMNS[type];
  if (!columns) return res.status(400).json({ success: false, message: 'Invalid import type.' });

  const worksheet = XLSX.utils.aoa_to_sheet([columns]);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}-import-template.csv"`);
  res.send(csv);
}

// POST /api/uploads/:type/preview  -> parses file, returns rows + validation errors without saving
async function preview(req, res, next) {
  try {
    const { type } = req.params;
    const columns = TEMPLATE_COLUMNS[type];
    if (!columns) return res.status(400).json({ success: false, message: 'Invalid import type.' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const rows = readRowsFromFile(req.file.path);
    const seenEmails = new Set();
    const seenPhones = new Set();

    const [existingUsers] = await pool.query('SELECT email, phone FROM users');
    const existingEmails = new Set(existingUsers.map((u) => u.email));
    const existingPhones = new Set(existingUsers.map((u) => u.phone));

    const validated = rows.map((row, index) => {
      const errors = [];
      if (!row.fullName) errors.push('Missing fullName');
      if (!row.email) errors.push('Missing email');
      if (!row.phone) errors.push('Missing phone');
      if (row.email && (seenEmails.has(row.email) || existingEmails.has(row.email))) errors.push('Duplicate email');
      if (row.phone && (seenPhones.has(row.phone) || existingPhones.has(row.phone))) errors.push('Duplicate phone');

      if (row.email) seenEmails.add(row.email);
      if (row.phone) seenPhones.add(row.phone);

      return { rowNumber: index + 2, ...row, valid: errors.length === 0, errors };
    });

    res.json({
      success: true,
      filePath: req.file.path,
      fileName: req.file.filename,
      totalRows: validated.length,
      validRows: validated.filter((r) => r.valid).length,
      invalidRows: validated.filter((r) => !r.valid).length,
      data: validated,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/uploads/:type/import  { fileName } -> imports only valid rows
async function importFile(req, res, next) {
  try {
    const { type } = req.params;
    const { fileName } = req.body;
    const role = type.slice(0, -1); // 'students' -> 'student'

    if (!TEMPLATE_COLUMNS[type]) return res.status(400).json({ success: false, message: 'Invalid import type.' });
    if (!fileName) return res.status(400).json({ success: false, message: 'fileName is required (from the preview step).' });

    const filePath = path.join(__dirname, '..', 'uploads', 'bulk', fileName);
    if (!fs.existsSync(filePath)) return res.status(400).json({ success: false, message: 'Uploaded file not found. Please re-upload.' });

    const rows = readRowsFromFile(filePath);

    let successCount = 0;
    const errorReport = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        if (!row.fullName || !row.email || !row.phone) throw new Error('Missing required field(s).');

        const [existing] = await pool.query('SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1', [row.email, row.phone]);
        if (existing.length > 0) throw new Error('Duplicate email or phone.');

        let programmeId = null;
        if (row.programmeName) {
          const [prog] = await pool.query('SELECT id FROM programmes WHERE name = ? LIMIT 1', [row.programmeName]);
          if (prog.length > 0) programmeId = prog[0].id;
        }

        const tempPassword = crypto.randomBytes(4).toString('hex') + 'A1';
        const hashed = await bcrypt.hash(tempPassword, 12);

        await pool.query(
          `INSERT INTO users (full_name, email, phone, password, role, programme_id, level, index_number, staff_id, is_verified, must_change_password)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
          [row.fullName, row.email, row.phone, hashed, role, programmeId, row.level || null, row.indexNumber || null, row.staffId || null]
        );

        successCount += 1;
      } catch (rowErr) {
        errorReport.push({ rowNumber: i + 2, email: row.email, error: rowErr.message });
      }
    }

    await pool.query(
      `INSERT INTO file_upload_logs (uploaded_by, file_name, import_type, total_rows, success_count, error_count, error_report)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, fileName, type, rows.length, successCount, errorReport.length, JSON.stringify(errorReport)]
    );

    await logActivity(req.user.id, `BULK_IMPORT_${type.toUpperCase()}`, `${successCount}/${rows.length} imported`, req);

    res.json({
      success: true,
      message: `Import complete: ${successCount} of ${rows.length} records imported.`,
      successCount,
      errorCount: errorReport.length,
      errors: errorReport,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { downloadTemplate, preview, importFile };
