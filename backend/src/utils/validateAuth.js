import ApiError from '../utils/ApiError.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignup(body) {
  const { name, email, password, confirmPassword } = body || {};

  if (!name || !String(name).trim()) throw new ApiError(400, 'Full name is required.');
  if (!email || !String(email).trim()) throw new ApiError(400, 'Email is required.');
  if (!password) throw new ApiError(400, 'Password is required.');
  if (confirmPassword === undefined) throw new ApiError(400, 'Please confirm your password.');

  const cleanName = String(name).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPassword = String(password);

  if (cleanName.length < 2) throw new ApiError(400, 'Name must be at least 2 characters.');
  if (cleanName.length > 80) throw new ApiError(400, 'Name must be at most 80 characters.');

  if (!EMAIL_RE.test(cleanEmail)) throw new ApiError(400, 'Please enter a valid email address.');
  if (cleanEmail.length > 254) throw new ApiError(400, 'Email address is too long.');

  if (cleanPassword.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters long.');
  }
  if (cleanPassword.length > 128) {
    throw new ApiError(400, 'Password must be at most 128 characters long.');
  }
  if (cleanPassword !== String(confirmPassword)) {
    throw new ApiError(400, 'Passwords do not match.');
  }

  return { name: cleanName, email: cleanEmail, password: cleanPassword };
}

export function validateLogin(body) {
  const { email, password } = body || {};

  if (!email || !String(email).trim()) throw new ApiError(400, 'Email is required.');
  if (!password) throw new ApiError(400, 'Password is required.');

  const cleanEmail = String(email).trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail)) throw new ApiError(400, 'Please enter a valid email address.');

  return { email: cleanEmail, password: String(password) };
}

export function validateProfileUpdate(body) {
  const { name, email } = body || {};
  if (name === undefined && email === undefined) {
    throw new ApiError(400, 'Nothing to update.');
  }

  const out = {};
  if (name !== undefined) {
    const cleanName = String(name).trim();
    if (cleanName.length < 2) throw new ApiError(400, 'Name must be at least 2 characters.');
    if (cleanName.length > 80) throw new ApiError(400, 'Name must be at most 80 characters.');
    out.name = cleanName;
  }
  if (email !== undefined) {
    const cleanEmail = String(email).trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail)) throw new ApiError(400, 'Please enter a valid email address.');
    out.email = cleanEmail;
  }
  return out;
}
