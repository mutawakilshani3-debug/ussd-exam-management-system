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
 * Strategy: find record BOUNDARIES rather than record starts. Every
 * qualification word ("DEGREE"/"DIPLOMA") that is immediately followed by
 * the next record's leading digits (or sits at the very end of the
 * document) marks the true end of a record. This correctly ignores
 * "DIPLOMA" when it's merely the first word of a course name (e.g.
 * "DIPLOMA IN INFORMATION TECHNOLOGY DIPLOMA") since that occurrence is
 * followed by more letters, not digits.
 *
 * Within each resulting chunk, the leading run of digits (serial number +
 * 11-digit index number, concatenated with no separator in the raw
 * extracted text) is located anywhere in the chunk - not anchored to the
 * very start - so any stray page header/footer text glued onto the front
 * of a record is simply discarded rather than causing the whole record to
 * be skipped. The index number is always the LAST 11 digits of that run,
 * which works regardless of how many digits the serial number itself has
 * or what it starts with (avoiding the earlier bug where serials starting
 * with "20" were confused for the index number's own prefix).
 */
async function parseNationalServicePdf(buffer) {
  const data = await pdfParse(buffer);
  let text = data.text.replace(/\r/g, ' ').replace(/\n/g, ' ');
  text = text.replace(/\s+/g, ' ');

  const boundaryRe = /(DEGREE|DIPLOMA)(?=\s*\d|\s*$)/g;
  const boundaries = [];
  let bm;
  while ((bm = boundaryRe.exec(text)) !== null) {
    boundaries.push({ qualification: bm[1], end: bm.index + bm[0].length });
  }

  const rows = [];
  let chunkStart = 0;

  for (const b of boundaries) {
    const chunk = text.slice(chunkStart, b.end);
    chunkStart = b.end;

    const content = chunk.slice(0, chunk.length - b.qualification.length).trim();

    const digitRunMatch = content.match(/\d+/);
    if (!digitRunMatch || digitRunMatch[0].length < 11) continue;

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
      qualification: b.qualification,
    });
  }

  return rows;
}

module.exports = { parseSpreadsheet, parsePdf, parseNationalServicePdf };
