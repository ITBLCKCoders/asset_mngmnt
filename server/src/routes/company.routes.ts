// src/routes/company.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/requirePermission.js';
import {
  createCompany,
  updateCompany,
  deleteCompanyLogo,
  getAllCompanies,
  getCompaniesPublicHandler,
  getActiveCompanyHandler,
  getMyCompanyHandler,
  setActiveCompany,
  setMainCompany,
  deleteCompany,
} from '../controllers/company.controller.js';

const router = Router();

/**
 * Public dropdown for the registration page — must stay above any
 * `router.use(authenticate)`. Returns only `{id, name, prefix, logo_url}`.
 * SECURITY: Do NOT swap to `getAllCompanies` here — that handler exposes
 * email, tax_id, phone, full address and audit metadata.
 */
router.get('/public', getCompaniesPublicHandler);

/**
 * @swagger
 * /api/companies:
 *   post:
 *     tags: [Companies]
 *     summary: Create a company
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               address: { type: string }
 *               logo: { type: string }
 *     responses:
 *       201: { description: Company created }
 *       401: { description: Unauthorized }
 */
router.post(
  '/',
  authenticate,
  requirePermission('Companies', 'create'),
  createCompany
);

/**
 * @swagger
 * /api/companies/{id}:
 *   patch:
 *     tags: [Companies]
 *     summary: Update a company
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
 *               address: { type: string }
 *               logo: { type: string }
 *     responses:
 *       200: { description: Company updated }
 *       401: { description: Unauthorized }
 *       404: { description: Company not found }
 */
router.patch(
  '/:id',
  authenticate,
  requirePermission('Companies', 'edit'),
  updateCompany
);

/**
 * @swagger
 * /api/companies/{id}/logo:
 *   delete:
 *     tags: [Companies]
 *     summary: Delete company logo
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Logo deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Company not found }
 */
router.delete(
  '/:id/logo',
  authenticate,
  requirePermission('Companies', 'edit'),
  deleteCompanyLogo
);

/**
 * @swagger
 * /api/companies:
 *   get:
 *     tags: [Companies]
 *     summary: Get all companies (full detail — authenticated only)
 *     responses:
 *       200: { description: List of companies with full audit metadata }
 *       401: { description: Unauthorized }
 */
router.get(
  '/',
  authenticate,
  requirePermission('Companies', 'view'),
  getAllCompanies
);

/**
 * @swagger
 * /api/companies/active:
 *   get:
 *     tags: [Companies]
 *     summary: Get active company for current user
 *     responses:
 *       200: { description: Active company }
 *       401: { description: Unauthorized }
 */
router.get('/active', authenticate, getActiveCompanyHandler);

/**
 * @swagger
 * /api/companies/my:
 *   get:
 *     tags: [Companies]
 *     summary: Get current user's company (e.g. for form logos)
 *     responses:
 *       200: { description: User's company or empty array }
 *       401: { description: Unauthorized }
 */
router.get('/my', authenticate, getMyCompanyHandler);

/**
 * @swagger
 * /api/companies/{id}/active:
 *   patch:
 *     tags: [Companies]
 *     summary: Set active company
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Active company set }
 *       401: { description: Unauthorized }
 *       404: { description: Company not found }
 */
router.patch('/:id/active', authenticate, setActiveCompany);

/**
 * @swagger
 * /api/companies/{id}/main:
 *   patch:
 *     tags: [Companies]
 *     summary: Set main company
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Main company set }
 *       401: { description: Unauthorized }
 *       404: { description: Company not found }
 */
router.patch('/:id/main', authenticate, setMainCompany);

/**
 * @swagger
 * /api/companies/{id}:
 *   delete:
 *     tags: [Companies]
 *     summary: Delete a company
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Company deleted }
 *       401: { description: Unauthorized }
 *       404: { description: Company not found }
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('Companies', 'delete'),
  deleteCompany
);

export default router;
