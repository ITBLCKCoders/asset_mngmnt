import type { Response } from 'express';
import { createReadStream } from 'fs';
import crypto from 'crypto';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';
import { handleAccountabilityFormOnAssetReturn, type ProcessSignature } from '../utils/accountabilityFormOnReturn.js';
import {
  isUserManagerApprover1,
  isUserManagerApprover2,
  getManagerApprover1UserIdsInDepartmentAndCompany,
} from '../utils/approverNotifications.js';
import { createNotificationForApi } from '../utils/notificationsApi.js';
import { getIoInstance } from '../utils/socketManager.js';
import { emitNotification } from '../sockets/socketHandlers.js';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../utils/responseWrapper.js';
import { AppError, NotFoundError, ValidationError } from '../types/AppError.js';
import {
  uploadReturnConditionImageToCloudinary,
  signedRawUrlFromStoredSecureUrl,
} from '../utils/cloudinary.js';
import { AssetTransferFormModel } from '../models/assetTransferForm.model.js';
import { AssetReturnFormModel } from '../models/assetReturnForm.model.js';
import { AssetReturn, AssetReturnModel } from '../models/assetReturn.model.js';
import {
  generateReturnFormNumber,
  generateReturnFormNumberFallback,
} from '../utils/returnFormNumber.js';
import {
  generateChecklistFormNumber,
  generateChecklistFormNumberFallback,
} from '../utils/checklistFormNumber.js';
import * as checklistRepo from '../repositories/assetChecklist.repository.js';
import * as intangibleAssetsService from '../services/intangibleAssets.service.js';
import {
  getCategoryDepartmentForAssetIds,
  getCompanyIdByDepartment,
} from '../repositories/assetReturn.repository.js';
import {
  generateTransferFormNumber,
  generateTransferFormNumberFallback,
} from '../utils/transferFormNumber.js';
import { getAssetScope, getDepartmentIdsForScope } from '../utils/assetScope.js';
import { fetchUserDigitalSignature } from '../repositories/assetReturn.repository.js';
import { createAccountabilityFormHandler } from './accountabilityForms.controller.js';
import {
  toBind,
  getTransferFormLinksForReturnForms,
  getTransferFormByReturnFormId,
  getTransferFormIdsByReturnFormId,
  getTransferFormAssignments,
  getActiveAssignmentsByIds,
  getRoomByLocationIdAndName,
  getDepartmentById,
  getUserById,
  getUserDepartmentId,
  getUserNamesById,
  getCategoryDepartmentsByAssetIds,
  getBuilderItemsByAssetIds,
  getBuilderItemCount,
  getBuilderByAssetId,
  getAssetCodeByAssetId,
  getAssetBuilderByAssetId,
  getAssetDetailsByIds,
  getAssetAssignmentDetailsByUserIdAndCategoryIds,
  getAssetAssignmentDetailsByUserIdAndAssetIds,
  getAccountabilityFormsByUserIdAndStatus,
  getApprovedTransferFormsByCompanyId,
  executeRawWrite,
} from '../repositories/assetTransferForm.repository.js';

async function getCompanyNameById(companyId: string): Promise<string | null> {
  const [rows] = (await pool.execute(
    'SELECT name FROM companies WHERE companyID = ? AND deleted_at IS NULL LIMIT 1',
    [companyId]
  )) as any[];
  return rows?.[0]?.name ?? null;
}

async function userCanAccessCompanyTransfer(userId: string): Promise<boolean> {
  const [rows] = (await pool.execute(
    `SELECT r.asset_type, r.manager_role, r.name as role_name
       FROM users u
       LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
      WHERE u.userID = ?
      LIMIT 1`,
    [userId]
  )) as any[];
  const row = rows?.[0];
  const roleName = String(row?.role_name ?? '').trim().toLowerCase();
  const assetType = String(row?.asset_type ?? '').trim().toLowerCase();
  const managerRole = String(row?.manager_role ?? '').trim();
  return (
    roleName === 'global admin' ||
    roleName === 'admin' ||
    managerRole === 'overallManager' ||
    assetType === 'it' ||
    assetType === 'admin'
  );
}

function formatProcessSignedAtForDb(
  signedAt: string | undefined | null
): string | null {
  if (signedAt == null) return null;
  const d = new Date(signedAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

async function resolveProcessSignatureForDb(
  processSignature:
    | {
        signed_at?: string | null;
        digital_signature?: string | null;
        digitalSignature?: string | null;
      }
    | undefined,
  processorUserId: string
): Promise<{
  processSignedAtForDb: string | null;
  processDigitalSignature: string | null;
}> {
  const processSignedAtForDb = formatProcessSignedAtForDb(
    processSignature?.signed_at ?? null
  );
  const fromBody =
    (typeof processSignature?.digital_signature === 'string'
      ? processSignature.digital_signature.trim()
      : '') ||
    (typeof processSignature?.digitalSignature === 'string'
      ? processSignature.digitalSignature.trim()
      : '') ||
    '';
  const processDigitalSignature =
    fromBody ||
    (processSignedAtForDb
      ? await fetchUserDigitalSignature(processorUserId)
      : null);
  return { processSignedAtForDb, processDigitalSignature };
}

/** Resolve IT Staff processor signature for PDF/display (matches profile documents tab). */
async function resolveProcessorSignatureForBatchDisplay(form: {
  created_by?: string | null;
  process_signed_at?: string | null;
  process_digital_signature?: string | null;
  processor_pending_signed_at?: string | null;
  processor_pending_signature?: string | null;
}): Promise<{
  process_signed_at: string | null;
  process_digital_signature: string | null;
  processor_pending_signed_at: string | null;
  processor_pending_signature: string | null;
}> {
  const processSignedAt =
    form.process_signed_at ?? form.processor_pending_signed_at ?? null;
  let processDigitalSignature =
    (form.process_digital_signature != null &&
      String(form.process_digital_signature).trim()) ||
    (form.processor_pending_signature != null &&
      String(form.processor_pending_signature).trim()) ||
    null;
  if (!processDigitalSignature && processSignedAt && form.created_by) {
    processDigitalSignature = await fetchUserDigitalSignature(form.created_by);
  }
  return {
    process_signed_at: form.process_signed_at ?? null,
    process_digital_signature: processDigitalSignature,
    processor_pending_signed_at: form.processor_pending_signed_at ?? null,
    processor_pending_signature: form.processor_pending_signature ?? null,
  };
}

export async function getCompanyTransferEligibleAssetsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const currentUserId = req.user!.userID;
    if (!(await userCanAccessCompanyTransfer(currentUserId))) {
      return res.status(403).json({ error: 'Not allowed to transfer assets by company' });
    }

    const scopeParam = req.query.scope as string | undefined;
    const scopeOverride =
      scopeParam === 'it' || scopeParam === 'admin' ? scopeParam : undefined;

    const { companyId, departmentIds: scopeDeptIds, isSuperAdmin } =
      await getAssetScope(pool, currentUserId);
    if (!companyId) return res.json({ assets: [] });

    let departmentIds = scopeDeptIds;

    if (scopeOverride) {
      const [userRows] = (await pool.execute(
        `SELECT r.manager_role, r.name as role_name FROM users u
         LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
         WHERE u.userID = ?`,
        [currentUserId]
      )) as any[];
      const managerRole = String(userRows?.[0]?.manager_role ?? '').trim();
      const roleName = String(userRows?.[0]?.role_name ?? '').trim().toLowerCase();
      if (isSuperAdmin || roleName === 'admin' || managerRole === 'overallManager') {
        departmentIds = await getDepartmentIdsForScope(pool, scopeOverride, companyId);
      }
    }

    const params: unknown[] = [companyId];
    let departmentFilter = '';
    if (departmentIds && departmentIds.length > 0) {
      departmentFilter = ` AND ac.department_id IN (${departmentIds.map(() => '?').join(',')})`;
      params.push(...departmentIds);
    }

    const [rows] = (await pool.execute(
      `SELECT
          a.assetID as assetId,
          a.asset_code as assetCode,
          a.name as assetName,
          a.status,
          a.company_id as companyId,
          ac.name as categoryName,
          at.name as typeName,
          aa.assignmentID as assignmentId,
          aa.assignment_notes as assignmentNotes,
          aa.user_id as assignedUserId,
          u.first_name,
          u.last_name
       FROM assets a
       LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
       LEFT JOIN asset_types at ON a.type_id = at.typeID
       LEFT JOIN asset_assignments aa
         ON aa.asset_id = a.assetID
        AND aa.status = 'Active'
        AND aa.deleted_at IS NULL
       LEFT JOIN users u ON aa.user_id = u.userID
       WHERE a.deleted_at IS NULL
         AND a.company_id = ?
         ${departmentFilter}
       ORDER BY a.asset_code ASC`,
      params as never[]
    )) as any[];

    return res.json({
      assets: (rows as any[]).map(row => ({
        assetId: row.assetId,
        assetCode: row.assetCode,
        assetName: row.assetName,
        status: row.status,
        companyId: row.companyId,
        categoryName: row.categoryName,
        typeName: row.typeName,
        assignmentId: row.assignmentId ?? null,
        assignmentNotes: row.assignmentNotes ?? null,
        source:
          !row.assignmentId
            ? 'available'
            : String(row.assignmentNotes ?? '')
                .toLowerCase()
                .includes('assigned via asset return (assign to processor)')
              ? 'temporary_custody'
              : 'assigned',
        assignedUser:
          row.assignedUserId != null
            ? {
                id: row.assignedUserId,
                name: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
              }
            : null,
      })),
    });
  } catch (error: any) {
    logger.error('Get company transfer eligible assets failed:', error);
    return res.status(500).json({ error: 'Failed to fetch company transfer assets' });
  }
}

export async function createCompanyTransferHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const currentUserId = req.user!.userID;
    if (!(await userCanAccessCompanyTransfer(currentUserId))) {
      return res.status(403).json({ error: 'Not allowed to transfer assets by company' });
    }

    const body = req.body as {
      assetIds?: unknown[];
      targetCompanyId?: string;
      notes?: string;
    };
    const assetIds = Array.isArray(body.assetIds)
      ? body.assetIds.map(id => String(id)).filter(Boolean)
      : [];
    const targetCompanyId = body.targetCompanyId ? String(body.targetCompanyId) : '';
    if (assetIds.length === 0) {
      return res.status(400).json({ error: 'assetIds array is required' });
    }
    if (!targetCompanyId) {
      return res.status(400).json({ error: 'targetCompanyId is required' });
    }

    const targetCompanyName = await getCompanyNameById(targetCompanyId);
    if (!targetCompanyName) {
      return res.status(404).json({ error: 'Target company not found' });
    }

    const { companyId, departmentIds } = await getAssetScope(pool, currentUserId);
    if (!companyId) return res.status(403).json({ error: 'Company scope not found' });
    if (companyId === targetCompanyId) {
      return res.status(400).json({ error: 'Target company must be different' });
    }

    const placeholders = assetIds.map(() => '?').join(',');
    const params: unknown[] = [...assetIds, companyId];
    let departmentFilter = '';
    if (departmentIds && departmentIds.length > 0) {
      departmentFilter = ` AND ac.department_id IN (${departmentIds.map(() => '?').join(',')})`;
      params.push(...departmentIds);
    }

    const [rows] = (await pool.execute(
      `SELECT
          a.assetID, a.asset_code, a.name, a.status, a.company_id,
          aa.assignmentID, aa.assignment_notes, aa.status as assignment_status,
          aa.user_id
       FROM assets a
       LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
       LEFT JOIN asset_assignments aa
         ON aa.asset_id = a.assetID
        AND aa.status = 'Active'
        AND aa.deleted_at IS NULL
       WHERE a.assetID IN (${placeholders})
         AND a.deleted_at IS NULL
         AND a.company_id = ?
         ${departmentFilter}`,
      params as never[]
    )) as any[];

    const uniqueRowsByAsset = new Map<string, any>();
    for (const row of rows as any[]) uniqueRowsByAsset.set(String(row.assetID), row);
    if (uniqueRowsByAsset.size !== assetIds.length) {
      return res.status(404).json({ error: 'One or more assets are not available in your company scope' });
    }

    const transferredAssets: any[] = [];
    const transferredAssetIdSet = new Set(assetIds.map(String));

    // ── Phase 1: Return assignments and set originating_company_id ──
    // IMPORTANT: Do NOT clear category_id yet — handleAccountabilityFormOnAssetReturn
    // needs it to look up the returned asset's department for proper form re-creation.
    const returnedByUser = new Map<string, string[]>();
    for (const row of uniqueRowsByAsset.values()) {
      const assetId = String(row.assetID);
      const assetCode = row.asset_code ?? assetId;

      if (row.assignmentID) {
        await pool.execute('CALL sp_mark_assignment_returned(?, ?, ?)', [
          row.assignmentID,
          `Returned for company transfer to ${targetCompanyName}`,
          'Good',
        ]);
        if (row.user_id) {
          const uid = String(row.user_id);
          if (!returnedByUser.has(uid)) returnedByUser.set(uid, []);
          returnedByUser.get(uid)!.push(assetId);
        }
      }

      // Preserve home company: set origin from source if missing
      await pool.execute(
        `UPDATE assets SET originating_company_id = ?
         WHERE assetID = ? AND originating_company_id IS NULL`,
        [companyId, assetId]
      );
    }

    // ── Phase 2: Handle accountability forms (category_id still intact) ──
    for (const [affectedUserId, returnedAssetIds] of returnedByUser.entries()) {
      await handleAccountabilityFormOnAssetReturn(
        affectedUserId,
        returnedAssetIds,
        null,
        null,
        null,
        currentUserId,
        req
      );
    }

    // ── Phase 3: Update company_id and clear department/category for scope neutrality ──
    for (const row of uniqueRowsByAsset.values()) {
      const assetId = String(row.assetID);
      const assetCode = row.asset_code ?? assetId;

      logger.info(`Moving asset ${assetCode} (ID: ${assetId}) to company ${targetCompanyId}`);

      await pool.execute(
        `UPDATE assets
            SET company_id = ?,
                status = 'Available',
                department_id = NULL,
                category_id = NULL,
                updated_by = ?,
                updated_at = NOW()
          WHERE assetID = ?`,
        [targetCompanyId, currentUserId, assetId]
      );

      await createAuditLog({
        userId: currentUserId,
        action: 'Transferred Asset to Company',
        resourceType: 'asset',
        resourceId: assetId,
        resourceName: `Asset ${assetCode}`,
        details: `Asset ${assetCode} transferred to ${targetCompanyName}. Department and category cleared for scope-neutral visibility in the target company.`,
        oldValues: { company_id: companyId, status: row.status, department_id: row.department_id, category_id: row.category_id },
        newValues: { company_id: targetCompanyId, status: 'Available', department_id: null, category_id: null },
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });

      transferredAssets.push({ assetId, assetCode, targetCompanyName });
    }

    const [builderRows] = (await pool.execute(
      `SELECT DISTINCT ab.builderID, ab.name, ab.status, ab.company_id
         FROM asset_builders ab
         JOIN asset_builder_items abi ON abi.builder_id = ab.builderID
        WHERE abi.asset_id IN (${placeholders})
          AND ab.deleted_at IS NULL`,
      assetIds as never[]
    )) as any[];

    for (const builder of builderRows as any[]) {
      const [itemRows] = (await pool.execute(
        `SELECT asset_id FROM asset_builder_items WHERE builder_id = ?`,
        [builder.builderID]
      )) as any[];
      const allBuilderAssetIds = (itemRows as any[]).map(row =>
        String(row.asset_id)
      );
      const isWholeBuilderTransferred =
        allBuilderAssetIds.length > 0 &&
        allBuilderAssetIds.every(id => transferredAssetIdSet.has(id));
      if (!isWholeBuilderTransferred) continue;

      await pool.execute(
        `UPDATE asset_builders SET originating_company_id = ?
         WHERE builderID = ? AND originating_company_id IS NULL`,
        [companyId, builder.builderID]
      );

      await pool.execute(
        `UPDATE asset_builders
            SET company_id = ?,
                status = 'Available',
                updated_by = ?,
                updated_at = NOW()
          WHERE builderID = ?`,
        [targetCompanyId, currentUserId, builder.builderID]
      );

      await createAuditLog({
        userId: currentUserId,
        action: 'Transferred Asset Builder to Company',
        resourceType: 'asset_builder',
        resourceId: builder.builderID,
        resourceName: builder.name,
        details: `Asset builder "${builder.name}" transferred to ${targetCompanyName}`,
        oldValues: { company_id: companyId, status: builder.status },
        newValues: { company_id: targetCompanyId, status: 'Available' },
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });
    }

    return res.json({
      message: `Transferred ${transferredAssets.length} asset${transferredAssets.length === 1 ? '' : 's'} to ${targetCompanyName}`,
      transferredAssets,
    });
  } catch (error: any) {
    logger.error('Create company transfer failed:', error);
    return res.status(500).json({ error: 'Failed to transfer assets to company' });
  }
}

