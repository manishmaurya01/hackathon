import multer from 'multer';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Something went wrong.';
  let code = err.code;
  let details = err.details || null;

  if (err instanceof ApiError) {
    code = code || 'API_ERROR';
  } else if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      message = `File is too large. Maximum size is ${Math.round(env.MAX_FILE_SIZE / (1024 * 1024))} MB.`;
      code = 'FILE_TOO_LARGE';
    }
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    details = Object.values(err.errors).map((e) => e.message);
    message = details[0] || 'Validation failed.';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid identifier supplied.';
  } else if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE';
    message = 'An account with that email already exists.';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'BAD_JSON';
    message = 'Malformed JSON in request body.';
  }

  if (statusCode >= 500 && !(err instanceof ApiError)) {
    console.error('[error]', err.stack || err);
    if (env.NODE_ENV === 'production') {
      message = 'Internal server error. Please try again later.';
    }
  }

  const body = { success: false, message, code: code || 'ERROR' };
  if (details) body.details = details;
  if (env.NODE_ENV === 'development' && statusCode >= 500 && !(err instanceof ApiError) && err.stack) {
    body.stack = err.stack.split('\n').slice(0, 4);
  }

  res.status(statusCode).json(body);
}
