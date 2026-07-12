const { pool } = require('../config/db');

/**
 * POST /api/ussd
 * Africa's Talking sends: sessionId, serviceCode, phoneNumber, text
 * text accumulates each step, separated by '*', e.g. "1*DIT202"
 */
async function handleUssd(req, res, next) {
  try {
    const { text = '' } = req.body;
    const parts = text.split('*').filter(Boolean);
    let response = '';

    if (text === '') {
      response = `CON Welcome to MUTA
1. Check exam timetable
2. Check National Service status
3. Check school timetable`;
    } else if (parts[0] === '1' && parts.length === 1) {
      response = `CON Enter your course code (e.g. DIT202)`;
    } else if (parts[0] === '1' && parts.length === 2) {
      const courseCode = parts[1].trim().toUpperCase();
      const [rows] = await pool.query(
        `SELECT t.exam_date, t.exam_day, t.start_time, t.end_time, t.venue, c.course_name
         FROM timetables t JOIN courses c ON t.course_id = c.id
         WHERE c.course_code = ? AND t.status = 'published' LIMIT 1`,
        [courseCode]
      );
      if (rows.length === 0) {
        response = `END No published exam found for ${courseCode}.`;
      } else {
        const r = rows[0];
        response = `END ${courseCode} - ${r.course_name}
${r.exam_day} ${r.exam_date}
${r.start_time} - ${r.end_time}
Venue: ${r.venue}`;
      }
    } else if (parts[0] === '2' && parts.length === 1) {
      response = `CON Enter your index number`;
    } else if (parts[0] === '2' && parts.length === 2) {
      const indexNo = parts[1].trim();
      const [rows] = await pool.query(
        'SELECT surname, course_of_study, qualification, service_year FROM national_service_records WHERE index_no = ? LIMIT 1',
        [indexNo]
      );
      if (rows.length === 0) {
        response = `END No record found for index number ${indexNo}.`;
      } else {
        const r = rows[0];
        response = `END ${r.surname}
${r.course_of_study}
${r.qualification} - ${r.service_year}`;
      }
    } else if (parts[0] === '3' && parts.length === 1) {
      response = `CON Enter your course codes separated by comma (e.g. DIT202,DMG202)`;
    } else if (parts[0] === '3' && parts.length === 2) {
      const codes = parts[1].split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
      if (codes.length === 0) {
        response = `END No course codes entered.`;
      } else {
        const placeholders = codes.map(() => '?').join(',');
        const [rows] = await pool.query(
          `SELECT course_code, day, start_time, end_time, venue FROM general_timetable WHERE course_code IN (${placeholders}) LIMIT 5`,
          codes
        );
        if (rows.length === 0) {
          response = `END No timetable entries found for those courses.`;
        } else {
          const lines = rows.map((r) => `${r.course_code} ${r.day} ${r.start_time}-${r.end_time} ${r.venue}`);
          response = `END ${lines.join('\n')}`;
        }
      }
    } else {
      response = `END Invalid selection.`;
    }

    res.set('Content-Type', 'text/plain');
    res.send(response);
  } catch (err) {
    console.error('USSD error:', err.message);
    res.set('Content-Type', 'text/plain');
    res.send('END Something went wrong. Please try again later.');
  }
}

module.exports = { handleUssd };
