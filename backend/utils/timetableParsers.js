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
 * Approach: find every 11-digit index number ("20" + 9 digits) in the raw
 * text as a fixed anchor point, then treat everything between one index
 * number and the next as a single record. Within each record:
 *   - the date of birth (YYYY-MM-DD) marks where the name ends
 *   - the qualification is taken as the LAST occurrence of "DEGREE" or
 *     "DIPLOMA" in the remaining text (not the first) - this matters
 *     because some course names themselves start with the word "DIPLOMA"
 *     (e.g. "DIPLOMA IN INFORMATION TECHNOLOGY DIPLOMA"), and naively
 *     matching the first occurrence would misidentify the course name's
 *     own leading word as the qualification marker, corrupting that
 *     record and cascading errors into subsequent ones.
 */
async function parseNationalServicePdf(buffer) {
  const data = await pdfParse(buffer);
  const text = data.text.replace(/\r/g, ' ').replace(/\n/g, ' ');

  const indexRe = /20\d{9}/g;
  const starts = [];
  let m;
  while ((m = indexRe.exec(text)) !== null) {
    starts.push(m.index);
  }

  const rows = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1] : text.length;
    const chunk = text.slice(start, end);

    const indexNo = chunk.slice(0, 11);
    const rest = chunk.slice(11);

    const dobMatch = rest.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dobMatch) continue;
    const dob = dobMatch[1];
    const dobIdx = dobMatch.index;

    const fullName = rest.slice(0, dobIdx).trim();
    const afterDob = rest.slice(dobIdx + dob.length);

    const degreeIdx = afterDob.lastIndexOf('DEGREE');
    const diplomaIdx = afterDob.lastIndexOf('DIPLOMA');

    let qualification = '';
    let qualStart = -1;
    if (degreeIdx > diplomaIdx) {
      qualification = 'DEGREE';
      qualStart = degreeIdx;
    } else if (diplomaIdx >= 0) {
      qualification = 'DIPLOMA';
      qualStart = diplomaIdx;
    }

    if (!qualification || !fullName) continue;

    const course = afterDob.slice(0, qualStart).trim().replace(/\s+/g, ' ');
    if (!course) continue;

    rows.push({
      index_no: indexNo,
      surname: fullName,
      other_names: '',
      date_of_birth: dob,
      course_of_study: course,
      qualification,
    });
  }
  return rows;
}

module.exports = { parseSpreadsheet, parsePdf, parseNationalServicePdf };
