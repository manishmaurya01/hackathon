const MIN_SECTION_CHARS = 220;
const MAX_SECTIONS = 12;

/**
 * Normalise raw extracted text: strip control characters, normalise
 * whitespace/line endings and collapse runaway blank lines.
 */
export function cleanText(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function countWords(text) {
  if (!text) return 0;
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

/**
 * Split cleaned text into meaningful, numbered sections.
 *
 * Strategy: prefer blank-line paragraph boundaries, then merge paragraphs
 * until each section is long enough to give the model context, and cap the
 * total number of sections so the prompt stays within a sane size.
 */
export function splitIntoSections(cleaned) {
  if (!cleaned) return [];

  let blocks = cleaned
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  // Fallback for text with no blank lines at all: split on sentence ends.
  if (blocks.length === 1 && cleaned.length > MIN_SECTION_CHARS * 2) {
    blocks = splitBySentenceTarget(cleaned);
  }

  // Merge short paragraphs forward so each section carries real context.
  const merged = [];
  for (const block of blocks) {
    const last = merged[merged.length - 1];
    if (last && last.length < MIN_SECTION_CHARS) {
      merged[merged.length - 1] = `${last}\n\n${block}`;
    } else {
      merged.push(block);
    }
  }

  // If still too many sections, distribute evenly into a bounded count.
  if (merged.length > MAX_SECTIONS) {
    const per = Math.ceil(merged.length / MAX_SECTIONS);
    const grouped = [];
    for (let i = 0; i < merged.length; i += per) {
      grouped.push(merged.slice(i, i + per).join('\n\n'));
    }
    return grouped.map((text, i) => ({ index: i + 1, text }));
  }

  return merged.map((text, i) => ({ index: i + 1, text }));
}

function splitBySentenceTarget(text, target = 700) {
  const sentences = text.match(/[^.!?\n]+[.!?]*[\s]*/g) || [text];
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > target) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/** Build a section-labelled transcript for the model prompt. */
export function sectionsToPrompt(sections) {
  return sections.map((s) => `[Section ${s.index}]\n${s.text}`).join('\n\n');
}

/**
 * Match a piece of quoted evidence text back to a real section so the
 * report UI can scroll to it. Falls back to the model-reported number.
 */
export function resolveSectionIndex(sections, reported, quotedText) {
  if (quotedText && typeof quotedText === 'string') {
    const needle = quotedText.trim().toLowerCase();
    if (needle.length >= 12) {
      const exact = sections.find((s) => s.text.toLowerCase().includes(needle));
      if (exact) return exact.index;
      // Match on a leading fragment when the model truncated the quote.
      const fragment = needle.slice(0, Math.min(80, needle.length));
      const partial = sections.find((s) => s.text.toLowerCase().includes(fragment));
      if (partial) return partial.index;
    }
  }

  const asNumber = Number(reported);
  if (Number.isInteger(asNumber) && asNumber >= 1) {
    if (asNumber <= sections.length) return asNumber;
    // Model counted from zero or overshot: clamp into range.
    if (asNumber === 0 && sections.length > 0) return 1;
    return Math.min(Math.max(asNumber, 1), Math.max(sections.length, 1));
  }
  return 1;
}
