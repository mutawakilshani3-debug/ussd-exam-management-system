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
 * Strategy: find every record's STARTING position first (a run of 11+
 * digits - serial number concatenated with the fixed 11-digit index number
 * - always the most reliable anchor). Then, for each record, take the LAST
 * qualifier word ("DEGREE"/"DIPLOMA") that appears before the *next*
 * record's digit run begins.
 *
 * This handles two real problems seen in this document:
 *  1) Page-break junk (repeating header/footer banners) sometimes sits
 *     between one record's qualifier and the next record's digits. Since
 *     each record's slice starts exactly at its own digit run, any such
 *     junk automatically falls outside both records and is discarded.
 *  2) Some course names themselves start with "DIPLOMA" (e.g. "DIPLOMA IN
 *     INFORMATION TECHNOLOGY DIPLOMA", "DIPLOMA LABORATORY TECHNOLOGY
 *     DIPLOMA"). Taking the LAST qualifier before the next record start
 *     correctly selects the true trailing qualifier rather than the
 *     course name's leading word.
 */
async function parseNationalServicePdf(buffer) {
  const data = await pdfParse(buffer);
  let text = data.text.replace(/\r/g, ' ').replace(/\n/g, ' ');
  text = text.replace(/\s+/g, ' ');

  const digitRunRe = /\d{11,}/g;
  const recordStarts = [];
  let dm;
  while ((dm = digitRunRe.exec(text)) !== null) {
    recordStarts.push(dm.index);
  }

  const qualRe = /(DEGREE|DIPLOMA)/g;
  const qualMatches = [];
  let qm;
  while ((qm = qualRe.exec(text)) !== null) {
    qualMatches.push({ word: qm[1], end: qm.index + qm[1].length });
  }

  const rows = [];

  for (let i = 0; i < recordStarts.length; i++) {
    const start = recordStarts[i];
    const nextStart = i + 1 < recordStarts.length ? recordStarts[i + 1] : text.length;

    let boundary = null;
    for (let j = qualMatches.length - 1; j >= 0; j--) {
      if (qualMatches[j].end <= nextStart && qualMatches[j].end > start) {
        boundary = qualMatches[j];
        break;
      }
    }
    if (!boundary) continue;

    const chunk = text.slice(start, boundary.end);
    const content = chunk.slice(0, chunk.length - boundary.word.length).trim();

    const digitRunMatch = content.match(/\d{11,}/);
    if (!digitRunMatch) continue;

    const indexNo = digitRunMatch[0].slice(-11);
    const afterDigits = content.slice(digitRunMatch.index + digitRunMatch[0].length);

    const dobMatch = afterDigits.match(/\d{4}-\d{2}-\d{2}/);
    if (!dobMatch) continue;

    const surname = afterDigits.slice(0, dobMatch.index).trim();
    const course = afterDigits
      .slice(dobMatch.index + dobMatch[0].length)
      .trim()
      .replace(/\s+/g, ' ');

    if (!surname || !course) continue;

    rows.push({
      index_no: indexNo,
      surname,
      other_names: '',
      date_of_birth: dobMatch[0],
      course_of_study: course,
      qualification: boundary.word,
    });
  }

  return rows;
}

module.exports = { parseSpreadsheet, parsePdf, parseNationalServicePdf };
