import path from 'path';
import env from '../config/env.js';

export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/msword', // legacy .doc — rejected downstream with a clear message
];

const MAX_EXT_LENGTH = 10;

export function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();

  if (!ext || ext.length > MAX_EXT_LENGTH || !ALLOWED_EXTENSIONS.includes(ext)) {
    const err = new Error('Unsupported file type. Please upload a PDF, DOCX or TXT file.');
    err.statusCode = 400;
    err.code = 'INVALID_FILE_TYPE';
    return cb(err);
  }

  if (file.mimetype === 'application/msword') {
    const err = new Error('Legacy .doc files are not supported. Please save as .docx or .pdf.');
    err.statusCode = 400;
    err.code = 'INVALID_FILE_TYPE';
    return cb(err);
  }

  return cb(null, true);
}

export function fileSizeLimit(req, file, cb) {
  // multer's `limits.fileSize` enforces the hard stop; this only guards
  // against a header that lies about its length before bytes arrive.
  const declared = Number(file.size);
  if (Number.isFinite(declared) && declared > env.MAX_FILE_SIZE) {
    const err = new Error('File is too large.');
    err.statusCode = 413;
    err.code = 'FILE_TOO_LARGE';
    return cb(err);
  }
  cb(null, true);
}