export async function createAssetTransferHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      assetTransfers,
      processSignature,
      transferType,
      receivedBy,
      newAssignment,
    } = req.body;

    if (
      !assetTransfers ||
      !Array.isArray(assetTransfers) ||
      assetTransfers.length === 0
    ) {
      return res.status(400).json({
        error: 'Asset transfers array is required',
      });
    }

    if (!newAssignment?.userId) {
      return res.status(400).json({
        error: 'New assignment user (userId) is required',
      });
    }

    const assignmentIds = assetTransfers.map((item: any) => item.assignmentId);

    const assignmentRows = await getActiveAssignmentsByIds(assignmentIds);

    if (assignmentRows.length !== assetTransfers.length) {
      return res
        .status(404)
        .json({ error: 'One or more assignments not found or not active' });
    }

    const firstAssignment = assignmentRows[0] as any;
    const pastOwnerUserId = firstAssignment.user_id;


    // Resolve room ID if room name provided
    let locationRoomId = newAssignment.roomId || null;
    if (newAssignment.roomName && newAssignment.locationId && !locationRoomId) {
      const room = await getRoomByLocationIdAndName(newAssignment.locationId, newAssignment.roomName);
      if (room) {
        locationRoomId = room.roomID;
      }
    }

    let companyId: string | null = null;
    if (firstAssignment.department_id) {
      const dept = await getDepartmentById(firstAssignment.department_id);
      companyId = dept?.company_id ?? null;
    }
    if (!companyId && pastOwnerUserId) {
      const user = await getUserById(pastOwnerUserId);
      companyId = user?.company_id ?? null;
    }

    const newDeptId = newAssignment.departmentId ?? null;
    const newLocId = newAssignment.locationId ?? null;
    const newRoomId = locationRoomId;

    // Derive department from asset category (not transfer location) for form numbers
    const transferredAssetIds = assignmentRows.map((r: any) => r.asset_id);

    const categoryDeptRows = await getCategoryDepartmentsByAssetIds(transferredAssetIds);
    const categoryDeptId = (categoryDeptRows[0] as any)?.departmentID ?? null;

    // Compute which builders have ALL their assets in this transfer batch (full transfer)
    const transferredAssetIdSet = new Set(transferredAssetIds);
    const fullyTransferredBuilderIds = new Set<string>();
    if (transferredAssetIdSet.size > 0) {
      const builderAssetRows = await getBuilderItemsByAssetIds([...transferredAssetIdSet]);

      const builderTransferredCount = new Map<string, number>();
      for (const row of builderAssetRows) {
        const bid = row.builder_id;
        builderTransferredCount.set(
          bid,
          (builderTransferredCount.get(bid) || 0) + 1
        );
      }
      for (const bid of builderTransferredCount.keys()) {
        const total = await getBuilderItemCount(bid);
        const transferred = builderTransferredCount.get(bid) ?? 0;
        if (total > 0 && total === transferred) {
          fullyTransferredBuilderIds.add(bid);
        }
      }
    }

    const { processSignedAtForDb, processDigitalSignature } =
      await resolveProcessSignatureForDb(
        processSignature,
        req.user!.userID
      );

    // Create asset_return_form first (for audit/history)
    const returnFormNumber =
      companyId != null
        ? await generateReturnFormNumber(companyId, categoryDeptId)
        : await generateReturnFormNumberFallback();
    const returnForm = await AssetReturnFormModel.create({
      form_number: returnFormNumber,
      user_id: pastOwnerUserId,
      department_id: categoryDeptId ?? newDeptId,
      location_id: newLocId,
      location_room_id: newRoomId,
      created_by: req.user!.userID,
      process_signed_at: processSignedAtForDb,
      process_digital_signature: processDigitalSignature,
      return_type: transferType ?? null,
      received_by: receivedBy ?? null,
    });
    const returnFormId = returnForm!.formID;

    const form_number =
      companyId != null
        ? await generateTransferFormNumber(companyId, categoryDeptId)
        : await generateTransferFormNumberFallback();

    const transferForm = await AssetTransferFormModel.create({
      form_number,
      user_id: pastOwnerUserId,
      department_id: categoryDeptId ?? newAssignment.departmentId ?? null,
      location_id: newAssignment.locationId ?? null,
      location_room_id: locationRoomId,
      new_assigned_user_id: newAssignment.userId,
      created_by: req.user!.userID,
      process_signed_at: processSignedAtForDb,
      process_digital_signature: processDigitalSignature,
      transfer_type: transferType ?? null,
      received_by: receivedBy ?? null,
    });

    const form_id =
      (transferForm as any)?.formID ?? (transferForm as any)?.form_id ?? null;
    if (!form_id) {
      logger.error('Asset transfer form creation did not return formID');
      return res.status(500).json({ error: 'Failed to create transfer form' });
    }
    const processorId = req.user!.userID;
    const newUserId = newAssignment.userId;

    const pastOwnerNames = await getUserNamesById(pastOwnerUserId);
    const processorNames = await getUserNamesById(processorId);
    const newUserNames = await getUserNamesById(newUserId);
    const pastOwnerName =
      pastOwnerNames?.first_name && pastOwnerNames?.last_name
        ? `${pastOwnerNames.first_name} ${pastOwnerNames.last_name}`
        : 'Unknown';
    const processorName =
      processorNames?.first_name && processorNames?.last_name
        ? `${processorNames.first_name} ${processorNames.last_name}`
        : 'Unknown';
    const newUserName =
      newUserNames?.first_name && newUserNames?.last_name
        ? `${newUserNames.first_name} ${newUserNames.last_name}`
        : 'Unknown';

    const builderTransfersMap = new Map<
      string,
      { builderName: string; assetCodes: string[] }
    >();

    for (const transferData of assetTransfers) {
      const assignment = assignmentRows.find(
        (row: any) => row.assignmentID === transferData.assignmentId
      );
      if (!assignment) continue;

      const validConditions = [
        'Excellent',
        'Good',
        'Fair',
        'Poor',
        'Damaged',
        'Needs Repair',
        'Obsolete',
      ];
      let condition = transferData.condition || 'Good';
      if (typeof condition !== 'string') condition = String(condition);
      if (!validConditions.includes(condition)) condition = 'Good';
      if (condition.length > 50) condition = condition.substring(0, 50);

      const conditionImagesJson =
        transferData.imageUrls &&
        Array.isArray(transferData.imageUrls) &&
        transferData.imageUrls.length > 0
          ? JSON.stringify(transferData.imageUrls)
          : null;

      // Create asset_return record (for audit/history)
      await AssetReturnModel.create({
        assignment_id: transferData.assignmentId,
        user_id: assignment.user_id,
        return_condition: condition,
        return_notes: transferData.notes || `Returned for transfer`,
        return_location_id: newLocId ?? null,
        return_location_room_id: newRoomId ?? null,
        return_department_id: newDeptId ?? null,
        return_batch_id: returnFormId ?? null,
        form_id: returnFormId,
        condition_images:
          transferData.imageUrls && transferData.imageUrls.length > 0
            ? transferData.imageUrls
            : null,
      });

      const recordId = crypto.randomUUID();
      await pool.execute(
        'CALL sp_create_asset_transfer_record(?, ?, ?, ?, ?, ?, ?)',
        [
          toBind(recordId),
          form_id,
          toBind(transferData.assignmentId),
          toBind(assignment.user_id),
          toBind(condition),
          toBind(transferData.notes || ''),
          toBind(conditionImagesJson),
        ]
      );

      const returnNotes = `Returned by ${pastOwnerName} for transfer, processed by ${processorName}`;
      await pool.execute('CALL sp_mark_assignment_returned(?, ?, ?)', [
        transferData.assignmentId,
        returnNotes,
        condition,
      ]);

      const assetCodeRow = await getAssetCodeByAssetId(assignment.asset_id);
      const assetCode = assetCodeRow?.asset_code || assignment.asset_id;

      await createAuditLog({
        userId: processorId,
        action: 'Returned Asset for Transfer',
        resourceType: 'asset_assignment',
        resourceId: transferData.assignmentId,
        resourceName: `Asset ${assetCode}`,
        details: `Asset ${assetCode} returned by ${pastOwnerName} for transfer, processed by ${processorName}`,
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });

      const newAssignmentId = crypto.randomUUID();
      const assignNotes = `Transferred via asset transfer from ${pastOwnerName}`;
      await pool.execute(
        'CALL sp_create_assignment(?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          newAssignmentId,
          assignment.asset_id,
          newUserId,
          newDeptId,
          newLocId,
          newRoomId,
          null,
          assignNotes,
          processorId,
        ]
      );

      await executeRawWrite(
        'UPDATE assets SET status = "Assigned", location_id = ?, location_room_id = ?, department_id = ?, `condition` = ?, updated_by = ?, updated_at = NOW() WHERE assetID = ?',
        [
          newLocId,
          newRoomId,
          newDeptId,
          condition || 'Good',
          processorId,
          assignment.asset_id,
        ]
      );

      await createAuditLog({
        userId: processorId,
        action: 'Transferred Asset',
        resourceType: 'asset_assignment',
        resourceId: newAssignmentId,
        resourceName: `Asset ${assetCode}`,
        details: `Asset ${assetCode} transferred to ${newUserName} via asset transfer from ${pastOwnerName}`,
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });

      // Asset builder: whole batch vs partial (mirror return flow)
      const builder = await getBuilderByAssetId(assignment.asset_id);
      const builderRows = builder ? [builder] : [];

      if (builderRows.length > 0) {
        const isFullTransferForAllBuilders = (builderRows as any[]).every(
          (b: any) => fullyTransferredBuilderIds.has(b.builderID)
        );
        if (isFullTransferForAllBuilders) {
          for (const b of builderRows as any[]) {
            const existing = builderTransfersMap.get(b.builderID);
            if (existing) {
              existing.assetCodes.push(assetCode);
            } else {
              builderTransfersMap.set(b.builderID, {
                builderName: b.name,
                assetCodes: [assetCode],
              });
            }
          }
        } else {
          await executeRawWrite(
            'DELETE FROM asset_builder_items WHERE asset_id = ?',
            [assignment.asset_id]
          );
          await createAuditLog({
            userId: processorId,
            action: 'Removed from Asset Builder',
            resourceType: 'asset',
            resourceId: assetCode,
            resourceName: assetCode,
            details: `Asset "${assetCode}" removed from asset builder due to partial transfer`,
            oldValues: {
              builder_ids: builderRows.map((b: any) => b.builderID),
            },
            ipAddress: req.ip,
            userAgent: req.get ? req.get('User-Agent') : 'Unknown',
          });
          for (const b of builderRows as any[]) {
            await createAuditLog({
              userId: processorId,
              action: 'Removed from Asset Builder',
              resourceType: 'asset_builder',
              resourceId: b.builderID,
              resourceName: b.name,
              details: `Asset "${assetCode}" removed from asset builder due to partial transfer`,
              oldValues: {
                asset_id: assignment.asset_id,
                asset_code: assetCode,
              },
              ipAddress: req.ip,
              userAgent: req.get ? req.get('User-Agent') : 'Unknown',
            });
          }
        }
      }
    }

    // Builder timeline for whole-batch transfers: "Transferred" first (top), then "Returned for Transfer" (under)
    for (const [
      builderID,
      { builderName, assetCodes },
    ] of builderTransfersMap) {
      const assetListBullet =
        assetCodes.length > 0 ? '\n• ' + assetCodes.join('\n• ') : '';
      await createAuditLog({
        userId: processorId,
        action: 'Transferred',
        resourceType: 'asset_builder',
        resourceId: builderID,
        resourceName: builderName,
        details: `Asset builder "${builderName}" transferred to ${newUserName} via asset transfer from ${pastOwnerName}. Assets:${assetListBullet}`,
        newValues: {
          transferred_asset_codes: assetCodes,
          assigned_to: newUserName,
        },
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });
      await createAuditLog({
        userId: processorId,
        action: 'Returned for Transfer',
        resourceType: 'asset_builder',
        resourceId: builderID,
        resourceName: builderName,
        details: `Asset builder "${builderName}" returned for transfer by ${pastOwnerName}, processed by ${processorName}. Assets:${assetListBullet}`,
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });
    }

    // Only recreate "past owner accountability on return" for assets that are
    // actually being returned as part of this transfer execution.
    // If the linked return form was processed first, the related assignments are already `Returned`.
    const returnedAssetIds = assignmentRows
      .filter((r: any) => String(r.status) !== 'Returned')
      .map((r: any) => r.asset_id);
    try {
      await handleAccountabilityFormOnAssetReturn(
        pastOwnerUserId,
        returnedAssetIds,
        null,
        null,
        null,
        processorId,
        req,
        processSignature ?? undefined
      );
    } catch (formErr) {
      logger.error(
        'Accountability form update on transfer (past owner) failed:',
        formErr
      );
    }

    const newAssetIds = assignmentRows.map((r: any) => r.asset_id);

    const newAssetDetails = await getAssetDetailsByIds(newAssetIds);

    // Group transferred assets by department (IT, Admin, etc.) - create one form per type
    const departmentGroups: Record<
      string,
      { departmentId: string; categoryIds: Set<string>; assetIds: string[] }
    > = {};
    for (const row of newAssetDetails as any[]) {
      const deptName = row.department_name || 'Other';
      if (!departmentGroups[deptName]) {
        departmentGroups[deptName] = {
          departmentId: row.department_id ?? newDeptId ?? '',
          categoryIds: new Set(),
          assetIds: [],
        };
      }
      const g = departmentGroups[deptName]!;
      g.assetIds.push(row.assetID);
      if (row.category_id) g.categoryIds.add(row.category_id);
    }

    for (const [deptName, deptInfo] of Object.entries(departmentGroups)) {
      const categoryIds = Array.from(deptInfo.categoryIds).filter(Boolean);

      let deptAssetsRows: any[];
      if (categoryIds.length > 0) {
        deptAssetsRows = await getAssetAssignmentDetailsByUserIdAndCategoryIds(newUserId, categoryIds);
      } else {
        // Fallback: assets without category, query by asset IDs
        deptAssetsRows = await getAssetAssignmentDetailsByUserIdAndAssetIds(newUserId, deptInfo.assetIds);
      }

      if (deptAssetsRows.length === 0) continue;

      const departmentAssets = deptAssetsRows.map((row: any) => ({
        id: row.assetID,
        code: row.asset_code,
        name: row.name || row.asset_code,
        category: row.category_name || row.category_id,
        type: row.type_name || row.type_id,
        department: row.department_name,
        serialNo: row.serial || '',
        modelNo: row.model || '',
        brand: row.brand || '',
      }));

      // Find existing Pending or Signed accountability forms for this user + department
      const existingForms = await getAccountabilityFormsByUserIdAndStatus(newUserId, ['Pending', 'Signed']);

      const mergedAssets = [...departmentAssets];
      const seenIds = new Set(departmentAssets.map((a: any) => String(a.id)));

      for (const form of existingForms) {
        await executeRawWrite(
          'UPDATE accountability_forms SET status = "Disabled", updated_at = NOW() WHERE formID = ?',
          [form.formID]
        );
        await createAuditLog({
          userId: processorId,
          action: 'Disabled Accountability Form',
          resourceType: 'accountability_form',
          resourceId: form.formID,
          resourceName: form.form_number,
          details: `Accountability form disabled due to asset transfer; new form created with merged assets`,
          oldValues: { status: form.status || 'Pending' },
          newValues: { status: 'Disabled' },
          ipAddress: req.ip,
          userAgent: req.get ? req.get('User-Agent') : 'Unknown',
        });

        // Merge assets from existing form into the new form (dedupe by asset id)
        if (form.assets_data) {
          try {
            const data =
              typeof form.assets_data === 'string'
                ? JSON.parse(form.assets_data)
                : form.assets_data;
            const assets = data?.assets || [];
            for (const a of assets) {
              const aid = String(a.id ?? a.assetID ?? '');
              if (aid && !seenIds.has(aid)) {
                seenIds.add(aid);
                mergedAssets.push({
                  id: a.id ?? a.assetID,
                  code: a.code ?? '',
                  name: a.name ?? '',
                  category: a.category ?? '',
                  type: a.type ?? '',
                  department: a.department ?? '',
                  serialNo: a.serialNo ?? '',
                  modelNo: a.modelNo ?? '',
                  brand: a.brand ?? '',
                });
              }
            }
          } catch {
            // ignore parse errors
          }
        }
      }

      const accountabilityFormReq = {
        ...req,
        user: { userID: processorId },
        body: {
          assets: mergedAssets,
          userId: newUserId,
          departmentId: deptInfo.departmentId || newDeptId,
          locationId: newLocId,
          locationRoomId: newRoomId,
        },
      } as AuthRequest;
      const accountabilityFormRes = {
        status: () => ({ json: () => ({}) }),
      } as unknown as Response;
      try {
        await createAccountabilityFormHandler(
          accountabilityFormReq,
          accountabilityFormRes
        );
        logger.info(
          `Created accountability form for transfer recipient: user ${newUserId}, dept ${deptName}, ${mergedAssets.length} assets`
        );
      } catch (acErr) {
        logger.error(
          `Create accountability form for transfer new assignee failed (${deptName}):`,
          acErr
        );
      }
    }

    await createAuditLog({
      userId: processorId,
      action: 'Created Asset Transfer Form',
      resourceType: 'asset_transfer_form',
      resourceId: form_id,
      resourceName: transferForm!.form_number,
      details: `Asset transfer form ${transferForm!.form_number} created. Past owner: ${pastOwnerName}, new assignee: ${newUserName}`,
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });

    return createSuccessResponse(
      res,
      {
        formID: form_id,
        form_number: transferForm!.form_number,
        message: `Successfully transferred ${assetTransfers.length} asset(s)`,
      },
      'Transfer completed',
      201
    );
  } catch (err: any) {
    logger.error('Create asset transfer failed:', err);
    return res.status(500).json({
      error: 'Failed to create asset transfer',
      details: err.message,
    });
  }
}

