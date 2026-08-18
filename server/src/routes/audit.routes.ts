import { Router } from 'express';
import {
  getAuditLogsHandler,
  getAssetAuditLogsHandler,
  getBuilderAuditLogsHandler,
  verifyAuditChainHandler,
  recordAuditExportHandler,
} from '../controllers/audit.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/audit/assets/{assetId}:
 *   get:
 *     tags: [Audit]
 *     summary: Get audit logs for a specific asset
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of audit logs for asset }
 *       401: { description: Unauthorized }
 */
router.get('/assets/:assetId', getAssetAuditLogsHandler);

/**
 * @swagger
 * /api/audit/builders/{builderId}:
 *   get:
 *     tags: [Audit]
 *     summary: Get audit logs for a specific asset builder
 *     parameters:
 *       - in: path
 *         name: builderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of audit logs for builder }
 *       401: { description: Unauthorized }
 */
router.get('/builders/:builderId', getBuilderAuditLogsHandler);

/**
 * @swagger
 * /api/audit:
 *   get:
 *     tags: [Audit]
 *     summary: Get audit logs with optional filtering
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: entityType
 *         schema: { type: string }
 *       - in: query
 *         name: entityId
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated list of audit logs }
 *       401: { description: Unauthorized }
 */
router.get('/', getAuditLogsHandler);

/**
 * @swagger
 * /api/audit/export:
 *   post:
 *     tags: [Audit]
 *     summary: Record an audit log export event (JSON/CSV/PDF download)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format: { type: string, enum: [json, csv, pdf] }
 *               rowCount: { type: integer }
 *               scope: { type: string }
 *     responses:
 *       200: { description: Export recorded }
 *       401: { description: Unauthorized }
 */
router.post('/export', recordAuditExportHandler);

/**
 * @swagger
 * /api/audit/verify:
 *   get:
 *     tags: [Audit]
 *     summary: Verify audit hash chain integrity
 *     responses:
 *       200: { description: Verification result }
 *       401: { description: Unauthorized }
 */
router.get('/verify', verifyAuditChainHandler);

export default router;
