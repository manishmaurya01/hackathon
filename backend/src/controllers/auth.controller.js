import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/response.js';
import { validateSignup, validateLogin, validateProfileUpdate } from '../utils/validateAuth.js';

function signToken(userId) {
  if (!env.JWT_SECRET) {
    throw new ApiError(500, 'Server is not configured with a JWT secret.');
  }
  return jwt.sign({ sub: userId.toString() }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

export const signup = asyncHandler(async (req, res) => {
  const input = validateSignup(req.body);

  const existing = await User.findOne({ email: input.email }).lean();
  if (existing) {
    throw new ApiError(409, 'An account with that email already exists.');
  }

  const user = await User.create(input);

  return created(
    res,
    { user: user.toJSON(), token: signToken(user._id) },
    'Account created successfully.'
  );
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = validateLogin(req.body);

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const match = await user.comparePassword(password);
  if (!match) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  return ok(res, { user: user.toJSON(), token: signToken(user._id) }, 'Logged in successfully.');
});

export const me = asyncHandler(async (req, res) => {
  return ok(res, { user: req.user.toJSON() });
});export const updateProfile = asyncHandler(async (req, res) => {
  const updates = validateProfileUpdate(req.body);

  if (updates.email && updates.email !== req.user.email) {
    const clash = await User.findOne({ email: updates.email, _id: { $ne: req.user._id } }).lean();
    if (clash) throw new ApiError(409, 'That email is already in use.');
  }

  Object.assign(req.user, updates);
  await req.user.save();

  return ok(res, { user: req.user.toJSON() }, 'Profile updated.');
});