/** POST create held transfer: return form + transfer form (no sigs), link assignments; no asset movement. Transferer signs both, then Dept Head approves/declines. */
export async function createHeldTransferHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      assetTransfers,
      transferType,
      receivedBy,
      newAssignment,
      processSignature,
      intangibleAssetItems,
    } = req.body;

    const hasIntangibleItems = intangibleAssetItems && Array.isArray(intangibleAssetItems) && intangibleAssetItems.length > 0;
    if (
      !assetTransfers ||
      !Array.isArray(assetTransfers) ||
      (assetTransfers.length === 0 && !hasIntangibleItems)
    ) {
      if (!hasIntangibleItems) {
        return res.status(400).json({
          error: 'Asset transfers array is required',
        });
      }
    }

    if (!newAssignment?.userId) {
      return res.status(400).json({
        error: 'New assignment user (userId) is required',
      });
    }

    const assignmentIds = assetTransfers.map((item: any) => item.assignmentId);

    const assignmentRows = await getActiveAssignmentsByIds(assignmentIds);

    if (assignmentRows.length !== assetTransfers.length) {
      return res
        .status(404)
        .json({ error: 'One or more assignments not found or not active' });
    }

    const firstAssignment = assignmentRows[0] as any;
    const pastOwnerUserId = firstAssignment.user_id;

    let locationRoomId = newAssignment.roomId || null;
    if (newAssignment.roomName && newAssignment.locationId && !locationRoomId) {
      const room = await getRoomByLocationIdAndName(newAssignment.locationId, newAssignment.roomName);
      if (room) {
        locationRoomId = room.roomID;
      }
    }

    let companyId: string | null = null;
    if (firstAssignment.department_id) {
      const dept = await getDepartmentById(firstAssignment.department_id);
      companyId = dept?.company_id ?? null;
    }
    if (!companyId && pastOwnerUserId) {
      const user = await getUserById(pastOwnerUserId);
      companyId = user?.company_id ?? null;
    }

    const newDeptId = newAssignment.departmentId ?? null;
    const newLocId = newAssignment.locationId ?? null;
    const newRoomId = locationRoomId;

    const transferredAssetIds = assignmentRows.map((r: any) => r.asset_id);

    const categoryDeptRows = await getCategoryDepartmentsByAssetIds(transferredAssetIds);
    const categoryDeptId = (categoryDeptRows[0] as any)?.departmentID ?? null;

    const { processSignedAtForDb, processDigitalSignature } =
      await resolveProcessSignatureForDb(
        processSignature,
        req.user!.userID
      );

    const returnFormNumber =
      companyId != null
        ? await generateReturnFormNumber(companyId, categoryDeptId)
        : await generateReturnFormNumberFallback();
    const returnForTransferNote =
      transferType != null && String(transferType).trim()
        ? `Return for transfer (${transferType})`
        : 'Return for transfer';
    const returnForm = await AssetReturnFormModel.create({
      form_number: returnFormNumber,
      user_id: pastOwnerUserId,
      department_id: categoryDeptId ?? newDeptId,
      location_id: newLocId,
      location_room_id: newRoomId,
      created_by: req.user!.userID,
      process_signed_at: processSignedAtForDb,
      process_digital_signature: processDigitalSignature,
      return_type: returnForTransferNote,
      received_by: receivedBy ?? null,
    });
    const returnFormId = returnForm!.formID;

    const form_number =
      companyId != null
        ? await generateTransferFormNumber(companyId, categoryDeptId)
        : await generateTransferFormNumberFallback();

    const transferForm = await AssetTransferFormModel.createPending({
      form_number,
      user_id: pastOwnerUserId,
      department_id: categoryDeptId ?? newAssignment.departmentId ?? null,
      location_id: newAssignment.locationId ?? null,
      location_room_id: locationRoomId,
      new_assigned_user_id: newAssignment.userId,
      created_by: req.user!.userID,
      transfer_type: transferType ?? null,
      return_form_id: returnFormId,
    } as any);

    const form_id =
      (transferForm as any)?.formID ?? (transferForm as any)?.form_id ?? null;
    if (!form_id) {
      logger.error('Asset transfer form creation did not return formID');
      return res.status(500).json({ error: 'Failed to create transfer form' });
    }

    try {
      await AssetTransferFormModel.addFormAssignments(form_id, assignmentIds);
    } catch (assignErr: any) {
      const msg = assignErr?.message ?? '';
      if (
        msg.includes("doesn't exist") &&
        msg.includes('transfer_form_assignments')
      ) {
        logger.error(
          'transfer_form_assignments table missing. Run migration_transfer_form_assignments_and_executed_at.sql'
        );
        return res.status(500).json({
          error:
            'Transfer could not be saved. Please contact support (missing database table).',
          details: msg,
        });
      }
      throw assignErr;
    }

    const validConditions = [
      'Excellent',
      'Good',
      'Fair',
      'Poor',
      'Damaged',
      'Needs Repair',
      'Obsolete',
    ];
    for (const item of assetTransfers as any[]) {
      let condition = item.condition || 'Good';
      if (typeof condition !== 'string') condition = String(condition);
      if (!validConditions.includes(condition)) condition = 'Good';
      if (condition.length > 50) condition = condition.substring(0, 50);
      const notes =
        item.notes != null ? String(item.notes).slice(0, 2000) : null;
      const conditionImagesJson =
        item.imageUrls &&
        Array.isArray(item.imageUrls) &&
        item.imageUrls.length > 0
          ? JSON.stringify(item.imageUrls)
          : null;
      await executeRawWrite(
        `UPDATE transfer_form_assignments SET transfer_condition = ?, transfer_notes = ?, condition_images = ? WHERE form_id = ? AND assignment_id = ?`,
        [
          condition,
          notes,
          conditionImagesJson,
          form_id,
          item.assignmentId,
        ]
      );
    }

    if (processSignedAtForDb != null) {
      await executeRawWrite(
        `UPDATE asset_transfer_forms
         SET process_signed_at = ?,
             process_digital_signature = ?,
             processor_pending_signature = ?,
             processor_pending_signed_at = ?,
             updated_at = NOW()
         WHERE formID = ?`,
        [
          processSignedAtForDb,
          processDigitalSignature,
          processDigitalSignature,
          processSignedAtForDb,
          form_id,
        ]
      );
    }

    return createSuccessResponse(
      res,
      {
        formID: form_id,
        returnFormID: returnFormId,
        form_number: transferForm!.form_number,
        message:
          'Transfer is on hold. The transferer must sign the return form and transfer form in Profile → Documents; then the department head will approve or decline.',
      },
      'Transfer on hold',
      201
    );
  } catch (err: any) {
    logger.error('Create held transfer failed:', err);
    return res.status(500).json({
      error: 'Failed to create held transfer',
      details: err.message,
    });
  }
}

/** POST submit transfer request: create form with transferer signature only, link assignments; form goes to Approvals for Dept Head. */
export async function submitTransferRequestHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const body = req.body as {
      assignmentIds?: string[] | unknown[];
      departmentId?: string;
      transferToUserId?: string;
      notes?: string;
      transferType?: string;
      digitalSignature?: string;
      intangibleAssetIds?: string[];
    };
    const rawAssignmentIds = body.assignmentIds;
    const assignmentIds = Array.isArray(rawAssignmentIds)
      ? rawAssignmentIds.map(id => String(id))
      : [];
    const departmentId =
      body.departmentId != null ? String(body.departmentId) : '';
    const transferToUserId =
      body.transferToUserId != null ? String(body.transferToUserId) : '';

    if (assignmentIds.length === 0) {
      return res.status(400).json({
        error: 'assignmentIds array is required',
      });
    }
    if (!transferToUserId) {
      return res.status(400).json({
        error: 'transferToUserId is required',
      });
    }
    if (!departmentId) {
      return res.status(400).json({
        error: 'departmentId is required',
      });
    }

    const currentUserId = req.user!.userID;

    const transfererDigitalSignature =
      (typeof body.digitalSignature === 'string' &&
        body.digitalSignature.trim()) ||
      (await fetchUserDigitalSignature(currentUserId));

    const assignmentRows = await getActiveAssignmentsByIds(assignmentIds);

    if (assignmentRows.length !== assignmentIds.length) {
      return res
        .status(404)
        .json({ error: 'One or more assignments not found or not active' });
    }

    for (const row of assignmentRows as any[]) {
      if (row.user_id !== currentUserId) {
        return res.status(403).json({
          error:
            'You can only submit transfer requests for your own assignments',
        });
      }
    }

    const targetUser = await getUserById(transferToUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Transfer-to user not found' });
    }
    const targetDeptIdRaw = await getUserDepartmentId(transferToUserId);
    const targetDeptId =
      targetDeptIdRaw != null ? String(targetDeptIdRaw) : '';
    if (targetDeptId !== departmentId) {
      return res.status(400).json({
        error: 'Transfer-to user must be in the selected department',
      });
    }

    // Build asset_id → department_id map from asset category
    const assetIdsForCategoryDept = assignmentRows.map((r: any) => r.asset_id);
    const categoryDeptRows = await getCategoryDepartmentsByAssetIds(assetIdsForCategoryDept);
    const assetDeptMap = new Map<string, string>();
    for (const row of categoryDeptRows as any[]) {
      if (row.assetID && row.departmentID) {
        assetDeptMap.set(row.assetID, row.departmentID);
      }
    }

    // Get transferer's own department as fallback
    const transfererUserDeptId = assignmentRows[0]?.user_id
      ? await getUserDepartmentId(assignmentRows[0].user_id)
      : null;

    // Group assignments by effective department
    const assignmentsByDept = new Map<string, any[]>();
    for (const row of assignmentRows as any[]) {
      const deptId = assetDeptMap.get(row.asset_id)
        ?? transfererUserDeptId
        ?? row.department_id
        ?? '__unknown__';
      if (!assignmentsByDept.has(deptId)) {
        assignmentsByDept.set(deptId, []);
      }
      assignmentsByDept.get(deptId)!.push(row);
    }

    // Validate target user belongs to each department group
    for (const [deptId] of assignmentsByDept) {
      const effectiveDeptId = deptId === '__unknown__' ? null : deptId;
      if (effectiveDeptId && targetDeptId !== effectiveDeptId) {
        const dept = effectiveDeptId ? await getDepartmentById(effectiveDeptId) : null;
        const deptName = dept?.name ?? effectiveDeptId;
        return res.status(400).json({
          error: `Cannot transfer assets from "${deptName}" department to the selected user. The target user must be in the same department as the assets. Assets from ${deptName} must be transferred to a user in ${deptName}.`,
        });
      }
    }

    const sharedNotes = (body.notes != null ? String(body.notes) : '') || '';
    const transferTypeValue =
      (req.body as { transferType?: string }).transferType ?? null;

    const createdForms: Array<{ formID: string; form_number: string | null; returnFormID: string; returnFormNumber: string | null }> = [];
    let firstForm: { formID: string; form_number: string | null; returnFormID: string; returnFormNumber: string | null } | null = null;

    for (const [deptId, deptAssignments] of assignmentsByDept) {
      const effectiveDepartmentId = deptId === '__unknown__' ? null : deptId;

      // Resolve company for return form number
      let returnFormCompanyId: string | null = null;
      const deptIdForReturnForm = effectiveDepartmentId || deptAssignments[0]?.department_id;
      if (deptIdForReturnForm) {
        const dept = await getDepartmentById(deptIdForReturnForm);
        returnFormCompanyId = dept?.company_id ?? null;
      }
      if (!returnFormCompanyId && deptAssignments[0]?.user_id) {
        const user = await getUserById(deptAssignments[0].user_id);
        returnFormCompanyId = user?.company_id ?? null;
      }
      const returnFormNumber =
        returnFormCompanyId != null
          ? await generateReturnFormNumber(returnFormCompanyId, effectiveDepartmentId)
          : await generateReturnFormNumberFallback();

      const firstDeptAssignment = deptAssignments[0];
      const returnForm = await AssetReturnFormModel.createWithReturnerSignature({
        form_number: returnFormNumber,
        user_id: firstDeptAssignment.user_id,
        department_id: effectiveDepartmentId,
        location_id: firstDeptAssignment.location_id ?? null,
        location_room_id: firstDeptAssignment.location_room_id ?? null,
        created_by: currentUserId,
        signed_by: currentUserId,
        signed_digital_signature: transfererDigitalSignature || null,
      });
      const returnFormId = returnForm!.formID;

      // Create asset return records for this department group
      for (const row of deptAssignments) {
        await AssetReturnModel.create({
          assignment_id: row.assignmentID,
          user_id: row.user_id,
          return_condition: 'Good',
          return_notes: sharedNotes,
          return_location_id: row.location_id ?? undefined,
          return_location_room_id: row.location_room_id ?? undefined,
          return_department_id: row.department_id ?? undefined,
          form_id: returnFormId,
        });
      }

      // Resolve company for transfer form number
      let companyId: string | null = null;
      const deptIdForTransfer = effectiveDepartmentId || departmentId;
      if (deptIdForTransfer) {
        const dept = await getDepartmentById(deptIdForTransfer);
        companyId = dept?.company_id ?? null;
      }
      if (!companyId && deptAssignments[0]?.user_id) {
        const user = await getUserById(deptAssignments[0].user_id);
        companyId = user?.company_id ?? null;
      }

      const form_number =
        companyId != null
          ? await generateTransferFormNumber(companyId, effectiveDepartmentId || departmentId)
          : await generateTransferFormNumberFallback();

      const transferForm =
        await AssetTransferFormModel.createWithTransfererSignature({
          form_number,
          user_id: currentUserId,
          department_id: effectiveDepartmentId || departmentId,
          location_id: null,
          location_room_id: null,
          new_assigned_user_id: transferToUserId,
          created_by: currentUserId,
          signed_by: currentUserId,
          signed_digital_signature: transfererDigitalSignature || null,
          transfer_type: transferTypeValue || null,
          return_form_id: returnFormId,
        } as any);

      const formId =
        (transferForm as any)?.formID ?? (transferForm as any)?.form_id ?? null;
      if (!formId) {
        logger.error('Transfer form creation did not return formID');
        return res.status(500).json({ error: 'Failed to create transfer form' });
      }

      const deptAssignmentIds = deptAssignments.map((r: any) => r.assignmentID);
      try {
        await AssetTransferFormModel.addFormAssignments(formId, deptAssignmentIds);
      } catch (assignErr: any) {
        const msg = assignErr?.message ?? '';
        if (
          msg.includes("doesn't exist") &&
          msg.includes('transfer_form_assignments')
        ) {
          logger.error(
            'transfer_form_assignments table missing. Run migration_transfer_form_assignments_and_executed_at.sql'
          );
          return res.status(500).json({
            error:
              'Transfer request could not be saved. Please contact support (missing database table).',
            details: msg,
          });
        }
        throw assignErr;
      }

      const entry = {
        formID: formId,
        form_number: transferForm!.form_number,
        returnFormID: returnFormId,
        returnFormNumber: returnForm?.form_number ?? returnFormNumber,
      };
      createdForms.push(entry);
      if (!firstForm) firstForm = entry;

      // Send notification to Manager Approver 1 users in the same department AND company
      if (effectiveDepartmentId && companyId) {
        try {
          const managerApprover1UserIds = await getManagerApprover1UserIdsInDepartmentAndCompany(effectiveDepartmentId, companyId);
          const requesterName = [firstDeptAssignment.user?.first_name, firstDeptAssignment.user?.last_name].filter(Boolean).join(' ') || 'A user';
          const assetCount = deptAssignments.length;

          const io = getIoInstance();
          for (const approverUserId of managerApprover1UserIds) {
            if (approverUserId !== currentUserId) {
              await createNotificationForApi({
                user_id: approverUserId,
                title: 'Asset Transfer Request Approval Needed',
                message: `${requesterName} has submitted an asset transfer request for ${assetCount} asset${assetCount !== 1 ? 's' : ''} and requires your approval.`,
                type: 'system',
                data: {
                  form_id: formId,
                  form_number: transferForm!.form_number,
                  requester_id: currentUserId,
                  requester_name: requesterName,
                  asset_count: assetCount,
                  route: '/approvals',
                  actionTarget: 'transfer_request_approval',
                },
              });
              if (io) {
                emitNotification(io, approverUserId, 'notification', {
                  id: formId,
                  title: 'Asset Transfer Request Approval Needed',
                  message: `${requesterName} has submitted an asset transfer request for ${assetCount} asset${assetCount !== 1 ? 's' : ''} and requires your approval.`,
                  type: 'system',
                  data: {
                    form_id: formId,
                    form_number: transferForm!.form_number,
                    requester_id: currentUserId,
                    requester_name: requesterName,
                    asset_count: assetCount,
                    route: '/approvals',
                    actionTarget: 'transfer_request_approval',
                  },
                  time: new Date().toISOString(),
                });
              }
            }
          }
        } catch (notifError) {
          logger.error('Failed to send transfer request notifications:', notifError);
        }
      }
    }

    // Process intangible assets tied to the first created form
    const intangibleAssetIds = body.intangibleAssetIds;
    if (intangibleAssetIds && intangibleAssetIds.length > 0 && firstForm) {
      const companyId = await (async () => {
        const user = assignmentRows[0]?.user_id ? await getUserById(assignmentRows[0].user_id) : null;
        return user?.company_id ?? null;
      })();
      if (companyId) {
        for (const assetId of intangibleAssetIds) {
          try {
            await intangibleAssetsService.unassignIntangibleAsset(assetId, currentUserId, companyId);
            await createAuditLog({
              userId: currentUserId,
              action: 'Requested Transfer of Intangible Asset',
              resourceType: 'intangible_asset',
              resourceId: assetId,
              resourceName: assetId,
              details: `Intangible asset unassigned as part of transfer request ${firstForm.form_number}`,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              companyId,
            });
          } catch (err) {
            logger.error('Failed to unassign intangible asset on transfer request', { id: assetId, err });
          }
        }
      }
    }

    return res.status(201).json({
      message: `Transfer request(s) submitted successfully (${createdForms.length} form${createdForms.length !== 1 ? 's' : ''})`,
      forms: createdForms,
      formID: firstForm?.formID,
      form_number: firstForm?.form_number,
      returnFormID: firstForm?.returnFormID,
      return_form_number: firstForm?.returnFormNumber,
    });
  } catch (error: any) {
    logger.error('Submit transfer request failed:', error);
    return res.status(500).json({
      error: 'Failed to submit transfer request',
      details: error.message,
    });
  }
}

/** GET transfer forms approved by Dept Head and not yet executed (for Transfer Requests page). */
export async function getApprovedForExecutionHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { companyId, departmentIds } = await getAssetScope(
      pool,
      req.user!.userID
    );
    if (!companyId) return res.json({ assetTransferForms: [] });

    const sqlApprovedFormsWithWet = `SELECT atf.formID, atf.form_number, atf.user_id, atf.department_id, atf.location_id, atf.location_room_id,
                atf.new_assigned_user_id, atf.created_by, atf.created_at, atf.signed_at, atf.signed_by, atf.signed_digital_signature,
                DATE_FORMAT(atf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
                atf.process_digital_signature, atf.transfer_type, atf.received_by,
                DATE_FORMAT(atf.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
                atf.dept_head_digital_signature, atf.dept_head_signed_by,
                d.company_id AS form_company_id
         FROM asset_transfer_forms atf
         LEFT JOIN asset_mngmnt_departments d ON atf.department_id = d.departmentID
         WHERE atf.deleted_at IS NULL
           AND (atf.declined_at IS NULL)
           AND atf.signed_at IS NOT NULL
           AND atf.dept_head_signed_at IS NOT NULL
           AND atf.executed_at IS NULL
           AND d.company_id = ?
         ORDER BY atf.dept_head_signed_at DESC`;

    const sqlApprovedFormsWithoutWet = sqlApprovedFormsWithWet;

    let formRows: any[];
    try {
      formRows = await getApprovedTransferFormsByCompanyId(companyId);
    } catch (colErr: any) {
      const msg = String(colErr?.message || '');
      if (
        colErr?.message?.includes('executed_at') ||
        colErr?.message?.includes('declined_at')
      ) {
        return res.json({ assetTransferForms: [] });
      } else {
        throw colErr;
      }
    }

    // If the user's role is scoped to particular departments (IT/Admin),
    // align transfer visibility with the asset list/dashboard by filtering
    // forms to those departments.
    if (departmentIds && departmentIds.length > 0) {
      const allowed = new Set(departmentIds);
      formRows = formRows.filter(
        (row: any) =>
          row.department_id && allowed.has(String(row.department_id))
      );
    }

    const batches = await buildTransferFormBatchesFromAssignments(formRows);
    return res.json({ assetTransferForms: batches });
  } catch (err: any) {
    logger.error('Get approved for execution failed:', err);
    return res
      .status(500)
      .json({ error: 'Failed to fetch approved transfer requests' });
  }
}

