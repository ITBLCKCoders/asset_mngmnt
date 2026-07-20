import { Router } from 'express';
import {
  getDashboardStatsHandler,
  getScopeCategoryIdsHandler,
} from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get dashboard stats, charts data (movement, distributions, pipeline, mix, aging, warranty), and analytics
 *     parameters:
 *       - in: query
 *         name: scope
 *         schema: { type: string, enum: [it, admin] }
 *         description: Optional. Only applied for Global Admin to view IT or Admin scope.
 *     responses:
 *       200: { description: Dashboard payload including stats, assetByType, movement, statusDistribution, assetsByDepartment, assetsByLocation, categoryMix, brandMix, agingBuckets, warrantyRunway, requestPipeline }
 *       401: { description: Unauthorized }
 */
router.get('/stats', getDashboardStatsHandler);

/**
 * @swagger
 * /api/dashboard/scope-category-ids:
 *   get:
 *     tags: [Dashboard]
 *     summary: Category IDs for IT or Admin asset scope (same as dashboard asset filter)
 *     parameters:
 *       - in: query
 *         name: scope
 *         required: true
 *         schema: { type: string, enum: [it, admin] }
 *       - in: query
 *         name: companyId
 *         schema: { type: string }
 *         description: Global Admin — company to resolve departments for
 */
router.get('/scope-category-ids', getScopeCategoryIdsHandler);

export default router;
