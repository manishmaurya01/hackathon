import path from 'path';
import Report from '../models/Report.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { extractText } from '../services/extract.service.js';
import { analyzeAssignment } from '../services/openrouter.service.js';
import { analyzePlagiarism, calculateTextStatistics } from '../services/plagiarism.service.js';
import { cleanText, splitIntoSections, sectionsToPrompt, countWords } from '../utils/text.js';
import { asTrimmedString, requireFields } from '../utils/validate.js';

const MAX_TEXT_CHARS = 60_000;
const MIN_WORDS = 15;

/**
 * Derive overall status from AI and plagiarism signals
 */
function deriveOverallStatus(aiLikelihood, plagiarismCategory, signals, plagiarismEvidence) {
  const hasHighPlagiarism = plagiarismCategory === 'High' || plagiarismCategory === 'Very High';
  const hasHighAI = aiLikelihood === 'High' || aiLikelihood === 'Elevated';
  const hasHighSeveritySignal = signals.some((s) => s.severity === 'high');
  const hasHighPlagiarismEvidence = plagiarismEvidence.some((e) => e.matchType === 'near-exact' && e.similarity > 80);

  if (hasHighPlagiarismEvidence) return 'High Similarity Detected';
  if (hasHighPlagiarism) return 'High Similarity Detected';
  if (hasHighAI && signals.length > 0) return 'Needs Attention';
  if (hasHighAI || hasHighSeveritySignal) return 'Needs Attention';
  if (plagiarismCategory === 'Moderate' || aiLikelihood === 'Moderate') return 'Review Recommended';
  if (signals.length > 0 || plagiarismEvidence.length > 0) return 'Multiple Signals Detected';
  return 'Clear';
}

/**
 * Shared analysis pipeline for both file uploads and pasted text.
 * Runs AI analysis, plagiarism detection, and style analysis in parallel.
 * Gracefully handles partial failures.
 */
async function runAnalysis({ userId, inputType, fileName, rawText }) {
  const cleaned = cleanText(rawText);

  if (!cleaned) {
    throw new ApiError(400, 'There is no text to analyse.', { code: 'EMPTY_TEXT' });
  }
  if (cleaned.length > MAX_TEXT_CHARS) {
    throw new ApiError(
      400,
      `Assignment is too long to analyse in one pass (max ${MAX_TEXT_CHARS.toLocaleString()} characters).`,
      { code: 'TEXT_TOO_LONG' }
    );
  }

  const words = countWords(cleaned);
  if (words < MIN_WORDS) {
    throw new ApiError(
      400,
      `Assignment is too short to analyse. At least ${MIN_WORDS} words are required (got ${words}).`,
      { code: 'TEXT_TOO_SHORT' }
    );
  }

  const sections = splitIntoSections(cleaned);
  if (!sections.length) {
    throw new ApiError(400, 'Could not split the assignment into sections.', {
      code: 'SECTIONING_FAILED',
    });
  }

  // Persist an in-progress row first so the report is discoverable and
  // failures are visible rather than silently swallowed.
  const report = await Report.create({
    userId,
    fileName,
    inputType,
    originalText: cleaned,
    sections,
    wordCount: words,
    status: 'processing',
  });

  try {
    // Run all three analyses in parallel
    const [aiResult, plagiarismResult, styleResult] = await Promise.allSettled([
      analyzeAssignment({
        sections,
        sectionsPrompt: sectionsToPrompt(sections),
        fileName,
        wordCount: words,
      }),
      analyzePlagiarism({ sections, wordCount: words }),
      calculateTextStatistics(cleaned),
    ]);

    // Process AI analysis result
    let aiAnalysis = null;
    let aiError = null;
    if (aiResult.status === 'fulfilled') {
      aiAnalysis = aiResult.value;
    } else {
      aiError = aiResult.reason;
      console.warn('AI analysis failed:', aiError.message);
    }

    // Process plagiarism result
    let plagiarismAnalysis = null;
    let plagiarismError = null;
    if (plagiarismResult.status === 'fulfilled') {
      plagiarismAnalysis = plagiarismResult.value;
    } else {
      plagiarismError = plagiarismResult.reason;
      console.warn('Plagiarism analysis failed:', plagiarismError.message);
    }

    // Process style analysis result
    let styleAnalysis = null;
    if (styleResult.status === 'fulfilled') {
      styleAnalysis = styleResult.value;
    } else {
      console.warn('Style analysis failed:', styleResult.reason.message);
    }

    // Determine overall status
    const overallStatus = deriveOverallStatus(
      aiAnalysis?.report?.aiLikelihood,
      plagiarismAnalysis?.plagiarismCategory,
      aiAnalysis?.report?.signals || [],
      plagiarismAnalysis?.evidence || []
    );

    // Build the final report
    report.status = aiError && plagiarismError ? 'failed' : aiError || plagiarismError ? 'partial' : 'completed';
    report.overallStatus = overallStatus;

    // AI fields
    if (aiAnalysis) {
      report.aiLikelihood = aiAnalysis.report.aiLikelihood;
      report.aiConfidence = aiAnalysis.report.confidence;
      report.aiSummary = aiAnalysis.report.summary;
      report.signals = aiAnalysis.report.signals;
      report.evidence = aiAnalysis.report.evidence;
      report.recommendations = aiAnalysis.report.recommendations;
      report.sectionsFlagged = aiAnalysis.report.sectionsFlagged;
      report.model = aiAnalysis.model;
    }

    // Plagiarism fields
    if (plagiarismAnalysis) {
      report.plagiarismScore = plagiarismAnalysis.score;
      report.plagiarismCategory = plagiarismAnalysis.category || 'Low';
      report.sourcesFound = plagiarismAnalysis.sourcesFound;
      report.matchedSections = plagiarismAnalysis.matchedSections;
      report.highestMatch = plagiarismAnalysis.highestMatch;
      report.plagiarismSources = plagiarismAnalysis.sources;
      report.plagiarismEvidence = plagiarismAnalysis.evidence;
    }

    // Style analysis fields
    if (styleAnalysis) {
      report.styleAnalysis = styleAnalysis;
    }

    // Error info
    if (aiError || plagiarismError) {
      const errors = [];
      if (aiError) errors.push(`AI: ${aiError.message}`);
      if (plagiarismError) errors.push(`Plagiarism: ${plagiarismError.message}`);
      report.error = errors.join('; ');
    } else {
      report.error = null;
    }

    await report.save();
    return report;
  } catch (err) {
    report.status = 'failed';
    report.error = err.message || 'Analysis failed.';
    await report.save();

    // Surface the real failure to the caller rather than a silent 200.
    const apiErr =
      err instanceof ApiError
        ? err
        : new ApiError(500, 'Analysis failed unexpectedly. Please try again.');
    apiErr.details = { ...(apiErr.details || {}), reportId: report._id.toString() };
    throw apiErr;
  }
}