/** Build batches for forms that have transfer_form_assignments (no asset_transfer yet). */
async function buildTransferFormBatchesFromAssignments(
  forms: any[]
): Promise<any[]> {
  const batches: any[] = [];
  const deptHeadSignedByIds = [
    ...new Set(forms.map((f: any) => f.dept_head_signed_by).filter(Boolean)),
  ] as string[];
  const deptHeadNames = new Map<string, string>();
  if (deptHeadSignedByIds.length > 0) {
    for (const userId of deptHeadSignedByIds) {
      const user = await getUserNamesById(userId);
      if (user) {
        deptHeadNames.set(userId, `${user.first_name} ${user.last_name}`);
      }
    }
  }

  const processorCreatedByIds = [
    ...new Set(forms.map((f: any) => f.created_by).filter(Boolean)),
  ] as string[];
  const processorNames = new Map<string, string>();
  if (processorCreatedByIds.length > 0) {
    for (const userId of processorCreatedByIds) {
      const user = await getUserNamesById(userId);
      if (user) {
        processorNames.set(userId, `${user.first_name} ${user.last_name}`);
      }
    }
  }

  for (const form of forms) {
    const formId = form.formID ?? form.form_id ?? null;
    if (!formId) continue;

    const [assignRows] = (await pool.execute(
      `SELECT tfa.assignment_id, aa.asset_id, aa.assigned_date, aa.assignment_notes, aa.user_id,
              a.asset_code, a.name as asset_name, a.category_id, a.type_id,
              ac.name as category_name, at.name as type_name,
              u.first_name, u.last_name, u.email, u.employee_number, u.position,
              d.name as department_name, d.departmentID as department_id,
              l.name as location_name, l.floor_unit, l.building, lr.room_name,
              ab.first_name as assigned_by_first_name, ab.last_name as assigned_by_last_name,
              uc.companyID as user_company_id, uc.name as user_company_name,
              ud.departmentID as user_department_id, ud.name as user_department_name
       FROM transfer_form_assignments tfa
       JOIN asset_assignments aa ON tfa.assignment_id = aa.assignmentID AND aa.deleted_at IS NULL
       JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
       LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
       LEFT JOIN asset_types at ON a.type_id = at.typeID
       LEFT JOIN users u ON aa.user_id = u.userID
       LEFT JOIN companies uc ON u.company_id = uc.companyID AND uc.deleted_at IS NULL
       LEFT JOIN asset_mngmnt_departments ud ON u.department_id = ud.departmentID AND ud.deleted_at IS NULL
       LEFT JOIN asset_mngmnt_departments d ON aa.department_id = d.departmentID AND d.deleted_at IS NULL
       LEFT JOIN asset_mngmnt_locations l ON aa.location_id = l.locationID AND l.deleted_at IS NULL
       LEFT JOIN asset_mngmnt_location_rooms lr ON aa.location_room_id = lr.roomID AND lr.deleted_at IS NULL
       LEFT JOIN users ab ON aa.assigned_by = ab.userID
       WHERE tfa.form_id = ?
       ORDER BY aa.assigned_date ASC`,
      [formId]
    )) as any[];

    const recordRows = (assignRows as any[]) || [];
    let new_assigned_user:
      | {
          first_name: string;
          last_name: string;
          position?: string | null;
          department?: string | null;
          company?: { id: string; name: string };
          user_department?: { id: string; name: string };
        }
      | undefined;
    const newAssignedUserId = form.new_assigned_user_id;
    if (newAssignedUserId) {
      const [newUserRows] = (await pool.execute(
        `SELECT u.first_name, u.last_name, u.position, d.departmentID as new_user_department_id, d.name as department_name,
                c.companyID as new_user_company_id, c.name as new_user_company_name
         FROM users u
         LEFT JOIN asset_mngmnt_departments d ON u.department_id = d.departmentID AND d.deleted_at IS NULL
         LEFT JOIN companies c ON u.company_id = c.companyID AND c.deleted_at IS NULL
         WHERE u.userID = ?`,
        [newAssignedUserId]
      )) as any[];
      const nu = newUserRows?.[0];
      if (nu) {
        new_assigned_user = {
          first_name: nu.first_name || '',
          last_name: nu.last_name || '',
          position: nu.position ?? null,
          department: nu.department_name ?? null,
        };

        if (nu.new_user_company_id != null) {
          new_assigned_user.company = {
            id: nu.new_user_company_id,
            name: nu.new_user_company_name,
          };
        }

        if (nu.new_user_department_id != null) {
          new_assigned_user.user_department = {
            id: nu.new_user_department_id,
            name: nu.department_name,
          };
        }
      }
    }

    const formUserId = form.user_id ?? form.userId ?? '';
    const processed_by =
      form.created_by != null
        ? (processorNames.get(form.created_by) ?? 'Unknown')
        : null;
    batches.push({
      formID: formId,
      form_number: form.form_number,
      return_batch_id: formId,
      created_at: form.created_at,
      user_id: formUserId,
      processed_by,
      new_assigned_user_id: form.new_assigned_user_id,
      new_assigned_user,
      signed_at: form.signed_at,
      signed_by: form.signed_by,
      signed_digital_signature: form.signed_digital_signature,
      process_signed_at: form.process_signed_at,
      process_digital_signature: form.process_digital_signature,
      transfer_type: form.transfer_type,
      received_by: form.received_by,
      dept_head_signed_at: form.dept_head_signed_at ?? null,
      dept_head_digital_signature: form.dept_head_digital_signature ?? null,
      dept_head_signed_by: form.dept_head_signed_by ?? null,
      dept_head_user_name: form.dept_head_signed_by
        ? (deptHeadNames.get(form.dept_head_signed_by) ?? null)
        : null,
      it_manager_signed_at: null,
      it_manager_digital_signature: null,
      it_manager_signed_by: null,
      it_manager_user_name: null,
      returns: recordRows.map((r: any) => ({
        return_id: null,
        assignment_id: r.assignment_id,
        user_id: r.user_id,
        return_condition: null,
        return_notes: null,
        condition_images: [],
        created_at: null,
        assignment: {
          assignmentID: r.assignment_id,
          asset: {
            id: r.asset_id,
            code: r.asset_code,
            name: r.asset_name,
            category_id: r.category_id,
            category_name: r.category_name,
            type_id: r.type_id,
            type_name: r.type_name,
          },
          user: {
            id: r.user_id,
            first_name: r.first_name,
            last_name: r.last_name,
            email: r.email,
            employeeNumber: r.employee_number,
            position: r.position,
            company:
              r.user_company_id != null
                ? { id: r.user_company_id, name: r.user_company_name }
                : undefined,
            department:
              r.user_department_id != null
                ? {
                    id: r.user_department_id,
                    name: r.user_department_name,
                  }
                : undefined,
          },
          department: r.department_id
            ? { id: r.department_id, name: r.department_name }
            : null,
          location: r.location_name
            ? {
                id: r.assignment_id,
                name: r.location_name,
                floor_unit: r.floor_unit || '',
                building: r.building || '',
                room_name: r.room_name,
              }
            : null,
          assigned_date: r.assigned_date,
          assignment_notes: r.assignment_notes,
          assigned_by: {
            id: form.created_by,
            first_name: r.assigned_by_first_name,
            last_name: r.assigned_by_last_name,
          },
        },
      })),
    });
  }
  return batches;
}

/** Options for runTransferFormExecution (execute handler + auto-execute on approval). */
interface RunTransferFormExecutionOptions {
  assetTransfers: Array<{
    assignmentId: string;
    condition?: string;
    notes?: string;
    imageUrls?: string[];
  }>;
  processSignature: {
    digital_signature?: string | null;
    signed_at?: string;
  } | null;
  transferType?: string | null;
  receivedBy?: string | null;
  newAssignment: {
    userId: string;
    departmentId?: string | null;
    locationId?: string | null;
    roomId?: string | null;
    roomName?: string | null;
  };
  checklists?: Array<{
    assignmentId: string;
    employeeId: string;
    employeeName: string;
    employeeDesignation?: string;
    employeeDepartment?: string;
    employeeCompany?: string;
    typeOnboarding: boolean;
    typeOffboarding: boolean;
    receivedBy?: string;
    checklistData: any;
    remarks?: string;
  }>;
  intangibleAssetItems?: Array<{
    id: string;
    notes?: string;
  }>;
}

