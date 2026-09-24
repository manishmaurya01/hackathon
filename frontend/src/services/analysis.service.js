import client, { request } from './api.js';

/** Text-only analysis. */
export function analyzeText({ text, fileName }) {
  return request(client.post('/analysis', { text, fileName }));
}

/** Multipart upload — the file field must be named `file`. */
export function analyzeFile(file, onUploadProgress) {
  const form = new FormData();
  form.append('file', file);
  return request(
    client.post('/analysis', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    })
  );
}

/** Extract/clean/section a payload without spending an AI call. */
export function extractFile(file) {
  const form = new FormData();
  form.append('file', file);
  return request(
    client.post('/analysis/extract', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  );
}

export function extractText(text, fileName) {
  return request(client.post('/analysis/extract', { text, fileName }));
}

export function listReports(params = {}) {
  return request(client.get('/reports', { params }));
}

export function getReport(id) {
  return request(client.get(`/reports/${id}`));
}

export function deleteReport(id) {
  return request(client.delete(`/reports/${id}`));
}

export function getStats() {
  return request(client.get('/dashboard/stats'));
}

export function getHealth() {
  return request(client.get('/health'));
}
