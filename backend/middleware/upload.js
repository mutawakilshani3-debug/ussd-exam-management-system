const multer = require('multer');
const path = require('path');
const fs = require('fs');

function makeStorage(subfolder) {
  const dir = path.join(__dirname, '..', 'uploads', subfolder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });
}

const imageFileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
  if (ok) return cb(null, true);
  cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed.'));
};

const bulkFileFilter = (req, file, cb) => {
  const allowed = /csv|xlsx|xls/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase());
  if (ok) return cb(null, true);
  cb(new Error('Only CSV or Excel (.xlsx, .xls) files are allowed.'));
};

const pdfFileFilter = (req, file, cb) => {
  const allowed = /pdf/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && file.mimetype === 'application/pdf';
  if (ok) return cb(null, true);
  cb(new Error('Only PDF files are allowed.'));
};

const uploadProfilePicture = multer({
  storage: makeStorage('profile'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: imageFileFilter,
});

// Profile pictures are stored as base64 directly in the database (not on disk),
// so they survive redeploys on hosts with ephemeral filesystems like Render's
// free tier. Kept at 1MB to stay well under typical hosted-MySQL packet limits.
const uploadProfilePictureToDb = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
  fileFilter: imageFileFilter,
});

const uploadBulkFile = multer({
  storage: makeStorage('bulk'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: bulkFileFilter,
});

// Timetable PDFs (general / morning / afternoon) are stored as binary data
// directly in the database, same reasoning as profile pictures above -
// Render's free tier filesystem is ephemeral and files would be lost on redeploy.
const uploadTimetablePdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: pdfFileFilter,
});

module.exports = {
  uploadProfilePicture,
  uploadProfilePictureToDb,
  uploadBulkFile,
  uploadTimetablePdf,
};
