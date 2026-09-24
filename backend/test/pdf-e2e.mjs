import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:5000/api';

const EMAIL = `pdf${Date.now()}@veriwrite.test`;
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

const su = await call('POST', '/auth/signup', {
  body: { name: 'PDF Tester', email: EMAIL, password: 'password123', confirmPassword: 'password123' },
});
token = su.json?.data?.token;
console.log('signup:', su.status, token ? 'token ok' : 'NO TOKEN');
if (!token) process.exit(1);

// 1) extract preview on the real PDF (no AI cost) — tests parser through HTTP
const form = new FormData();
form.append('file', new Blob([fs.readFileSync(path.join(__dirname, 'real-sample.pdf'))]), 'real-sample.pdf');
const prev = await call('POST', '/analysis/extract', { token, form });
console.log('\n--- extract preview (real 267-page PDF) ---');
console.log('status:', prev.status);
if (prev.json?.data) {
  const d = prev.json.data;
  console.log('fileName:', d.fileName, '| ext:', d.fileNameExt);
  console.log('words:', d.wordCount, '| chars:', d.characterCount, '| sections:', d.sectionCount);
  console.log('canAnalyze:', d.canAnalyze);
  console.log('section previews:');
  d.sections.slice(0, 4).forEach((s) => console.log(`  [${s.index}] ${s.preview.slice(0, 70)}...`));
} else {
  console.log('ERROR:', JSON.stringify(prev.json).slice(0, 400));
}

// 2) A small real-world PDF we can actually afford to analyse end-to-end.
//    Build from the W3C PDF's first page text by re-using a short txt instead.
console.log('\n--- full analysis on real text (paste path) ---');
const sample = fs.readFileSync(path.join(__dirname, 'strong-ai.txt'), 'utf8');
const an = await call('POST', '/analysis', { token, body: { text: sample, fileName: 'essay.txt' } });
console.log('status:', an.status);
const r = an.json?.data?.report;
if (r) {
  console.log('overall:', r.overallStatus, '| likelihood:', r.aiLikelihood, '| conf:', r.confidence);
  console.log('signals:', r.signals.length, '| evidence:', r.evidence.length, '| flagged:', r.sectionsFlagged);
  console.log('evidence sections:', r.evidence.map((e) => e.section).join(','));
  const inRange = r.evidence.every((e) => e.section >= 1 && e.section <= r.sections.length);
  console.log('all evidence sections within range 1..' + r.sections.length + ':', inRange);
  console.log('quotes are verbatim:', r.evidence.every((e) => r.sections.find((s) => s.index === e.section)?.text.includes(e.text)));
} else {
  console.log('ERROR:', JSON.stringify(an.json).slice(0, 500));
}

// 3) oversized text (over MAX_TEXT_CHARS = 60000)
console.log('\n--- over-long text (expect clean 400) ---');
const huge = 'This sentence exists purely to exceed the maximum analysable assignment length limit for testing purposes. '.repeat(650);
console.log('chars:', huge.length);
const over = await call('POST', '/analysis', { token, body: { text: huge } });
console.log('status:', over.status, JSON.stringify(over.json).slice(0, 300));

// 4) confirm no report row persisted for the rejected over-long input
const list = await call('GET', '/reports', { token });
console.log('\nreports stored:', list.json?.data?.reports?.length);
console.log('statuses:', list.json?.data?.reports?.map((x) => x.status).join(','));
