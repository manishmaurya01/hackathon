// Verifies the PDF parser actually extracts text before we ship the feature.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractText } from '../src/services/extract.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Minimal single-page PDF with visible text, built by hand.
function buildPdf(text) {
  const lines = text.split('\n').map((l) => l.replace(/[()\\]/g, ''));
  const content =
    'BT\n/F1 12 Tf\n50 780 Td\n16 TL\n' +
    lines.map((l) => `(${l}) Tj T*`).join('\n') +
    '\nET\n';

  const objs = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (const o of objs) {
    offsets.push(pdf.length);
    pdf += o;
  }
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

const body = `The Industrial Revolution transformed manufacturing.

It is important to note that factories changed daily life for millions of workers.

In conclusion, the period remains historically significant.`;

const cases = [
  { name: 'pdf', ext: '.pdf', buf: buildPdf(body) },
  { name: 'txt', ext: '.txt', buf: Buffer.from(body, 'utf8') },
  { name: 'empty txt', ext: '.txt', buf: Buffer.from('   ', 'utf8') },
  { name: 'binary-as-txt', ext: '.txt', buf: Buffer.from([0x00, 0x01, 0x02, 0x00]) },
  { name: 'exe rejected', ext: '.exe', buf: Buffer.from('MZ') },
];

for (const c of cases) {
  try {
    const out = await extractText(c.buf, `sample${c.ext}`);
    console.log(`${c.name.padEnd(16)} OK   len=${out.length} | ${JSON.stringify(out.slice(0, 70))}`);
  } catch (err) {
    console.log(`${c.name.padEnd(16)} ERR  ${err.statusCode || 500} ${err.message}`);
  }
}

// Corrupt PDF
try {
  await extractText(Buffer.from('%PDF-1.4\ngarbage not a pdf'), 'broken.pdf');
  console.log('corrupt pdf      OK   (unexpected)');
} catch (err) {
  console.log(`corrupt pdf      ERR  ${err.statusCode || 500} ${err.message}`);
}

// Real .docx from fixture if present
const docx = path.join(__dirname, 'ai-style-assignment.docx');
if (fs.existsSync(docx)) {
  try {
    const out = await extractText(fs.readFileSync(docx), 'ai-style-assignment.docx');
    console.log(`docx             OK   len=${out.length} | ${JSON.stringify(out.slice(0, 70))}`);
  } catch (err) {
    console.log(`docx             ERR  ${err.statusCode || 500} ${err.message}`);
  }
}