/** Run transfer execution (assignments, accountability, executed_at). Throws AppError on failure. Exported for use from approveReturnFormHandler when return form has linked transfer. */
export async function runTransferFormExecution(
  formId: string,
  options: RunTransferFormExecutionOptions,
  context: { req: AuthRequest; processorId: string }
): Promise<void> {
  const {
    assetTransfers,
    processSignature,
    transferType,
    receivedBy,
    newAssignment,
    checklists,
    intangibleAssetItems,
  } = options;
  const { req, processorId } = context;
  const form = await AssetTransferFormModel.findById(formId);
  if (!form) throw new NotFoundError('Transfer form not found');
  const formAny = form as any;
  if (formAny.declined_at)
    throw new ValidationError('This transfer form has been declined');
  if (!form.signed_at || !formAny.dept_head_signed_at) {
    throw new ValidationError(
      'Form must be signed by transferrer and approved by Department Head before execution'
    );
  }
  if (formAny.executed_at)
    throw new ValidationError('This transfer form has already been executed');
  const formAssignmentIds =
    await AssetTransferFormModel.getFormAssignmentIds(formId);
  if (formAssignmentIds.length === 0)
    throw new ValidationError('No assignments linked to this form');
  const bodyAssignmentIds = assetTransfers.map((t: any) => t.assignmentId);
  const match =
    bodyAssignmentIds.length === formAssignmentIds.length &&
    bodyAssignmentIds.every((id: string) => formAssignmentIds.includes(id));
  if (!match)
    throw new ValidationError('Request assignment IDs do not match the form');
  const placeholders = bodyAssignmentIds.map(() => '?').join(',');
  /** Active = normal path. Returned is allowed when the return was processed first but this transfer form is still pending execution (linked transfer / Transfer Requests). */
  const [assignmentRows] = (await pool.execute(
    `SELECT aa.* FROM asset_assignments aa
     WHERE aa.assignmentID IN (${placeholders})
       AND aa.deleted_at IS NULL
       AND (
         aa.status = 'Active'
         OR (
           aa.status = 'Returned'
           AND EXISTS (
             SELECT 1 FROM transfer_form_assignments tfa
             WHERE tfa.form_id = ? AND tfa.assignment_id = aa.assignmentID
           )
         )
       )`,
    [...bodyAssignmentIds, formId]
  )) as any[];
  if (assignmentRows.length !== bodyAssignmentIds.length) {
    throw new NotFoundError('One or more assignments not found or not active');
  }
  const firstAssignment = assignmentRows[0] as any;
  const pastOwnerUserId = firstAssignment.user_id;
  const newUserId = newAssignment.userId;
  let locationRoomId = newAssignment.roomId || null;
  if (newAssignment.roomName && newAssignment.locationId && !locationRoomId) {
    const room = await getRoomByLocationIdAndName(newAssignment.locationId, newAssignment.roomName);
    if (room) {
      locationRoomId = room.roomID;
    }
  }

  let companyId: string | null = null;
  if (firstAssignment.department_id) {
    const dept = await getDepartmentById(firstAssignment.department_id);
    companyId = dept?.company_id ?? null;
  }
  if (!companyId && pastOwnerUserId) {
    const user = await getUserById(pastOwnerUserId);
    companyId = user?.company_id ?? null;
  }

  const newDeptId = newAssignment.departmentId ?? null;
  const newLocId = newAssignment.locationId ?? null;
  const newRoomId = locationRoomId;

  const transferredAssetIds = assignmentRows.map((r: any) => r.asset_id);

  const categoryDeptRows = await getCategoryDepartmentsByAssetIds(transferredAssetIds);
  const categoryDeptId = (categoryDeptRows[0] as any)?.departmentID ?? null;

  // Compute which builders have ALL their assets in this transfer batch (full transfer)
  const transferredAssetIdSet = new Set(transferredAssetIds);
  const fullyTransferredBuilderIds = new Set<string>();
  if (transferredAssetIdSet.size > 0) {
    const builderAssetRows = await getBuilderItemsByAssetIds(Array.from(transferredAssetIdSet) as string[]);

    const builderTransferredCount = new Map<string, number>();
    for (const row of builderAssetRows) {
      const bid = row.builder_id;
      builderTransferredCount.set(
        bid,
        (builderTransferredCount.get(bid) || 0) + 1
      );
    }
    for (const bid of builderTransferredCount.keys()) {
      const total = await getBuilderItemCount(bid);
      const transferred = builderTransferredCount.get(bid) ?? 0;
      if (total > 0 && total === transferred) {
        fullyTransferredBuilderIds.add(bid);
      }
    }
  }

  const processSignedAtForDb =
    processSignature?.signed_at != null
      ? (() => {
          const d = new Date(processSignature.signed_at);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const h = String(d.getHours()).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          const s = String(d.getSeconds()).padStart(2, '0');
          return `${y}-${m}-${day} ${h}:${min}:${s}`;
        })()
      : null;

  let linkedReturnFormId: string | null = formAny.return_form_id ?? null;
  if (linkedReturnFormId == null) {
    const linkRows = await getTransferFormByReturnFormId(formId);
    linkedReturnFormId = linkRows?.return_form_id ?? null;
  }
  let returnFormId: string;

  if (linkedReturnFormId) {
    const existingReturnForm =
      await AssetReturnFormModel.findById(linkedReturnFormId);
    if (!existingReturnForm)
      throw new NotFoundError('Linked return form not found');
    const retAny = existingReturnForm as any;
    if (!existingReturnForm.signed_at) {
      throw new ValidationError(
        'Linked return form must be signed by the transferrer before execution'
      );
    }
    if (retAny.declined_at)
      throw new ValidationError('Linked return form has been declined');
    if (!retAny.process_signed_at) {
      throw new ValidationError(
        'Transfer cannot be processed until the linked return form is processed by the processor'
      );
    }
    returnFormId = linkedReturnFormId;
    await executeRawWrite(
      `UPDATE asset_return_forms SET process_signed_at = ?, process_digital_signature = ?, return_type = ?, received_by = ?, updated_at = NOW() WHERE formID = ?`,
      [
        processSignedAtForDb,
        processSignature?.digital_signature ?? null,
        transferType ?? null,
        receivedBy ?? null,
        returnFormId,
      ]
    );
    await executeRawWrite(
      `UPDATE asset_transfer_forms SET process_signed_at = ?, process_digital_signature = ?, received_by = ?, updated_at = NOW() WHERE formID = ?`,
      [
        processSignedAtForDb,
        processSignature?.digital_signature ?? null,
        receivedBy ?? null,
        formId,
      ]
    );
  } else {
    const returnFormNumber =
      companyId != null
        ? await generateReturnFormNumber(companyId, categoryDeptId)
        : await generateReturnFormNumberFallback();
    const returnForm = await AssetReturnFormModel.create({
      form_number: returnFormNumber,
      user_id: pastOwnerUserId,
      department_id: categoryDeptId ?? newDeptId,
      location_id: newLocId,
      location_room_id: newRoomId,
      created_by: processorId,
      process_signed_at: processSignedAtForDb,
      process_digital_signature: processSignature?.digital_signature ?? null,
      return_type: transferType ?? null,
      received_by: receivedBy ?? null,
    });
    returnFormId = returnForm!.formID;
    await executeRawWrite(
      `UPDATE asset_transfer_forms SET process_signed_at = ?, process_digital_signature = ?, received_by = ?, updated_at = NOW() WHERE formID = ?`,
      [
        processSignedAtForDb,
        processSignature?.digital_signature ?? null,
        receivedBy ?? null,
        formId,
      ]
    );
  }

  const pastOwnerNames = await getUserNamesById(pastOwnerUserId);
  const processorNames = await getUserNamesById(processorId);
  const newUserNames = await getUserNamesById(newUserId);
  const pastOwnerName =
    pastOwnerNames?.first_name && pastOwnerNames?.last_name
      ? `${pastOwnerNames.first_name} ${pastOwnerNames.last_name}`
      : 'Unknown';
  const processorName =
    processorNames?.first_name && processorNames?.last_name
      ? `${processorNames.first_name} ${processorNames.last_name}`
      : 'Unknown';
  const newUserName =
    newUserNames?.first_name && newUserNames?.last_name
      ? `${newUserNames.first_name} ${newUserNames.last_name}`
      : 'Unknown';

  const builderTransfersMap = new Map<
    string,
    { builderName: string; assetCodes: string[] }
  >();

  for (const transferData of assetTransfers) {
    const assignment = assignmentRows.find(
      (row: any) => row.assignmentID === transferData.assignmentId
    );
    if (!assignment) continue;

    const validConditions = [
      'Excellent',
      'Good',
      'Fair',
      'Poor',
      'Damaged',
      'Needs Repair',
      'Obsolete',
    ];
    let condition = transferData.condition || 'Good';
    if (typeof condition !== 'string') condition = String(condition);
    if (!validConditions.includes(condition)) condition = 'Good';
    if (condition.length > 50) condition = condition.substring(0, 50);

    const conditionImagesJson =
      transferData.imageUrls &&
      Array.isArray(transferData.imageUrls) &&
      transferData.imageUrls.length > 0
        ? JSON.stringify(transferData.imageUrls)
        : null;

    const assignmentAlreadyReturned = assignment.status === 'Returned';

    if (!assignmentAlreadyReturned) {
      const returnData: Omit<AssetReturn, 'return_id' | 'created_at' | 'updated_at' | 'deleted_at'> = {
        assignment_id: transferData.assignmentId,
        user_id: assignment.user_id,
        return_condition: condition,
        return_notes: transferData.notes || `Returned for transfer`,
        return_batch_id: returnFormId ?? null,
        form_id: returnFormId,
        condition_images:
          transferData.imageUrls && transferData.imageUrls.length > 0
            ? transferData.imageUrls
            : null,
      };

      if (newLocId != null) {
        returnData.return_location_id = newLocId;
      }
      if (newRoomId != null) {
        returnData.return_location_room_id = newRoomId;
      }
      if (newDeptId != null) {
        returnData.return_department_id = newDeptId;
      }

      await AssetReturnModel.create(returnData);
    }

    const recordId = crypto.randomUUID();
    await pool.execute(
      'CALL sp_create_asset_transfer_record(?, ?, ?, ?, ?, ?, ?)',
      [
        toBind(recordId),
        formId,
        toBind(transferData.assignmentId),
        toBind(assignment.user_id),
        toBind(condition),
        toBind(transferData.notes || ''),
        toBind(conditionImagesJson),
      ]
    );

    if (!assignmentAlreadyReturned) {
      const returnNotes = `Returned by ${pastOwnerName} for transfer, processed by ${processorName}`;
      await pool.execute('CALL sp_mark_assignment_returned(?, ?, ?)', [
        transferData.assignmentId,
        returnNotes,
        condition,
      ]);
    }

    const assetCodeRow = await getAssetCodeByAssetId(assignment.asset_id);
    const assetCode = assetCodeRow?.asset_code || assignment.asset_id;

    if (!assignmentAlreadyReturned) {
      await createAuditLog({
        userId: processorId,
        action: 'Returned Asset for Transfer',
        resourceType: 'asset_assignment',
        resourceId: transferData.assignmentId,
        resourceName: `Asset ${assetCode}`,
        details: `Asset ${assetCode} returned by ${pastOwnerName} for transfer, processed by ${processorName}`,
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });
    }

    const newAssignmentId = crypto.randomUUID();
    const assignNotes = `Transferred via asset transfer from ${pastOwnerName}`;
    await pool.execute('CALL sp_create_assignment(?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      newAssignmentId,
      assignment.asset_id,
      newUserId,
      newDeptId,
      newLocId,
      newRoomId,
      null,
      assignNotes,
      processorId,
    ]);

    await pool.execute(
      'UPDATE assets SET status = "Assigned", location_id = ?, location_room_id = ?, department_id = ?, `condition` = ?, updated_by = ?, updated_at = NOW() WHERE assetID = ?',
      [
        newLocId,
        newRoomId,
        newDeptId,
        condition || 'Good',
        processorId,
        assignment.asset_id,
      ]
    );

    // Save matching checklist for this transfer if provided
    if (checklists && checklists.length > 0) {
      const matchingChecklist = checklists.find(
        (c: any) => c.assignmentId === transferData.assignmentId
      );
      if (matchingChecklist) {
        try {
          const checklistId = crypto.randomUUID();
          let chkFormNumber = await generateChecklistFormNumberFallback();
          try {
            const deptId = await getCategoryDepartmentForAssetIds([
              assignment.asset_id,
            ]);
            if (deptId) {
              const companyId = await getCompanyIdByDepartment(deptId);
              if (companyId) {
                chkFormNumber = await generateChecklistFormNumber(
                  companyId,
                  deptId
                );
              }
            }
          } catch (numErr) {
            logger.warn(
              'Failed to generate proper checklist form number, using fallback:',
              numErr
            );
          }

          await checklistRepo.createAssetChecklist({
            id: checklistId,
            formNumber: chkFormNumber,
            assignmentId: newAssignmentId,
            employeeId: matchingChecklist.employeeId,
            employeeName: matchingChecklist.employeeName,
            employeeDesignation:
              matchingChecklist.employeeDesignation || null,
            employeeDepartment:
              matchingChecklist.employeeDepartment || null,
            employeeCompany: matchingChecklist.employeeCompany || null,
            typeOnboarding: matchingChecklist.typeOnboarding ? 1 : 0,
            typeOffboarding: matchingChecklist.typeOffboarding ? 1 : 0,
            receivedBy: matchingChecklist.receivedBy || null,
            checklistData: matchingChecklist.checklistData,
            remarks: matchingChecklist.remarks || null,
            createdBy: processorId,
          });
        } catch (chkErr) {
          logger.error('Failed to save transfer checklist:', chkErr);
        }
      }
    }

    await createAuditLog({
      userId: processorId,
      action: 'Transferred Asset',
      resourceType: 'asset_assignment',
      resourceId: newAssignmentId,
      resourceName: `Asset ${assetCode}`,
      details: `Asset ${assetCode} transferred to ${newUserName} via asset transfer from ${pastOwnerName}`,
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });

    // Asset builder: whole batch vs partial (mirror return flow)
    const [builderRows] = (await pool.execute(
      `SELECT ab.builderID, ab.name
       FROM asset_builder_items abi
       JOIN asset_builders ab ON abi.builder_id = ab.builderID
       WHERE abi.asset_id = ? AND ab.deleted_at IS NULL`,
      [assignment.asset_id]
    )) as any[];

    if (builderRows.length > 0) {
      const isFullTransferForAllBuilders = (builderRows as any[]).every(
        (b: any) => fullyTransferredBuilderIds.has(b.builderID)
      );
      if (isFullTransferForAllBuilders) {
        for (const b of builderRows as any[]) {
          const existing = builderTransfersMap.get(b.builderID);
          if (existing) {
            existing.assetCodes.push(assetCode);
          } else {
            builderTransfersMap.set(b.builderID, {
              builderName: b.name,
              assetCodes: [assetCode],
            });
          }
        }
      } else {
        await pool.execute(
          'DELETE FROM asset_builder_items WHERE asset_id = ?',
          [assignment.asset_id]
        );
        await createAuditLog({
          userId: processorId,
          action: 'Removed from Asset Builder',
          resourceType: 'asset',
          resourceId: assetCode,
          resourceName: assetCode,
          details: `Asset "${assetCode}" removed from asset builder due to partial transfer`,
          oldValues: {
            builder_ids: builderRows.map((b: any) => b.builderID),
          },
          ipAddress: req.ip,
          userAgent: req.get ? req.get('User-Agent') : 'Unknown',
        });
        for (const b of builderRows as any[]) {
          await createAuditLog({
            userId: processorId,
            action: 'Removed from Asset Builder',
            resourceType: 'asset_builder',
            resourceId: b.builderID,
            resourceName: b.name,
            details: `Asset "${assetCode}" removed from asset builder due to partial transfer`,
            oldValues: {
              asset_id: assignment.asset_id,
              asset_code: assetCode,
            },
            ipAddress: req.ip,
            userAgent: req.get ? req.get('User-Agent') : 'Unknown',
          });
        }
      }
    }
  }

  // Builder timeline for whole-batch transfers: "Transferred" first (top), then "Returned for Transfer" (under)
  for (const [builderID, { builderName, assetCodes }] of builderTransfersMap) {
    const assetListBullet =
      assetCodes.length > 0 ? '\n• ' + assetCodes.join('\n• ') : '';
    await createAuditLog({
      userId: processorId,
      action: 'Transferred',
      resourceType: 'asset_builder',
      resourceId: builderID,
      resourceName: builderName,
      details: `Asset builder "${builderName}" transferred to ${newUserName} via asset transfer from ${pastOwnerName}. Assets:${assetListBullet}`,
      newValues: {
        transferred_asset_codes: assetCodes,
        assigned_to: newUserName,
      },
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });
    await createAuditLog({
      userId: processorId,
      action: 'Returned for Transfer',
      resourceType: 'asset_builder',
      resourceId: builderID,
      resourceName: builderName,
      details: `Asset builder "${builderName}" returned for transfer by ${pastOwnerName}, processed by ${processorName}. Assets:${assetListBullet}`,
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });
  }

  // Remove transferred assets from processor temporary accountability forms
  // (created by return processing with form_origin=processor_return), then
  // rebuild temp forms with remaining processor-held temporary assets.
  const transferredAssetIdSetForCleanup = new Set(
    transferredAssetIds.map((id: string) => String(id))
  );
  const [existingProcessorTempForms] = (await pool.execute(
    `SELECT formID, form_number, status, assets_data, department_id
       FROM accountability_forms
      WHERE user_id = ?
        AND deleted_at IS NULL
        AND status NOT IN ('Disabled', 'Revoked', 'Declined')
        AND JSON_UNQUOTE(JSON_EXTRACT(assets_data, '$.form_origin')) = 'processor_return'`,
    [processorId]
  )) as any[];

  if ((existingProcessorTempForms as any[]).length > 0) {
    const allTempAssetIds = new Set<string>();
    let hasTransferredOverlap = false;

    for (const formRow of existingProcessorTempForms as any[]) {
      const raw = formRow.assets_data;
      if (!raw) continue;
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const assets = Array.isArray(parsed?.assets) ? parsed.assets : [];
        for (const a of assets) {
          const aid = String(a?.id ?? a?.assetID ?? '').trim();
          if (!aid) continue;
          allTempAssetIds.add(aid);
          if (transferredAssetIdSetForCleanup.has(aid)) {
            hasTransferredOverlap = true;
          }
        }
      } catch {
        // ignore malformed assets_data
      }
    }

    if (hasTransferredOverlap) {
      for (const formRow of existingProcessorTempForms as any[]) {
        await pool.execute(
          'UPDATE accountability_forms SET status = "Disabled", updated_at = NOW() WHERE formID = ?',
          [formRow.formID]
        );
        await createAuditLog({
          userId: processorId,
          action: 'Disabled Accountability Form',
          resourceType: 'accountability_form',
          resourceId: formRow.formID,
          resourceName: formRow.form_number,
          details:
            'Processor temporary accountability disabled due to transfer execution; form will be rebuilt with remaining temporary assets only',
          oldValues: { status: formRow.status || 'Pending' },
          newValues: { status: 'Disabled' },
          ipAddress: req.ip,
          userAgent: req.get ? req.get('User-Agent') : 'Unknown',
        });
      }

      const remainingTempAssetIds = [...allTempAssetIds].filter(
        id => !transferredAssetIdSetForCleanup.has(id)
      );
      if (remainingTempAssetIds.length === 0) {
        logger.info(
          'All processor temporary accountability assets were transferred; skipping temporary accountability form recreation'
        );
      } else {
        const remainingPlaceholders = remainingTempAssetIds.map(() => '?').join(',');
        const [remainingRows] = (await pool.execute(
          `SELECT
              a.assetID, a.asset_code, a.name, a.serial, a.model, a.brand, a.category_id,
              ac.name as category_name, at.name as type_name,
              d.name as department_name, d.departmentID as department_id,
              aa.location_id, aa.location_room_id
           FROM asset_assignments aa
           JOIN assets a ON aa.asset_id = a.assetID
           LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
           LEFT JOIN asset_types at ON a.type_id = at.typeID
           LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
           WHERE aa.user_id = ?
             AND aa.status = 'Active'
             AND aa.deleted_at IS NULL
             AND a.assetID IN (${remainingPlaceholders})
           ORDER BY aa.assigned_date ASC`,
          [processorId, ...remainingTempAssetIds]
        )) as any[];

        const groupedByDept = new Map<
          string,
          {
            departmentId: string | null;
            locationId: string | null;
            locationRoomId: string | null;
            assets: Array<{
              id: string;
              code: string;
              name: string;
              category: string;
              type: string;
              department: string;
              serialNo: string;
              modelNo: string;
              brand: string;
            }>;
          }
        >();

        for (const row of remainingRows as any[]) {
          const deptKey = String(row.department_id ?? 'other');
          if (!groupedByDept.has(deptKey)) {
            groupedByDept.set(deptKey, {
              departmentId: row.department_id ? String(row.department_id) : null,
              locationId: row.location_id ? String(row.location_id) : null,
              locationRoomId: row.location_room_id
                ? String(row.location_room_id)
                : null,
              assets: [],
            });
          }
          const group = groupedByDept.get(deptKey)!;
          group.assets.push({
            id: row.assetID,
            code: row.asset_code,
            name: row.name || row.asset_code,
            category: row.category_name || row.category_id || '',
            type: row.type_name || row.type_id || '',
            department: row.department_name || 'Other',
            serialNo: row.serial || '',
            modelNo: row.model || '',
            brand: row.brand || '',
          });
        }

        const processorDigitalSignature =
          processSignature?.digital_signature?.trim() ||
          (await fetchUserDigitalSignature(processorId));

        // Use the original employee's department from the existing temp form (same source as Asset Accountability settings)
        const existingDeptId = (existingProcessorTempForms as any[])[0]?.department_id || null;

        for (const group of groupedByDept.values()) {
          if (group.assets.length === 0) continue;
          const tempFormReq = {
            ...req,
            user: { userID: processorId },
            body: {
              assets: group.assets,
              userId: processorId,
              departmentId: existingDeptId,
              locationId: group.locationId,
              locationRoomId: group.locationRoomId,
              formOrigin: 'processor_return',
              issuerSignature: processorDigitalSignature,
              itCopySignature: processorDigitalSignature,
            },
          } as AuthRequest;
          const tempFormRes = {
            status: () => ({ json: () => null }),
          } as unknown as Response;
          await createAccountabilityFormHandler(tempFormReq, tempFormRes);
        }
      }
    }
  }

  // Only recreate "past owner accountability on return" for assets that are
  // actually being returned as part of this transfer execution AND are not
  // processor temporary-custody assets created by return flow.
  // If the linked return form was processed first, related assignments are already `Returned`.
  const returnedAssetIdsForPastOwnerAccountability = assignmentRows
    .filter((r: any) => {
      if (String(r.status) === 'Returned') return false;
      const notes = String(r.assignment_notes ?? '').toLowerCase();
      const isProcessorTemporaryCustody = notes.includes(
        'assigned via asset return (assign to processor)'
      );
      return !isProcessorTemporaryCustody;
    })
    .map((r: any) => r.asset_id);
  if (returnedAssetIdsForPastOwnerAccountability.length > 0) {
    try {
      await handleAccountabilityFormOnAssetReturn(
        pastOwnerUserId,
        returnedAssetIdsForPastOwnerAccountability,
        null,
        null,
        null,
        processorId,
        req,
        processSignature
          ? ({
              ...(processSignature.signed_at != null
                ? { signed_at: processSignature.signed_at }
                : {}),
              ...(processSignature.digital_signature != null &&
              String(processSignature.digital_signature).trim() !== ''
                ? { digital_signature: processSignature.digital_signature }
                : {}),
            } as ProcessSignature)
          : undefined
      );
    } catch (formErr) {
      logger.error(
        'Accountability form update on transfer execute (past owner) failed:',
        formErr
      );
    }
  } else {
    logger.info(
      'Skipping past-owner accountability recreation: transfer batch is processor temporary custody only'
    );
  }

  const newAssetIds = assignmentRows.map((r: any) => r.asset_id);
  const placeholdersAssets = newAssetIds.map(() => '?').join(',');
  const [newAssetDetails] = (await pool.execute(
    `SELECT a.assetID, a.asset_code, a.name, a.serial, a.model, a.brand,
              ac.name as category_name, at.name as type_name, d.name as department_name, d.departmentID as department_id
       FROM assets a
       LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
       LEFT JOIN asset_types at ON a.type_id = at.typeID
       LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
       WHERE a.assetID IN (${placeholdersAssets}) AND a.deleted_at IS NULL`,
    newAssetIds
  )) as any[];

  const departmentGroups: Record<
    string,
    { departmentId: string; categoryIds: Set<string>; assetIds: string[] }
  > = {};
  for (const row of newAssetDetails as any[]) {
    const deptName = row.department_name || 'Other';
    if (!departmentGroups[deptName]) {
      departmentGroups[deptName] = {
        departmentId: row.department_id ?? newDeptId ?? '',
        categoryIds: new Set(),
        assetIds: [],
      };
    }
    const g = departmentGroups[deptName]!;
    g.assetIds.push(row.assetID);
    if (row.category_id) g.categoryIds.add(row.category_id);
  }

  for (const [deptName, deptInfo] of Object.entries(departmentGroups)) {
    const categoryIds = Array.from(deptInfo.categoryIds).filter(Boolean);

    let deptAssetsRows: any[];
    if (categoryIds.length > 0) {
      const [rows] = (await pool.execute(
        `SELECT a.assetID, a.asset_code, a.name, a.serial, a.model, a.brand,
                  ac.name as category_name, at.name as type_name, d.name as department_name, d.departmentID as department_id
           FROM asset_assignments aa
           JOIN assets a ON aa.asset_id = a.assetID
           LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
           LEFT JOIN asset_types at ON a.type_id = at.typeID
           LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
           WHERE aa.user_id = ? AND aa.status = 'Active' AND aa.deleted_at IS NULL
           AND ac.categoryID IN (${categoryIds.map(() => '?').join(',')})
           ORDER BY aa.assigned_date ASC`,
        [newUserId, ...categoryIds]
      )) as any[];
      deptAssetsRows = rows || [];
    } else {
      const assetPlaceholders = deptInfo.assetIds.map(() => '?').join(',');
      const [rows] = (await pool.execute(
        `SELECT a.assetID, a.asset_code, a.name, a.serial, a.model, a.brand,
                  ac.name as category_name, at.name as type_name, d.name as department_name, d.departmentID as department_id
           FROM asset_assignments aa
           JOIN assets a ON aa.asset_id = a.assetID
           LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
           LEFT JOIN asset_types at ON a.type_id = at.typeID
           LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
           WHERE aa.user_id = ? AND aa.status = 'Active' AND aa.deleted_at IS NULL
           AND a.assetID IN (${assetPlaceholders})
           ORDER BY aa.assigned_date ASC`,
        [newUserId, ...deptInfo.assetIds]
      )) as any[];
      deptAssetsRows = rows || [];
    }

    if (deptAssetsRows.length === 0) continue;

    const departmentAssets = deptAssetsRows.map((row: any) => ({
      id: row.assetID,
      code: row.asset_code,
      name: row.name || row.asset_code,
      category: row.category_name || row.category_id,
      type: row.type_name || row.type_id,
      department: row.department_name,
      serialNo: row.serial || '',
      modelNo: row.model || '',
      brand: row.brand || '',
    }));

    const deptIdForQuery = deptInfo.departmentId || null;
    const [existingForms] = (await pool.execute(
      `SELECT formID, form_number, status, assets_data FROM accountability_forms
         WHERE user_id = ? AND status IN ('Pending', 'Signed') AND deleted_at IS NULL
         AND (department_id <=> ?)`,
      [newUserId, deptIdForQuery]
    )) as any[];

    const mergedAssets = [...departmentAssets];
    const seenIds = new Set(departmentAssets.map((a: any) => String(a.id)));

    for (const formRow of existingForms) {
      await pool.execute(
        'UPDATE accountability_forms SET status = "Disabled", updated_at = NOW() WHERE formID = ?',
        [formRow.formID]
      );
      await createAuditLog({
        userId: processorId,
        action: 'Disabled Accountability Form',
        resourceType: 'accountability_form',
        resourceId: formRow.formID,
        resourceName: formRow.form_number,
        details: `Accountability form disabled due to asset transfer; new form created with merged assets`,
        oldValues: { status: formRow.status || 'Pending' },
        newValues: { status: 'Disabled' },
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });

      if (formRow.assets_data) {
        try {
          const data =
            typeof formRow.assets_data === 'string'
              ? JSON.parse(formRow.assets_data)
              : formRow.assets_data;
          const assets = data?.assets || [];
          for (const a of assets) {
            const aid = String(a.id ?? a.assetID ?? '');
            if (aid && !seenIds.has(aid)) {
              seenIds.add(aid);
              mergedAssets.push({
                id: a.id ?? a.assetID,
                code: a.code ?? '',
                name: a.name ?? '',
                category: a.category ?? '',
                type: a.type ?? '',
                department: a.department ?? '',
                serialNo: a.serialNo ?? '',
                modelNo: a.modelNo ?? '',
                brand: a.brand ?? '',
              });
            }
          }
        } catch {
          // ignore
        }
      }
    }

    const accountabilityFormReq = {
      ...req,
      user: { userID: processorId },
      body: {
        assets: mergedAssets,
        userId: newUserId,
        departmentId: deptInfo.departmentId || newDeptId,
        locationId: newLocId,
        locationRoomId: newRoomId,
      },
    } as AuthRequest;
    const accountabilityFormRes = {
      status: () => ({ json: () => ({}) }),
    } as unknown as Response;
    try {
      await createAccountabilityFormHandler(
        accountabilityFormReq,
        accountabilityFormRes
      );
    } catch (acErr) {
      logger.error(
        `Create accountability form for transfer new assignee failed (${deptName}):`,
        acErr
      );
    }
  }

  // Process intangible asset transfers (assign to new user)
  if (intangibleAssetItems && intangibleAssetItems.length > 0 && companyId) {
    for (const item of intangibleAssetItems) {
      try {
        await intangibleAssetsService.assignIntangibleAsset({
          id: item.id,
          assignedTo: newUserId,
          assignmentId: formId,
          companyId,
          assignedBy: processorId,
        });
        await createAuditLog({
          userId: processorId,
          action: 'Transferred Intangible Asset',
          resourceType: 'intangible_asset',
          resourceId: item.id,
          resourceName: item.id,
          details: `Intangible asset transferred via transfer form ${formId}`,
          newValues: { assignedTo: newUserId, notes: item.notes || null },
          ipAddress: req.ip,
          userAgent: req.get ? req.get('User-Agent') : 'Unknown',
          companyId,
        });
      } catch (err) {
        logger.error('Failed to assign intangible asset on transfer', { id: item.id, err });
      }
    }
  }

  await pool.execute(
    'UPDATE asset_transfer_forms SET executed_at = NOW(), updated_at = NOW() WHERE formID = ?',
    [formId]
  );
}

