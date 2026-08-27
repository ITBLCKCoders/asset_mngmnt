// src/routes/riskLevels.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validateDto } from '../utils/validation.js';
import {
  CreateRiskLevelDtoSchema,
  UpdateRiskLevelDtoSchema,
} from '../dtos/riskLevels/RiskLevelDto.js';
import {
  getAllRiskLevels,
  createRiskLevel,
  updateRiskLevel,
  deleteRiskLevel,
} from '../controllers/riskLevels.controller.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /api/risk-levels:
 *   get:
 *     tags: [Risk Levels]
 *     summary: Get all risk levels
 *     responses:
 *       200: { description: List of risk levels }
 *       401: { description: Unauthorized }
 */
router.get('/', getAllRiskLevels);

/**
 * @swagger
 * /api/risk-levels:
 *   post:
 *     tags: [Risk Levels]
 *     summary: Create a risk level
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               color: { type: string, nullable: true }
 *     responses:
 *       201: { description: Risk level created }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
router.post('/', validateDto(CreateRiskLevelDtoSchema), createRiskLevel);

/**
 * @swagger
 * /api/risk-levels/{id}:
 *   patch:
 *     tags: [Risk Levels]
 *     summary: Update a risk level
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               color: { type: string, nullable: true }
 *     responses:
 *       200: { description: Risk level updated }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Risk level not found }
 */
router.patch('/:id', validateDto(UpdateRiskLevelDtoSchema), updateRiskLevel);

/**
 * @swagger
 * /api/risk-levels/{id}:
 *   delete:
 *     tags: [Risk Levels]
 *     summary: Delete a risk level
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Risk level deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Risk level not found }
 */
router.delete('/:id', deleteRiskLevel);

export default router;
