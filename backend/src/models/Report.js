import mongoose from 'mongoose';

export const SIGNAL_TYPES = [
  'writing_style',
  'sentence_structure',
  'vocabulary',
  'repetition',
  'consistency',
  'transition',
  'formality',
];

export const SEVERITIES = ['low', 'medium', 'high'];
export const LIKELIHOODS = ['Unlikely', 'Low', 'Moderate', 'Elevated', 'High'];
export const CONFIDENCES = ['Low', 'Moderate', 'High'];
export const OVERALL_STATUSES = [
  'Clear',
  'Needs Attention',
  'Review Recommended',
  'High Similarity Detected',
  'Multiple Signals Detected',
];

const signalSchema = new mongoose.Schema(
  {
    type: { type: String, enum: SIGNAL_TYPES, default: 'writing_style' },
    label: { type: String, required: true, trim: true },
    severity: { type: String, enum: SEVERITIES, default: 'medium' },
    explanation: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const evidenceSchema = new mongoose.Schema(
  {
    section: { type: Number, required: true, min: 1 },
    text: { type: String, required: true, trim: true },
    signal: { type: String, default: 'Writing pattern anomaly', trim: true },
    reason: { type: String, required: true, trim: true },
    confidence: { type: String, enum: CONFIDENCES, default: 'Moderate' },
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true, min: 1 },
    text: { type: String, required: true },
  },
  { _id: false }
);

// Plagiarism source schema
const plagiarismSourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true },
    matchCount: { type: Number, default: 0 },
    maxSimilarity: { type: Number, default: 0 },
  },
  { _id: false }
);

// Plagiarism evidence schema
const plagiarismEvidenceSchema = new mongoose.Schema(
  {
    section: { type: Number, required: true, min: 1 },
    studentText: { type: String, required: true, trim: true },
    sourceText: { type: String, required: true, trim: true },
    sourceTitle: { type: String, required: true, trim: true },
    sourceUrl: { type: String, required: true, trim: true },
    sourceDomain: { type: String, required: true, trim: true },
    similarity: { type: Number, required: true, min: 0, max: 100 },
    matchType: { type: String, enum: ['near-exact', 'high-similarity', 'semantic', 'low'], required: true },
    explanation: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// Style analysis schema
const styleAnalysisSchema = new mongoose.Schema(
  {
    wordCount: { type: Number, default: 0 },
    sentenceCount: { type: Number, default: 0 },
    paragraphCount: { type: Number, default: 0 },
    averageSentenceLength: { type: Number, default: 0 },
    vocabularyDiversity: { type: Number, default: 0 },
    repeatedPhrases: [{
      phrase: { type: String, trim: true },
      count: { type: Number },
    }],
    longestSentence: { type: String, default: '', trim: true },
    shortestSentence: { type: String, default: '', trim: true },
    sentenceLengthStdDev: { type: Number, default: 0 },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileName: { type: String, default: null, trim: true },
    inputType: { type: String, enum: ['file', 'text'], required: true },
    originalText: { type: String, required: true },
    sections: { type: [sectionSchema], default: [] },
    status: { type: String, enum: ['processing', 'completed', 'failed', 'partial'], default: 'processing' },
    error: { type: String, default: null },
    overallStatus: { type: String, enum: [...OVERALL_STATUSES, null], default: null },

    // AI Writing Analysis
    aiLikelihood: { type: String, enum: [...LIKELIHOODS, null], default: null },
    aiConfidence: { type: String, enum: [...CONFIDENCES, null], default: null },
    aiSummary: { type: String, default: null },
    signals: { type: [signalSchema], default: [] },
    evidence: { type: [evidenceSchema], default: [] },
    recommendations: { type: [String], default: [] },
    sectionsFlagged: { type: Number, default: 0 },

    // Plagiarism Analysis
    plagiarismScore: { type: Number, default: 0, min: 0, max: 100 },
    plagiarismCategory: { type: String, enum: ['Low', 'Moderate', 'High', 'Very High', null], default: null },
    sourcesFound: { type: Number, default: 0 },
    matchedSections: { type: Number, default: 0 },
    highestMatch: { type: Number, default: 0 },
    plagiarismSources: { type: [plagiarismSourceSchema], default: [] },
    plagiarismEvidence: { type: [plagiarismEvidenceSchema], default: [] },

    // Style Analysis
    styleAnalysis: { type: styleAnalysisSchema, default: {} },

    // Metadata
    wordCount: { type: Number, default: 0 },
    model: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Report', reportSchema);