/** POST execute an approved transfer form: perform actual transfer (assignments, accountability). */
export async function executeTransferFormHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const {
      assetTransfers,
      processSignature,
      transferType,
      receivedBy,
      newAssignment,
      checklists,
      intangibleAssetItems,
    } = req.body;

    if (!formId) return res.status(400).json({ error: 'Form ID is required' });
    if (
      !assetTransfers ||
      !Array.isArray(assetTransfers) ||
      assetTransfers.length === 0
    ) {
      return res.status(400).json({
        error: 'Asset transfers array is required',
      });
    }
    if (!newAssignment?.userId) {
      return res.status(400).json({
        error: 'New assignment user (userId) is required',
      });
    }

    await runTransferFormExecution(
      formId,
      {
        assetTransfers,
        processSignature,
        transferType,
        receivedBy,
        newAssignment,
        checklists,
        intangibleAssetItems,
      },
      { req, processorId: req.user!.userID }
    );

    const form = await AssetTransferFormModel.findById(formId);
    return createSuccessResponse(
      res,
      {
        formID: formId,
        form_number: form!.form_number,
        message: `Successfully transferred ${assetTransfers.length} asset(s)`,
      },
      'Transfer completed',
      200
    );
  } catch (err: any) {
    logger.error('Execute transfer form failed:', err);
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({
      error: 'Failed to execute transfer',
      details: err?.message,
    });
  }
}

export async function getTransferHistoryHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { companyId } = await getAssetScope(pool, req.user!.userID);
    if (!companyId) {
      return createSuccessResponse(res, { records: [] });
    }

    // 1) Executed transfers (from asset_transfer)
    // Show transfers where asset is currently in company OR involves users from this company
    const query = `
      SELECT
        atr.record_id,
        atr.form_id,
        atr.assignment_id,
        atr.transfer_condition,
        atr.transfer_notes,
        atr.condition_images,
        atr.created_at,
        atf.form_number,
        atf.process_signed_at,
        a.assetID,
        a.asset_code,
        a.name as asset_name,
        a.category_id,
        a.company_id as asset_company_id,
        past_owner.first_name as from_first_name,
        past_owner.last_name as from_last_name,
        past_owner.company_id as from_company_id,
        recipient.first_name as to_first_name,
        recipient.last_name as to_last_name,
        recipient.company_id as to_company_id,
        processor.first_name as processor_first_name,
        processor.last_name as processor_last_name,
        processor.company_id as processor_company_id
      FROM asset_transfer atr
      JOIN asset_transfer_forms atf ON atr.form_id = atf.formID AND atf.deleted_at IS NULL
      JOIN asset_assignments aa ON atr.assignment_id = aa.assignmentID AND aa.deleted_at IS NULL
      JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
      LEFT JOIN users past_owner ON atf.user_id = past_owner.userID
      LEFT JOIN users recipient ON atf.new_assigned_user_id = recipient.userID
      LEFT JOIN users processor ON atf.created_by = processor.userID
      WHERE atr.deleted_at IS NULL AND (
        a.company_id = ? OR
        past_owner.company_id = ? OR
        recipient.company_id = ? OR
        processor.company_id = ?
      )
      ORDER BY atr.created_at DESC
    `;

    const [rows] = (await pool.execute(query, [companyId, companyId, companyId, companyId])) as any[];

    const executedRecords = (rows as any[]).map((r: any) => {
      const pastOwnerName =
        r.from_first_name && r.from_last_name
          ? `${r.from_first_name} ${r.from_last_name}`
          : 'Unknown';
      const processorName =
        r.processor_first_name && r.processor_last_name
          ? `${r.processor_first_name} ${r.processor_last_name}`
          : 'Unknown';
      const action = `Returned by ${pastOwnerName} for transfer, processed by ${processorName}`;

      let conditionImages: string[] = [];
      const raw = r.condition_images;
      if (Array.isArray(raw)) {
        conditionImages = raw.slice(0, 5);
      } else if (typeof raw === 'string') {
        try {
          const p = JSON.parse(raw);
          conditionImages = Array.isArray(p) ? p.slice(0, 5) : [];
        } catch {
          conditionImages = [];
        }
      }

      return {
        recordId: r.record_id,
        formId: r.form_id,
        formNumber: r.form_number,
        asset: {
          id: r.assetID,
          code: r.asset_code,
          name: r.asset_name,
          category_id: r.category_id ?? null,
        },
        from: { name: pastOwnerName },
        to: {
          name:
            r.to_first_name && r.to_last_name
              ? `${r.to_first_name} ${r.to_last_name}`
              : 'Unknown',
        },
        processor: processorName,
        status: 'Transferred',
        action,
        condition: r.transfer_condition ?? null,
        transferNotes: r.transfer_notes ?? null,
        conditionImages,
        transferDate:
          r.process_signed_at ?? r.created_at ?? new Date().toISOString(),
      };
    });

    // 2) Held/pending forms (have transfer_form_assignments but no asset_transfer yet)
    // Show pending transfers where asset is currently in company OR involves users from this company
    const pendingQuery = `
      SELECT
        atf.formID as form_id,
        atf.form_number,
        atf.created_at,
        atf.dept_head_signed_at,
        atf.declined_at,
        tfa.assignment_id,
        tfa.transfer_condition,
        tfa.transfer_notes,
        tfa.condition_images,
        a.assetID,
        a.asset_code,
        a.name as asset_name,
        a.category_id,
        past_owner.first_name as from_first_name,
        past_owner.last_name as from_last_name,
        past_owner.company_id as from_company_id,
        recipient.first_name as to_first_name,
        recipient.last_name as to_last_name,
        recipient.company_id as to_company_id,
        processor.first_name as processor_first_name,
        processor.last_name as processor_last_name,
        processor.company_id as processor_company_id
      FROM transfer_form_assignments tfa
      JOIN asset_transfer_forms atf ON tfa.form_id = atf.formID AND atf.deleted_at IS NULL
      JOIN asset_assignments aa ON tfa.assignment_id = aa.assignmentID AND aa.deleted_at IS NULL
      JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
      LEFT JOIN asset_transfer atr ON atr.form_id = atf.formID AND atr.assignment_id = tfa.assignment_id AND atr.deleted_at IS NULL
      LEFT JOIN users past_owner ON atf.user_id = past_owner.userID
      LEFT JOIN users recipient ON atf.new_assigned_user_id = recipient.userID
      LEFT JOIN users processor ON atf.created_by = processor.userID
      WHERE atr.record_id IS NULL AND (
        a.company_id = ? OR
        past_owner.company_id = ? OR
        recipient.company_id = ? OR
        processor.company_id = ?
      )
      ORDER BY atf.created_at DESC
    `;

    const [pendingRows] = (await pool.execute(pendingQuery, [
      companyId,
      companyId,
      companyId,
      companyId,
    ])) as any[];

    const pendingRecords = (pendingRows as any[]).map((r: any) => {
      const pastOwnerName =
        r.from_first_name && r.from_last_name
          ? `${r.from_first_name} ${r.from_last_name}`
          : 'Unknown';
      const processorName =
        r.processor_first_name && r.processor_last_name
          ? `${r.processor_first_name} ${r.processor_last_name}`
          : 'Unknown';
      let status: string;
      if (r.declined_at) {
        status = 'Declined by dept head';
      } else if (r.dept_head_signed_at) {
        status = 'Approved by dept head';
      } else {
        status = 'Pending';
      }
      const action = `Transfer on hold. Returned by ${pastOwnerName} for transfer${processorName ? `, processor ${processorName}` : ''}.`;

      let conditionImages: string[] = [];
      const raw = r.condition_images;
      if (Array.isArray(raw)) {
        conditionImages = raw.slice(0, 5);
      } else if (typeof raw === 'string') {
        try {
          const p = JSON.parse(raw);
          conditionImages = Array.isArray(p) ? p.slice(0, 5) : [];
        } catch {
          conditionImages = [];
        }
      }

      return {
        recordId: `form-${r.form_id}-${r.assignment_id}`,
        formId: r.form_id,
        formNumber: r.form_number,
        asset: {
          id: r.assetID,
          code: r.asset_code,
          name: r.asset_name,
          category_id: r.category_id ?? null,
        },
        from: { name: pastOwnerName },
        to: {
          name:
            r.to_first_name && r.to_last_name
              ? `${r.to_first_name} ${r.to_last_name}`
              : 'Unknown',
        },
        processor: processorName,
        status,
        action,
        condition: r.transfer_condition ?? null,
        transferNotes: r.transfer_notes ?? null,
        conditionImages,
        transferDate: r.created_at ?? new Date().toISOString(),
      };
    });

    const records = [...executedRecords, ...pendingRecords].sort(
      (a, b) =>
        new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime()
    );

    return createSuccessResponse(res, { records });
  } catch (err: any) {
    logger.error('Get transfer history failed:', err);
    return res.status(500).json({
      error: 'Failed to fetch transfer history',
      details: err.message,
    });
  }
}

export async function getAssetTransferFormsByUserHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const forms = await AssetTransferFormModel.findByUserId(userId);

    const deptHeadSignedByIds = [
      ...new Set(forms.map((f: any) => f.dept_head_signed_by).filter(Boolean)),
    ] as string[];
    const deptHeadNames = new Map<string, string>();
    if (deptHeadSignedByIds.length > 0) {
      const placeholders = deptHeadSignedByIds.map(() => '?').join(',');
      const [userRows] = (await pool.execute(
        `SELECT userID, first_name, last_name FROM users WHERE userID IN (${placeholders})`,
        deptHeadSignedByIds
      )) as any[];
      for (const u of userRows ?? []) {
        deptHeadNames.set(
          u.userID,
          `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'
        );
      }
    }

    const itManagerSignedByIds = [
      ...new Set(forms.map((f: any) => f.it_manager_signed_by).filter(Boolean)),
    ] as string[];
    const itManagerNames = new Map<string, string>();
    if (itManagerSignedByIds.length > 0) {
      const placeholders = itManagerSignedByIds.map(() => '?').join(',');
      const [userRows] = (await pool.execute(
        `SELECT userID, first_name, last_name FROM users WHERE userID IN (${placeholders})`,
        itManagerSignedByIds
      )) as any[];
      for (const u of userRows ?? []) {
        itManagerNames.set(
          u.userID,
          `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'
        );
      }
    }

    const batches: any[] = [];
    for (const form of forms) {
      const formId =
        (form as { formID?: string; form_id?: string }).formID ??
        (form as { formID?: string; form_id?: string }).form_id ??
        null;
      if (!formId) continue;
      let [recordRows] = (await pool.execute(
        `SELECT atr.record_id, atr.assignment_id, atr.user_id, atr.transfer_condition, atr.transfer_notes, atr.condition_images, atr.created_at,
                aa.asset_id, aa.assigned_date, aa.assignment_notes,
                a.asset_code, a.name as asset_name, a.category_id, a.type_id,
                ac.name as category_name, at.name as type_name,
                u.first_name, u.last_name, u.email, u.employee_number, u.position,
                d.name as department_name, d.departmentID as department_id,
                l.name as location_name, l.floor_unit, l.building, lr.room_name,
                ab.first_name as assigned_by_first_name, ab.last_name as assigned_by_last_name
         FROM asset_transfer atr
         JOIN asset_assignments aa ON atr.assignment_id = aa.assignmentID
         JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
         LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
         LEFT JOIN asset_types at ON a.type_id = at.typeID
         LEFT JOIN users u ON aa.user_id = u.userID
         LEFT JOIN asset_mngmnt_departments d ON aa.department_id = d.departmentID AND d.deleted_at IS NULL
         LEFT JOIN asset_mngmnt_locations l ON aa.location_id = l.locationID AND l.deleted_at IS NULL
         LEFT JOIN asset_mngmnt_location_rooms lr ON aa.location_room_id = lr.roomID AND lr.deleted_at IS NULL
         LEFT JOIN users ab ON aa.assigned_by = ab.userID
         WHERE atr.form_id = ? AND atr.deleted_at IS NULL
         ORDER BY atr.created_at ASC`,
        [toBind(formId)]
      )) as any[];

      if (!recordRows || (recordRows as any[]).length === 0) {
        try {
          const [assignRows] = (await pool.execute(
            `SELECT tfa.assignment_id, tfa.transfer_condition, tfa.transfer_notes, tfa.condition_images,
                    aa.user_id, aa.asset_id, aa.assigned_date, aa.assignment_notes,
                    a.asset_code, a.name as asset_name, a.category_id, a.type_id,
                    ac.name as category_name, at.name as type_name,
                    u.first_name, u.last_name, u.email, u.employee_number, u.position,
                    d.name as department_name, d.departmentID as department_id,
                    l.name as location_name, l.floor_unit, l.building, lr.room_name,
                    ab.first_name as assigned_by_first_name, ab.last_name as assigned_by_last_name
             FROM transfer_form_assignments tfa
             JOIN asset_assignments aa ON tfa.assignment_id = aa.assignmentID AND aa.deleted_at IS NULL
             JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
             LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
             LEFT JOIN asset_types at ON a.type_id = at.typeID
             LEFT JOIN users u ON aa.user_id = u.userID
             LEFT JOIN asset_mngmnt_departments d ON aa.department_id = d.departmentID AND d.deleted_at IS NULL
             LEFT JOIN asset_mngmnt_locations l ON aa.location_id = l.locationID AND l.deleted_at IS NULL
             LEFT JOIN asset_mngmnt_location_rooms lr ON aa.location_room_id = lr.roomID AND lr.deleted_at IS NULL
             LEFT JOIN users ab ON aa.assigned_by = ab.userID
             WHERE tfa.form_id = ?
             ORDER BY aa.assigned_date ASC`,
            [formId]
          )) as any[];
          recordRows = (assignRows || []).map((r: any) => ({
            ...r,
            record_id: null,
            transfer_condition: r.transfer_condition ?? null,
            transfer_notes: r.transfer_notes ?? null,
            condition_images: r.condition_images ?? null,
            created_at: null,
          }));
        } catch {
          recordRows = [];
        }
      }

      const [processorRows] = (await pool.execute(
        'SELECT first_name, last_name FROM users WHERE userID = ?',
        [toBind((form as { created_by?: string }).created_by)]
      )) as any[];
      const processed_by =
        processorRows[0]?.first_name && processorRows[0]?.last_name
          ? `${processorRows[0].first_name} ${processorRows[0].last_name}`
          : null;

      let new_assigned_user:
        | {
            first_name: string;
            last_name: string;
            position?: string | null;
            department?: string | null;
          }
        | undefined;
      const newAssignedUserId = form.new_assigned_user_id;
      if (newAssignedUserId) {
        const [newUserRows] = (await pool.execute(
          `SELECT u.first_name, u.last_name, u.position, d.name as department_name
           FROM users u
           LEFT JOIN asset_mngmnt_departments d ON u.department_id = d.departmentID AND d.deleted_at IS NULL
           WHERE u.userID = ?`,
          [toBind(newAssignedUserId)]
        )) as any[];
        const nu = newUserRows?.[0];
        if (nu) {
          new_assigned_user = {
            first_name: nu.first_name || '',
            last_name: nu.last_name || '',
            position: nu.position ?? null,
            department: nu.department_name ?? null,
          };
        }
      }

      const formUserId =
        (form as { user_id?: string }).user_id ??
        (form as { userId?: string }).userId ??
        '';
      const processorFields = await resolveProcessorSignatureForBatchDisplay(
        form as {
          created_by?: string | null;
          process_signed_at?: string | null;
          process_digital_signature?: string | null;
          processor_pending_signed_at?: string | null;
          processor_pending_signature?: string | null;
        }
      );
      batches.push({
        formID: formId,
        form_number: form.form_number,
        return_batch_id: formId,
        created_at: form.created_at,
        user_id: formUserId,
        processed_by,
        new_assigned_user_id: form.new_assigned_user_id,
        new_assigned_user,
        signed_at: form.signed_at,
        signed_by: form.signed_by,
        signed_digital_signature: form.signed_digital_signature,
        process_signed_at: processorFields.process_signed_at,
        process_digital_signature: processorFields.process_digital_signature,
        processor_pending_signature: processorFields.processor_pending_signature,
        processor_pending_signed_at: processorFields.processor_pending_signed_at,
        transfer_type: form.transfer_type,
        received_by: form.received_by,
        dept_head_signed_at: (form as any).dept_head_signed_at ?? null,
        dept_head_digital_signature:
          (form as any).dept_head_digital_signature ?? null,
        dept_head_signed_by: (form as any).dept_head_signed_by ?? null,
        dept_head_user_name: (form as any).dept_head_signed_by
          ? (deptHeadNames.get((form as any).dept_head_signed_by) ?? null)
          : null,
        it_manager_signed_at: (form as any).it_manager_signed_at ?? null,
        it_manager_digital_signature:
          (form as any).it_manager_digital_signature ?? null,
        it_manager_signed_by: (form as any).it_manager_signed_by ?? null,
        it_manager_user_name: (form as any).it_manager_signed_by
          ? (itManagerNames.get((form as any).it_manager_signed_by) ?? null)
          : null,
        declined_at: (form as any).declined_at ?? null,
        executed_at: (form as any).executed_at ?? null,
        returns: (recordRows as any[]).map((r: any) => ({
          return_id: r.record_id,
          assignment_id: r.assignment_id,
          user_id: r.user_id,
          return_condition: r.transfer_condition,
          return_notes: r.transfer_notes,
          condition_images: (() => {
            const raw = r.condition_images;
            if (Array.isArray(raw)) return raw;
            if (typeof raw === 'string') {
              try {
                const p = JSON.parse(raw);
                return Array.isArray(p) ? p : [];
              } catch {
                return [];
              }
            }
            return [];
          })(),
          created_at: r.created_at,
          assignment: {
            assignmentID: r.assignment_id,
            asset: {
              id: r.asset_id,
              code: r.asset_code,
              name: r.asset_name,
              category_id: r.category_id,
              category_name: r.category_name,
              type_id: r.type_id,
              type_name: r.type_name,
            },
            user: {
              id: r.user_id,
              first_name: r.first_name,
              last_name: r.last_name,
              email: r.email,
              employeeNumber: r.employee_number,
              position: r.position,
            },
            department: r.department_id
              ? { id: r.department_id, name: r.department_name }
              : null,
            location: r.location_name
              ? {
                  id: r.assignment_id,
                  name: r.location_name,
                  floor_unit: r.floor_unit || '',
                  building: r.building || '',
                  room_name: r.room_name,
                }
              : null,
            assigned_date: r.assigned_date,
            assignment_notes: r.assignment_notes,
            assigned_by: {
              id: form.created_by,
              first_name: r.assigned_by_first_name,
              last_name: r.assigned_by_last_name,
            },
          },
        })),
      });
    }

    return res.json({ assetTransferForms: batches });
  } catch (err: any) {
    logger.error('Get asset transfer forms by user failed:', err);
    return res.status(500).json({ error: 'Failed to fetch transfer forms' });
  }
}

