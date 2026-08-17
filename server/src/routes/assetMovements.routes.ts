import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getMyAssetMovementsHandler } from '../controllers/assetMovements.controller.js';

const router = Router();

/**
 * @openapi
 * /api/asset-movements/my:
 *   get:
 *     summary: Get current user's asset movement report
 *     description: Returns combined transfer and return movements with old/new accountability form numbers and old/new owners
 *     tags: [Asset Movements]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date (ISO date)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date (ISO date)
 *       - in: query
 *         name: formNumber
 *         schema:
 *           type: string
 *         description: Filter by accountability form number (partial match)
 *       - in: query
 *         name: assetCode
 *         schema:
 *           type: string
 *         description: Filter by asset code (partial match)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, transfer, return]
 *           default: all
 *         description: Filter by movement type
 *     responses:
 *       200:
 *         description: Asset movements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       assetCode:
 *                         type: string
 *                       assetName:
 *                         type: string
 *                       oldOwner:
 *                         type: string
 *                       newOwner:
 *                         type: string
 *                       oldAccountabilityFormNo:
 *                         type: string
 *                         nullable: true
 *                       newAccountabilityFormNo:
 *                         type: string
 *                         nullable: true
 *                       date:
 *                         type: string
 *                       movementType:
 *                         type: string
 *                         enum: [Transfer, Return]
 *                       transferFormNumber:
 *                         type: string
 *                         nullable: true
 *                       returnFormNumber:
 *                         type: string
 *                         nullable: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/my', authenticate, getMyAssetMovementsHandler);

export default router;