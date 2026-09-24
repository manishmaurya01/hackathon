import ApiError from '../utils/ApiError.js';

/**
 * Validates request bodies without pulling in a schema library.
 * Returns the sanitised value, or throws a 400 with a readable message.
 */
export function requireFields(body, fields) {
  const source = body && typeof body === 'object' ? body : {};
  const missing = fields.filter((f) => {
    const value = source[f];
    return value === undefined || value === null || String(value).trim() === '';
  });

  if (missing.length) {
    throw new ApiError(400, `Missing required field(s): ${missing.join(', ')}.`, {
      fields: missing,
    });
  }
  return source;
}

export function asTrimmedString(value, { max = 200000, field = 'value' } = {}) {
  if (typeof value !== 'string') {
    throw new ApiError(400, `Field "${field}" must be a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiError(400, `Field "${field}" must not be empty.`);
  }
  if (trimmed.length > max) {
    throw new ApiError(400, `Field "${field}" exceeds ${max.toLocaleString()} characters.`);
  }
  return trimmed;
}
