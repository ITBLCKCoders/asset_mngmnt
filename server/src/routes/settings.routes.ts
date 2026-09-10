import { Router } from 'express';
import {
  getAssetIdFormatSettingsHandler,
  updateAssetIdFormatSettingsHandler,
  copyMainCompanyAssetSettings,
  copyMainCompanyLocationSettings,
  copyMainCompanyDepartmentSettings,
  getAccountabilityFormSettingsHandler,
  updateAccountabilityFormSettingsHandler,
  updateIntangibleClearanceFormSettingsHandler,
  getIntangibleClearanceFormSettingsHandler,
  getAssetReturnFormSettingsHandler,
  updateAssetReturnFormSettingsHandler,
  getAssetChecklistFormSettingsHandler,
  updateAssetChecklistFormSettingsHandler,
  getAssetTransferFormSettingsHandler,
  updateAssetTransferFormSettingsHandler,
  getAssetBorrowFormSettingsHandler,
  updateAssetBorrowFormSettingsHandler,
  getGlobalMFASettingsHandler,
  updateGlobalMFASettingsHandler,
  getSecuritySettingsHandler,
  updateSecuritySettingsHandler,
} from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/settings/asset-id-format:
 *   get:
 *     tags: [Settings]
 *     summary: Get asset ID format settings
 *     responses:
 *       200: { description: Asset ID format settings }
 *       401: { description: Unauthorized }
 */
router.get('/asset-id-format', getAssetIdFormatSettingsHandler);

/**
 * @swagger
 * /api/settings/asset-id-format:
 *   put:
 *     tags: [Settings]
 *     summary: Update asset ID format settings
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format: { type: string }
 *               prefix: { type: string }
 *     responses:
 *       200: { description: Settings updated }
 *       401: { description: Unauthorized }
 */
router.put('/asset-id-format', updateAssetIdFormatSettingsHandler);

/**
 * @swagger
 * /api/settings/copy-main-company-assets:
 *   post:
 *     tags: [Settings]
 *     summary: Copy asset settings from main company
 *     responses:
 *       200: { description: Settings copied }
 *       401: { description: Unauthorized }
 */
router.post('/copy-main-company-assets', copyMainCompanyAssetSettings);

/**
 * @swagger
 * /api/settings/copy-main-company-locations:
 *   post:
 *     tags: [Settings]
 *     summary: Copy location settings from main company
 *     responses:
 *       200: { description: Settings copied }
 *       401: { description: Unauthorized }
 */
router.post('/copy-main-company-locations', copyMainCompanyLocationSettings);

/**
 * @swagger
 * /api/settings/copy-main-company-departments:
 *   post:
 *     tags: [Settings]
 *     summary: Copy department settings from main company
 *     responses:
 *       200: { description: Settings copied }
 *       401: { description: Unauthorized }
 */
router.post(
  '/copy-main-company-departments',
  copyMainCompanyDepartmentSettings
);

/**
 * @swagger
 * /api/settings/accountability-form:
 *   get:
 *     tags: [Settings]
 *     summary: Get accountability form settings
 *     responses:
 *       200: { description: Accountability form settings }
 *       401: { description: Unauthorized }
 */
router.get('/accountability-form', getAccountabilityFormSettingsHandler);

/**
 * @swagger
 * /api/settings/accountability-form:
 *   put:
 *     tags: [Settings]
 *     summary: Update accountability form settings
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200: { description: Settings updated }
 *       401: { description: Unauthorized }
 */
router.put('/accountability-form', updateAccountabilityFormSettingsHandler);

// Intangible deactivation and accountability clearance share the clearance_* fields
// on the accountability settings record.
router.get('/intangible-clearance-form', getIntangibleClearanceFormSettingsHandler);
router.put('/intangible-clearance-form', updateIntangibleClearanceFormSettingsHandler);

/**
 * @swagger
 * /api/settings/asset-return-form:
 *   get:
 *     tags: [Settings]
 *     summary: Get asset return form settings
 *     responses:
 *       200: { description: Asset return form settings }
 *       401: { description: Unauthorized }
 */
router.get('/asset-return-form', getAssetReturnFormSettingsHandler);

/**
 * @swagger
 * /api/settings/asset-return-form:
 *   put:
 *     tags: [Settings]
 *     summary: Update asset return form settings
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200: { description: Settings updated }
 *       401: { description: Unauthorized }
 */
router.put('/asset-return-form', updateAssetReturnFormSettingsHandler);

router.get('/asset-checklist-form', getAssetChecklistFormSettingsHandler);
router.put('/asset-checklist-form', updateAssetChecklistFormSettingsHandler);

router.get('/asset-transfer-form', getAssetTransferFormSettingsHandler);
router.put('/asset-transfer-form', updateAssetTransferFormSettingsHandler);

router.get('/asset-borrow-form', getAssetBorrowFormSettingsHandler);
router.put('/asset-borrow-form', updateAssetBorrowFormSettingsHandler);

/**
 * @swagger
 * /api/settings/mfa:
 *   get:
 *     tags: [Settings]
 *     summary: Get global MFA settings
 *     responses:
 *       200: { description: Global MFA settings }
 *       401: { description: Unauthorized }
 */
router.get('/mfa', getGlobalMFASettingsHandler);

/**
 * @swagger
 * /api/settings/mfa:
 *   put:
 *     tags: [Settings]
 *     summary: Update global MFA settings
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mfaEnabled]
 *             properties:
 *               mfaEnabled: { type: boolean }
 *     responses:
 *       200: { description: MFA settings updated }
 *       401: { description: Unauthorized }
 */
router.put('/mfa', updateGlobalMFASettingsHandler);

/**
 * @swagger
 * /api/settings/security:
 *   get:
 *     tags: [Settings]
 *     summary: Get security settings
 *     responses:
 *       200: { description: Security settings }
 *       401: { description: Unauthorized }
 */
router.get('/security', getSecuritySettingsHandler);

/**
 * @swagger
 * /api/settings/security:
 *   put:
 *     tags: [Settings]
 *     summary: Update security settings
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               passwordMinLength: { type: number }
 *               passwordRequireUppercase: { type: boolean }
 *               passwordRequireLowercase: { type: boolean }
 *               passwordRequireNumbers: { type: boolean }
 *               passwordRequireSpecial: { type: boolean }
 *               passwordExpirationDays: { type: number }
 *               maxLoginAttempts: { type: number }
 *               lockoutDurationMinutes: { type: number }
 *               sessionTimeoutMinutes: { type: number }
 *               auditLoggingEnabled: { type: boolean }
 *     responses:
 *       200: { description: Security settings updated }
 *       401: { description: Unauthorized }
 */
router.put('/security', updateSecuritySettingsHandler);

export default router;
