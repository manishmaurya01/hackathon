import Report from '../models/Report.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';

export const listReports = asyncHandler(async (req, res) => {
  const { q = '', status = '', limit = 200 } = req.query;

  const filter = { userId: req.user._id };

  if (status && ['completed', 'processing', 'failed', 'high-similarity', 'ai-signals'].includes(status)) {
    if (status === 'high-similarity') {
      filter.$or = [
        { plagiarismCategory: { $in: ['High', 'Very High'] } },
        { plagiarismScore: { $gte: 50 } },
      ];
    } else if (status === 'ai-signals') {
      filter.aiLikelihood = { $in: ['Elevated', 'High'] };
    } else {
      filter.status = status;
    }
  }

  const query = Report.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 200, 500))
    // Summary rows never need the full assignment body — it can be 60k chars.
    .select(
      'fileName inputType status overallStatus aiLikelihood aiConfidence confidence plagiarismScore plagiarismCategory sectionsFlagged wordCount aiSummary summary error createdAt updatedAt'
    )
    .lean();

  let reports = await query;

  if (q) {
    const needle = String(q).toLowerCase();
    reports = reports.filter(
      (r) =>
        (r.fileName || '').toLowerCase().includes(needle) ||
        (r.overallStatus || '').toLowerCase().includes(needle) ||
        (r.aiLikelihood || '').toLowerCase().includes(needle) ||
        (r.plagiarismCategory || '').toLowerCase().includes(needle) ||
        (r.inputType || '').toLowerCase().includes(needle) ||
        (r.aiSummary || r.summary || '').toLowerCase().includes(needle)
    );
  }

  return ok(res, {
    reports: reports.map((r) => ({
      ...r,
      confidence: r.aiConfidence || r.confidence,
      summary: r.aiSummary || r.summary,
      id: r._id.toString(),
    })),
  });
});

export const getReport = asyncHandler(async (req, res) => {
  const report = await Report.findOne({ _id: req.params.id, userId: req.user._id }).lean();
  if (!report) throw new ApiError(404, 'Report not found.');

  return ok(res, {
    report: {
      ...report,
      confidence: report.aiConfidence || report.confidence,
      summary: report.aiSummary || report.summary,
      id: report._id.toString(),
    },
  });
});

export const deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!report) throw new ApiError(404, 'Report not found.');

  return ok(res, { id: req.params.id }, 'Report deleted.');
});

export const stats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [total, thisMonth, completed, flagged, highSimilarity, recent] = await Promise.all([
    Report.countDocuments({ userId }),
    Report.countDocuments({ userId, createdAt: { $gte: startOfMonth } }),
    Report.countDocuments({ userId, status: 'completed' }),
    Report.countDocuments({
      userId,
      status: 'completed',
      aiLikelihood: { $in: ['Elevated', 'High'] },
    }),
    Report.countDocuments({
      userId,
      status: 'completed',
      $or: [
        { plagiarismCategory: { $in: ['High', 'Very High'] } },
        { plagiarismScore: { $gte: 50 } },
      ],
    }),
    Report.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        'fileName overallStatus aiLikelihood plagiarismScore plagiarismCategory sectionsFlagged createdAt status inputType'
      )
      .lean(),
  ]);

  return ok(res, {
    stats: {
      totalReports: total,
      thisMonth,
      analysesCompleted: completed,
      flaggedReports: flagged,
      highSimilarityReports: highSimilarity,
    },
    recentReports: recent.map((r) => ({ ...r, id: r._id.toString() })),
  });
});
