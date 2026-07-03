const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const { pool } = require('../config/db');

const REPORT_QUERIES = {
  students: `SELECT u.full_name, u.email, u.phone, u.index_number, p.name AS programme, u.level, u.is_active
             FROM users u LEFT JOIN programmes p ON p.id = u.programme_id WHERE u.role = 'student' ORDER BY u.full_name`,
  examiners: `SELECT full_name, email, phone, staff_id, is_active FROM users WHERE role = 'examiner' ORDER BY full_name`,
  invigilators: `SELECT full_name, email, phone, staff_id, is_active FROM users WHERE role = 'invigilator' ORDER BY full_name`,
  timetable: `SELECT c.code, c.name AS course_name, t.exam_date, t.exam_day, t.venue, t.start_time, t.end_time,
                     ex.full_name AS examiner, iv.full_name AS invigilator, t.status
              FROM exam_timetable t
              JOIN courses c ON c.id = t.course_id
              LEFT JOIN users ex ON ex.id = t.examiner_id
              LEFT JOIN users iv ON iv.id = t.invigilator_id
              ORDER BY t.exam_date, t.start_time`,
  'upcoming-exams': `SELECT c.code, c.name AS course_name, t.exam_date, t.exam_day, t.venue, t.start_time, t.end_time
                     FROM exam_timetable t JOIN courses c ON c.id = t.course_id
                     WHERE t.exam_date >= CURDATE() AND t.status = 'published'
                     ORDER BY t.exam_date, t.start_time`,
  'completed-exams': `SELECT c.code, c.name AS course_name, t.exam_date, t.exam_day, t.venue
                      FROM exam_timetable t JOIN courses c ON c.id = t.course_id
                      WHERE t.exam_date < CURDATE()
                      ORDER BY t.exam_date DESC`,
};

const REPORT_TITLES = {
  students: 'Student List',
  examiners: 'Examiner List',
  invigilators: 'Invigilator List',
  timetable: 'Examination Timetable',
  'upcoming-exams': 'Upcoming Exams',
  'completed-exams': 'Completed Exams',
};

async function fetchReportRows(type) {
  const query = REPORT_QUERIES[type];
  if (!query) return null;
  const [rows] = await pool.query(query);
  return rows;
}

// GET /api/reports/:type/:format(csv|excel|pdf)
async function generate(req, res, next) {
  try {
    const { type, format } = req.params;
    const rows = await fetchReportRows(type);

    if (rows === null) {
      return res.status(400).json({ success: false, message: `Unknown report type: ${type}` });
    }
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No data available for this report.' });
    }

    const title = REPORT_TITLES[type];
    const filenameBase = `${type}-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'csv') {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.csv"`);
      return res.send(csv);
    }

    if (format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, title.substring(0, 31));
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.xlsx"`);
      return res.send(buffer);
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.pdf"`);
      doc.pipe(res);

      doc.fontSize(16).text('MUTA - USSD Exam Management System', { align: 'center' });
      doc.fontSize(13).text(title, { align: 'center' });
      doc.moveDown();

      const columns = Object.keys(rows[0]);
      const colWidth = (doc.page.width - 80) / columns.length;

      doc.fontSize(9).font('Helvetica-Bold');
      columns.forEach((col, i) => {
        doc.text(col.replace(/_/g, ' ').toUpperCase(), 40 + i * colWidth, doc.y, { width: colWidth, continued: false });
      });
      doc.moveDown(0.5);
      doc.font('Helvetica');

      rows.forEach((row) => {
        const y = doc.y;
        columns.forEach((col, i) => {
          doc.text(String(row[col] ?? ''), 40 + i * colWidth, y, { width: colWidth });
        });
        doc.moveDown(0.3);
        if (doc.y > doc.page.height - 60) doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
      });

      return doc.end();
    }

    res.status(400).json({ success: false, message: `Unsupported format: ${format}. Use csv, excel or pdf.` });
  } catch (err) {
    next(err);
  }
}

module.exports = { generate };
