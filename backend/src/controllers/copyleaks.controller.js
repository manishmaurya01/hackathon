import Report from '../models/Report.js';
import {
  parseCopyleaksResults,
  getSimilarityCategory,
  processCopyleaksWebhook,
} from '../services/copyleaks.service.js';
import { deriveOverallStatus } from './analysis.controller.js';

/**
 * Handle incoming Copyleaks webhook callbacks.
 *
 * Endpoint: POST /api/copyleaks/webhook/:status
 *
 * Copyleaks replaces {STATUS} with:
 * - 'completed' (scan succeeded and results are ready)
 * - 'error' (scan failed)
 * - 'creditsChecked' (credit verification)
 * - 'indexed' (internal indexing notification)
 */
export async function handleWebhook(req, res) {
  const statusParam = String(req.params.status || '').toLowerCase();

  // Extract scan ID from possible Copyleaks headers or payload properties
  const scanId =
    req.headers['copyleaks-scan-id'] ||
    req.headers['x-copyleaks-scan-id'] ||
    req.body?.scannedDocument?.scanId ||
    req.body?.scanId ||
    req.body?.id ||
    req.query?.scanId ||
    null;

  console.log(
    `[Copyleaks Webhook] Received notification: status="${statusParam}", scanId="${scanId || 'unknown'}"`
  );

  try {
    // 1. Handle error notifications
    if (statusParam === 'error' || req.body?.status === 1 || req.body?.error) {
      const errDetail =
        req.body?.error?.message ||
        req.body?.message ||
        'Copyleaks reported an error during plagiarism scanning';

      console.warn(`[Copyleaks Webhook] Scan error for ${scanId || 'unknown'}: ${errDetail}`);

      if (scanId) {
        const query = {
          $or: [
            { scanIds: scanId },
            ...(scanId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: scanId }] : []),
          ],
        };
        const report = await Report.findOne(query);
        if (report && (report.status === 'processing' || report.status === 'partial')) {
          report.error = report.error
            ? `${report.error}; Plagiarism: ${errDetail}`
            : `Plagiarism: ${errDetail}`;
          report.status = report.signals && report.signals.length > 0 ? 'partial' : 'failed';
          await report.save();
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Error webhook acknowledged',
        status: statusParam,
        scanId,
      });
    }

    // 2. Handle completed scan results
    if (statusParam === 'completed' || req.body?.results) {
      if (scanId) {
        const query = {
          $or: [
            { scanIds: scanId },
            ...(scanId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: scanId }] : []),
          ],
        };
        const report = await Report.findOne(query);

        if (report) {
          let parsed;
          try {
            parsed = processCopyleaksWebhook(req.body, report.sections || [], report.wordCount || 0);
          } catch {
            parsed = parseCopyleaksResults(req.body, report.sections || [], report.wordCount || 0);
          }

          report.plagiarismScore = parsed.score;
          report.plagiarismCategory =
            parsed.category || getSimilarityCategory(parsed.score);
          report.sourcesFound = parsed.sourcesFound;
          report.matchedSections = parsed.matchedSections;
          report.highestMatch = parsed.highestMatch;
          report.plagiarismSources = parsed.sources || [];
          report.plagiarismEvidence = parsed.evidence || [];

          if (report.status === 'processing' || report.status === 'partial') {
            report.status = report.error ? 'partial' : 'completed';
          }

          report.overallStatus = deriveOverallStatus(
            report.aiLikelihood,
            report.plagiarismCategory,
            report.signals || [],
            report.plagiarismEvidence || []
          );

          await report.save();
          console.log(
            `[Copyleaks Webhook] Successfully updated report ${report._id} with score ${parsed.score}%`
          );
        } else {
          console.log(
            `[Copyleaks Webhook] No matching report found for scanId: "${scanId}" (acknowledged)`
          );
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Completed webhook processed',
        status: statusParam,
        scanId,
      });
    }

    // 3. Handle informational callbacks (creditsChecked, indexed, etc.)
    return res.status(200).json({
      success: true,
      message: `Webhook status "${statusParam}" acknowledged`,
      status: statusParam,
      scanId,
    });
  } catch (err) {
    // Return HTTP 200 so Copyleaks does not endlessly hammer the webhook endpoint
    console.error('[Copyleaks Webhook] Error processing webhook payload:', err?.message || err);
    return res.status(200).json({
      success: false,
      message: 'Payload received and handled safely',
      status: statusParam,
    });
  }
}
