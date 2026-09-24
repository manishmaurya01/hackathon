import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listReports, getReport, deleteReport, stats } from '../controllers/report.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', listReports);
router.get('/stats', stats);
router.get('/:id', getReport);
router.delete('/:id', deleteReport);

export default router;
