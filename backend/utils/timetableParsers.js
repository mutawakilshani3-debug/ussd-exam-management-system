const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_RANGE_RE = /^(\d{1,2}:\d{2}[ap])\s*-\s*(\d{1,2}:\d{2}[ap])$/i;
const COURSE_CODE_RE = /^([A-Z]{2,4}\s?\d{3})\s*Lec\s*\d+[a-z]?$/i;
const ROOM_META_RE = /^\(\d+,\s*[\d.]+\)$/;

function parseSpreadsheet(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return json
    .map((row) => {
      const normalized = {};
      Object.keys(row).forEach((key) => {
        normalized[key.trim().toLowerCase().replace(/\s+/g, '_')] = String(row[key]).trim();
      });
      return {
        course_code: normalized.course_code || normalized.coursecode || normalized.code || '',
        day: normalized.day || '',
        start_time: normalized.start_time || normalized.starttime || '',
        end_time: normalized.end_time || normalized.endtime || '',
        venue: normalized.venue || normalized.room || '',
        lecturer: normalized.lecturer || normalized.lecturer_name || '',
      };
    })
    .filter((r) => r.course_code && r.day && r.start_time && r.end_time && r.venue);
}

async function parsePdf(buffer) {
  const data = await pdfParse(buffer);
  const lines = data.text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = [];
  let currentDay = null;
  let currentVenue = null;
  let pendingCourse = null;
  let pendingTimeRange = null;

  const flushPending = (lecturerLines) => {
    if (pendingCourse && pendingTimeRange && currentDay && currentVenue) {
      rows.push({
        course_code: pendingCourse,
        day: currentDay,
        start_time: pendingTimeRange.start,
        end_time: pendingTimeRange.end,
        venue: currentVenue,
        lecturer: lecturerLines.join(', ') || null,
      });
    }
    pendingCourse = null;
    pendingTimeRange = null;
  };

  let lecturerBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (DAYS.includes(line)) {
      flushPending(lecturerBuffer);
      lecturerBuffer = [];
      currentDay = line;
      currentVenue = null;
      continue;
    }

    if (ROOM_META_RE.test(line)) {
      flushPending(lecturerBuffer);
      lecturerBuffer = [];
      currentVenue = lines[i - 1];
      continue;
    }

    if (/^7:00 am/.test(line) || line.includes('noon')) {
      continue;
    }

    const courseMatch = line.match(COURSE_CODE_RE);
    if (courseMatch) {
      flushPending(lecturerBuffer);
      lecturerBuffer = [];
      pendingCourse = courseMatch[1].replace(/\s+/g, '');
      continue;
    }

    if (TIME_RANGE_RE.test(line)) {
      const [, start, end] = line.match(TIME_RANGE_RE);
      pendingTimeRange = { start, end };
      continue;
    }

    if (pendingCourse) {
      lecturerBuffer.push(line);
    }
  }
  flushPending(lecturerBuffer);

  return rows;
}

/**
 * Parses the National Service class list PDF.
 *
 * The raw text pdf-parse extracts has NO reliable line boundaries: columns
 * within a record are sometimes concatenated with zero spaces (e.g.
 * "AMOAKOJESSICA1998-02-11"), and at every page break the repeating
 * header/footer banner gets glued onto the same line as the next record's
 * serial number, corrupting that line entirely.
 *
 * Instead of matching whole lines, this scans the ENTIRE document as one
 * continuous stream and anchors on the one pattern that's always reliable:
 * an 11-digit index number starting with "20" (e.g. 20240212023). Whatever
 * junk text (serial numbers, page headers/footers) sits before that pattern
 * is simply skipped over rather than requiring a clean line start, so page
 * breaks no longer cause records to be dropped.
 */
async function parseNationalServicePdf(buffer) {
  const data = await pdfParse(buffer);
  const text = data.text.replace(/\r/g, ' ').replace(/\n/g, ' ');

  const RECORD_RE = /(20\d{9})([A-Za-z][A-Za-z\-'\s]*?)\s*(\d{4}-\d{2}-\d{2})\s*([A-Za-z0-9.\-\s]*?)\s*(DEGREE|DIPLOMA)/g;

  const rows = [];
  let match;
  while ((match = RECORD_RE.exec(text)) !== null) {
    const [, indexNo, fullName, dob, course, qualification] = match;

    rows.push({
      index_no: indexNo,
      surname: fullName.trim(),
      other_names: '',
      date_of_birth: dob,
      course_of_study: course.trim().replace(/\s+/g, ' '),
      qualification,
    });
  }
  return rows;
}

module.exports = { parseSpreadsheet, parsePdf, parseNationalServicePdf };
