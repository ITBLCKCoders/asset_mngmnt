import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import {
  getRetentionSettingsHandler,
  upsertRetentionSettingsHandler,
  getSystemDefaultsHandler,
  updateSystemDefaultsHandler,
  triggerArchiveHandler,
} from '../controllers/auditRetention.controller.js';

const router = Router();

router.use(authenticate);

// Company-level retention settings
router.get('/settings', getRetentionSettingsHandler);
router.put('/settings', upsertRetentionSettingsHandler);
router.post('/archive', triggerArchiveHandler);

// System-level defaults (super admin only)
router.get('/defaults', getSystemDefaultsHandler);
router.put('/defaults', updateSystemDefaultsHandler);

export default router;
