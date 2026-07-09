const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_RANGE_RE = /^(\d{1,2}:\d{2}[ap])\s*-\s*(\d{1,2}:\d{2}[ap])$/i;
const COURSE_CODE_RE = /^([A-Z]{2,4}\s?\d{3})\s*Lec\s*\d+[a-z]?$/i;
const ROOM_META_RE = /^\(\d+,\s*[\d.]+\)$/;

/**
 * Parses CSV or Excel (.xlsx/.xls) files.
 * Expects a header row: course_code, day, start_time, end_time, venue, lecturer
 */
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

/**
 * Parses the master UTAS-style PDF timetable (day headers, room blocks,
 * course entries with time ranges and lecturer names).
 */
async function parsePdf(buffer) {
  const data = await pdfParse(buffer);
  const lines = data.text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = [];
  let currentDay = null;
  let currentVenue = null;
  let pendingCourse = null; // { course_code }
  let pendingTimeRange = null; // { start_time, end_time }

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

    // Day header
    if (DAYS.includes(line)) {
      flushPending(lecturerBuffer);
      lecturerBuffer = [];
      currentDay = line;
      currentVenue = null;
      continue;
    }

    // Room capacity/coordinate line marks that the PREVIOUS line was a room name
    if (ROOM_META_RE.test(line)) {
      flushPending(lecturerBuffer);
      lecturerBuffer = [];
      currentVenue = lines[i - 1]; // the line right before this one is the room name
      continue;
    }

    // Skip the hourly time ruler line
    if (/^7:00 am/.test(line) || line.includes('noon')) {
      continue;
    }

    // Course code + section line, e.g. "ESD 106 Lec 2"
    const courseMatch = line.match(COURSE_CODE_RE);
    if (courseMatch) {
      flushPending(lecturerBuffer);
      lecturerBuffer = [];
      pendingCourse = courseMatch[1].replace(/\s+/g, '');
      continue;
    }

    // Time range line, e.g. "7:00a - 9:00a"
    if (TIME_RANGE_RE.test(line)) {
      const [, start, end] = line.match(TIME_RANGE_RE);
      pendingTimeRange = { start, end };
      continue;
    }

    // Anything else while we have a pending course = lecturer name(s)
    if (pendingCourse) {
      lecturerBuffer.push(line);
    }
  }
  flushPending(lecturerBuffer);

  return rows;
}

/**
 * Parses the National Service class list PDF (S/N, Index No, Surname,
 * Other Names, DOB, Course of Study, Qualification).
 *
 * Rather than relying on line breaks (which vary depending on how the PDF's
 * table columns get extracted), this collapses the whole document into one
 * continuous string and scans for records using a global pattern. Each
 * record is anchored by a serial number, a 9-12 digit index number, a date
 * of birth (YYYY-MM-DD), and a trailing DEGREE/DIPLOMA marker - so matches
 * stay correctly bounded even if page headers or stray line breaks appear
 * in between records.
 */
async function parseNationalServicePdf(buffer) {
  const data = await pdfParse(buffer);
  const text = data.text
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const RECORD_RE = /(\d{1,4})\s+(\d{9,12})\s+(\S+)\s+(.+?)\s+(\d{4}-\d{2}-\d{2})\s+(.+?)\s+(DEGREE|DIPLOMA)/g;

  const rows = [];
  let match;
  while ((match = RECORD_RE.exec(text)) !== null) {
    const [, , indexNo, surname, otherNames, dob, course, qualification] = match;
    rows.push({
      index_no: indexNo,
      surname,
      other_names: otherNames.trim(),
      date_of_birth: dob,
      course_of_study: course.trim(),
      qualification,
    });
  }
  return rows;
}

module.exports = { parseSpreadsheet, parsePdf, parseNationalServicePdf };
