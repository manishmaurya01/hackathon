import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const AI_TEXT = `The Industrial Revolution and the Reshaping of Modern Labour

The Industrial Revolution, which began in Britain during the late eighteenth century, fundamentally transformed the way goods were produced and the way people organised their working lives. Prior to this period, manufacturing was largely carried out in small workshops and through the domestic system, in which raw materials were distributed to rural families who processed them in their own homes. The introduction of mechanised production altered this arrangement entirely, concentrating workers within factories and subjecting them to a strict discipline of time and machine.

It is important to note that the transition was neither immediate nor uniform. Different regions adopted mechanisation at varying rates, and many communities resisted the changes that accompanied it. Furthermore, the social consequences of industrialisation were deeply uneven. While some individuals accumulated considerable wealth, a large proportion of the labouring population experienced long hours, dangerous conditions and inadequate compensation. Child labour, in particular, became a subject of growing concern during the early decades of the nineteenth century.

In conclusion, the Industrial Revolution represents a pivotal moment in economic history. Its effects continue to shape contemporary institutions, and its legacy remains a subject of considerable scholarly debate. The evidence suggests that its influence was both transformative and deeply contested, and that any balanced assessment must acknowledge the complexity of the period.`;

const HUMAN_TEXT = `Field Notes — River Survey, 14 March

Got to the site around 6:40, which was later than I wanted. The path in from the north gate is still washed out so we had to go the long way round past the pump house, adding maybe twenty minutes. Water level was higher than the January reading — I'd guessed knee-deep and it was closer to mid-thigh, which made the wading samples awkward.

Sam took the turbidity readings while I did the core tubes. Three of the four tubes sealed properly; the fourth one leaked in the bag, so that replicate is probably junk. I'm annoyed because it was the deep point. Next time bring the spare caps, the ones that actually fit.

Noticed a lot of orange film on the rocks near the outflow. Could be iron bacteria, could be runoff from whatever is happening upstream of the culvert. Didn't have a kit to test it properly. Wrote it down, took two photos, both came out blurry because of the light.

Drive back took an hour because of the diversion at the bridge. Uploaded the data tonight but the turbidity column for sample 03 looks wrong — values are all identical, which usually means the meter didn't auto-range. Will recheck against the raw file tomorrow before I put anything in the report.

Anyway. Not a bad day, just not the clean set I was hoping for.`;

function writeFixture(name, content) {
  const p = path.join(__dirname, name);
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

// Minimal, valid .docx: a zip containing the OOXML parts Word expects.
async function writeDocx(name, paragraphs) {
  const { default: JSZip } = await import('jszip').catch(() => ({ default: null }));
  if (!JSZip) return null; // jszip optional; test skips docx if absent

  const body = paragraphs
    .map((p) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(p)}</w:t></w:r></w:p>`)
    .join('');

  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );
  zip.folder('_rels').file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );
  const word = zip.folder('word');
  word.file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`
  );

  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  const p = path.join(__dirname, name);
  fs.writeFileSync(p, buf);
  return p;
}

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]
  );
}

writeFixture('ai-style-assignment.txt', AI_TEXT);
writeFixture('human-notes.txt', HUMAN_TEXT);
writeFixture('empty.txt', '');
writeFixture('tooshort.txt', 'Too short.');

const docx = await writeDocx('ai-style-assignment.docx', AI_TEXT.split('\n\n'));

console.log(
  JSON.stringify(
    {
      ai_txt: path.join(__dirname, 'ai-style-assignment.txt'),
      human_txt: path.join(__dirname, 'human-notes.txt'),
      empty: path.join(__dirname, 'empty.txt'),
      tooshort: path.join(__dirname, 'tooshort.txt'),
      docx: docx || null,
      words_ai: AI_TEXT.split(/\s+/).length,
      words_human: HUMAN_TEXT.split(/\s+/).length,
    },
    null,
    2
  )
);