export const createAnalysis = asyncHandler(async (req, res) => {
  let rawText = '';
  let fileName = null;
  let inputType = 'text';

  if (req.file) {
    inputType = 'file';
    fileName = req.file.originalname;
    rawText = await extractText(req.file.buffer, req.file.originalname);
  } else {
    requireFields(req.body, ['text']);
    rawText = asTrimmedString(req.body.text, { max: MAX_TEXT_CHARS, field: 'text' });
    fileName = req.body.fileName ? String(req.body.fileName).slice(0, 180) : null;
    if (req.body.inputType === 'file' && fileName) inputType = 'file';
  }

  const report = await runAnalysis({ userId: req.user._id, inputType, fileName, rawText });

  return ok(
    res,
    {
      reportId: report._id.toString(),
      report: report.toObject(),
      status: report.status,
    },
    'Analysis complete.'
  );
});

/** Dry-run endpoint: extract + clean + section only, no AI call. */
export const extractPreview = asyncHandler(async (req, res) => {
  let rawText = '';
  let fileName = null;
  let inputType = 'text';

  if (req.file) {
    inputType = 'file';
    fileName = req.file.originalname;
    rawText = await extractText(req.file.buffer, req.file.originalname);
  } else {
    requireFields(req.body, ['text']);
    rawText = asTrimmedString(req.body.text, { max: MAX_TEXT_CHARS, field: 'text' });
    if (req.body.fileName) fileName = String(req.body.fileName).slice(0, 180);
  }

  const cleaned = cleanText(rawText);
  if (!cleaned) throw new ApiError(400, 'There is no text to analyse.', { code: 'EMPTY_TEXT' });

  const sections = splitIntoSections(cleaned);
  const words = countWords(cleaned);

  return ok(res, {
    inputType,
    fileName,
    fileNameExt: fileName ? path.extname(fileName).toLowerCase() : null,
    cleaned,
    sections: sections.map((s) => ({ index: s.index, preview: s.text.slice(0, 160) })),
    sectionCount: sections.length,
    wordCount: words,
    characterCount: cleaned.length,
    canAnalyze: words >= MIN_WORDS,
    minWords: MIN_WORDS,
    maxFileSize: env.MAX_FILE_SIZE,
  });
});
