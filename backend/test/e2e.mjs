import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:5000/api';

const EMAIL = `e2e${Date.now()}@veriwrite.test`;
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

const label = (s) => console.log(`\n=== ${s} ===`);

function uploadForm(filePath) {
  const form = new FormData();
  const buf = fs.readFileSync(filePath);
  form.append('file', new Blob([buf]), path.basename(filePath));
  return form;
}

label('signup');
const su = await call('POST', '/auth/signup', {
  body: { name: 'E2E Tester', email: EMAIL, password: 'password123', confirmPassword: 'password123' },
});
console.log(su.status, JSON.stringify(su.json).slice(0, 160));
token = su.json?.data?.token;
if (!token) process.exit(1);

label('TEXT analysis (ai-style)');
const aiText = fs.readFileSync(path.join(__dirname, 'ai-style-assignment.txt'), 'utf8');
const t1 = await call('POST', '/analysis', { token, body: { text: aiText } });
console.log(t1.status);
const r1 = t1.json?.data?.report;
if (r1) {
  console.log('overall:', r1.overallStatus, '| likelihood:', r1.aiLikelihood, '| conf:', r1.confidence);
  console.log('sections:', r1.sections?.length, '| flagged:', r1.sectionsFlagged);
  console.log('signals:', r1.signals?.length, r1.signals?.map((s) => `${s.label}[${s.severity}]`));
  console.log('evidence:', r1.evidence?.length);
  console.log('summary:', String(r1.summary).slice(0, 300));
  console.log('sample evidence:', JSON.stringify(r1.evidence?.[0], null, 2));
  console.log('recommendations:', r1.recommendations);
  console.log('BAD LANGUAGE CHECK:',
    /definitely written by ai|100%|guaranteed|plagiaris|cheated/i.test(JSON.stringify(r1)) ? 'FAIL' : 'clean');
} else {
  console.log('NO REPORT:', JSON.stringify(t1.json).slice(0, 500));
}

label('TEXT analysis (human notes)');
const hText = fs.readFileSync(path.join(__dirname, 'human-notes.txt'), 'utf8');
const t2 = await call('POST', '/analysis', { token, body: { text: hText, fileName: 'field-notes.txt', inputType: 'file' } });
console.log(t2.status);
const r2 = t2.json?.data?.report;
if (r2) {
  console.log('overall:', r2.overallStatus, '| likelihood:', r2.aiLikelihood, '| conf:', r2.confidence);
  console.log('signals:', r2.signals?.length, '| evidence:', r2.evidence?.length, '| flagged:', r2.sectionsFlagged);
  console.log('summary:', String(r2.summary).slice(0, 300));
} else console.log('NO REPORT:', JSON.stringify(t2.json).slice(0, 500));

label('FILE upload (.txt)');
const t3 = await call('POST', '/analysis', { token, form: uploadForm(path.join(__dirname, 'ai-style-assignment.txt')) });
console.log(t3.status, 'fileName:', t3.json?.data?.report?.fileName, '| inputType:', t3.json?.data?.report?.inputType);
console.log('likelihood:', t3.json?.data?.report?.aiLikelihood);

label('FILE upload (.docx)');
const docxPath = path.join(__dirname, 'ai-style-assignment.docx');
if (fs.existsSync(docxPath)) {
  const t4 = await call('POST', '/analysis', { token, form: uploadForm(docxPath) });
  console.log(t4.status, 'fileName:', t4.json?.data?.report?.fileName);
  if (t4.json?.data?.report) {
    console.log('extracted words:', t4.json.data.report.wordCount, '| sections:', t4.json.data.report.sections?.length);
    console.log('likelihood:', t4.json.data.report.aiLikelihood, '| signals:', t4.json.data.report.signals?.length);
  } else console.log('ERR:', JSON.stringify(t4.json).slice(0, 400));
} else console.log('no docx fixture');

label('FILE upload (.txt, raw) - empty file');
const t5 = await call('POST', '/analysis', { token, form: uploadForm(path.join(__dirname, 'empty.txt')) });
console.log(t5.status, JSON.stringify(t5.json).slice(0, 250));

label('FILE upload - too short');
const t6 = await call('POST', '/analysis', { token, form: uploadForm(path.join(__dirname, 'tooshort.txt')) });
console.log(t6.status, JSON.stringify(t6.json).slice(0, 250));

label('FILE upload - disallowed extension');
{
  const form = new FormData();
  form.append('file', new Blob([Buffer.from('MZ fake exe')]), 'malware.exe');
  const t = await call('POST', '/analysis', { token, form });
  console.log(t.status, JSON.stringify(t.json).slice(0, 250));
}

label('FILE upload - oversize');
{
  const form = new FormData();
  form.append('file', new Blob([Buffer.alloc(6 * 1024 * 1024, 0x41)]), 'huge.txt');
  const t = await call('POST', '/analysis', { token, form });
  console.log(t.status, JSON.stringify(t.json).slice(0, 250));
}

label('reports list');
const list = await call('GET', '/reports', { token });
console.log(list.status, 'count:', list.json?.data?.reports?.length);
console.log('has originalText?', list.json?.data?.reports?.[0] ? ('originalText' in list.json.data.reports[0]) : 'n/a');
console.log('fields:', list.json?.data?.reports?.[0] && Object.keys(list.json.data.reports[0]).join(','));

label('search filter');
const s1 = await call('GET', '/reports?q=docx', { token });
console.log('q=docx ->', s1.status, 'count:', s1.json?.data?.reports?.length);
const s2 = await call('GET', '/reports?q=zzzznotfound', { token });
console.log('q=zzzz ->', s2.status, 'count:', s2.json?.data?.reports?.length);

label('stats (must be real)');
const st = await call('GET', '/dashboard/stats', { token });
console.log(st.status, JSON.stringify(st.json?.data?.stats));
console.log('recent:', st.json?.data?.recentReports?.length);

label('single report fetch');
const firstId = list.json?.data?.reports?.[0]?.id;
const one = await call('GET', `/reports/${firstId}`, { token });
console.log(one.status, 'has sections:', Array.isArray(one.json?.data?.report?.sections));
console.log('has originalText:', Boolean(one.json?.data?.report?.originalText));

label('delete report');
const del = await call('DELETE', `/reports/${firstId}`, { token });
console.log(del.status, JSON.stringify(del.json).slice(0, 150));
const del2 = await call('DELETE', `/reports/${firstId}`, { token });
console.log('delete again (expect 404):', del2.status);

label('final stats');
const st2 = await call('GET', '/dashboard/stats', { token });
console.log(st2.status, JSON.stringify(st2.json?.data?.stats));

label('health');
console.log(JSON.stringify((await call('GET', '/health')).json));
