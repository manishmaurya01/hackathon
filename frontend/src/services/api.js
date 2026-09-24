import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const TOKEN_KEY = 'veriwrite_token';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) — session stays in memory only */
  }
}

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Pull the human-readable message the backend actually sent. */
function messageFrom(error) {
  const data = error?.response?.data;
  if (data?.message) return data.message;
  if (error?.code === 'ECONNABORTED')
    return 'The request took too long. Please check your connection and try again.';
  if (error?.response) return `Request failed (${error.response.status}). Please try again.`;
  if (error?.request) return 'Could not reach the server. Please check your connection.';
  return error?.message || 'Something went wrong.';
}

client.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;

    // A 401 means the token is no longer usable — drop it so guards work.
    if (status === 401 && getToken() && !error?.config?.url?.includes('/auth/login')) {
      setToken(null);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }

    error.friendlyMessage = messageFrom(error);
    error.statusCode = status || 0;
    error.code = error?.response?.data?.code || error?.code || 'REQUEST_FAILED';
    error.details = error?.response?.data?.details || null;
    return Promise.reject(error);
  }
);

/** Extract `data` on success, or throw a normal Error with a readable message. */
export async function request(promise) {
  try {
    const res = await promise;
    return res.data?.data ?? res.data;
  } catch (err) {
    const e = new Error(err.friendlyMessage || 'Something went wrong.');
    e.statusCode = err.statusCode;
    e.code = err.code;
    e.details = err.details;
    throw e;
  }
}

export default client;