/** Build transfer form batches from form list (shared helper) */
async function buildTransferFormBatches(forms: any[]): Promise<any[]> {
  const batches: any[] = [];

  const deptHeadSignedByIds = [
    ...new Set(forms.map((f: any) => f.dept_head_signed_by).filter(Boolean)),
  ] as string[];
  const deptHeadNames = new Map<string, string>();
  if (deptHeadSignedByIds.length > 0) {
    const placeholders = deptHeadSignedByIds.map(() => '?').join(',');
    const [userRows] = (await pool.execute(
      `SELECT userID, first_name, last_name FROM users WHERE userID IN (${placeholders})`,
      deptHeadSignedByIds
    )) as any[];
    for (const u of userRows) {
      deptHeadNames.set(
        u.userID,
        `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'
      );
    }
  }

  const itManagerSignedByIds = [
    ...new Set(forms.map((f: any) => f.it_manager_signed_by).filter(Boolean)),
  ] as string[];
  const itManagerNames = new Map<string, string>();
  if (itManagerSignedByIds.length > 0) {
    const placeholders = itManagerSignedByIds.map(() => '?').join(',');
    const [userRows] = (await pool.execute(
      `SELECT userID, first_name, last_name FROM users WHERE userID IN (${placeholders})`,
      itManagerSignedByIds
    )) as any[];
    for (const u of userRows) {
      itManagerNames.set(
        u.userID,
        `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'
      );
    }
  }

  for (const form of forms) {
    const formId =
      (form as { formID?: string; form_id?: string }).formID ??
      (form as { formID?: string; form_id?: string }).form_id ??
      null;
    if (!formId) continue;
    let [recordRows] = (await pool.execute(
      `SELECT atr.record_id, atr.assignment_id, atr.user_id, atr.transfer_condition, atr.transfer_notes, atr.condition_images, atr.created_at,
              aa.asset_id, aa.assigned_date, aa.assignment_notes,
              a.asset_code, a.name as asset_name, a.category_id, a.type_id,
              ac.name as category_name, at.name as type_name,
              u.first_name, u.last_name, u.email, u.employee_number, u.position,
              d.name as department_name, d.departmentID as department_id,
              l.name as location_name, l.floor_unit, l.building, lr.room_name,
              ab.first_name as assigned_by_first_name, ab.last_name as assigned_by_last_name,
              uc.companyID as user_company_id, uc.name as user_company_name,
              ud.departmentID as user_department_id, ud.name as user_department_name
       FROM asset_transfer atr
       JOIN asset_assignments aa ON atr.assignment_id = aa.assignmentID
       JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
       LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
       LEFT JOIN asset_types at ON a.type_id = at.typeID
       LEFT JOIN users u ON aa.user_id = u.userID
       LEFT JOIN companies uc ON u.company_id = uc.companyID AND uc.deleted_at IS NULL
       LEFT JOIN asset_mngmnt_departments ud ON u.department_id = ud.departmentID AND ud.deleted_at IS NULL
       LEFT JOIN asset_mngmnt_departments d ON aa.department_id = d.departmentID AND d.deleted_at IS NULL
       LEFT JOIN asset_mngmnt_locations l ON aa.location_id = l.locationID AND l.deleted_at IS NULL
       LEFT JOIN asset_mngmnt_location_rooms lr ON aa.location_room_id = lr.roomID AND lr.deleted_at IS NULL
       LEFT JOIN users ab ON aa.assigned_by = ab.userID
       WHERE atr.form_id = ? AND atr.deleted_at IS NULL
       ORDER BY atr.created_at ASC`,
      [toBind(formId)]
    )) as any[];

    if (!recordRows || (recordRows as any[]).length === 0) {
      try {
        const [assignRows] = (await pool.execute(
          `SELECT tfa.assignment_id, tfa.transfer_condition, tfa.transfer_notes, tfa.condition_images,
                  aa.user_id, aa.asset_id, aa.assigned_date, aa.assignment_notes,
                  a.asset_code, a.name as asset_name, a.category_id, a.type_id,
                  ac.name as category_name, at.name as type_name,
                  u.first_name, u.last_name, u.email, u.employee_number, u.position,
                  d.name as department_name, d.departmentID as department_id,
                  l.name as location_name, l.floor_unit, l.building, lr.room_name,
                  ab.first_name as assigned_by_first_name, ab.last_name as assigned_by_last_name,
                  uc.companyID as user_company_id, uc.name as user_company_name,
                  ud.departmentID as user_department_id, ud.name as user_department_name
           FROM transfer_form_assignments tfa
           JOIN asset_assignments aa ON tfa.assignment_id = aa.assignmentID AND aa.deleted_at IS NULL
           JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
           LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
           LEFT JOIN asset_types at ON a.type_id = at.typeID
           LEFT JOIN users u ON aa.user_id = u.userID
           LEFT JOIN companies uc ON u.company_id = uc.companyID AND uc.deleted_at IS NULL
           LEFT JOIN asset_mngmnt_departments ud ON u.department_id = ud.departmentID AND ud.deleted_at IS NULL
           LEFT JOIN asset_mngmnt_departments d ON aa.department_id = d.departmentID AND d.deleted_at IS NULL
           LEFT JOIN asset_mngmnt_locations l ON aa.location_id = l.locationID AND l.deleted_at IS NULL
           LEFT JOIN asset_mngmnt_location_rooms lr ON aa.location_room_id = lr.roomID AND lr.deleted_at IS NULL
           LEFT JOIN users ab ON aa.assigned_by = ab.userID
           WHERE tfa.form_id = ?
           ORDER BY aa.assigned_date ASC`,
          [formId]
        )) as any[];
        recordRows = (assignRows || []).map((r: any) => ({
          ...r,
          record_id: null,
          transfer_condition: r.transfer_condition ?? null,
          transfer_notes: r.transfer_notes ?? null,
          condition_images: r.condition_images ?? null,
          created_at: null,
        }));
      } catch {
        recordRows = [];
      }
    }

    const [processorRows] = (await pool.execute(
      'SELECT first_name, last_name FROM users WHERE userID = ?',
      [toBind((form as { created_by?: string }).created_by)]
    )) as any[];
    const processed_by =
      processorRows[0]?.first_name && processorRows[0]?.last_name
        ? `${processorRows[0].first_name} ${processorRows[0].last_name}`
        : null;

    let new_assigned_user:
      | {
          first_name: string;
          last_name: string;
          position?: string | null;
          department?: string | null;
          company?: { id: string; name: string };
          user_department?: { id: string; name: string };
        }
      | undefined;
    const newAssignedUserId = form.new_assigned_user_id;
    if (newAssignedUserId) {
      const [newUserRows] = (await pool.execute(
        `SELECT u.first_name, u.last_name, u.position, d.departmentID as new_user_department_id, d.name as department_name,
                c.companyID as new_user_company_id, c.name as new_user_company_name
         FROM users u
         LEFT JOIN asset_mngmnt_departments d ON u.department_id = d.departmentID AND d.deleted_at IS NULL
         LEFT JOIN companies c ON u.company_id = c.companyID AND c.deleted_at IS NULL
         WHERE u.userID = ?`,
        [toBind(newAssignedUserId)]
      )) as any[];
      const nu = newUserRows?.[0];
      if (nu) {
        new_assigned_user = {
          first_name: nu.first_name || '',
          last_name: nu.last_name || '',
          position: nu.position ?? null,
          department: nu.department_name ?? null,
        };

        if (nu.new_user_company_id != null) {
          new_assigned_user.company = {
            id: nu.new_user_company_id,
            name: nu.new_user_company_name,
          };
        }

        if (nu.new_user_department_id != null) {
          new_assigned_user.user_department = {
            id: nu.new_user_department_id,
            name: nu.department_name,
          };
        }
      }
    }

    const formUserId =
      (form as { user_id?: string }).user_id ??
      (form as { userId?: string }).userId ??
      '';
    const processorFields = await resolveProcessorSignatureForBatchDisplay(
      form as {
        created_by?: string | null;
        process_signed_at?: string | null;
        process_digital_signature?: string | null;
        processor_pending_signed_at?: string | null;
        processor_pending_signature?: string | null;
      }
    );
    batches.push({
      formID: formId,
      form_number: form.form_number,
      return_batch_id: formId,
      created_at: form.created_at,
      user_id: formUserId,
      processed_by,
      new_assigned_user_id: form.new_assigned_user_id,
      new_assigned_user,
      signed_at: form.signed_at,
      signed_by: form.signed_by,
      signed_digital_signature: form.signed_digital_signature,
      process_signed_at: processorFields.process_signed_at,
      process_digital_signature: processorFields.process_digital_signature,
      processor_pending_signed_at: processorFields.processor_pending_signed_at,
      processor_pending_signature: processorFields.processor_pending_signature,
      transfer_type: form.transfer_type,
      received_by: form.received_by,
      dept_head_signed_at: form.dept_head_signed_at ?? null,
      dept_head_digital_signature: form.dept_head_digital_signature ?? null,
      dept_head_signed_by: form.dept_head_signed_by ?? null,
      dept_head_user_name: form.dept_head_signed_by
        ? (deptHeadNames.get(form.dept_head_signed_by) ?? null)
        : null,
      it_manager_signed_at: form.it_manager_signed_at ?? null,
      it_manager_digital_signature: form.it_manager_digital_signature ?? null,
      it_manager_signed_by: form.it_manager_signed_by ?? null,
      it_manager_user_name: form.it_manager_signed_by
        ? (itManagerNames.get(form.it_manager_signed_by) ?? null)
        : null,
      declined_at: form.declined_at ?? null,
      executed_at: form.executed_at ?? null,
      returns: (recordRows as any[]).map((r: any) => ({
        return_id: r.record_id,
        assignment_id: r.assignment_id,
        user_id: r.user_id,
        return_condition: r.transfer_condition,
        return_notes: r.transfer_notes,
        condition_images: (() => {
          const raw = r.condition_images;
          if (Array.isArray(raw)) return raw;
          if (typeof raw === 'string') {
            try {
              const p = JSON.parse(raw);
              return Array.isArray(p) ? p : [];
            } catch {
              return [];
            }
          }
          return [];
        })(),
        created_at: r.created_at,
        assignment: {
          assignmentID: r.assignment_id,
          asset: {
            id: r.asset_id,
            code: r.asset_code,
            name: r.asset_name,
            category_id: r.category_id,
            category_name: r.category_name,
            type_id: r.type_id,
            type_name: r.type_name,
          },
          user: {
            id: r.user_id,
            first_name: r.first_name,
            last_name: r.last_name,
            email: r.email,
            employeeNumber: r.employee_number,
            position: r.position,
            company:
              r.user_company_id != null
                ? { id: r.user_company_id, name: r.user_company_name }
                : undefined,
            department:
              r.user_department_id != null
                ? {
                    id: r.user_department_id,
                    name: r.user_department_name,
                  }
                : undefined,
          },
          department: r.department_id
            ? { id: r.department_id, name: r.department_name }
            : null,
          location: r.location_name
            ? {
                id: r.assignment_id,
                name: r.location_name,
                floor_unit: r.floor_unit || '',
                building: r.building || '',
                room_name: r.room_name,
              }
            : null,
          assigned_date: r.assigned_date,
          assignment_notes: r.assignment_notes,
          assigned_by: {
            id: form.created_by,
            first_name: r.assigned_by_first_name,
            last_name: r.assigned_by_last_name,
          },
        },
      })),
    });
  }
  return batches;
}

export async function getAllAssetTransferFormsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { companyId } = await getAssetScope(pool, req.user!.userID);
    const forms = await AssetTransferFormModel.findAll();
    let filteredForms = forms;
    if (companyId) {
      // Need company_id on forms. AssetTransferFormModel.findAll() might not have it joined.
      // Assuming for now it has it or we filter after enrichment if needed.
      // But more efficient is to join.
      const [rows] = await pool.execute(
        `SELECT atf.* FROM asset_transfer_forms atf
         LEFT JOIN asset_mngmnt_departments d ON atf.department_id = d.departmentID
         WHERE atf.deleted_at IS NULL AND d.company_id = ?`,
        [companyId]
      );
      filteredForms = rows as any[];
    } else {
      return res.json({ assetTransferForms: [] });
    }
    const batches = await buildTransferFormBatches(filteredForms);
    return res.json({ assetTransferForms: batches });
  } catch (err: any) {
    logger.error('Get all asset transfer forms failed:', err);
    return res.status(500).json({ error: 'Failed to fetch transfer forms' });
  }
}

/** GET transfer forms pending Dept Head approval. Only Manager Approver 1 users; only forms where transferer's user department = approver's department. When return_form_id set, linked return form must be signed. */
export async function getTransferPendingApprovalsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.user!.userID;
    const { companyId } = await getAssetScope(pool, userId);
    if (!companyId) return res.json({ assetTransferForms: [] });

    const isManager1 = await isUserManagerApprover1(userId);
    if (!isManager1) return res.json({ assetTransferForms: [] });

    const [approverDeptRows] = (await pool.execute(
      'SELECT department_id FROM users WHERE userID = ?',
      [userId]
    )) as any[];
    const approverDepartmentId = approverDeptRows[0]?.department_id ?? null;
    if (approverDepartmentId == null)
      return res.json({ assetTransferForms: [] });

    let formRows: any[];
    try {
      const [rows] = (await pool.execute(
        `SELECT atf.formID, atf.form_number, atf.user_id, atf.department_id, atf.location_id, atf.location_room_id,
                atf.new_assigned_user_id, atf.created_by, atf.created_at, atf.signed_at, atf.signed_by, atf.signed_digital_signature,
                DATE_FORMAT(atf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
                atf.process_digital_signature,
                DATE_FORMAT(atf.processor_pending_signed_at, '%Y-%m-%d %H:%i:%s') AS processor_pending_signed_at,
                atf.processor_pending_signature,
                atf.transfer_type, atf.received_by,
                d.company_id AS form_company_id
         FROM asset_transfer_forms atf
         LEFT JOIN asset_mngmnt_departments d ON atf.department_id = d.departmentID
         LEFT JOIN users transferer ON transferer.userID = atf.user_id
         LEFT JOIN asset_return_forms arf ON atf.return_form_id = arf.formID AND arf.deleted_at IS NULL
         WHERE atf.deleted_at IS NULL
           AND (atf.declined_at IS NULL)
           AND atf.signed_at IS NOT NULL
           AND atf.dept_head_signed_at IS NULL
           AND (atf.return_form_id IS NULL OR (arf.formID IS NOT NULL AND arf.signed_at IS NOT NULL AND arf.declined_at IS NULL))
           AND transferer.department_id <=> ? AND d.company_id = ?`,
        [approverDepartmentId, companyId]
      )) as any[];
      formRows = rows || [];
    } catch (colErr: any) {
      if (
        colErr?.message?.includes('declined_at') ||
        colErr?.message?.includes('return_form_id')
      ) {
        return res.json({ assetTransferForms: [] });
      }
      throw colErr;
    }
    const pendingForms = formRows;
    const batches = await buildTransferFormBatches(pendingForms);
    return res.json({ assetTransferForms: batches });
  } catch (err: any) {
    const msg = err?.message ?? '';
    logger.error('Get transfer pending approvals failed:', err);
    if (typeof msg === 'string' && msg.includes('dept_head')) {
      return res.json({ assetTransferForms: [] });
    }
    return res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
}

