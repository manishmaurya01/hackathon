import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import ApiError from '../utils/ApiError.js';

/**
 * Extract plain text from an uploaded buffer.
 * `originalname` decides the parser; extensions are pre-validated by multer.
 */
export async function extractText(buffer, originalname) {
  const ext = path.extname(originalname || '').toLowerCase();

  switch (ext) {
    case '.pdf':
      return extractPdf(buffer, originalname);
    case '.docx':
      return extractDocx(buffer, originalname);
    case '.txt':
      return extractTxt(buffer, originalname);
    default:
      throw new ApiError(400, 'Unsupported file type. Please upload a PDF, DOCX or TXT file.');
  }
}

async function extractPdf(buffer, name) {
  try {
    const result = await pdfParse(buffer);
    const text = (result.text || '').trim();
    if (!text) {
      throw new ApiError(
        422,
        `No readable text found in "${name}". The file may be a scan or an image-only PDF.`
      );
    }
    return text;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (isCorrupt(err)) {
      throw new ApiError(422, `"${name}" could not be read. It may be corrupt or password-protected.`);
    }
    throw new ApiError(500, `Failed to read "${name}".`);
  }
}

async function extractDocx(buffer, name) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = (result.value || '').trim();
    if (!text) {
      throw new ApiError(422, `No readable text found in "${name}".`);
    }
    return text;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      422,
      `"${name}" could not be read as a DOCX file. It may be corrupt or a legacy .doc renamed to .docx.`
    );
  }
}

async function extractTxt(buffer, name) {
  // UTF-8 with BOM tolerance; reject binary payloads disguised as .txt.
  const sample = buffer.subarray(0, 4096);
  if (sample.includes(0)) {
    throw new ApiError(422, `"${name}" appears to be a binary file, not plain text.`);
  }

  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  } catch {
    text = buffer.toString('utf8');
  }

  text = text.replace(/^\uFEFF/, '').trim();
  if (!text) throw new ApiError(422, `"${name}" is empty.`);
  return text;
}

function isCorrupt(err) {
  const msg = String(err?.message || '').toLowerCase();
  return (
    msg.includes('invalid') ||
    msg.includes('password') ||
    msg.includes('protected') ||
    msg.includes('xref') ||
    msg.includes('structure') ||
    msg.includes('parse') ||
    msg.includes('token') ||
    msg.includes('object')
  );
}
