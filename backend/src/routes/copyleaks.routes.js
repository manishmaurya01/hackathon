import { Router } from 'express';
import { handleWebhook } from '../controllers/copyleaks.controller.js';

const router = Router();

// Public webhook route for Copyleaks scan notifications
// Handled at: POST /api/copyleaks/webhook/:status
router.post('/webhook/:status', handleWebhook);

export default router;
