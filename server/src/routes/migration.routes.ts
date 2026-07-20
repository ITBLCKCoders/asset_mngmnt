import express from 'express';
import {
  getMigrationStatus,
  runMigrations,
  rollbackLastMigration,
  createMigration,
  checkMigrationsTable,
} from '../controllers/migration.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { ipBasedLimiter } from '../middleware/rateLimiters.js';
import { migrationValidationRules } from '../utils/validationSchemas.js';
import { ROLES } from '../constants/roles.js';

const router = express.Router();

/**
 * All migration endpoints (status, run, rollback, create) are restricted to
 * Global Admin. Running or rolling back DB migrations as a regular user
 * would be a critical privilege-escalation / DoS vector — the gate must
 * stay even though every route also carries `authenticate + ipBasedLimiter`.
 */
const adminOnly = [authenticate, ipBasedLimiter, requireRole(ROLES.SUPER_ADMIN)];

// Migration status routes
router.get('/status', ...adminOnly, getMigrationStatus);
router.get('/check-table', ...adminOnly, checkMigrationsTable);

// Migration execution routes
router.post('/run', ...adminOnly, runMigrations);
router.post('/rollback', ...adminOnly, rollbackLastMigration);

// Migration creation route
router.post(
  '/create',
  ...adminOnly,
  migrationValidationRules.validateSchema,
  createMigration
);

export default router;
