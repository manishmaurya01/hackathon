const BASE = 'http://localhost:5000/api';

async function call(method, path, { body, token, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  try {
    const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, json };
  } catch (err) {
    return { status: 0, json: { message: err.message } };
  }
}

const show = (label, r) =>
  console.log(`${label.padEnd(34)} -> ${r.status}  ${typeof r.json === 'string' ? r.json : JSON.stringify(r.json).slice(0, 260)}`);

const EMAIL = `t${Date.now()}@veriwrite.test`;
let token;

// --- auth errors ---
show('signup missing fields', await call('POST', '/auth/signup', { body: { name: '', email: '', password: '' } }));
const su = await call('POST', '/auth/signup', {
  body: { name: 'Grace Hopper', email: EMAIL, password: 'password123', confirmPassword: 'password123' },
});
show('signup valid', su);
token = su.json?.data?.token;

show('duplicate email', await call('POST', '/auth/signup', {
  body: { name: 'G2', email: EMAIL, password: 'password123', confirmPassword: 'password123' },
}));
show('login wrong password', await call('POST', '/auth/login', { body: { email: EMAIL, password: 'nope12345' } }));
show('login unknown email', await call('POST', '/auth/login', { body: { email: 'x@y.z.io', password: 'password123' } }));

const li = await call('POST', '/auth/login', { body: { email: EMAIL, password: 'password123' } });
show('login valid', li);
token = li.json?.data?.token;

// --- protected routes ---
show('me (no token)', await call('GET', '/auth/me'));
show('me (bad token)', await call('GET', '/auth/me', { token: 'not.a.jwt' }));
show('me (valid)', await call('GET', '/auth/me', { token }));

// --- empty state: stats + reports with no data ---
show('dashboard stats (empty)', await call('GET', '/dashboard/stats', { token }));
show('reports list (empty)', await call('GET', '/reports', { token }));

// --- validation on analysis ---
const longText = Array.from({ length: 60 }, (_, i) =>
  `Sentence number ${i} of this paragraph describes the ongoing investigation into writing patterns and how they vary across student assignments in a way that is deliberately verbose but entirely plausible for an academic essay on the subject matter under discussion.`
).join(' ');

show('analysis empty text', await call('POST', '/analysis', { token, body: { text: '   ' } }));
show('analysis too short', await call('POST', '/analysis', { token, body: { text: 'Too short.' } }));

// --- unconfigured OpenRouter -> must be a real error, not fake success ---
const noKey = await call('POST', '/analysis', { token, body: { text: longText } });
show('analysis (no API key)', noKey);

show('reports list after failure', await call('GET', '/reports', { token }));
show('stats after failure', await call('GET', '/dashboard/stats', { token }));

// --- extract preview (no AI involved) ---
show('extract preview', await call('POST', '/analysis/extract', { token, body: { text: longText } }));

// --- 404 + unknown route ---
show('unknown route', await call('GET', '/definitely-not-a-route', { token }));

// --- ownership check: report from another user ---
const other = await call('POST', '/auth/signup', {
  body: { name: 'Other', email: `o${Date.now()}@veriwrite.test`, password: 'password123', confirmPassword: 'password123' },
});
const reports = await call('GET', '/reports', { token });
const firstId = reports.json?.data?.reports?.[0]?.id;
if (firstId) {
  show('cross-user report access', await call('GET', `/reports/${firstId}`, { token: other.json.data.token }));
  show('cross-user delete attempt', await call('DELETE', `/reports/${firstId}`, { token: other.json.data.token }));
}
show('own report fetch', firstId ? await call('GET', `/reports/${firstId}`, { token }) : { status: 0, json: 'no report' });
show('bogus report id', await call('GET', '/reports/notanobjectid', { token }));
