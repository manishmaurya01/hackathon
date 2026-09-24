import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    throw new ApiError(401, 'Authentication required. Please log in.');
  }

  if (!env.JWT_SECRET) {
    throw new ApiError(500, 'Server is not configured with a JWT secret.');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Your session has expired. Please log in again.'
        : 'Invalid session. Please log in again.';
    throw new ApiError(401, message);
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new ApiError(401, 'Account no longer exists. Please log in again.');
  }

  req.user = user;
  next();
});
