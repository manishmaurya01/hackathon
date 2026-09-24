import { resolveSectionIndex } from '../utils/text.js';

const LIKELIHOODS = ['Unlikely', 'Low', 'Moderate', 'Elevated', 'High'];
const CONFIDENCES = ['Low', 'Moderate', 'High'];
const OVERALL = [
  'Clear',
  'Needs Attention',
  'Review Recommended',
  'High Similarity Detected',
  'Multiple Signals Detected',
];
const SEVERITIES = ['low', 'medium', 'high'];
const SIGNAL_TYPES = [
  'writing_style',
  'sentence_structure',
  'vocabulary',
  'repetition',
  'consistency',
  'transition',
  'formality',
];

const pick = (value, allowed, fallback) => {
  if (typeof value !== 'string') return fallback;
  const match = allowed.find(
    (v) => v.toLowerCase() === value.trim().toLowerCase()
  );
  return match || fallback;
};

const str = (value, max = 1200) => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
};

function deriveOverall(likelihood, signals) {
  if (likelihood === 'High' || likelihood === 'Elevated') return 'Needs Attention';
  if (likelihood === 'Moderate') return 'Review Recommended';
  if (signals.some((s) => s.severity === 'high')) return 'Review Recommended';
  return 'Clear';
}

/**
 * Validate and normalise the model's JSON before it is persisted.
 * Never throws — returns { ok, value | errors } so callers can decide.
 */
export function validateAnalysisResult(raw, sections = []) {
  const errors = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['response is not a JSON object'] };
  }

  const confidence = pick(raw.confidence, CONFIDENCES, null);
  if (!confidence) errors.push('missing or invalid "confidence"');

  let aiLikelihood = pick(raw.aiLikelihood, LIKELIHOODS, null);
  if (!aiLikelihood) errors.push('missing or invalid "aiLikelihood"');

  const summary = str(raw.summary, 2000);
  if (!summary) errors.push('missing "summary"');

  if (errors.length) return { ok: false, errors };

  // ---- signals -------------------------------------------------------
  const signals = [];
  if (raw.signals !== undefined && !Array.isArray(raw.signals)) {
    errors.push('"signals" must be an array');
  } else {
    for (const item of Array.isArray(raw.signals) ? raw.signals : []) {
      if (!item || typeof item !== 'object') continue;
      const label = str(item.label, 160);
      const explanation = str(item.explanation, 900);
      if (!label || !explanation) continue;
      signals.push({
        type: pick(item.type, SIGNAL_TYPES, 'writing_style'),
        label,
        severity: pick(item.severity, SEVERITIES, 'medium'),
        explanation,
      });
    }
    if (signals.length > 8) signals.length = 8;
  }

  // ---- evidence ------------------------------------------------------
  const evidence = [];
  if (raw.evidence !== undefined && !Array.isArray(raw.evidence)) {
    errors.push('"evidence" must be an array');
  } else {
    for (const item of Array.isArray(raw.evidence) ? raw.evidence : []) {
      if (!item || typeof item !== 'object') continue;
      const text = str(item.text, 600);
      const reason = str(item.reason, 900);
      if (!text || !reason) continue;

      evidence.push({
        section: resolveSectionIndex(sections, item.section, text),
        text,
        signal: str(item.signal, 160) || 'Writing pattern anomaly',
        reason,
        confidence: pick(item.confidence, CONFIDENCES, confidence),
      });
    }
    if (evidence.length > 12) evidence.length = 12;
  }

  if (errors.length) return { ok: false, errors };

  // A report claiming findings with zero evidence is not explainable —
  // downgrade rather than store something we cannot justify.
  if (evidence.length === 0 && signals.length > 0 && aiLikelihood === 'High') {
    aiLikelihood = 'Moderate';
  }

  const overallStatus = pick(raw.overallStatus, OVERALL, null) || deriveOverall(aiLikelihood, signals);

  const recommendations = [];
  const rawRecs = Array.isArray(raw.recommendations) ? raw.recommendations : [];
  for (const r of rawRecs.slice(0, 6)) {
    const clean = str(r, 300);
    if (clean) recommendations.push(clean);
  }
  if (!recommendations.length) {
    recommendations.push('Review the highlighted sections against the student\'s known writing.');
  }

  const sectionsFlagged = new Set(evidence.map((e) => e.section)).size;

  return {
    ok: true,
    errors: [],
    value: {
      overallStatus,
      aiLikelihood,
      confidence,
      summary,
      signals,
      evidence,
      recommendations,
      sectionsFlagged,
    },
  };
}
