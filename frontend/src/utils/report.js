/**
 * Presentation helpers for the vocabulary VeriWrite deliberately uses
 * instead of "AI Generated: 92%".
 */

export function likelihoodTone(value) {
  switch (value) {
    case 'High':
      return 'badge-bad';
    case 'Elevated':
      return 'badge-warn';
    case 'Moderate':
      return 'badge-info';
    case 'Low':
    case 'Unlikely':
      return 'badge-good';
    default:
      return 'badge-neutral';
  }
}

export function statusTone(value) {
  switch (value) {
    case 'Needs Attention':
      return 'badge-bad';
    case 'High Similarity Detected':
      return 'badge-bad';
    case 'Review Recommended':
      return 'badge-warn';
    case 'Multiple Signals Detected':
      return 'badge-warn';
    case 'Clear':
      return 'badge-good';
    default:
      return 'badge-neutral';
  }
}

export function confidenceTone(value) {
  switch (value) {
    case 'High':
      return 'badge-good';
    case 'Moderate':
      return 'badge-info';
    case 'Low':
      return 'badge-warn';
    default:
      return 'badge-neutral';
  }
}

export function severityTone(value) {
  switch (value) {
    case 'high':
      return { bar: 'bg-red-500', badge: 'badge-bad', label: 'High' };
    case 'medium':
      return { bar: 'bg-amber-500', badge: 'badge-warn', label: 'Moderate' };
    case 'low':
      return { bar: 'bg-brand-400', badge: 'badge-info', label: 'Low' };
    default:
      return { bar: 'bg-ink-300', badge: 'badge-neutral', label: '—' };
  }
}

export function signalTypeLabel(type) {
  const map = {
    writing_style: 'Writing Style',
    sentence_structure: 'Sentence Pattern',
    vocabulary: 'Vocabulary',
    repetition: 'Repetition',
    consistency: 'Consistency',
    transition: 'Transitions',
    formality: 'Formality',
  };
  return map[type] || 'Writing Style';
}

export function actionLabel(report) {
  return report?.status === 'failed' ? 'View details' : 'View Report';
}

export function similarityTone(value) {
  switch (value) {
    case 'Very High':
      return 'badge-bad';
    case 'High':
      return 'badge-bad';
    case 'Moderate':
      return 'badge-warn';
    case 'Low':
      return 'badge-info';
    default:
      return 'badge-neutral';
  }
}

export function matchTypeLabel(type) {
  const map = {
    'near-exact': 'Near-Exact',
    'high-similarity': 'High Similarity',
    semantic: 'Semantic',
    low: 'Low',
  };
  return map[type] || type;
}

export function matchTypeTone(type) {
  switch (type) {
    case 'near-exact':
      return 'badge-bad';
    case 'high-similarity':
      return 'badge-warn';
    case 'semantic':
      return 'badge-info';
    default:
      return 'badge-neutral';
  }
}
