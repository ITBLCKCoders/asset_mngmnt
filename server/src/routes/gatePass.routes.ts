import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import {
  createGatePassHandler,
  getGatePassHandler,
  getAllGatePassesHandler,
  updateGatePassHandler,
  deleteGatePassHandler,
} from '../controllers/gatePass.controller.js';

const router = Router();

// All gate pass routes require authentication
router.use(authenticate);

// GET /api/gate-passes - List all gate passes (with optional filters)
router.get('/', requirePermission('Gate Pass', 'view'), getAllGatePassesHandler);

// GET /api/gate-passes/:id - Get single gate pass
router.get('/:id', requirePermission('Gate Pass', 'view'), getGatePassHandler);

// POST /api/gate-passes - Create new gate pass
router.post('/', requirePermission('Gate Pass', 'create'), createGatePassHandler);

// PUT /api/gate-passes/:id - Update gate pass
router.put('/:id', requirePermission('Gate Pass', 'edit'), updateGatePassHandler);

// DELETE /api/gate-passes/:id - Delete gate pass
router.delete('/:id', requirePermission('Gate Pass', 'delete'), deleteGatePassHandler);

export default router;
