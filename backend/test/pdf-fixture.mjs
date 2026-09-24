import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractText } from '../src/services/extract.service.js';
import { cleanText, splitIntoSections, countWords } from '../src/utils/text.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Build a valid single-page PDF containing the given paragraphs. */
function buildPdf(paragraphs) {
  const lines = [];
  for (const p of paragraphs) {
    // naive wrap at ~90 chars
    const words = p.split(/\s+/);
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > 90) {
        lines.push(cur.trim());
        cur = w;
      } else cur = `${cur} ${w}`;
    }
    if (cur.trim()) lines.push(cur.trim());
    lines.push('');
  }

  const esc = (s) => s.replace(/([()\\])/g, '\\$1');
  const content =
    'BT\n/F1 11 Tf\n14 TL\n48 750 Td\n' + lines.map((l) => `(${esc(l)}) Tj T*`).join('\n') + '\nET\n';

  const objs = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}endstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (const o of objs) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += o;
  }
  const xrefPos = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

const paragraphs = [
  "In today's rapidly evolving educational landscape, artificial intelligence has become an increasingly significant force in academic institutions. It is important to note that educators must carefully consider the multifaceted implications of these technologies when designing their curricula for the coming academic year and beyond.",
  'Furthermore, students benefit from a structured approach to learning that emphasizes critical thinking and analytical reasoning across disciplines. Moreover, institutions should leverage cutting-edge solutions to foster an environment of innovation and collaboration among learners, faculty, and industry partners alike.',
  'In conclusion, the relationship between artificial intelligence and education represents a paradigm shift that warrants careful examination by all stakeholders. Ultimately, the future of learning depends on our collective ability to harness these transformative tools responsibly and thoughtfully in the years ahead.',
];

const buf = buildPdf(paragraphs);
const out = path.join(__dirname, 'strong-ai.pdf');
fs.writeFileSync(out, buf);
console.log('wrote', out, buf.length, 'bytes');

const extracted = await extractText(buf, 'strong-ai.pdf');
const cleaned = cleanText(extracted);
const sections = splitIntoSections(cleaned);

console.log('\n--- extraction ---');
console.log('raw len:', extracted.length, '| words:', countWords(cleaned), '| sections:', sections.length);
console.log('section sizes:', sections.map((s) => s.text.length).join(', '));
console.log('\n--- cleaned text ---');
console.log(cleaned.slice(0, 500));

console.log('\nsection 1 starts:', JSON.stringify(sections[0]?.text.slice(0, 80)));
console.log('section 2 starts:', JSON.stringify(sections[1]?.text.slice(0, 80)));