/** GET transfer forms pending IT Manager receive (after execution: executed_at IS NOT NULL, it_manager not yet signed). */
export async function getTransferReceivePendingApprovalsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { companyId } = await getAssetScope(pool, req.user!.userID);
    if (!companyId) return res.json({ assetTransferForms: [] });

    let formRows: any[];
    try {
      const [rows] = (await pool.execute(
        `SELECT atf.formID, atf.form_number, atf.user_id, atf.department_id, atf.location_id, atf.location_room_id,
                atf.new_assigned_user_id, atf.created_by, atf.created_at, atf.signed_at, atf.signed_by, atf.signed_digital_signature,
                DATE_FORMAT(atf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
                atf.process_digital_signature,
                DATE_FORMAT(atf.processor_pending_signed_at, '%Y-%m-%d %H:%i:%s') AS processor_pending_signed_at,
                atf.processor_pending_signature,
                atf.transfer_type, atf.received_by,
                DATE_FORMAT(atf.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
                atf.dept_head_digital_signature, atf.dept_head_signed_by,
                d.company_id AS form_company_id
         FROM asset_transfer_forms atf
         LEFT JOIN asset_mngmnt_departments d ON atf.department_id = d.departmentID
         WHERE atf.deleted_at IS NULL
           AND (atf.declined_at IS NULL)
           AND atf.dept_head_signed_at IS NOT NULL
           AND atf.executed_at IS NOT NULL
           AND atf.it_manager_signed_at IS NULL
           AND d.company_id = ?`,
        [companyId]
      )) as any[];
      formRows = rows || [];
    } catch (colErr: any) {
      if (
        colErr?.message?.includes('executed_at') ||
        colErr?.message?.includes('declined_at')
      ) {
        return res.json({ assetTransferForms: [] });
      }
      throw colErr;
    }
    const batches = await buildTransferFormBatches(formRows);
    return res.json({ assetTransferForms: batches });
  } catch (err: any) {
    const msg = err?.message ?? '';
    logger.error('Get transfer receive pending failed:', err);
    if (
      typeof msg === 'string' &&
      (msg.includes('dept_head') || msg.includes('it_manager'))
    ) {
      return res.json({ assetTransferForms: [] });
    }
    return res.status(500).json({ error: 'Failed to fetch receive approvals' });
  }
}

/** GET transfer forms approved by current user (Dept Head). Requires migration_add_transfer_form_approvals. */
export async function getTransferApprovedByMeHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.user!.userID;
    const [formRows] = (await pool.execute(
      `SELECT atf.formID, atf.form_number, atf.user_id, atf.department_id, atf.location_id, atf.location_room_id,
              atf.new_assigned_user_id, atf.created_by, atf.created_at, atf.signed_at, atf.signed_by, atf.signed_digital_signature,
              DATE_FORMAT(atf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
              atf.process_digital_signature,
              DATE_FORMAT(atf.processor_pending_signed_at, '%Y-%m-%d %H:%i:%s') AS processor_pending_signed_at,
              atf.processor_pending_signature,
              atf.transfer_type, atf.received_by,
              DATE_FORMAT(atf.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
              atf.dept_head_digital_signature, atf.dept_head_signed_by,
              DATE_FORMAT(atf.it_manager_signed_at, '%Y-%m-%d %H:%i:%s') AS it_manager_signed_at,
              atf.it_manager_digital_signature, atf.it_manager_signed_by
       FROM asset_transfer_forms atf
       WHERE atf.deleted_at IS NULL AND atf.dept_head_signed_at IS NOT NULL AND atf.dept_head_signed_by = ?`,
      [userId]
    )) as any[];
    const batches = await buildTransferFormBatches(formRows || []);
    return res.json({ assetTransferForms: batches });
  } catch (err: any) {
    const msg = err?.message ?? '';
    logger.error('Get transfer approved by me failed:', err);
    if (typeof msg === 'string' && msg.includes('dept_head')) {
      return res.json({ assetTransferForms: [] });
    }
    return res.status(500).json({ error: 'Failed to fetch approved forms' });
  }
}

/** POST approve transfer form (Dept Head). Requires migration_add_transfer_form_approvals. */
export async function approveTransferFormHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const userId = req.user!.userID;
    if (!formId) return res.status(400).json({ error: 'Form ID is required' });
    const form = await AssetTransferFormModel.findById(formId);
    if (!form)
      return res.status(404).json({ error: 'Transfer form not found' });
    if (!form.signed_at) {
      return res.status(400).json({
        error: 'Transfer form must be signed by the transferrer first',
      });
    }
    const formAny = form as any;
    if (formAny.dept_head_signed_at) {
      return res.status(400).json({
        error: 'This transfer form is already approved by Department Head',
      });
    }
    const [permRows] = (await pool.execute(
      'SELECT module_name, permission_type, granted FROM user_permissions WHERE user_id = ?',
      [userId]
    )) as any[];
    const hasCreate = permRows.some(
      (r: any) =>
        r.module_name === 'Approvals' &&
        r.permission_type === 'create' &&
        r.granted === 1
    );
    const hasEdit = permRows.some(
      (r: any) =>
        r.module_name === 'Approvals' &&
        r.permission_type === 'edit' &&
        r.granted === 1
    );
    const managerApprover1 = await isUserManagerApprover1(userId);
    if (!(hasCreate && hasEdit) && !managerApprover1) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to approve this form' });
    }
    const body = req.body as {
      digitalSignature?: string | null;
      digital_signature?: string | null;
    };
    const deptHeadDigitalSignature =
      (typeof body.digitalSignature === 'string'
        ? body.digitalSignature.trim()
        : '') ||
      (typeof body.digital_signature === 'string'
        ? body.digital_signature.trim()
        : '') ||
      (await fetchUserDigitalSignature(userId));

    await pool.execute(
      `UPDATE asset_transfer_forms SET dept_head_signed_at = NOW(), dept_head_digital_signature = ?, dept_head_signed_by = ?, updated_at = NOW() WHERE formID = ?`,
      [deptHeadDigitalSignature || null, userId, formId]
    );
    const returnFormId = formAny.return_form_id ?? null;
    await createAuditLog({
      userId,
      action: 'Approved Asset Transfer Form (Dept Head)',
      resourceType: 'asset_transfer_form',
      resourceId: formId,
      resourceName: form.form_number,
      details: `User approved asset transfer form ${form.form_number} as Department Head`,
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });

    if (returnFormId) {
      const [returnDhRows] = (await pool.execute(
        `SELECT dept_head_signed_at FROM asset_return_forms WHERE formID = ? AND deleted_at IS NULL`,
        [returnFormId]
      )) as any[];
      if (!returnDhRows?.[0]?.dept_head_signed_at) {
        return res.json({
          message:
            'Transfer form approved. Approve the linked return form separately before the transfer can be executed.',
          formID: formId,
          linkedReturnFormID: returnFormId,
          pendingLinkedReturnApproval: true,
        });
      }

      const [formRows] = (await pool.execute(
        `SELECT process_signed_at, process_digital_signature, processor_pending_signature, processor_pending_signed_at, executed_at,
                new_assigned_user_id, department_id, location_id, location_room_id, transfer_type, received_by
         FROM asset_transfer_forms WHERE formID = ?`,
        [formId]
      )) as any[];
      const row = formRows?.[0];
      const hasProcessSig =
        row?.process_signed_at != null || row?.processor_pending_signed_at != null;
      if (hasProcessSig && !row?.executed_at) {
        const [tfaRows] = (await pool.execute(
          `SELECT assignment_id, transfer_condition, transfer_notes, condition_images
           FROM transfer_form_assignments WHERE form_id = ?`,
          [formId]
        )) as any[];
        const assetTransfers = (tfaRows || []).map((r: any) => {
          let imageUrls: string[] = [];
          if (r.condition_images) {
            try {
              imageUrls =
                typeof r.condition_images === 'string'
                  ? JSON.parse(r.condition_images)
                  : r.condition_images;
            } catch {
              imageUrls = [];
            }
          }
          return {
            assignmentId: r.assignment_id,
            condition: r.transfer_condition || 'Good',
            notes: r.transfer_notes || '',
            imageUrls,
          };
        });
        const newAssignment = {
          userId: row.new_assigned_user_id,
          departmentId: row.department_id ?? null,
          locationId: row.location_id ?? null,
          roomId: row.location_room_id ?? null,
          roomName: null as string | null,
        };
        const processDigitalSig =
          (row.process_digital_signature != null &&
            String(row.process_digital_signature).trim()) ||
          (row.processor_pending_signature != null &&
            String(row.processor_pending_signature).trim()) ||
          null;
        const processSignedAtRaw =
          row.process_signed_at != null
            ? row.process_signed_at
            : row.processor_pending_signed_at;
        const processSignature = processSignedAtRaw
          ? {
              digital_signature: processDigitalSig,
              signed_at:
                processSignedAtRaw instanceof Date
                  ? processSignedAtRaw.toISOString()
                  : String(processSignedAtRaw),
            }
          : null;
        try {
          await runTransferFormExecution(
            formId,
            {
              assetTransfers,
              processSignature,
              transferType: row.transfer_type ?? null,
              receivedBy: row.received_by ?? null,
              newAssignment,
            },
            { req, processorId: userId }
          );
          return res.json({
            message:
              'Transfer form approved and transfer executed successfully',
            formID: formId,
            autoExecuted: true,
          });
        } catch (autoErr: any) {
          logger.error('Auto-execute transfer on approval failed:', autoErr);
          return res.status(500).json({
            error:
              'Approval recorded but transfer execution failed. You may execute the transfer manually from Transfer Requests.',
            details: autoErr?.message,
          });
        }
      }
    }

    return res.json({
      message: 'Transfer form approved successfully',
      formID: formId,
    });
  } catch (err: any) {
    const msg = err?.message ?? '';
    logger.error('Approve transfer form failed:', err);
    if (typeof msg === 'string' && msg.includes('dept_head')) {
      return res.status(503).json({
        error:
          'Transfer form approval requires migration. Run migration_add_transfer_form_approvals.sql',
      });
    }
    return res.status(500).json({ error: 'Failed to approve transfer form' });
  }
}

/** POST decline transfer form (Dept Head). Declines both transfer form and linked return form. */
export async function declineTransferFormHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const userId = req.user!.userID;
    if (!formId) return res.status(400).json({ error: 'Form ID is required' });
    const form = await AssetTransferFormModel.findById(formId);
    if (!form)
      return res.status(404).json({ error: 'Transfer form not found' });
    const formAny = form as any;
    if (formAny.declined_at) {
      return res
        .status(400)
        .json({ error: 'This transfer form is already declined' });
    }
    if (formAny.executed_at) {
      return res
        .status(400)
        .json({ error: 'Cannot decline an executed transfer form' });
    }
    const [permRows] = (await pool.execute(
      'SELECT module_name, permission_type, granted FROM user_permissions WHERE user_id = ?',
      [userId]
    )) as any[];
    const hasCreate = permRows.some(
      (r: any) =>
        r.module_name === 'Approvals' &&
        r.permission_type === 'create' &&
        r.granted === 1
    );
    const hasEdit = permRows.some(
      (r: any) =>
        r.module_name === 'Approvals' &&
        r.permission_type === 'edit' &&
        r.granted === 1
    );
    const managerApprover1 = await isUserManagerApprover1(userId);
    if (!(hasCreate && hasEdit) && !managerApprover1) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to decline this form' });
    }
    await pool.execute(
      `UPDATE asset_transfer_forms SET declined_at = NOW(), declined_by = ?, updated_at = NOW() WHERE formID = ?`,
      [userId, formId]
    );
    const returnFormId = formAny.return_form_id ?? null;
    if (returnFormId) {
      await pool.execute(
        `UPDATE asset_return_forms SET declined_at = NOW(), declined_by = ?, updated_at = NOW() WHERE formID = ?`,
        [userId, returnFormId]
      );
    }
    await createAuditLog({
      userId,
      action: 'Declined Asset Transfer Form',
      resourceType: 'asset_transfer_form',
      resourceId: formId,
      resourceName: form.form_number,
      details: `User declined asset transfer form ${form.form_number}`,
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });
    return res.json({
      message: 'Transfer form declined',
      formID: formId,
    });
  } catch (err: any) {
    const msg = err?.message ?? '';
    logger.error('Decline transfer form failed:', err);
    if (typeof msg === 'string' && msg.includes('declined_at')) {
      return res.status(503).json({
        error:
          'Transfer form decline requires migration. Run migration_transfer_hold_and_decline.sql',
      });
    }
    return res.status(500).json({ error: 'Failed to decline transfer form' });
  }
}

/** POST receive transfer form (IT Manager). Requires migration_add_transfer_form_approvals. */
export async function receiveTransferFormHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const userId = req.user!.userID;
    const { digitalSignature } = req.body as { digitalSignature?: string };
    if (!formId) return res.status(400).json({ error: 'Form ID is required' });
    const isManagerApprover2 = await isUserManagerApprover2(userId);
    if (!isManagerApprover2) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to receive this form' });
    }
    const form = await AssetTransferFormModel.findById(formId);
    if (!form)
      return res.status(404).json({ error: 'Transfer form not found' });
    const formAny = form as any;
    if (!form.signed_at) {
      return res.status(400).json({
        error: 'Transfer form must be signed by the transferrer first',
      });
    }
    if (!formAny.dept_head_signed_at) {
      return res.status(400).json({
        error: 'Transfer form must be approved by Department Head first',
      });
    }
    if (formAny.it_manager_signed_at) {
      return res
        .status(400)
        .json({ error: 'This transfer form is already received' });
    }
    const itManagerDigitalSignature =
      (typeof digitalSignature === 'string' && digitalSignature.trim()) ||
      (await fetchUserDigitalSignature(userId));

    await pool.execute(
      `UPDATE asset_transfer_forms SET it_manager_signed_at = NOW(), it_manager_digital_signature = ?, it_manager_signed_by = ?, updated_at = NOW() WHERE formID = ?`,
      [itManagerDigitalSignature, userId, formId]
    );
    await createAuditLog({
      userId,
      action: 'Received Asset Transfer Form (IT Manager)',
      resourceType: 'asset_transfer_form',
      resourceId: formId,
      resourceName: form.form_number,
      details: `User received asset transfer form ${form.form_number} as IT Manager`,
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });
    return res.json({
      message: 'Transfer form received successfully',
      formID: formId,
    });
  } catch (err: any) {
    const msg = err?.message ?? '';
    logger.error('Receive transfer form failed:', err);
    if (
      typeof msg === 'string' &&
      (msg.includes('dept_head') || msg.includes('it_manager'))
    ) {
      return res.status(503).json({
        error:
          'Transfer form receive requires migration. Run migration_add_transfer_form_approvals.sql',
      });
    }
    return res.status(500).json({ error: 'Failed to receive transfer form' });
  }
}

export async function signAssetTransferFormHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const form = await AssetTransferFormModel.findById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Asset transfer form not found' });
    }

    if (req.user!.userID !== form.user_id) {
      return res.status(403).json({
        error:
          'You can only sign transfer forms assigned to you (as transferrer)',
      });
    }

    if (form.signed_at) {
      return res
        .status(400)
        .json({ error: 'This transfer form is already signed' });
    }

    const body = req.body as {
      digitalSignature?: string | null;
      digital_signature?: string | null;
    };
    const transferrerDigitalSignature =
      (typeof body.digitalSignature === 'string'
        ? body.digitalSignature.trim()
        : '') ||
      (typeof body.digital_signature === 'string'
        ? body.digital_signature.trim()
        : '') ||
      (await fetchUserDigitalSignature(req.user!.userID));

    await pool.execute('CALL sp_sign_asset_transfer_form(?, ?, ?)', [
      formId,
      req.user!.userID,
      transferrerDigitalSignature || null,
    ]);

    await createAuditLog({
      userId: req.user!.userID,
      action: 'Signed Asset Transfer Form',
      resourceType: 'asset_transfer_form',
      resourceId: formId,
      resourceName: form.form_number,
      details: `User signed asset transfer form ${form.form_number}`,
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });

    return createSuccessResponse(
      res,
      { formID: formId },
      'Transfer form signed successfully'
    );
  } catch (err: any) {
    logger.error('Sign asset transfer form failed:', err);
    return res.status(500).json({ error: 'Failed to sign transfer form' });
  }
}

export async function uploadTransferConditionPhotoHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const file = (req as any).file;
    if (!file?.buffer) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const url = await uploadReturnConditionImageToCloudinary(file.buffer);

    logger.info(
      `[TRANSFER CONDITION PHOTO UPLOAD] Success → User ${req.user!.userID} | URL: ${url}`
    );
    return res.json({ url });
  } catch (err: any) {
    logger.error('Transfer condition photo upload failed', { err });
    return res
      .status(500)
      .json({ error: 'Upload failed', details: err.message });
  }
}

async function isTransferFormInExecutionScope(
  formRow: {
    department_id?: string | null;
    form_company_id?: string | null;
  },
  staffUserId: string
): Promise<boolean> {
  const { companyId, departmentIds } = await getAssetScope(pool, staffUserId);
  if (!companyId) return false;
  if (formRow.form_company_id !== companyId) return false;
  if (departmentIds && departmentIds.length > 0) {
    const allowed = new Set(departmentIds);
    if (!formRow.department_id || !allowed.has(String(formRow.department_id)))
      return false;
  }
  return true;
}

async function canViewAssetTransferWetPdf(
  formRow: {
    user_id: string;
    new_assigned_user_id?: string | null;
    department_id?: string | null;
    form_company_id?: string | null;
  },
  viewerUserId: string
): Promise<boolean> {
  if (formRow.user_id === viewerUserId) return true;
  if (formRow.new_assigned_user_id === viewerUserId) return true;
  return isTransferFormInExecutionScope(
    {
      department_id: formRow.department_id ?? null,
      form_company_id: formRow.form_company_id ?? null,
    },
    viewerUserId
  );
}

