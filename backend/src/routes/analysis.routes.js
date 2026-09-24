import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import upload, { handleUploadError } from '../middleware/upload.js';
import { createAnalysis, extractPreview } from '../controllers/analysis.controller.js';
import { listReports, getReport, deleteReport } from '../controllers/report.controller.js';

const router = Router();

router.use(requireAuth);

router.post('/', upload.single('file'), handleUploadError, createAnalysis);
router.post('/extract', upload.single('file'), handleUploadError, extractPreview);

// Report read/delete endpoints are also exposed under /api/analysis so the
// documented API surface (GET /api/analysis, GET/DELETE /api/analysis/:id)
// matches what the frontend and integration docs reference.
router.get('/', listReports);
router.get('/:id', getReport);
router.delete('/:id', deleteReport);

export default router;
