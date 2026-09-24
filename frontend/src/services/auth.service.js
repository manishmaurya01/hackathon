import client, { request, setToken } from './api.js';

export async function signup({ name, email, password, confirmPassword }) {
  const data = await request(
    client.post('/auth/signup', { name, email, password, confirmPassword })
  );
  if (data?.token) setToken(data.token);
  return data;
}

export async function login({ email, password }) {
  const data = await request(client.post('/auth/login', { email, password }));
  if (data?.token) setToken(data.token);
  return data;
}

export async function fetchMe() {
  return request(client.get('/auth/me'));
}

export async function updateProfile({ name, email }) {
  const payload = {};
  if (name !== undefined) payload.name = name;
  if (email !== undefined) payload.email = email;
  return request(client.put('/auth/profile', payload));
}

export function logout() {
  setToken(null);
}
