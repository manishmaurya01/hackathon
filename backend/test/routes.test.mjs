const BASE = 'http://localhost:5000/api';
const EMAIL = `routes${Date.now()}@veriwrite.test`;
let token;

async function call(method, p, { body, token: tk, form } = {}) {
  const headers = {};
  if (tk) headers.Authorization = `Bearer ${tk}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${p}`, { method, headers, body: payload });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
}

let pass = 0;
let fail = 0;
function check(label, cond, extra = '') {
  if (cond) { pass += 1; console.log(`  PASS  ${label}`); }
  else { fail += 1; console.log(`  FAIL  ${label} ${extra}`); }
}

// signup
const su = await call('POST', '/auth/signup', {
  body: { name: 'Route Tester', email: EMAIL, password: 'password123', confirmPassword: 'password123' },
});
token = su.json?.data?.token;
check('signup returns token', Boolean(token));

// create a report via real AI
const an = await call('POST', '/analysis', { token, body: { text: 'It is important to note that the findings were significant. Furthermore, the data suggests a clear pattern across all trials. In conclusion, the results confirm the hypothesis was correct and warrants further study in future work.' } });
const reportId = an.json?.data?.report?.id || an.json?.data?.reportId;
check('POST /api/analysis creates report', an.status === 200 && Boolean(reportId), `status=${an.status}`);

// spec route: GET /api/analysis
const list = await call('GET', '/analysis', { token });
check('GET /api/analysis (list)', list.status === 200 && Array.isArray(list.json?.data?.reports), `status=${list.status}`);
check('list excludes originalText', !('originalText' in (list.json?.data?.reports?.[0] || {})));

// spec route: GET /api/analysis/:id
const one = await call('GET', `/analysis/${reportId}`, { token });
check('GET /api/analysis/:id', one.status === 200 && one.json?.data?.report?.id === reportId, `status=${one.status}`);
check('single report includes sections', Array.isArray(one.json?.data?.report?.sections));

// legacy alias still works
const oneLegacy = await call('GET', `/reports/${reportId}`, { token });
check('GET /api/reports/:id (alias)', oneLegacy.status === 200, `status=${oneLegacy.status}`);

// cross-user access must still fail
const other = await call('POST', '/auth/signup', {
  body: { name: 'Other', email: `other${Date.now()}@veriwrite.test`, password: 'password123', confirmPassword: 'password123' },
});
const otherToken = other.json?.data?.token;
const cross = await call('GET', `/analysis/${reportId}`, { token: otherToken });
check('cross-user GET /api/analysis/:id -> 404', cross.status === 404, `status=${cross.status}`);
const crossDel = await call('DELETE', `/analysis/${reportId}`, { token: otherToken });
check('cross-user DELETE /api/analysis/:id -> 404', crossDel.status === 404, `status=${crossDel.status}`);

// spec route: DELETE /api/analysis/:id
const del = await call('DELETE', `/analysis/${reportId}`, { token });
check('DELETE /api/analysis/:id', del.status === 200, `status=${del.status}`);
const del2 = await call('DELETE', `/analysis/${reportId}`, { token });
check('DELETE again -> 404', del2.status === 404, `status=${del2.status}`);

// invalid ObjectId
const bad = await call('GET', '/analysis/not-an-objectid', { token });
check('invalid ObjectId -> 400', bad.status === 400, `status=${bad.status}`);

// stats
const st = await call('GET', '/dashboard/stats', { token });
check('GET /api/dashboard/stats', st.status === 200 && typeof st.json?.data?.stats?.totalReports === 'number', `status=${st.status}`);

// health includes maxFileSize
const h = await call('GET', '/health');
check('GET /api/health has maxFileSize', h.status === 200 && typeof h.json?.data?.maxFileSize === 'number');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
