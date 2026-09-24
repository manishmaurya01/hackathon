import multer from 'multer';
import env from '../config/env.js';
import { fileFilter } from '../utils/fileValidation.js';

const MB = 1024 * 1024;

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
    files: 1,
    fields: 5,
  },
  fileFilter,
});

/** Translate multer's technical errors into messages a user can act on. */
export function handleUploadError(err, req, res, next) {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: `File is too large. Maximum size is ${Math.round(env.MAX_FILE_SIZE / MB)} MB.`,
        code: 'FILE_TOO_LARGE',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Please upload only one file at a time.',
        code: 'TOO_MANY_FILES',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
      code: err.code || 'UPLOAD_ERROR',
    });
  }

  if (err.code === 'INVALID_FILE_TYPE' || err.statusCode === 400) {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: err.code || 'INVALID_FILE',
    });
  }

  return next(err);
}

export default upload;
