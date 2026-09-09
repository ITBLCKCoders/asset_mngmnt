import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';
import * as repo from '../repositories/accountabilityForm.repository.js';
import { getReturnFormsByAssetId as getAssetReturnFormsByAssetId } from '../repositories/assetReturn.repository.js';
import { getTransferFormsByAssetId as getAssetTransferFormsByAssetId } from '../repositories/assetTransferForm.repository.js';
import * as checklistRepo from '../repositories/assetChecklist.repository.js';
import { resolveAssetIdByCodeOrId } from '../repositories/asset.repository.js';
import { declineAccountabilityFormBodySchema } from '../dtos/accountabilityForms/DeclineAccountabilityFormDto.js';
import { applyReturnAssignmentSideEffectsOnConnection } from '../utils/returnAssignmentSideEffects.js';
import { signedRawUrlFromStoredSecureUrl } from '../utils/cloudinary.js';
import { getAssetScope, classifyDepartmentScopeByName } from '../utils/assetScope.js';
import { getClearanceEligibility, createClearanceForScope } from '../utils/accountabilityFormOnReturn.js';
import { emitNotification } from '../sockets/socketHandlers.js';
import { createNotificationForApi, type NotificationApiType } from '../utils/notificationsApi.js';
import { getHrAccountabilityReceiverUserIds } from '../utils/approverNotifications.js';
import { getIoInstance } from '../utils/socketManager.js';
import { NotificationService } from '../services/notification.service.js';
import { randomUUID } from 'crypto';
import { resolveChecklistAssignmentIds } from '../utils/accountabilityFormAssetsData.js';
import { isComputerTypeName } from '../utils/computerTypeAsset.js';
import * as assignmentRepo from '../repositories/assetAssignment.repository.js';
import * as intangibleAssignmentRepo from '../repositories/intangibleAssets.repository.js';
import {
  isDesignatedApprover,
  isDesignatedSubApprover,
  getDesignatedApproverUserIdForRequester,
  getDesignatedSubApproverUserIdForRequester,
  getRequestorMA1Status,
} from '../utils/approverNotifications.js';

async function userHasHrAccountabilityReceiverAccess(
  userId: string
): Promise<boolean> {
  const [rows] = (await pool.execute(
    `SELECT 1
     FROM users u
     LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
     LEFT JOIN user_custodian_settings uc ON u.userID = uc.user_id
     WHERE u.userID = ?
       AND (r.hr_accountability_receiver = 1 OR COALESCE(uc.hr_accountability_receiver, 0) = 1)
     LIMIT 1`,
    [userId]
  )) as [unknown[], unknown];
  return Array.isArray(rows) && rows.length > 0;
}

async function userCanViewAccountabilityFormRow(
  row: { user_id: string; created_by: string | null },
  currentUserId: string
): Promise<boolean> {
  if (row.user_id === currentUserId || row.created_by === currentUserId) {
    return true;
  }
  if (await userHasHrAccountabilityFullAccess(currentUserId)) {
    return true;
  }
  if (await userHasHrAccountabilityReceiverAccess(currentUserId)) {
    return true;
  }
  const perms = await repo.getUserAccountabilityFormPermissions(currentUserId);
  return perms.some(p => p.granted === 1);
}

async function userHasHrAccountabilityFullAccess(
  userId: string
): Promise<boolean> {
  const rows = await repo.getUserAccountabilityFormPermissions(userId);
  let create = false;
  let edit = false;
  let del = false;
  for (const row of rows) {
    if (row.granted !== 1) continue;
    if (row.permission_type === 'create') create = true;
    if (row.permission_type === 'edit') edit = true;
    if (row.permission_type === 'delete') del = true;
  }
  return create && edit && del;
}

/**
 * MySQL2 may return JSON columns as parsed objects, strings, or Buffers depending on config.
 * Calling JSON.parse on an object stringifies it to "[object Object]" and throws.
 */
function parseMysqlJsonColumn<T = unknown>(value: unknown): T | null {
  if (value == null || value === '') return null;
  if (Buffer.isBuffer(value)) {
    try {
      const s = value.toString('utf8');
      if (!s) return null;
      return JSON.parse(s) as T;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return null;
}

async function resolveSigningDigitalSignature(
  userId: string,
  preferredSignature?: string | null
): Promise<string | null> {
  const preferred =
    preferredSignature != null && String(preferredSignature).trim() !== ''
      ? String(preferredSignature).trim()
      : '';
  if (preferred) {
    return preferred;
  }

  const [userRows] = (await pool.query(
    `SELECT digital_signature FROM users WHERE userID = ? LIMIT 1`,
    [userId]
  )) as [{ digital_signature?: string | null }[], unknown];
  const fromUser = userRows[0]?.digital_signature;
  return fromUser != null && String(fromUser).trim() !== ''
    ? String(fromUser).trim()
    : null;
}

/**
 * Map the new Department head signatory columns with graceful fallbacks:
 * - legacy/backfilled rows inherit `approved_by/approved_at` when the
 *   `dept_head_*` columns are NULL (or the migration has not run yet).
 * - names prefer the stored snapshot, then the joined user names.
 */
function mapDeptHeadFields(row: any) {
  const storedName =
    row.dept_head_signed_by_name != null &&
    String(row.dept_head_signed_by_name).trim() !== ''
      ? String(row.dept_head_signed_by_name).trim()
      : null;
  const joinedDeptName =
    row.dept_head_signer_first_name != null ||
    row.dept_head_signer_last_name != null
      ? `${row.dept_head_signer_first_name || ''} ${row.dept_head_signer_last_name || ''}`.trim() ||
        null
      : null;
  const joinedApproverName =
    row.approved_by_first_name != null || row.approved_by_last_name != null
      ? `${row.approved_by_first_name || ''} ${row.approved_by_last_name || ''}`.trim() ||
        null
      : null;
  return {
    approvedByName: joinedApproverName,
    approvedBySignature:
      row.approved_by_digital_signature != null &&
      String(row.approved_by_digital_signature).trim() !== ''
        ? String(row.approved_by_digital_signature).trim()
        : null,
    deptHeadSignedById: row.dept_head_signed_by ?? row.approved_by ?? null,
    deptHeadSignedAt: row.dept_head_signed_at ?? row.approved_at ?? null,
    deptHeadSignature:
      row.dept_head_signature != null &&
      String(row.dept_head_signature).trim() !== ''
        ? String(row.dept_head_signature).trim()
        : row.approved_by_digital_signature != null &&
            String(row.approved_by_digital_signature).trim() !== ''
          ? String(row.approved_by_digital_signature).trim()
          : null,
    deptHeadSignedByName: storedName ?? joinedDeptName ?? joinedApproverName,
  };
}

/**
 * Map the unified-clearance per-stage signers (IT Asset / Admin Asset / HR
 * Receiver) for the clearance PDF "Copy for IT" / "Copy for Admin" blocks.
 * Names resolve from the joined signer users; all fields stay null until the
 * corresponding approval stage completes.
 */
function mapClearanceStageSigners(row: any) {
  const joinName = (first: unknown, last: unknown): string | null => {
    const name = `${(first as string) || ''} ${(last as string) || ''}`.trim();
    return name || null;
  };
  return {
    clearanceItSignerName: joinName(
      row.clearance_it_signer_first_name,
      row.clearance_it_signer_last_name
    ),
    clearanceItSignature: row.clearance_it_signature ?? null,
    clearanceItSignedAt: row.clearance_it_signed_at ?? null,
    clearanceAdminSignerName: joinName(
      row.clearance_admin_signer_first_name,
      row.clearance_admin_signer_last_name
    ),
    clearanceAdminSignature: row.clearance_admin_signature ?? null,
    clearanceAdminSignedAt: row.clearance_admin_signed_at ?? null,
    clearanceHrSignerName: joinName(
      row.clearance_hr_signer_first_name,
      row.clearance_hr_signer_last_name
    ),
    clearanceHrSignature: row.clearance_hr_signature ?? null,
    clearanceHrSignedAt: row.clearance_hr_signed_at ?? null,
  };
}

async function notifyChecklistApproversAfterEmployeeSign(params: {
  employeeId: string;
  formId: string;
  signedCount: number;
}): Promise<void> {
  const { employeeId, formId, signedCount } = params;
  if (signedCount <= 0) {
    return;
  }

  const [empRows] = (await pool.query(
    `SELECT department_id, company_id, name, first_name, last_name
     FROM users WHERE userID = ? LIMIT 1`,
    [employeeId]
  )) as [
    {
      department_id: string | null;
      company_id: string | null;
      name?: string | null;
      first_name?: string | null;
      last_name?: string | null;
    }[],
    unknown,
  ];
  const emp = empRows[0];
  const companyId = emp?.company_id ?? null;

  if (!companyId) {
    return;
  }

  // Check if employee has MA1 custodian access
  const employeeHasMA1 = await getRequestorMA1Status(employeeId);
  // Use the employee's designated approver (user-level, local-admin fallback)
  const approverUserId = await getDesignatedApproverUserIdForRequester(employeeId);
  const subApproverUserId = await getDesignatedSubApproverUserIdForRequester(employeeId);
  
  const employeeName =
    [emp?.first_name, emp?.last_name].filter(Boolean).join(' ').trim() ||
    emp?.name ||
    'An employee';

  const notifyUsers = [approverUserId, subApproverUserId].filter((id): id is string => id !== null && id !== employeeId);
  
  for (const approverUserId of notifyUsers) {
    await createNotificationForApi({
      user_id: approverUserId,
      title: 'Asset Checklist Approval Needed',
      message: `${employeeName} signed ${signedCount} asset checklist${signedCount !== 1 ? 's' : ''} and requires your approval.`,
      type: 'system',
      data: {
        route: '/approvals',
        actionTarget: 'checklist_approval',
        form_id: formId,
        employee_id: employeeId,
        employee_name: employeeName,
        checklist_count: signedCount,
      },
    });
  }
}

async function signLinkedChecklistsForAccountabilityForm(params: {
  formId: string;
  formNumber: string | null;
  assetsDataRaw: unknown;
  fallbackAssignmentId: string | null;
  userId: string;
  employeeId: string;
  digitalSignature: string | null;
  req: AuthRequest;
}): Promise<number> {
  const {
    formId,
    formNumber,
    assetsDataRaw,
    fallbackAssignmentId,
    userId,
    employeeId,
    digitalSignature,
    req,
  } = params;

  const assignmentIds = await resolveChecklistAssignmentIds({
    assetsDataRaw,
    fallbackAssignmentId,
    userId,
    getActiveAssignmentIdsByAssetIds:
      assignmentRepo.getActiveAssignmentIdsByUserAndAssetIds,
    getActiveAssignmentIdsByAssetCodes:
      assignmentRepo.getActiveAssignmentIdsByUserAndAssetCodes,
    isComputerType: isComputerTypeName,
  });

  const checklists =
    await checklistRepo.getChecklistsByAssignmentIds(assignmentIds);
  const unsigned = checklists.filter(
    (c: { employee_signed_at?: string | null }) => !c.employee_signed_at
  );
  const allChecklistIds = checklists.map((c: { id: string }) => c.id);

  if (allChecklistIds.length === 0) {
    return 0;
  }

  let signedCount = 0;
  if (unsigned.length > 0) {
    signedCount = await checklistRepo.signChecklistsAsEmployee({
      checklistIds: unsigned.map((c: { id: string }) => c.id),
      employeeId,
      digitalSignature,
    });
  }

  if (digitalSignature) {
    signedCount += await checklistRepo.backfillEmployeeChecklistSignatures({
      checklistIds: allChecklistIds,
      employeeId,
      digitalSignature,
    });
  }

  if (signedCount === 0) {
    return 0;
  }

  try {
    await notifyChecklistApproversAfterEmployeeSign({
      employeeId,
      formId,
      signedCount,
    });
  } catch (notifError) {
    logger.error('Failed to notify checklist approvers:', notifError);
  }

  await createAuditLog({
    userId: employeeId,
    action: 'Signed Asset Checklists',
    resourceType: 'accountability_form',
    resourceId: formId,
    resourceName: formNumber ?? formId,
    details: `Signed ${signedCount} asset checklist(s) for accountability form`,
    newValues: {
      signed_checklist_count: signedCount,
      checklist_ids: unsigned.map((c: { id: string }) => c.id),
    },
    ipAddress: req.ip,
    userAgent: req.get ? req.get('User-Agent') : 'Unknown',
  });

  return signedCount;
}

/**
 * Classify the IT/Admin scope of a form based on its assets (or single asset).
 * Returns 'IT' when any asset is IT-scoped, 'Admin' when admin-scoped,
 * null when the form has no resolvable scope (e.g. clearance with no assets).
 */
export type ClearanceScope = 'IT' | 'Admin' | 'Unified';
export type ClearanceReason = 'return' | 'transfer' | 'clearance';
export type AdminCopyCopyType = 'IT' | 'Admin';

/** Stored inside `assets_data` JSON alongside `assets` (not shown in PDF tables). */
export type AccountabilityFormOrigin = 'processor_return' | 'clearance';

function detectFormCopyScope(
  assets: any[] | null | undefined,
  formOrigin: AccountabilityFormOrigin | undefined,
  clearanceScope: ClearanceScope | undefined
): AdminCopyCopyType | null {
  if (formOrigin === 'clearance') {
    if (clearanceScope === 'Unified') return null;
    return (clearanceScope as AdminCopyCopyType) ?? null;
  }
  if (!assets || assets.length === 0) return null;
  let isIT = false;
  let isAdmin = false;
  for (const a of assets) {
    const dept = (a?.department || a?.categoryDepartment || '').toString().toLowerCase();
    const type = (a?.type || '').toString().toLowerCase();
    if (dept.includes('it') || dept.includes('information technology')) {
      isIT = true;
    } else if (dept.includes('admin') || dept.includes('administration')) {
      isAdmin = true;
    } else if (
      type.includes('computer') ||
      type.includes('laptop') ||
      type.includes('server')
    ) {
      isIT = true;
    }
  }
  if (isIT && !isAdmin) return 'IT';
  if (isAdmin && !isIT) return 'Admin';
  // Mixed scopes → prefer the dominant one but still require a copy signer.
  if (isIT) return 'IT';
  if (isAdmin) return 'Admin';
  return null;
}

/**
 * Build the standard notification payload for "please sign the IT/Admin copy".
 */
function buildAdminCopySignNotification(args: {
  signerUserId: string;
  formNumber: string;
  formId: string;
  ownerName: string;
  copyType: AdminCopyCopyType;
  alsoApproves: boolean;
}) {
  const stepLabel = args.alsoApproves
    ? 'sign and approve'
    : `sign the ${args.copyType} copy`;
  return {
    user_id: args.signerUserId,
    title: `Accountability form ${args.formNumber} needs ${args.copyType} copy signature`,
    message: `Please ${stepLabel} for ${args.ownerName}'s accountability form (${args.formNumber}).`,
    type: 'accountability_form',
    data: {
      route: '/approvals?tab=for-approval',
      actionTarget: 'accountability_form_admin_copy',
      formId: args.formId,
      formNumber: args.formNumber,
      copyType: args.copyType,
      alsoApproves: args.alsoApproves,
    },
  };
}

/**
 * Build the standard notification payload for "please approve the form".
 */
function buildApprovalRequestNotification(args: {
  approverUserId: string;
  formNumber: string;
  formId: string;
  ownerName: string;
}) {
  return {
    user_id: args.approverUserId,
    title: `Accountability form ${args.formNumber} needs your approval`,
    message: `Please review and approve the accountability form for ${args.ownerName} (${args.formNumber}).`,
    type: 'accountability_form',
    data: {
      route: '/approvals?tab=for-approval',
      actionTarget: 'accountability_form_approval',
      formId: args.formId,
      formNumber: args.formNumber,
    },
  };
}

/**
 * Build the standard notification payload for "form is ready for user to sign".
 */
function buildOwnerReadyNotification(args: {
  ownerUserId: string;
  formNumber: string;
  formId: string;
  assignerName: string;
}) {
  return {
    user_id: args.ownerUserId,
    title: 'New accountability form has been issued',
    message: `by ${args.assignerName}. Review it and check your assets and sign the form`,
    type: 'accountability_form',
    status: 'unread',
    data: JSON.stringify({
      description: `by ${args.assignerName}. Review it and check your assets and sign the form`,
      route: '/profile?tab=documents',
      actionTarget: 'profile_documents',
      formId: args.formId,
      formNumber: args.formNumber,
      assignedBy: args.assignerName,
      timestamp: new Date().toISOString(),
    }),
  };
}

async function notifyUser(payload: {
  userId: string;
  title: string;
  message: string;
  type: NotificationApiType;
  data: Record<string, unknown> | string;
  createdBy: string;
  req: AuthRequest;
}): Promise<void> {
  try {
    const dataString =
      typeof payload.data === 'string' ? payload.data : JSON.stringify(payload.data);
    await NotificationService.createNotification(
      {
        user_id: payload.userId,
        title: payload.title,
        message: payload.message,
        type: payload.type as
          | 'asset_assignment'
          | 'accountability_form'
          | 'system'
          | 'reminder'
          | 'user_lockout',
        status: 'unread',
        data: dataString,
      },
      payload.createdBy,
      payload.req.ip,
      payload.req.get('User-Agent')
    );
    const io = getIoInstance();
    if (io) {
      emitNotification(io, payload.userId, 'notification', {
        ...(typeof payload.data === 'object' ? payload.data : {}),
        title: payload.title,
        description: payload.message,
        type: payload.type,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    logger.error('Failed to send notification:', err);
  }
}

function parseAccountabilityAssetsData(assetsDataRaw: unknown): {
  assets: any[];
  assignmentIds: string[];
  formOrigin?: AccountabilityFormOrigin;
  clearanceScope?: ClearanceScope;
  clearanceReason?: ClearanceReason;
  referenceDisabledFormNumbers?: string[];
  clearedAt?: string;
} {

  const assets: any[] = [];
  const assignmentIds: string[] = [];
  if (assetsDataRaw == null || assetsDataRaw === '') {
    return { assets, assignmentIds };
  }
  try {
    const raw =
      Buffer.isBuffer(assetsDataRaw)
        ? assetsDataRaw.toString('utf8')
        : assetsDataRaw;
    const assetsData =
      typeof raw === 'string'
        ? JSON.parse(raw)
        : typeof raw === 'object'
          ? (raw as Record<string, unknown>)
          : null;
    if (
      assetsData &&
      Array.isArray((assetsData as { assets?: unknown }).assets)
    ) {
      for (const a of (assetsData as { assets: any[] }).assets) {
        assets.push(a);
      }
    }
    const rawAssignmentIds = (assetsData as { assignment_ids?: unknown })
      ?.assignment_ids;
    if (Array.isArray(rawAssignmentIds)) {
      for (const id of rawAssignmentIds) {
        const assignmentId = String(id ?? '').trim();
        if (assignmentId) {
          assignmentIds.push(assignmentId);
        }
      }
    }
    const fo = (assetsData as { form_origin?: unknown })?.form_origin;
    const clearedScope = (assetsData as { clearance_scope?: unknown })
      ?.clearance_scope;
    const clearedReason = (assetsData as { clearance_reason?: unknown })
      ?.clearance_reason;
    const refDisabled = (assetsData as {
      reference_disabled_form_numbers?: unknown;
    })?.reference_disabled_form_numbers;
    const clearedAt = (assetsData as { cleared_at?: unknown })?.cleared_at;
    if (fo === 'clearance') {
      return {
        assets,
        assignmentIds: [...new Set(assignmentIds)],
        formOrigin: 'clearance',
        clearanceScope:
          clearedScope === 'IT' || clearedScope === 'Admin' || clearedScope === 'Unified'
            ? (clearedScope as ClearanceScope)
            : undefined,
        clearanceReason:
          clearedReason === 'return' || clearedReason === 'transfer' || clearedReason === 'clearance'
            ? (clearedReason as ClearanceReason)
            : undefined,
        referenceDisabledFormNumbers: Array.isArray(refDisabled)
          ? refDisabled.map((v: unknown) => String(v)).filter(Boolean)
          : undefined,
        clearedAt:
          typeof clearedAt === 'string' && clearedAt ? clearedAt : undefined,
      };
    }
    if (fo === 'processor_return') {
      return {
        assets,
        assignmentIds: [...new Set(assignmentIds)],
        formOrigin: 'processor_return',
      };
    }
  } catch {
    /* ignore */
  }
  return { assets, assignmentIds: [...new Set(assignmentIds)] };
}

/**
 * Collect every tangible assignmentID linked to an accountability form:
 * the legacy single `assignment_id` column plus `assignment_ids` in
 * `assets_data`. Used to reveal assignments held as `Inactive` while the
 * IT/Admin copy approval flow runs.
 */
function collectFormAssignmentIds(formRow: {
  assignment_id?: string | null;
  assets_data?: unknown;
}): string[] {
  const ids: string[] = [];
  const single = String(formRow.assignment_id ?? '').trim();
  if (single) ids.push(single);
  ids.push(...parseAccountabilityAssetsData(formRow.assets_data).assignmentIds);
  return [...new Set(ids.map(id => String(id ?? '').trim()).filter(Boolean))];
}

/**
 * Reveal assignments held as `Inactive` once the IT/Admin copy is signed.
 * Tangible rows flip by assignmentID; intangible rows follow via their
 * `accountability_assignment_id` link. Only `Inactive` rows are touched.
 */
async function activateAssignmentsForAccountabilityForm(formRow: {
  assignment_id?: string | null;
  assets_data?: unknown;
  user_id: string;
}): Promise<{ tangible: number; intangible: number }> {
  const ids = collectFormAssignmentIds(formRow);
  if (ids.length === 0) return { tangible: 0, intangible: 0 };
  let tangible = 0;
  let intangible = 0;
  try {
    tangible = await assignmentRepo.setAssignmentsActiveByIds(ids);
  } catch (err) {
    logger.error('Failed to activate tangible assignments on copy sign:', err);
  }
  try {
    intangible =
      await intangibleAssignmentRepo.setIntangibleActiveByAccountabilityAssignmentIds(
        ids,
        formRow.user_id
      );
  } catch (err) {
    logger.error('Failed to activate intangible assignments on copy sign:', err);
  }
  return { tangible, intangible };
}

/**
 * Notify the new asset owner with BOTH the assignment notice and the
 * accountability-issued notice. Fired once the form is finally `approved`
 * (or via the combined copy-sign + approve step), never at issuance time.
 */
async function notifyOwnerAssignmentAndAccountability(args: {
  ownerUserId: string;
  formNumber: string;
  formId: string;
  assignerName: string;
  assignerUserId: string;
  assetCodes: string[];
  req: AuthRequest;
}): Promise<void> {
  const truncatedCodes =
    args.assetCodes.length > 0
      ? (() => {
          const joined = args.assetCodes.join(', ');
          return joined.length > 50 ? joined.substring(0, 47) + '...' : joined;
        })()
      : '';
  const assignMessage = truncatedCodes
    ? `by ${args.assignerName}. Assets: ${truncatedCodes}`
    : `by ${args.assignerName}.`;
  await notifyUser({
    userId: args.ownerUserId,
    title: 'New asset is assigned to You',
    message: assignMessage,
    type: 'asset_assignment',
    data: {
      description: assignMessage,
      route: '/my-assets',
      actionTarget: 'my_assets',
      formId: args.formId,
      formNumber: args.formNumber,
      assignedBy: args.assignerName,
      timestamp: new Date().toISOString(),
    },
    createdBy: args.assignerUserId,
    req: args.req,
  });
  const ownerPayload = buildOwnerReadyNotification({
    ownerUserId: args.ownerUserId,
    formNumber: args.formNumber,
    formId: args.formId,
    assignerName: args.assignerName,
  });
  await notifyUser({
    userId: ownerPayload.user_id,
    title: ownerPayload.title,
    message: ownerPayload.message,
    type: 'accountability_form',
    data: JSON.parse(ownerPayload.data),
    createdBy: args.assignerUserId,
    req: args.req,
  });
}

/**
 * Read asset codes linked to a form for the assignment notification.
 */
async function getAssetCodesForForm(formRow: {
  assignment_id?: string | null;
  assets_data?: unknown;
}): Promise<string[]> {
  const parsed = parseAccountabilityAssetsData(formRow.assets_data);
  const codes = parsed.assets
    .map((a: any) => String(a?.code ?? a?.asset_code ?? '').trim())
    .filter(Boolean);
  return [...new Set(codes)];
}

// Helper function to generate form number based on settings
async function generateFormNumber(
  companyId: string,
  assets: any[],
  departmentId?: string,
  options?: {
    origin?: AccountabilityFormOrigin;
    clearanceScope?: ClearanceScope;
  }
): Promise<string> {
  // Fetch accountability form settings
  const settings = await repo.getAccountabilityFormSettings(companyId);

  // Block form creation if no settings exist for the company
  if (!settings) {
    throw new Error(
      'Please configure your company asset accountability form number first or contact system administrator'
    );
  }

  // Get company info
  const company = await repo.getCompanyCodePrefix(companyId);

  // Get department info if department_format is not 'none'
  let department: { code: string | null; prefix: string | null } | null = null;
  if (settings?.department_format !== 'none' && departmentId) {
    department = await repo.getDepartmentCodePrefix(departmentId);
  }

  // Determine if assets are IT or Admin based on asset category's department first
  const deptName = (asset: any) =>
    (asset.department || asset.categoryDepartment || '')
      .toString()
      .toLowerCase();
  const isITByDept = assets.some(
    (asset: any) =>
      deptName(asset).includes('it') ||
      deptName(asset).includes('information technology')
  );
  const isAdminByDept = assets.some(
    (asset: any) =>
      deptName(asset).includes('admin') ||
      deptName(asset).includes('administration')
  );

  let isITAsset: boolean;
  if (isITByDept) {
    isITAsset = true;
  } else if (isAdminByDept) {
    isITAsset = false;
  } else {
    // Fallback: keyword matching on type only when no department info
    isITAsset = assets.some(
      (asset: any) =>
        (asset.type || '').toLowerCase().includes('computer') ||
        (asset.type || '').toLowerCase().includes('server') ||
        (asset.type || '').toLowerCase().includes('laptop')
    );
  }

  let assetCode: string | null;
  if (options?.origin === 'clearance') {
    // Unified clearance uses CLR (single certificate). Legacy IT/Admin codes kept for history.
    assetCode = 'CLR';
  } else {
    assetCode = isITAsset
      ? settings?.it_asset_code
      : settings?.admin_asset_code;
  }

  // Build form number parts
  const parts = [];

  // Company part
  if (settings?.company_format === 'code' && company?.code) {
    parts.push(company.code);
  } else if (settings?.company_format === 'prefix' && company?.prefix) {
    parts.push(company.prefix);
  }

  // Department part
  if (settings?.department_format === 'code' && department?.code) {
    parts.push(department.code);
  } else if (settings?.department_format === 'prefix' && department?.prefix) {
    parts.push(department.prefix);
  }

  // Asset code part
  if (assetCode) {
    parts.push(assetCode);
  }

  // Date part
  if (settings?.include_date) {
    const now = new Date();
    const dateStr =
      settings.date_format === 'YYYYMMDD'
        ? `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
        : `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
    parts.push(dateStr);
  }

  // Generate sequence number (for MMYYYY: reset per year, so match any month in same year)
  const dateFilter = settings?.include_date ? parts[parts.length - 1] : null;
  const basePattern = parts.slice(0, -1).join('-'); // All parts except date/sequence
  const year = settings?.include_date ? new Date().getFullYear() : null;
  const likeParam =
    settings?.include_date && settings?.date_format === 'MMYYYY'
      ? `${basePattern}-%${year}`
      : `${basePattern}${dateFilter ? `-${dateFilter}` : ''}`;

  const nextSeq = await repo.getNextFormSequence(likeParam);
  parts.push(String(nextSeq).padStart(4, '0'));

  return parts.join('-');
}

/** Primary key is UUID (DEFAULT (uuid())); mysql2 insertId is 0 — resolve by unique form_number. */
async function getFormIdByFormNumber(
  formNumber: string
): Promise<string | null> {
  const id = await repo.findFormIdByFormNumber(formNumber);
  return id != null && String(id).trim() !== '' ? String(id) : null;
}

/**
 * Resolve the approval-flow parameters for a form. The form's status is
 * decided by:
 *   1. The IT/Admin copy scope of the assets (clearance uses its own scope)
 *   2. The designated approver/sub-approver of the form's user
 *   3. The adminCopySignerId supplied by the issuer (may be null when the
 *      issuer chose the legacy `signITCopy` checkbox or for clearance)
 *
 * Returns null when the form does not need to go through the new flow
 * (no IT/Admin copy, no clearance, no approver found).
 */
async function resolveApprovalParams(args: {
  userId: string;
  assetsForScope: any[];
  formOrigin: AccountabilityFormOrigin | undefined;
  clearanceScope: ClearanceScope | undefined;
  adminCopySignerIdRaw: unknown;
  adminCopyCopyTypeRaw: unknown;
}): Promise<
  | {
      approvalStatus: 'pending_admin_copy_signature' | 'pending_approval' | 'approved';
      adminCopySignerId: string | null;
      adminCopyCopyType: AdminCopyCopyType | null;
      ownerApproverId: string | null;
      ownerSubApproverId: string | null;
    }
  | null
> {
  const copyType: AdminCopyCopyType | null =
    args.adminCopyCopyTypeRaw === 'IT' || args.adminCopyCopyTypeRaw === 'Admin'
      ? (args.adminCopyCopyTypeRaw as AdminCopyCopyType)
      : detectFormCopyScope(
          args.assetsForScope,
          args.formOrigin,
          args.clearanceScope
        );

  // Clearance uses the copy scope directly, but there's no IT/Admin copy to
  // sign - clearance is a single certificate. We still need an approver
  // (the form user's approver/sub-approver) to release it.
  if (args.formOrigin === 'clearance') {
    const approverId = await getDesignatedApproverUserIdForRequester(
      args.userId
    );
    const subApproverId = await getDesignatedSubApproverUserIdForRequester(
      args.userId
    );
    return {
      approvalStatus: approverId || subApproverId ? 'pending_approval' : 'approved',
      adminCopySignerId: null,
      adminCopyCopyType: copyType,
      ownerApproverId: approverId,
      ownerSubApproverId: subApproverId,
    };
  }

  // For tangible forms: if the form has no IT/Admin scope, the legacy flow
  // (direct to user) still applies - no copy signer required.
  if (copyType === null) {
    return null;
  }

  // IT/Admin scope form: must have a copy signer.
  const signerId =
    typeof args.adminCopySignerIdRaw === 'string' &&
    args.adminCopySignerIdRaw.trim() !== ''
      ? args.adminCopySignerIdRaw.trim()
      : null;

  if (!signerId) {
    throw Object.assign(new Error('NO_ADMIN_COPY_SIGNER'), {
      code: 'NO_ADMIN_COPY_SIGNER',
    });
  }

  const approverId = await getDesignatedApproverUserIdForRequester(args.userId);
  const subApproverId = await getDesignatedSubApproverUserIdForRequester(
    args.userId
  );

  return {
    approvalStatus: 'pending_admin_copy_signature',
    adminCopySignerId: signerId,
    adminCopyCopyType: copyType,
    ownerApproverId: approverId,
    ownerSubApproverId: subApproverId,
  };
}

/**
 * Send the next-step notification after a form is created. When the form is
 * in `pending_admin_copy_signature`, notify the IT/Admin copy signer. When in
 * `pending_approval` (clearance), notify the owner's approver. When
 * `approved`, notify the new asset owner.
 */
async function sendApprovalKickoffNotifications(args: {
  formId: string;
  formNumber: string;
  ownerUserId: string;
  ownerName: string;
  assignerName: string;
  approvalStatus: 'pending_admin_copy_signature' | 'pending_approval' | 'approved';
  adminCopySignerId: string | null;
  adminCopyCopyType: AdminCopyCopyType | null;
  ownerApproverId: string | null;
  ownerSubApproverId: string | null;
  req: AuthRequest;
}): Promise<void> {
  const { req } = args;
  if (args.approvalStatus === 'pending_admin_copy_signature' && args.adminCopySignerId) {
    await notifyUser({
      userId: args.adminCopySignerId,
      title: `Accountability form ${args.formNumber} needs ${args.adminCopyCopyType ?? 'IT'} copy signature`,
      message: `Please sign the ${args.adminCopyCopyType ?? 'IT'} copy for ${args.ownerName}'s accountability form (${args.formNumber}).`,
      type: 'accountability_form',
      data: {
        route: '/approvals?tab=for-approval',
        actionTarget: 'accountability_form_admin_copy',
        formId: args.formId,
        formNumber: args.formNumber,
        copyType: args.adminCopyCopyType,
      },
      createdBy: req.user!.userID,
      req,
    });
    return;
  }
  if (args.approvalStatus === 'pending_approval') {
    const recipients = [
      args.ownerApproverId,
      args.ownerSubApproverId,
    ].filter((id): id is string => !!id && id !== args.ownerUserId);
    for (const approverId of recipients) {
      await notifyUser({
        userId: approverId,
        title: `Accountability form ${args.formNumber} needs your approval`,
        message: `Please review and approve the accountability form for ${args.ownerName} (${args.formNumber}).`,
        type: 'accountability_form',
        data: {
          route: '/approvals?tab=for-approval',
          actionTarget: 'accountability_form_approval',
          formId: args.formId,
          formNumber: args.formNumber,
        },
        createdBy: req.user!.userID,
        req,
      });
    }
    return;
  }
  // 'approved' or fallback - notify the new asset owner.
  const ownerPayload = buildOwnerReadyNotification({
    ownerUserId: args.ownerUserId,
    formNumber: args.formNumber,
    formId: args.formId,
    assignerName: args.assignerName,
  });
  try {
    await NotificationService.createNotification(
      {
        user_id: ownerPayload.user_id,
        title: ownerPayload.title,
        message: ownerPayload.message,
        type: ownerPayload.type as
          | 'asset_assignment'
          | 'accountability_form'
          | 'system'
          | 'reminder'
          | 'user_lockout',
        status: 'unread',
        data: ownerPayload.data,
      },
      req.user!.userID,
      req.ip,
      req.get('User-Agent')
    );
    const io = getIoInstance();
    if (!io) {
      logger.error('[NOTIFICATION] Socket.IO instance not available');
    } else {
      emitNotification(io, args.ownerUserId, 'notification', {
        title: ownerPayload.title,
        description: ownerPayload.message,
        type: ownerPayload.type,
        route: '/profile?tab=documents',
        actionTarget: 'profile_documents',
        formId: args.formId,
        formNumber: args.formNumber,
        assignedBy: args.assignerName,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    logger.error('Failed to send owner notification:', err);
  }
}

/**
 * Kick off the approval-flow notifications for a form that was created with
 * `skipNotification: true` (asset assignment / asset transfer / builder
 * flows create forms via an internal handler call and send their own
 * owner-facing notices after approval). This re-reads the persisted form,
 * and when it is still pending an IT/Admin copy signature or pending
 * approval, notifies the copy signer / owner's approver exactly like the
 * direct-creation path would have. No-op for already-approved forms and
 * never throws so callers can fire-and-forget.
 */
export async function kickoffApprovalFlowNotifications(args: {
  formId: string;
  formNumber: string;
  ownerUserId: string;
  ownerName: string;
  assignerName: string;
  req: AuthRequest;
}): Promise<void> {
  try {
    const [rows] = await pool.execute(
      `SELECT approval_status, admin_copy_signer_id, admin_copy_copy_type
       FROM accountability_forms
       WHERE formID = ? AND deleted_at IS NULL
       LIMIT 1`,
      [args.formId]
    );
    const row = (rows as any[])[0];
    if (!row) {
      logger.warn(
        `kickoffApprovalFlowNotifications: form ${args.formId} not found`
      );
      return;
    }

    const approvalStatus = row.approval_status ?? null;
    if (
      !approvalStatus ||
      approvalStatus === 'approved' ||
      (!row.admin_copy_signer_id && approvalStatus !== 'pending_approval')
    ) {
      // Nothing pending that requires a kickoff notification.
      return;
    }

    const ownerApproverId = await getDesignatedApproverUserIdForRequester(
      args.ownerUserId
    );
    const ownerSubApproverId = await getDesignatedSubApproverUserIdForRequester(
      args.ownerUserId
    );

    await sendApprovalKickoffNotifications({
      formId: args.formId,
      formNumber: args.formNumber,
      ownerUserId: args.ownerUserId,
      ownerName: args.ownerName,
      assignerName: args.assignerName,
      approvalStatus,
      adminCopySignerId: row.admin_copy_signer_id ?? null,
      adminCopyCopyType: row.admin_copy_copy_type ?? null,
      ownerApproverId,
      ownerSubApproverId,
      req: args.req,
    });
  } catch (err) {
    logger.error(
      `kickoffApprovalFlowNotifications failed for form ${args.formId}:`,
      err
    );
  }
}

export async function createAccountabilityFormHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      assignmentId,
      assetId,
      userId,
      departmentId,
      locationId,
      assets,
      assignmentIds,
      signAsIssuer,
      issuerSignature,
      signITCopy,
      itCopySignature,
      adminCopySignerId,
      adminCopyCopyType: adminCopyCopyTypeBody,
      adminCopySigner: adminCopySignerBody,
      formOrigin: formOriginBody,
      form_origin: formOriginSnake,
      clearanceScope: clearanceScopeBody,
      clearance_scope: clearanceScopeSnake,
      clearanceReason: clearanceReasonBody,
      clearance_reason: clearanceReasonSnake,
      referenceDisabledFormNumbers,
      reference_disabled_form_numbers: referenceDisabledFormNumbersSnake,
      clearedAt,
      cleared_at: clearedAtSnake,
      previousFormId,
      previousFormOriginalStatus,
      skipNotification,
    } = req.body;
    const formOriginRaw = formOriginBody ?? formOriginSnake;
    const formOriginStored: AccountabilityFormOrigin | undefined =
      formOriginRaw === 'processor_return'
        ? 'processor_return'
        : formOriginRaw === 'clearance'
          ? 'clearance'
          : undefined;
    const clearanceScopeRaw =
      (formOriginStored === 'clearance'
        ? (clearanceScopeBody ?? clearanceScopeSnake)
        : undefined) ?? null;
    const clearanceScopeStored: ClearanceScope | undefined =
      clearanceScopeRaw === 'IT' || clearanceScopeRaw === 'Admin'
        ? (clearanceScopeRaw as ClearanceScope)
        : undefined;
    const clearanceReasonRaw =
      (formOriginStored === 'clearance'
        ? (clearanceReasonBody ?? clearanceReasonSnake)
        : undefined) ?? null;
    const clearanceReasonStored: ClearanceReason | undefined =
      clearanceReasonRaw === 'return' || clearanceReasonRaw === 'transfer'
        ? (clearanceReasonRaw as ClearanceReason)
        : undefined;
    const referenceDisabledFormNumbersStored: string[] | undefined = (() => {
      if (formOriginStored !== 'clearance') return undefined;
      const raw =
        referenceDisabledFormNumbers ?? referenceDisabledFormNumbersSnake;
      if (!Array.isArray(raw)) return undefined;
      return raw
        .map((v: unknown) => String(v ?? '').trim())
        .filter(Boolean);
    })();
    const clearedAtRaw =
      formOriginStored === 'clearance' ? (clearedAt ?? clearedAtSnake) : null;
    const clearedAtStored: string | undefined =
      typeof clearedAtRaw === 'string' && clearedAtRaw.trim() !== ''
        ? clearedAtRaw
        : new Date().toISOString();
    const createdBy = req.user!.userID;

    // Handle clearance certificates (unified) - owner self-service via createClearanceHandler
    // This legacy direct path is retained for backwards compat but now requires Unified scope
    if (formOriginStored === 'clearance') {
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      // Allow Unified or legacy IT/Admin for backward compat; normalize to Unified
      const effectiveClearanceScope: ClearanceScope = (clearanceScopeStored as ClearanceScope) ?? 'Unified';
      // re-assign for downstream usage
      (clearanceScopeStored as any) = effectiveClearanceScope;

      const userDetails = await repo.getUserCompanyAndName(userId);
      let companyId: string | null =
        (departmentId && (await repo.getCompanyIdByDepartmentId(departmentId))) ||
        null;
      if (!companyId) {
        companyId = userDetails?.company_id ?? null;
      }
      if (!companyId) {
        return res.status(400).json({
          error: 'Could not determine company for clearance creation',
        });
      }

      let formNumber = '';
      let attempts = 0;
      const maxAttempts = 5;
      let resolvedApprovalParams: Awaited<ReturnType<typeof resolveApprovalParams>> = null;
      while (attempts < maxAttempts) {
        try {
          formNumber = await generateFormNumber(
            companyId,
            [],
            departmentId ?? null,
            {
              origin: 'clearance',
              clearanceScope: clearanceScopeStored,
            }
          );

          const assetsDataPayload: Record<string, unknown> = {
            assets: [],
            form_origin: 'clearance',
            clearance_scope: clearanceScopeStored,
            clearance_reason: clearanceReasonStored ?? 'return',
            reference_disabled_form_numbers:
              referenceDisabledFormNumbersStored ?? [],
            cleared_at: clearedAtStored,
          };

          // Resolve approval parameters for the clearance form.
          try {
            resolvedApprovalParams = await resolveApprovalParams({
              userId,
              assetsForScope: [],
              formOrigin: 'clearance',
              clearanceScope: clearanceScopeStored,
              adminCopySignerIdRaw: adminCopySignerId,
              adminCopyCopyTypeRaw: adminCopyCopyTypeBody,
            });
          } catch (approvalErr: any) {
            if (approvalErr?.code === 'NO_ADMIN_COPY_SIGNER') {
              return res.status(400).json({
                error: `No designated approver/sub-approver found for this user; cannot create clearance that requires approval`,
              });
            }
            throw approvalErr;
          }

          await repo.insertAccountabilityFormMulti({
            formNumber,
            userId,
            departmentId: departmentId || null,
            locationId: locationId || null,
            createdBy,
            assetsDataJson: JSON.stringify(assetsDataPayload),
            issuerSignature: issuerSignature || null,
            itCopySignature: itCopySignature || null,
            assignmentId: null,
            approvalStatus: resolvedApprovalParams?.approvalStatus ?? 'approved',
            adminCopySignerId: resolvedApprovalParams?.adminCopySignerId ?? null,
            adminCopyCopyType: resolvedApprovalParams?.adminCopyCopyType ?? null,
          });
          break;
        } catch (error: any) {
          attempts++;
          if (error.code === 'ER_DUP_ENTRY' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100 * attempts));
            continue;
          }
          throw error;
        }
      }

      const resolvedFormId = await getFormIdByFormNumber(formNumber);
      if (!resolvedFormId) {
        logger.error(
          'Could not resolve formID after clearance insert',
          { formNumber }
        );
        return res.status(500).json({
          error: 'Failed to create clearance certificate',
        });
      }

      const userName =
        `${userDetails?.first_name || ''} ${userDetails?.last_name || ''}`.trim();
      await createAuditLog({
        userId: createdBy,
        action: 'Created Clearance Certificate',
        resourceType: 'accountability_form',
        resourceId: resolvedFormId,
        resourceName: formNumber,
        details: `Clearance certificate ${formNumber} (${clearanceScopeStored}) created for ${userName} (${referenceDisabledFormNumbersStored?.join(', ') || 'no reference forms'})`,
        newValues: {
          form_number: formNumber,
          user_id: userId,
          clearance_scope: clearanceScopeStored,
          clearance_reason: clearanceReasonStored ?? 'return',
          reference_disabled_form_numbers:
            referenceDisabledFormNumbersStored ?? [],
        },
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });

      if (!skipNotification) {
        try {
          const createdByRow = await repo.getUserNameById(createdBy);
          const assignerName = createdByRow
            ? `${createdByRow.first_name ?? ''} ${createdByRow.last_name ?? ''}`.trim() ||
              createdBy
            : createdBy;

          if (resolvedApprovalParams && resolvedApprovalParams.approvalStatus !== 'approved') {
            // Defer the user-facing notification; kick off the approval flow.
            await sendApprovalKickoffNotifications({
              formId: resolvedFormId,
              formNumber,
              ownerUserId: userId,
              ownerName: userName,
              assignerName,
              approvalStatus: resolvedApprovalParams.approvalStatus,
              adminCopySignerId: resolvedApprovalParams.adminCopySignerId,
              adminCopyCopyType: resolvedApprovalParams.adminCopyCopyType,
              ownerApproverId: resolvedApprovalParams.ownerApproverId,
              ownerSubApproverId: resolvedApprovalParams.ownerSubApproverId,
              req,
            });
          } else {
            // Legacy path: directly notify the new asset owner.
            await NotificationService.createNotification(
              {
                user_id: userId,
                title: 'Asset clearance certificate issued',
                message: `by ${assignerName}. You are now cleared of all ${clearanceScopeStored} asset accountabilities. Download your clearance from your profile.`,
                type: 'accountability_form',
                status: 'unread',
                data: JSON.stringify({
                  description: `by ${assignerName}. You are now cleared of all ${clearanceScopeStored} asset accountabilities. Download your clearance from your profile.`,
                  route: '/profile?tab=documents',
                  actionTarget: 'profile_documents',
                  formId: resolvedFormId,
                  formNumber: formNumber,
                  assignedBy: assignerName,
                  clearanceScope: clearanceScopeStored,
                  timestamp: new Date().toISOString(),
                }),
              },
              createdBy,
              req.ip,
              req.get('User-Agent')
            );

            const io = getIoInstance();
            if (!io) {
              logger.error('[NOTIFICATION] Socket.IO instance not available');
            } else {
              emitNotification(io, userId, 'notification', {
                title: 'Asset clearance certificate issued',
                description: `by ${assignerName}. You are now cleared of all ${clearanceScopeStored} asset accountabilities. Download your clearance from your profile.`,
                type: 'accountability_form',
                route: '/profile?tab=documents',
                actionTarget: 'profile_documents',
                formId: resolvedFormId,
                formNumber: formNumber,
                assignedBy: assignerName,
                clearanceScope: clearanceScopeStored,
                timestamp: new Date().toISOString(),
              });
            }
          }
        } catch (socketError) {
          logger.error('Failed to send clearance notification:', socketError);
        }
      }

      return res.status(201).json({
        message: 'Clearance certificate created successfully',
        form: {
          formID: resolvedFormId,
          form_number: formNumber,
          user_id: userId,
          department_id: departmentId ?? null,
          location_id: locationId ?? null,
          status: 'Pending',
          approvalStatus: resolvedApprovalParams?.approvalStatus ?? 'approved',
          created_at: new Date(),
          created_by: createdBy,
          formOrigin: 'clearance',
          clearanceScope: clearanceScopeStored,
          clearanceReason: clearanceReasonStored ?? 'return',
          assets: [],
        },
      });
    }

    // Handle builder forms (multiple assets)
    if (assets && Array.isArray(assets) && assets.length > 0) {
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Merge the user's currently-active intangible asset assignments so every
      // generated accountability form lists all of the user's held assets.
      if (departmentId) {
        try {
          const activeIntangibles =
            await repo.getActiveIntangibleAssetsByUserAndDepartment(
              userId,
              departmentId
            );
          if (activeIntangibles.length > 0) {
            const seenIds = new Set(
              assets
                .map((a: any) => String(a?.id ?? a?.assetID ?? '').trim())
                .filter(Boolean)
            );
            for (const row of activeIntangibles) {
              const id = String(row.id ?? '').trim();
              if (!id || seenIds.has(id)) continue;
              seenIds.add(id);
              assets.push({
                id,
                code: row.name || id,
                name: row.name || '',
                description: row.description || '',
                category: 'Intangible',
                type: row.type || 'Intangible',
                department: row.department_name,
                serialNo: '',
                modelNo: '',
                brand: '',
              });
            }
          }
        } catch (mergeErr) {
          logger.error(
            'Failed to merge intangible assets into accountability form:',
            mergeErr
          );
        }
      }

      // Get company ID and user details from department or user
      let companyId: string | null = null;
      if (departmentId) {
        companyId = await repo.getCompanyIdByDepartmentId(departmentId);
      }
      const userDetails = await repo.getUserCompanyAndName(userId);
      if (!companyId) {
        companyId = userDetails?.company_id ?? null;
      }

      if (!companyId) {
        return res
          .status(400)
          .json({ error: 'Could not determine company for form creation' });
      }

      // Generate form number based on settings
      let formNumber: string = '';
      let attempts = 0;
      const maxAttempts = 5;
      let multiResolvedApproval: Awaited<ReturnType<typeof resolveApprovalParams>> = null;

      while (attempts < maxAttempts) {
        try {
          formNumber = await generateFormNumber(
            companyId,
            assets,
            departmentId
          );

          const assetsDataPayload: Record<string, unknown> = { assets };
          if (formOriginStored) {
            assetsDataPayload.form_origin = formOriginStored;
          }
          if (previousFormId) {
            assetsDataPayload.previous_form_id = previousFormId;
          }
          if (previousFormOriginalStatus) {
            assetsDataPayload.previous_form_original_status = previousFormOriginalStatus;
          }
          if (Array.isArray(assignmentIds) && assignmentIds.length > 0) {
            assetsDataPayload.assignment_ids = assignmentIds;
          }

          // Determine which assignment_id to use for the accountability form
          // Prioritize the assignment that matches a computer-type asset (same logic as frontend)
          let selectedAssignmentId: string | null = null;
          if (Array.isArray(assignmentIds) && assignmentIds.length > 0) {
            if (assets && Array.isArray(assets)) {
              // Query the assignments to find which one has a computer-type asset
              const assignmentsQuery = `
                SELECT aa.assignmentID, a.category_id, a.type_id, ac.name as category_name, at.name as type_name
                FROM asset_assignments aa
                LEFT JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
                LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
                LEFT JOIN asset_types at ON a.type_id = at.typeID
                WHERE aa.assignmentID IN (${assignmentIds.map(() => '?').join(',')})
                AND aa.deleted_at IS NULL
              `;
              const [assignmentRows] = await pool.execute(assignmentsQuery, assignmentIds);

              // Find the assignment with a computer-type asset
              const computerAssignment = (assignmentRows as any[]).find((row: any) => {
                const type = (row.type_name || '').toLowerCase();
                return type.includes('computer') ||
                       type.includes('laptop') ||
                       type.includes('server');
              });

              if (computerAssignment) {
                selectedAssignmentId = computerAssignment.assignmentID;
              }
            }

            // Fall back to first assignment_id if no computer asset found
            if (!selectedAssignmentId) {
              selectedAssignmentId = assignmentIds[0];
            }
          }

          // Resolve approval parameters for the form. If the form has an
          // IT/Admin copy column and no admin copy signer is provided, this
          // throws to surface a 400 response. The legacy `signITCopy` flag
          // falls back to the issuer auto-signing (no copy signer required).
          try {
            if (adminCopySignerId || adminCopyCopyTypeBody) {
              multiResolvedApproval = await resolveApprovalParams({
                userId,
                assetsForScope: assets,
                formOrigin: formOriginStored,
                clearanceScope: clearanceScopeStored,
                adminCopySignerIdRaw: adminCopySignerId,
                adminCopyCopyTypeRaw: adminCopyCopyTypeBody ?? adminCopySignerBody,
              });
            } else {
              multiResolvedApproval = null;
            }
          } catch (approvalErr: any) {
            if (approvalErr?.code === 'NO_ADMIN_COPY_SIGNER') {
              return res.status(400).json({
                error: 'No designated approver/sub-approver found for this user; an IT/Admin copy signer must be selected for this form',
              });
            }
            throw approvalErr;
          }

          // Create accountability form with assets stored in separate column
          await repo.insertAccountabilityFormMulti({
            formNumber,
            userId,
            departmentId: departmentId || null,
            locationId: locationId || null,
            createdBy,
            assetsDataJson: JSON.stringify(assetsDataPayload),
            issuerSignature: issuerSignature || null,
            itCopySignature: itCopySignature || null,
            assignmentId: selectedAssignmentId,
            approvalStatus: multiResolvedApproval?.approvalStatus ?? 'approved',
            adminCopySignerId: multiResolvedApproval?.adminCopySignerId ?? null,
            adminCopyCopyType: multiResolvedApproval?.adminCopyCopyType ?? null,
          });

          break; // Success, exit retry loop
        } catch (error: any) {
          attempts++;
          if (error.code === 'ER_DUP_ENTRY' && attempts < maxAttempts) {
            // If duplicate entry error, wait a bit and retry
            await new Promise(resolve => setTimeout(resolve, 100 * attempts));
            continue;
          }
          throw error; // Re-throw if not a duplicate entry or max attempts reached
        }
      }

      const resolvedFormId = await getFormIdByFormNumber(formNumber);
      if (!resolvedFormId) {
        logger.error(
          'Could not resolve formID after accountability form insert (multi-asset)',
          { formNumber }
        );
        return res.status(500).json({
          error: 'Failed to create accountability form',
        });
      }

      // Create audit log
      const userName =
        `${userDetails?.first_name || ''} ${userDetails?.last_name || ''}`.trim();
      await createAuditLog({
        userId: createdBy,
        action: 'Created Accountability Form',
        resourceType: 'accountability_form',
        resourceId: resolvedFormId,
        resourceName: formNumber,
        details: `Accountability form ${formNumber} created for ${userName} with ${assets.length} assets`,
        newValues: {
          form_number: formNumber,
          user_id: userId,
          assets: assets,
        },
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });

      // Emit WebSocket notification to the form user
      if (!skipNotification) {
        try {
          const createdByRow = await repo.getUserNameById(createdBy);
          const assignerName = createdByRow
            ? `${createdByRow.first_name ?? ''} ${createdByRow.last_name ?? ''}`.trim() || createdBy
            : createdBy;

          if (multiResolvedApproval && multiResolvedApproval.approvalStatus !== 'approved') {
            // Defer the user-facing notification; kick off the approval flow.
            await sendApprovalKickoffNotifications({
              formId: resolvedFormId,
              formNumber,
              ownerUserId: userId,
              ownerName: userName,
              assignerName,
              approvalStatus: multiResolvedApproval.approvalStatus,
              adminCopySignerId: multiResolvedApproval.adminCopySignerId,
              adminCopyCopyType: multiResolvedApproval.adminCopyCopyType,
              ownerApproverId: multiResolvedApproval.ownerApproverId,
              ownerSubApproverId: multiResolvedApproval.ownerSubApproverId,
              req,
            });
          } else {
            // Legacy path: directly notify the new asset owner.
            // Create database notification entry
            await NotificationService.createNotification(
              {
                user_id: userId,
                title: 'New accountability form has been issued',
                message: `by ${assignerName}. Review it and check your assets and sign the form`,
                type: 'accountability_form',
                status: 'unread',
                data: JSON.stringify({
                  description: `by ${assignerName}. Review it and check your assets and sign the form`,
                  route: '/profile?tab=documents',
                  actionTarget: 'profile_documents',
                  formId: resolvedFormId,
                  formNumber: formNumber,
                  assignedBy: assignerName,
                  timestamp: new Date().toISOString(),
                }),
              },
              createdBy,
              req.ip,
              req.get('User-Agent')
            );

            const io = getIoInstance();
            if (!io) {
              logger.error('[NOTIFICATION] Socket.IO instance not available');
            } else {
              emitNotification(io, userId, 'notification', {
                title: 'New accountability form has been issued',
                description: `by ${assignerName}. Review it and check your assets and sign the form`,
                type: 'accountability_form',
                route: '/profile?tab=documents',
                actionTarget: 'profile_documents',
                formId: resolvedFormId,
                formNumber: formNumber,
                assignedBy: assignerName,
                timestamp: new Date().toISOString(),
              });
            }
          }
        } catch (socketError) {
          logger.error('Failed to send WebSocket notification:', socketError);
          // Don't fail the form creation if notification fails
        }
      }

      return res.status(201).json({
        message: 'Accountability form created successfully',
        form: {
          formID: resolvedFormId,
          form_number: formNumber,
          user_id: userId,
          department_id: departmentId,
          location_id: locationId,
          status: 'Pending',
          approvalStatus: multiResolvedApproval?.approvalStatus ?? 'approved',
          created_at: new Date(),
          created_by: createdBy,
          assets: assets,
        },
      });
    }

    // Handle single asset forms
    if (!assignmentId || !assetId || !userId) {
      return res
        .status(400)
        .json({ error: 'Assignment ID, Asset ID, and User ID are required' });
    }

    // Validate that assignment exists and is active
    const assignment = await repo.getAssignmentForFormCheck(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    if (assignment.status !== 'Active') {
      return res.status(400).json({
        error: 'Accountability form can only be created for active assignments',
      });
    }

    // Check if form already exists for this assignment
    const existingFormId = await repo.findFormIdByAssignmentId(assignmentId);
    if (existingFormId) {
      return res.status(400).json({
        error: 'Accountability form already exists for this assignment',
      });
    }

    // Get company ID, user details, and asset info
    let companyId: string | null = null;
    if (departmentId) {
      companyId = await repo.getCompanyIdByDepartmentId(departmentId);
    }
    const userDetails = await repo.getUserCompanyAndName(userId);
    if (!companyId) {
      companyId = userDetails?.company_id ?? null;
    }

    // Get asset information (including category's department for IT/Admin form number)
    const assetInfo = await repo.getAssetForFormCreation(assetId);

    if (!companyId) {
      return res
        .status(400)
        .json({ error: 'Could not determine company for form creation' });
    }

    // Generate form number based on settings
    let formNumber: string = '';
    let attempts = 0;
    const maxAttempts = 5;
    let singleResolvedApproval: Awaited<ReturnType<typeof resolveApprovalParams>> = null;
    const assetScopeArray = assetInfo
      ? [
          {
            category: assetInfo.category_name,
            type: assetInfo.type_name,
            department: assetInfo.department_name,
          },
        ]
      : [];

    while (attempts < maxAttempts) {
      try {
        formNumber = await generateFormNumber(
          companyId,
          assetScopeArray,
          departmentId
        );

        // Resolve approval parameters for the form. If the form has an
        // IT/Admin copy column and no admin copy signer is provided, this
        // throws to surface a 400 response.
        try {
          if (adminCopySignerId || adminCopyCopyTypeBody) {
            singleResolvedApproval = await resolveApprovalParams({
              userId,
              assetsForScope: assetScopeArray,
              formOrigin: formOriginStored,
              clearanceScope: clearanceScopeStored,
              adminCopySignerIdRaw: adminCopySignerId,
              adminCopyCopyTypeRaw: adminCopyCopyTypeBody ?? adminCopySignerBody,
            });
          } else {
            singleResolvedApproval = null;
          }
        } catch (approvalErr: any) {
          if (approvalErr?.code === 'NO_ADMIN_COPY_SIGNER') {
            return res.status(400).json({
              error: 'No designated approver/sub-approver found for this user; an IT/Admin copy signer must be selected for this form',
            });
          }
          throw approvalErr;
        }

        // Create accountability form
        await repo.insertAccountabilityFormSingle({
          formNumber,
          assignmentId,
          assetId,
          userId,
          departmentId: departmentId || null,
          locationId: locationId || null,
          createdBy,
          issuerSignature: issuerSignature || null,
          itCopySignature: itCopySignature || null,
          approvalStatus: singleResolvedApproval?.approvalStatus ?? 'approved',
          adminCopySignerId: singleResolvedApproval?.adminCopySignerId ?? null,
          adminCopyCopyType: singleResolvedApproval?.adminCopyCopyType ?? null,
        });

        break; // Success, exit retry loop
      } catch (error: any) {
        attempts++;
        if (error.code === 'ER_DUP_ENTRY' && attempts < maxAttempts) {
          // If duplicate entry error, wait a bit and retry
          await new Promise(resolve => setTimeout(resolve, 100 * attempts));
          continue;
        }
        throw error; // Re-throw if not a duplicate entry or max attempts reached
      }
    }

    const resolvedFormIdSingle = await getFormIdByFormNumber(formNumber);
    if (!resolvedFormIdSingle) {
      logger.error(
        'Could not resolve formID after accountability form insert (single-asset)',
        { formNumber }
      );
      return res.status(500).json({
        error: 'Failed to create accountability form',
      });
    }

    // Create audit log
    const userName =
      `${userDetails?.first_name || ''} ${userDetails?.last_name || ''}`.trim();
    await createAuditLog({
      userId: createdBy,
      action: 'Created Accountability Form',
      resourceType: 'accountability_form',
      resourceId: resolvedFormIdSingle,
      resourceName: formNumber,
      details: `Accountability form ${formNumber} created for ${userName} with assignment ${assignmentId}`,
      newValues: {
        form_number: formNumber,
        assignment_id: assignmentId,
        asset_id: assetId,
        user_id: userId,
      },
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });

// Emit WebSocket notification to the form user
    if (!skipNotification) {
      try {
        const createdByRow = await repo.getUserNameById(createdBy);
        const assignerName = createdByRow
          ? `${createdByRow.first_name ?? ''} ${createdByRow.last_name ?? ''}`.trim() || createdBy
          : createdBy;

        if (singleResolvedApproval && singleResolvedApproval.approvalStatus !== 'approved') {
          // Defer the user-facing notification; kick off the approval flow.
          await sendApprovalKickoffNotifications({
            formId: resolvedFormIdSingle,
            formNumber,
            ownerUserId: userId,
            ownerName: userName,
            assignerName,
            approvalStatus: singleResolvedApproval.approvalStatus,
            adminCopySignerId: singleResolvedApproval.adminCopySignerId,
            adminCopyCopyType: singleResolvedApproval.adminCopyCopyType,
            ownerApproverId: singleResolvedApproval.ownerApproverId,
            ownerSubApproverId: singleResolvedApproval.ownerSubApproverId,
            req,
          });
        } else {
          // Legacy path: directly notify the new asset owner.
          // Create database notification entry
          await NotificationService.createNotification(
            {
              user_id: userId,
              title: 'New accountability form has been issued',
              message: `by ${assignerName}. Review it and check your assets and sign the form`,
              type: 'accountability_form',
              status: 'unread',
              data: JSON.stringify({
                description: `by ${assignerName}. Review it and check your assets and sign the form`,
                route: '/profile?tab=documents',
                actionTarget: 'profile_documents',
                formId: resolvedFormIdSingle,
                formNumber: formNumber,
                assignedBy: assignerName,
                timestamp: new Date().toISOString(),
              }),
            },
            createdBy,
            req.ip,
            req.get('User-Agent')
          );

          const io = getIoInstance();
          if (!io) {
            logger.error('[NOTIFICATION] Socket.IO instance not available');
          } else {
            emitNotification(io, userId, 'notification', {
              title: 'New accountability form has been issued',
              description: `by ${assignerName}. Review it and check your assets and sign the form`,
              type: 'accountability_form',
              route: '/profile?tab=documents',
              actionTarget: 'profile_documents',
              formId: resolvedFormIdSingle,
              formNumber: formNumber,
              assignedBy: assignerName,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (socketError) {
        logger.error('Failed to send WebSocket notification:', socketError);
        // Don't fail the form creation if notification fails
      }
    }

    return res.status(201).json({
      message: 'Accountability form created successfully',
      form: {
        formID: resolvedFormIdSingle,
        form_number: formNumber,
        assignment_id: assignmentId,
        asset_id: assetId,
        user_id: userId,
        department_id: departmentId,
        location_id: locationId,
        status: 'Pending',
        approvalStatus: singleResolvedApproval?.approvalStatus ?? 'approved',
        created_at: new Date(),
        created_by: createdBy,
      },
    });
  } catch (error: any) {
    logger.error('Create accountability form failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to create accountability form' });
  }
}

export async function getAccountabilityFormsByAssetIdHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { assetId } = req.params;
    if (!assetId) {
      return res.status(400).json({ error: 'Asset ID is required' });
    }

    const rows = await repo.findFormsByAssetId(assetId);

    const forms = rows.map((row: any) => {
      const parsed = parseAccountabilityAssetsData(row.assets_data);
      let assets = parsed.assets;
      const formOrigin = parsed.formOrigin;

      // If no assets from acknowledgments, use the single asset
      if (assets.length === 0 && row.asset_id) {
        assets = [
          {
            id: row.asset_id,
            code: row.asset_code,
            name: row.asset_name,
            category: row.category_name || row.category_id,
            type: row.type_name || row.type_id,
            serialNo: row.serial,
            modelNo: row.assetModelNo,
          },
        ];
      }

      return {
        id: row.formID,
        formNumber: row.form_number,
        assets: assets,
        assignmentIds: parsed.assignmentIds,
        ...(formOrigin ? { formOrigin } : {}),
        ...(parsed.clearanceScope
          ? { clearanceScope: parsed.clearanceScope }
          : {}),
        ...(parsed.clearanceReason
          ? { clearanceReason: parsed.clearanceReason }
          : {}),
        ...(parsed.referenceDisabledFormNumbers
          ? { referenceDisabledFormNumbers: parsed.referenceDisabledFormNumbers }
          : {}),
        ...(parsed.clearedAt ? { clearedAt: parsed.clearedAt } : {}),
        user: {
          id: row.user_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          employeeNumber: row.employeeNumber,
          position: row.position,
          companyLogoUrl: row.user_company_logo_url ?? null,
          company:
            row.user_company_id != null
              ? {
                  id: row.user_company_id,
                  name: row.user_company_name,
                }
              : undefined,
          department:
            row.user_department_name != null
              ? {
                  id: row.user_department_id,
                  name: row.user_department_name,
                }
              : undefined,
        },
        assignment: {
          id: row.assignment_id,
          assigned_date: row.assigned_date,
          expected_return_date: row.expected_return_date,
          assignment_notes: row.assignment_notes,
          assigned_by: row.assigned_by
            ? {
                id: row.assigned_by,
                first_name: row.assigned_by_first_name,
                last_name: row.assigned_by_last_name,
                email: row.assigned_by_email,
              }
            : null,
        },
        issuer: row.created_by
          ? {
              id: row.created_by,
              first_name: row.created_by_first_name,
              last_name: row.created_by_last_name,
              email: row.created_by_email,
            }
          : null,
        department: row.department_id
          ? {
              id: row.department_id,
              name: row.department_name,
            }
          : null,
        location: row.location_id
          ? {
              id: row.location_id,
              name: row.location_name,
              floor_unit: row.floor_unit,
              building: row.building,
              room_name: row.room_name,
            }
          : null,
        status: row.status,
        approvalStatus: row.approval_status ?? 'approved',
        adminCopySignerId: row.admin_copy_signer_id ?? null,
        adminCopySignerName:
          row.admin_copy_signer_first_name != null ||
          row.admin_copy_signer_last_name != null
            ? `${row.admin_copy_signer_first_name || ''} ${row.admin_copy_signer_last_name || ''}`.trim() ||
              null
            : null,
        adminCopySignature: row.admin_copy_signature ?? null,
        adminCopyCopyType: row.admin_copy_copy_type ?? null,
        adminCopySignedAt: row.admin_copy_signed_at ?? null,
        approvedBy: row.approved_by ?? null,
        approvedAt: row.approved_at ?? null,
        approvalNotes: row.approval_notes ?? null,
        ...mapDeptHeadFields(row),
        ...mapClearanceStageSigners(row),
        declineReason: row.decline_reason ?? null,
        acknowledgments: parseMysqlJsonColumn(row.acknowledgments),
        issuerSignature: row.issuer_signature,
        itCopySignature: row.it_copy_signature,
        receivedCopy201FileSignature:
          row.received_copy_201_file_signature ?? null,
        receivedCopy201FileSignedAt:
          row.received_copy_201_file_signed_at ?? null,
        receivedCopy201FileSignedById:
          row.received_copy_201_file_signed_by ?? null,
        receivedCopy201FileSignedByName:
          (row.received_copy_201_file_signed_by_name &&
            String(row.received_copy_201_file_signed_by_name).trim()) ||
          (row.received_copy_signer_first_name != null ||
          row.received_copy_signer_last_name != null
            ? `${row.received_copy_signer_first_name || ''} ${row.received_copy_signer_last_name || ''}`.trim() ||
              null
            : null),
        signed_at: row.signed_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    return res.json({ forms });
  } catch (error: any) {
    logger.error('Get accountability forms by asset id failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch accountability forms' });
  }
}

export async function getAccountabilityFormsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { userId, status } = req.query;

    // Scope list by company and by the user's IT/Admin department scope.
    // HR accountability receivers are exempt so they can keep handling
    // 201-file copies across companies (client drives the company filter).
    const scope = await getAssetScope(pool, req.user!.userID);
    const isHrReceiver = await userHasHrAccountabilityReceiverAccess(
      req.user!.userID
    );
    const companyId = isHrReceiver ? undefined : (scope.companyId ?? undefined);
    // IT/Admin department scope applies to the general listing only; a
    // specific userId query (documents tab, return flow) stays company-scoped
    // so an employee's own forms are never hidden by their asset scope.
    const departmentIds =
      isHrReceiver || typeof userId === 'string'
        ? undefined
        : scope.departmentIds?.length
          ? scope.departmentIds
          : undefined;

    const rows = await repo.listAccountabilityForms({
      userId: typeof userId === 'string' ? userId : undefined,
      status: typeof status === 'string' ? status : undefined,
      companyId,
      departmentIds,
    });

    const allForms = rows.map((row: any) => {
      const parsed = parseAccountabilityAssetsData(row.assets_data);
      let assets = parsed.assets;
      const formOrigin = parsed.formOrigin;

      // If no assets from acknowledgments, use the single asset
      if (assets.length === 0 && row.asset_id) {
        assets = [
          {
            id: row.asset_id,
            code: row.asset_code,
            name: row.asset_name,
            category: row.category_name || row.category_id,
            type: row.type_name || row.type_id,
            serialNo: row.serial,
            modelNo: row.assetModelNo,
          },
        ];
      }

      return {
        id: row.formID,
        formNumber: row.form_number,
        assets: assets,
        assignmentIds: parsed.assignmentIds,
        ...(formOrigin ? { formOrigin } : {}),
        ...(parsed.clearanceScope
          ? { clearanceScope: parsed.clearanceScope }
          : {}),
        ...(parsed.clearanceReason
          ? { clearanceReason: parsed.clearanceReason }
          : {}),
        ...(parsed.referenceDisabledFormNumbers
          ? { referenceDisabledFormNumbers: parsed.referenceDisabledFormNumbers }
          : {}),
        ...(parsed.clearedAt ? { clearedAt: parsed.clearedAt } : {}),
        user: {
          id: row.user_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          employeeNumber: row.employeeNumber,
          position: row.position,
          companyLogoUrl: row.user_company_logo_url ?? null,
          company:
            row.user_company_id != null
              ? {
                  id: row.user_company_id,
                  name: row.user_company_name,
                }
              : undefined,
          department:
            row.user_department_name != null
              ? {
                  id: row.user_department_id,
                  name: row.user_department_name,
                }
              : undefined,
        },
        assignment: {
          id: row.assignment_id,
          assigned_date: row.assigned_date,
          expected_return_date: row.expected_return_date,
          assignment_notes: row.assignment_notes,
          assigned_by: row.assigned_by
            ? {
                id: row.assigned_by,
                first_name: row.assigned_by_first_name,
                last_name: row.assigned_by_last_name,
                email: row.assigned_by_email,
              }
            : null,
        },
        issuer: row.created_by
          ? {
              id: row.created_by,
              first_name: row.created_by_first_name,
              last_name: row.created_by_last_name,
              email: row.created_by_email,
            }
          : null,
        department: row.department_id
          ? {
              id: row.department_id,
              name: row.department_name,
            }
          : null,
        location: row.location_id
          ? {
              id: row.location_id,
              name: row.location_name,
              floor_unit: row.floor_unit,
              building: row.building,
              room_name: row.room_name,
            }
          : null,
        status: row.status,
        approvalStatus: row.approval_status ?? 'approved',
        adminCopySignerId: row.admin_copy_signer_id ?? null,
        adminCopySignerName:
          row.admin_copy_signer_first_name != null ||
          row.admin_copy_signer_last_name != null
            ? `${row.admin_copy_signer_first_name || ''} ${row.admin_copy_signer_last_name || ''}`.trim() ||
              null
            : null,
        adminCopySignature: row.admin_copy_signature ?? null,
        adminCopyCopyType: row.admin_copy_copy_type ?? null,
        adminCopySignedAt: row.admin_copy_signed_at ?? null,
        approvedBy: row.approved_by ?? null,
        approvedAt: row.approved_at ?? null,
        approvalNotes: row.approval_notes ?? null,
        ...mapDeptHeadFields(row),
        ...mapClearanceStageSigners(row),
        declineReason: row.decline_reason ?? null,
        acknowledgments: parseMysqlJsonColumn(row.acknowledgments),
        issuerSignature: row.issuer_signature,
        itCopySignature: row.it_copy_signature,
        receivedCopy201FileSignature:
          row.received_copy_201_file_signature ?? null,
        receivedCopy201FileSignedAt:
          row.received_copy_201_file_signed_at ?? null,
        receivedCopy201FileSignedById:
          row.received_copy_201_file_signed_by ?? null,
        receivedCopy201FileSignedByName:
          (row.received_copy_201_file_signed_by_name &&
            String(row.received_copy_201_file_signed_by_name).trim()) ||
          (row.received_copy_signer_first_name != null ||
          row.received_copy_signer_last_name != null
            ? `${row.received_copy_signer_first_name || ''} ${row.received_copy_signer_last_name || ''}`.trim() ||
              null
            : null),
        signed_at: row.signed_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    // When fetching forms for a specific user (documents tab), hide forms
    // that are still pending IT/Admin copy signature or final approval.
    // These forms appear on the Approvals page for the designated signers.
    const forms = typeof userId === 'string'
      ? allForms.filter((form: any) =>
          form.approvalStatus !== 'pending_admin_copy_signature' &&
          form.approvalStatus !== 'pending_approval'
        )
      : allForms;

    return res.json({ forms });
  } catch (error: any) {
    logger.error('Get accountability forms failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch accountability forms' });
  }
}

export async function signAccountabilityFormHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const { acknowledgments } = req.body;
    const userId = req.user!.userID;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    // Get form details
    const form = await repo.getFormById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Accountability form not found' });
    }

    // Check if user can sign this form (only the assigned user)
    if (form.user_id !== userId) {
      return res
        .status(403)
        .json({ error: 'You can only sign forms assigned to you' });
    }

    if (form.status !== 'Pending') {
      return res.status(400).json({ error: 'Form is not in pending status' });
    }

    // Standard approval flow: the owner cannot sign until the IT/Admin copy
    // has been signed.
    if (form.approval_status === 'pending_admin_copy_signature') {
      return res.status(400).json({
        error: 'The IT/Admin copy must be signed before you can sign this form',
      });
    }

    // Get existing acknowledgments to preserve issuer signature
    const parsedExisting = parseMysqlJsonColumn<Record<string, unknown>>(
      form.acknowledgments
    );
    const existingAcknowledgments =
      parsedExisting &&
      typeof parsedExisting === 'object' &&
      !Array.isArray(parsedExisting)
        ? parsedExisting
        : {};

    const updatedAcknowledgments = {
      ...existingAcknowledgments,
      ...acknowledgments,
    } as Record<string, unknown>;

    const digitalSignature = await resolveSigningDigitalSignature(
      userId,
      typeof updatedAcknowledgments.digitalSignature === 'string'
        ? updatedAcknowledgments.digitalSignature
        : null
    );

    // Persist the resolved signature so the stored acknowledgments always
    // contain it, even when the client omits it from the request body.
    if (digitalSignature) {
      updatedAcknowledgments.digitalSignature = digitalSignature;
    }

    // Sign linked asset checklists before marking the accountability form signed
    try {
      await signLinkedChecklistsForAccountabilityForm({
        formId,
        formNumber: form.form_number ?? null,
        assetsDataRaw: form.assets_data,
        fallbackAssignmentId: form.assignment_id,
        userId: form.user_id,
        employeeId: userId,
        digitalSignature,
        req,
      });
    } catch (checklistSignError) {
      logger.error(
        'Failed to auto-sign linked checklists during accountability sign:',
        checklistSignError
      );
      return res.status(500).json({
        error:
          'Failed to sign linked asset checklists. Accountability form was not signed.',
      });
    }

    // Update form with signature
    await repo.updateFormSigned(
      formId,
      JSON.stringify(updatedAcknowledgments),
      req.ip ?? '',
      req.get ? req.get('User-Agent') ?? 'Unknown' : 'Unknown'
    );

    // Create audit log
    await createAuditLog({
      userId,
      action: 'Signed Accountability Form',
      resourceType: 'accountability_form',
      resourceId: formId,
      resourceName: form.form_number,
      details: `Accountability form ${form.form_number} signed by user`,
      oldValues: {
        status: form.status,
      },
      newValues: {
        status: 'Signed',
        signed_at: new Date(),
        acknowledgments: acknowledgments,
      },
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });

    // Standard approval flow: the owner just signed, so the form moves on to
    // the owner's designated approver/sub-approver. When the owner has no
    // designated approvers, the form is approved right away.
    if (form.approval_status === 'pending_owner_signature') {
      const ownerApproverId = await getDesignatedApproverUserIdForRequester(
        form.user_id
      );
      const ownerSubApproverId =
        await getDesignatedSubApproverUserIdForRequester(form.user_id);

      const hasNextApprover = !!ownerApproverId || !!ownerSubApproverId;
      const nextApprovalStatus: 'pending_approval' | 'approved' = hasNextApprover
        ? 'pending_approval'
        : 'approved';

      const affected = await repo.updateOwnerSignatureApproval(
        formId,
        nextApprovalStatus
      );
      if (affected === 0) {
        return res.status(409).json({
          error: 'Form state changed during owner signature',
        });
      }

      await createAuditLog({
        userId,
        action: 'Released Accountability Form To Approver',
        resourceType: 'accountability_form',
        resourceId: formId,
        resourceName: form.form_number,
        details: `Accountability form ${form.form_number} owner signature completed; released to ${hasNextApprover ? 'approver' : 'approval (no designated approver)'}`,
        newValues: {
          approval_status: nextApprovalStatus,
        },
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });

      if (hasNextApprover) {
        // Notify the owner's approver(s). Notify both approver and
        // sub-approver when they are different; deduplicate recipients.
        const ownerRow = await repo.getUserNameById(form.user_id);
        const ownerName = ownerRow
          ? `${ownerRow.first_name ?? ''} ${ownerRow.last_name ?? ''}`.trim() ||
            form.user_id
          : form.user_id;
        const recipients = [ownerApproverId, ownerSubApproverId].filter(
          (id): id is string => !!id && id !== userId
        );
        const seen = new Set<string>();
        const uniqueRecipients = recipients.filter(id => {
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        for (const approverId of uniqueRecipients) {
          try {
            await notifyUser({
              userId: approverId,
              title: `Accountability form ${form.form_number} needs your approval`,
              message: `Please review and approve the accountability form for ${ownerName} (${form.form_number}).`,
              type: 'accountability_form',
              data: {
                route: '/approvals?tab=for-approval',
                actionTarget: 'accountability_form_approval',
                formId,
                formNumber: form.form_number,
              },
              createdBy: userId,
              req,
            });
          } catch (notifErr) {
            logger.error(
              'Failed to notify approver after owner signature:',
              notifErr
            );
          }
        }

        return res.json({
          message:
            'Accountability form signed; awaiting final approval',
          form: {
            id: formId,
            status: 'Signed',
            signed_at: new Date(),
            approvalStatus: 'pending_approval',
          },
        });
      }

      // No designated approver: the form is fully approved. Stamp the
      // generic approval columns, send the owner their assignment notice,
      // and let the HR copy notice below go out as well.
      try {
        await pool.execute(
          `UPDATE accountability_forms
           SET approved_by = ?, approved_at = NOW(), updated_at = NOW()
           WHERE formID = ?`,
          [userId, formId]
        );
      } catch (approveErr) {
        logger.error(
          'Failed to stamp auto-approval after owner signature:',
          approveErr
        );
      }
      try {
        const signerRow = await repo.getUserNameById(userId);
        const assignerName = signerRow
          ? `${signerRow.first_name ?? ''} ${signerRow.last_name ?? ''}`.trim() ||
            userId
          : userId;
        await notifyOwnerAssignmentAndAccountability({
          ownerUserId: form.user_id,
          formNumber: form.form_number,
          formId,
          assignerName,
          assignerUserId: userId,
          assetCodes: await getAssetCodesForForm(form),
          req,
        });
      } catch (notifErr) {
        logger.error(
          'Failed to notify owner after auto-approval:',
          notifErr
        );
      }
    }

    // Notify HR accountability receivers
    try {
      const hrReceiverIds = await getHrAccountabilityReceiverUserIds();
      const io = getIoInstance();
      for (const receiverId of hrReceiverIds) {
        const message = `An Accountability form (${form.form_number}) is ready for you to receive for HR Copy of 201 file`;
        const notificationPayload = {
          title: 'Accountability Form Ready for HR Copy',
          description: message,
          type: 'accountability_form' as const,
          route: '/forms/accountability?tab=hrCopy',
          actionTarget: 'accountability_form_hr_copy',
          formId: formId,
          formNumber: form.form_number,
          timestamp: new Date().toISOString(),
        };
        await createNotificationForApi({
          user_id: receiverId,
          title: notificationPayload.title,
          message,
          type: notificationPayload.type,
          data: notificationPayload,
        });

        if (io) {
          emitNotification(io, receiverId, 'notification', notificationPayload);
        }
      }
      logger.info(`Sent HR copy notifications to ${hrReceiverIds.length} receivers`);
    } catch (notifError) {
      logger.error('Failed to send HR copy notifications:', notifError);
      // Don't fail the request if notification fails
    }

    return res.json({
      message: 'Accountability form signed successfully',
      form: {
        id: formId,
        status: 'Signed',
        signed_at: new Date(),
        approvalStatus:
          form.approval_status === 'pending_owner_signature'
            ? 'approved'
            : form.approval_status ?? undefined,
      },
    });
  } catch (error: any) {
    logger.error('Sign accountability form failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to sign accountability form' });
  }
}

export async function declineAccountabilityFormHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const parsed = declineAccountabilityFormBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const first =
        parsed.error.flatten().fieldErrors.reason?.[0] ||
        parsed.error.errors[0]?.message ||
        'Invalid request body';
      return res.status(400).json({ error: first });
    }

    const { reason } = parsed.data;
    const { formId } = req.params;
    const userId = req.user!.userID;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const form = await repo.getFormById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Accountability form not found' });
    }

    if (form.user_id !== userId) {
      return res.status(403).json({
        error: 'You can only decline forms assigned to you',
      });
    }

    if (form.status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending forms can be declined' });
    }

    // Extract previous_form_id and original status from assets_data if it exists
    let previousFormId: string | null = null;
    let previousFormOriginalStatus: string | null = null;
    let previousFormAssetIds: string[] = [];
    if (form.assets_data) {
      try {
        const data =
          typeof form.assets_data === 'string'
            ? JSON.parse(form.assets_data)
            : form.assets_data;
        previousFormId = data?.previous_form_id || null;
        previousFormOriginalStatus = data?.previous_form_original_status || null;
      } catch {
        /* ignore */
      }
    }

    // Get assets from the previous form if it exists
    if (previousFormId) {
      try {
        const prevAssetsData = await repo.getFormAssetsDataById(previousFormId);
        if (prevAssetsData != null) {
          const prevData =
            typeof prevAssetsData === 'string'
              ? JSON.parse(prevAssetsData)
              : prevAssetsData;
          const prevAssets = (prevData as { assets?: unknown })?.assets;
          if (Array.isArray(prevAssets)) {
            previousFormAssetIds = prevAssets
              .map((a: any) => String(a.id))
              .filter(Boolean);
          }
        }
      } catch {
        /* ignore */
      }
    }

    const assetIds: string[] = [];
    if (form.assets_data) {
      try {
        const data =
          typeof form.assets_data === 'string'
            ? JSON.parse(form.assets_data)
            : form.assets_data;
        const arr = data?.assets;
        if (Array.isArray(arr)) {
          for (const a of arr) {
            if (a?.id) assetIds.push(String(a.id));
          }
        }
      } catch {
        /* ignore */
      }
    }
    if (assetIds.length === 0 && form.asset_id) {
      assetIds.push(String(form.asset_id));
    }

    if (assetIds.length === 0) {
      return res
        .status(400)
        .json({ error: 'Form has no assets to release' });
    }

    const uniqueAssetIds = [...new Set(assetIds)];
    
    // Only return assets that are NOT in the previous form (the newly added ones)
    const newlyAddedAssetIds = uniqueAssetIds.filter(
      id => !previousFormAssetIds.includes(id)
    );
    
    const returnNotes = `Accountability form declined by assignee. Reason: ${reason}`;
    const ipAddress = req.ip || '';
    const userAgent = req.get ? req.get('User-Agent') || 'Unknown' : 'Unknown';

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      for (const assetId of newlyAddedAssetIds) {
        const assignment = await repo.findActiveAssignmentForUserAssetTx(
          conn,
          form.user_id,
          assetId
        );

        if (!assignment) {
          logger.warn(
            `Decline form ${formId}: no active assignment for user ${form.user_id} asset ${assetId}`
          );
          continue;
        }

        await repo.callReturnAssignmentTx(
          conn,
          assignment.assignmentID,
          returnNotes,
          userId
        );

        await applyReturnAssignmentSideEffectsOnConnection(
          conn,
          {
            assignmentID: assignment.assignmentID,
            asset_id: assignment.asset_id,
            user_id: assignment.user_id,
            status: assignment.status,
          },
          returnNotes,
          userId,
          {
            ipAddress,
            userAgent,
            skipAssigneeNotification: true,
          }
        );
      }

      // Re-assign assets from the previous form back to the user
      if (previousFormId && previousFormAssetIds.length > 0) {
        for (const assetId of previousFormAssetIds) {
          // Check if asset already has an active assignment for the user
          const existingAssignmentId =
            await repo.findAssignmentIdForUserAssetTx(
              conn,
              form.user_id,
              assetId
            );

          // Only create new assignment if one doesn't already exist
          if (existingAssignmentId == null) {
            if (!(await repo.assetExistsTx(conn, assetId))) continue;

            const assignmentId = randomUUID();
            await repo.callCreateAssignmentTx(conn, {
              assignmentId,
              assetId,
              userId: form.user_id,
              departmentId: form.department_id ?? null,
              locationId: form.location_id ?? null,
              locationRoomId: form.location_room_id ?? null,
              expectedReturnDate: null,
              assignmentNotes: `Re-assigned after decline of form ${form.form_number}`,
              assignedBy: userId,
            });
          }
        }
      }

      const declinedRows = await repo.updateFormDeclinedTx(
        conn,
        formId,
        reason
      );
      if (declinedRows === 0) {
        throw new Error('Form state changed during decline');
      }

      // Re-enable previous form if it exists
      if (previousFormId) {
        const prevForm = await repo.getFormByIdTx(conn, previousFormId);

        if (prevForm) {
          // Restore original status if available, otherwise use 'Pending'
          const restoredStatus = previousFormOriginalStatus || 'Pending';
          await repo.updateFormStatusTx(conn, previousFormId, restoredStatus);

          await createAuditLog({
            userId,
            action: 'Re-enabled Accountability Form',
            resourceType: 'accountability_form',
            resourceId: previousFormId,
            resourceName: prevForm.form_number,
            details: `Previous accountability form re-enabled after decline of form ${form.form_number}`,
            oldValues: { status: 'Disabled' },
            newValues: { status: restoredStatus },
            ipAddress,
            userAgent,
          });
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    await createAuditLog({
      userId,
      action: 'Declined Accountability Form',
      resourceType: 'accountability_form',
      resourceId: formId,
      resourceName: form.form_number,
      details: `Accountability form ${form.form_number} declined. Reason: ${reason}`,
      oldValues: { status: 'Pending' },
      newValues: { status: 'Disabled', decline_reason: reason },
      ipAddress,
      userAgent,
    });

    // Send notification to the issuer if form has an issuer
    logger.info(`Checking if form has issuer. form.created_by: ${form.created_by}`);
    if (form.created_by) {
      try {
        // Get user details for the notification
        const userRow = await repo.getUserNameById(userId);
        const userName = userRow
          ? `${userRow.first_name ?? ''} ${userRow.last_name ?? ''}`.trim()
          : userId;

        // Truncate reason if too long (max 100 characters)
        const truncatedReason = reason.length > 100
          ? reason.substring(0, 97) + '...'
          : reason;

        // Create notification for the issuer
        const notificationData = {
          type: 'accountability_form',
          title: `${userName} Declined accountability form no. ${form.form_number}`,
          message: `Reason: ${truncatedReason}`,
          formId: formId,
          formNumber: form.form_number,
          declineReason: reason, // Store full reason for dialog
          declinedBy: userId,
          declinedByName: userName,
          actionTarget: 'accountability_form_declined',
          route: '/forms/accountability',
          openPreview: true, // Flag to open PDF preview dialog
        };

        logger.info(`Inserting notification into database for issuer ${form.created_by}`);
        const insertId = await repo.insertDeclineNotification(
          form.created_by,
          notificationData.title,
          notificationData.message,
          notificationData.type,
          JSON.stringify(notificationData)
        );

        logger.info(`Notification inserted with ID: ${insertId}`);

        // Emit socket event to notify the issuer
        const { getIoInstance } = await import('../utils/socketManager.js');
        const io = getIoInstance();
        if (io) {
          logger.info(`Emitting socket notification to user:${form.created_by}`);
          io.to(`user:${form.created_by}`).emit('notification', notificationData);
        } else {
          logger.warn('Socket.IO instance not available');
        }

        logger.info(`Notification sent to issuer ${form.created_by} for declined form ${formId}`);
      } catch (notifError) {
        logger.error('Failed to send decline notification to issuer:', notifError);
        // Don't fail the decline operation if notification fails
      }
    } else {
      logger.warn(`Form ${formId} does not have a creator, skipping notification`);
    }

    return res.json({
      message: 'Accountability form declined successfully',
      form: {
        id: formId,
        status: 'Disabled',
        declineReason: reason,
      },
    });
  } catch (error: any) {
    logger.error('Decline accountability form failed:', error);
    if (error?.message === 'Form state changed during decline') {
      return res.status(409).json({
        error: 'Form could not be declined; refresh and try again',
      });
    }
    return res
      .status(500)
      .json({ error: 'Failed to decline accountability form' });
  }
}

/**
 * POST /api/accountability-forms/:formId/sign-admin-copy
 *
 * Sign the IT/Admin copy of an accountability form. The current user must be
 * the assigned `admin_copy_signer_id` for the form, and the form must be in
 * `pending_admin_copy_signature` status.
 *
 * If the signer is also the asset owner's designated approver, the form
 * transitions directly to `approved` (combined-step flow per user decision).
 * Otherwise it transitions to `pending_approval` and the owner's approver is
 * notified.
 */
export async function signAdminCopyHandler(req: AuthRequest, res: Response) {
  try {
    const { formId } = req.params;
    const { digitalSignature } = req.body ?? {};
    const currentUserId = req.user!.userID;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const form = await repo.getFormById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Accountability form not found' });
    }

    if (form.approval_status !== 'pending_admin_copy_signature') {
      return res.status(400).json({
        error: 'Form is not awaiting an IT/Admin copy signature',
      });
    }

    if (form.admin_copy_signer_id !== currentUserId) {
      return res.status(403).json({
        error: 'You are not the designated IT/Admin copy signer for this form',
      });
    }

    const signature = await resolveSigningDigitalSignature(
      currentUserId,
      typeof digitalSignature === 'string' ? digitalSignature : null
    );

    // After the IT/Admin copy is signed, the accountability owner signs
    // before the owner's designated approver/sub-approver.
    const nextStatus: 'pending_owner_signature' = 'pending_owner_signature';

    const affected = await repo.updateAdminCopySignature(
      formId,
      signature,
      nextStatus
    );
    if (affected === 0) {
      return res.status(409).json({
        error: 'Form state changed during admin copy sign',
      });
    }

    // Copy signed: reveal assignments held as `Inactive` since issuance so
    // the assets now appear in the new owner's My Assets. Owner-facing
    // notifications still wait until final approval.
    try {
      const activated = await activateAssignmentsForAccountabilityForm(form);
      if (activated.tangible > 0 || activated.intangible > 0) {
        await createAuditLog({
          userId: currentUserId,
          action: 'Activated Assignments On Copy Sign',
          resourceType: 'accountability_form',
          resourceId: formId,
          resourceName: form.form_number,
          details: `Activated ${activated.tangible} tangible and ${activated.intangible} intangible assignment(s) after IT/Admin copy sign for ${form.form_number}`,
          newValues: activated,
          ipAddress: req.ip,
          userAgent: req.get ? req.get('User-Agent') : 'Unknown',
        });
      }
    } catch (activateErr) {
      logger.error('Failed to activate assignments on copy sign:', activateErr);
    }

    await createAuditLog({
      userId: currentUserId,
      action: 'Signed IT/Admin Copy',
      resourceType: 'accountability_form',
      resourceId: formId,
      resourceName: form.form_number,
      details: `IT/Admin copy signed for accountability form ${form.form_number}`,
      newValues: {
        admin_copy_signature: signature,
        admin_copy_signed_at: new Date(),
        approval_status: nextStatus,
      },
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });

    // Notify the accountability owner to sign the form.
    const ownerRow = await repo.getUserNameById(form.user_id);
    const ownerName = ownerRow
      ? `${ownerRow.first_name ?? ''} ${ownerRow.last_name ?? ''}`.trim() ||
        form.user_id
      : form.user_id;
    try {
      await notifyUser({
        userId: form.user_id,
        title: `Accountability form ${form.form_number} needs your signature`,
        message: `Please review and sign your accountability form (${form.form_number}).`,
        type: 'accountability_form',
        data: {
          route: '/profile?tab=documents',
          actionTarget: 'profile_documents',
          formId,
          formNumber: form.form_number,
        },
        createdBy: currentUserId,
        req,
      });
    } catch (ownerNotifErr) {
      logger.error('Failed to notify owner after copy sign:', ownerNotifErr);
    }

    return res.json({
      message: 'IT/Admin copy signed; awaiting owner signature',
      formId,
      approvalStatus: 'pending_owner_signature',
      ownerName,
    });
  } catch (error: any) {
    logger.error('Sign admin copy failed:', error);
    return res.status(500).json({ error: 'Failed to sign IT/Admin copy' });
  }
}

/**
 * POST /api/accountability-forms/:formId/approve
 *
 * Approve an accountability form. The current user must be the asset owner's
 * designated approver OR sub-approver. The form must be in
 * `pending_approval` status (i.e. the IT/Admin copy has been signed AND the
 * accountability owner has signed).
 */
export async function approveAccountabilityFormHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const { approvalNotes } = req.body ?? {};
    const currentUserId = req.user!.userID;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const form = await repo.getFormById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Accountability form not found' });
    }

    if (form.approval_status !== 'pending_approval') {
      return res.status(400).json({
        error: 'Form is not awaiting approval',
      });
    }

    // Authorize: current user must be the owner's designated approver or
    // sub-approver.
    const [isApprover, isSubApprover] = await Promise.all([
      isDesignatedApprover(currentUserId, form.user_id),
      isDesignatedSubApprover(currentUserId, form.user_id),
    ]);
    if (!isApprover && !isSubApprover) {
      return res.status(403).json({
        error: 'You are not the designated approver/sub-approver for this user',
      });
    }

    const notes =
      typeof approvalNotes === 'string' && approvalNotes.trim() !== ''
        ? approvalNotes.trim()
        : null;

    const signerRowForDept = await repo.getUserNameById(currentUserId);
    const deptHeadName = signerRowForDept
      ? `${signerRowForDept.first_name ?? ''} ${signerRowForDept.last_name ?? ''}`.trim() ||
        null
      : null;
    const deptHeadSignature = await resolveSigningDigitalSignature(
      currentUserId,
      null
    );

    const affected = await repo.updateFormApproval({
      formId,
      approvedBy: currentUserId,
      approvalNotes: notes,
      deptHeadSignature,
      deptHeadSignedByName: deptHeadName,
    });
    if (affected === 0) {
      return res.status(409).json({
        error: 'Form state changed during approval',
      });
    }

    await createAuditLog({
      userId: currentUserId,
      action: 'Approved Accountability Form',
      resourceType: 'accountability_form',
      resourceId: formId,
      resourceName: form.form_number,
      details: `Accountability form ${form.form_number} approved`,
      newValues: {
        approval_status: 'approved',
        approved_by: currentUserId,
        approved_at: new Date(),
        approval_notes: notes,
        dept_head_signed_by: currentUserId,
        dept_head_signed_by_name: deptHeadName,
        dept_head_signature: deptHeadSignature,
        dept_head_signed_at: new Date(),
      },
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });

    // Final approval: assignments were already revealed at copy-sign time,
    // so the new owner now gets BOTH the assignment notice and the
    // accountability-issued notice together.
    const ownerRow = await repo.getUserNameById(form.user_id);
    const ownerName = ownerRow
      ? `${ownerRow.first_name ?? ''} ${ownerRow.last_name ?? ''}`.trim() ||
        form.user_id
      : form.user_id;
    const signerRow = await repo.getUserNameById(currentUserId);
    const assignerName = signerRow
      ? `${signerRow.first_name ?? ''} ${signerRow.last_name ?? ''}`.trim() ||
        currentUserId
      : currentUserId;
    try {
      await notifyOwnerAssignmentAndAccountability({
        ownerUserId: form.user_id,
        formNumber: form.form_number,
        formId,
        assignerName,
        assignerUserId: currentUserId,
        assetCodes: await getAssetCodesForForm(form),
        req,
      });
    } catch (notifErr) {
      logger.error('Failed to notify owner after approval:', notifErr);
    }

    // The owner already signed (owner signs before the approver in the
    // standard flow), so the form is now ready for the HR 201-file copy.
    if (form.status === 'Signed') {
      try {
        const hrReceiverIds = await getHrAccountabilityReceiverUserIds();
        const io = getIoInstance();
        for (const receiverId of hrReceiverIds) {
          const message = `An Accountability form (${form.form_number}) is ready for you to receive for HR Copy of 201 file`;
          const notificationPayload = {
            title: 'Accountability Form Ready for HR Copy',
            description: message,
            type: 'accountability_form' as const,
            route: '/forms/accountability?tab=hrCopy',
            actionTarget: 'accountability_form_hr_copy',
            formId: formId,
            formNumber: form.form_number,
            timestamp: new Date().toISOString(),
          };
          await createNotificationForApi({
            user_id: receiverId,
            title: notificationPayload.title,
            message,
            type: notificationPayload.type,
            data: notificationPayload,
          });

          if (io) {
            emitNotification(io, receiverId, 'notification', notificationPayload);
          }
        }
        logger.info(`Sent HR copy notifications to ${hrReceiverIds.length} receivers`);
      } catch (notifError) {
        logger.error('Failed to send HR copy notifications after approval:', notifError);
        // Don't fail the request if notification fails
      }
    }

    return res.json({
      message: 'Accountability form approved',
      formId,
      approvalStatus: 'approved',
      ownerName,
    });
  } catch (error: any) {
    logger.error('Approve accountability form failed:', error);
    return res.status(500).json({ error: 'Failed to approve accountability form' });
  }
}

/**
 * GET /api/accountability-forms/pending-admin-copy-signatures
 *
 * Lists forms where the current user is the designated IT/Admin copy signer
 * and the form is awaiting their signature.
 */
export async function getPendingAdminCopySignaturesHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const currentUserId = req.user!.userID;
    const rows = await repo.listFormsPendingAdminCopySignature(currentUserId);
    return res.json({ forms: rows });
  } catch (error: any) {
    logger.error('Get pending admin copy signatures failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to load pending admin copy signatures' });
  }
}

/**
 * GET /api/accountability-forms/pending-approvals
 *
 * Lists forms where the current user is the asset owner's designated
 * approver or sub-approver and the form is awaiting final approval.
 */
export async function getPendingAccountabilityApprovalsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const currentUserId = req.user!.userID;
    const rows = await repo.listFormsPendingApprovalForApprover(currentUserId);
    return res.json({ forms: rows });
  } catch (error: any) {
    logger.error('Get pending accountability approvals failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to load pending accountability approvals' });
  }
}

export async function getPendingClearanceApprovalsHandler(req: AuthRequest, res: Response) {
  try {
    const currentUserId = req.user!.userID;
    const result: any[] = [];
    // Stage 1: owner approver
    try { const rows = await repo.listFormsPendingClearanceForApprover(currentUserId); result.push(...rows.map((r:any)=>({...r, _clearanceStage: 'pending_approval'}))); } catch {}
    // Stage 2/3/4: role based
    const hasIt = await repo.hasRole(currentUserId, 'IT Asset');
    if (hasIt) {
      try { const rows = await repo.listFormsPendingItForUser(currentUserId); result.push(...rows.map((r:any)=>({...r, _clearanceStage: 'pending_it'}))); } catch {}
    }
    const hasAdmin = await repo.hasRole(currentUserId, 'Admin Asset');
    if (hasAdmin) {
      try { const rows = await repo.listFormsPendingAdminForUser(currentUserId); result.push(...rows.map((r:any)=>({...r, _clearanceStage: 'pending_admin'}))); } catch {}
    }
    const hasHr = await userHasHrAccountabilityReceiverAccess(currentUserId);
    if (hasHr) {
      try { const rows = await repo.listFormsPendingHrForUser(currentUserId); result.push(...rows.map((r:any)=>({...r, _clearanceStage: 'pending_hr'}))); } catch {}
    }
    // dedupe by formID
    const seen = new Set<string>();
    const deduped = result.filter(r=>{ const id=String((r as any).formID); if(seen.has(id)) return false; seen.add(id); return true; });
    return res.json({ forms: deduped });
  } catch (error:any) {
    logger.error('Get pending clearance approvals failed:', error);
    return res.status(500).json({ error: 'Failed to load pending clearance approvals' });
  }
}

export async function signReceivedCopyHandler(req: AuthRequest, res: Response) {
  try {
    const { formId } = req.params;
    const { digitalInitials } = req.body;
    const userId = req.user!.userID;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const form = await repo.getFormById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Accountability form not found' });
    }

    if (form.received_copy_201_file_signed_at) {
      return res.status(400).json({
        error: 'Received Copy for 201 File has already been signed',
      });
    }

    const signerRow = await repo.getUserNameById(userId);
    const signerName = signerRow
      ? `${signerRow.first_name ?? ''} ${signerRow.last_name ?? ''}`.trim() || null
      : null;

    // Do NOT set status = 'Signed' - that would cause PDF to show HR signature in
    // "Issued to/Received by". Status reflects employee signing; received copy has its own columns.
    await repo.updateFormReceivedCopySignature(
      formId,
      digitalInitials || null,
      userId,
      signerName
    );

    await createAuditLog({
      userId,
      action: 'Signed Received Copy for 201 File',
      resourceType: 'accountability_form',
      resourceId: formId,
      resourceName: form.form_number,
      details: `Received Copy for 201 File signed for form ${form.form_number} with digital initials: ${digitalInitials}`,
      newValues: { received_copy_201_file_signed_at: 'Updated', received_copy_201_file_signature: digitalInitials },
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });

    return res.json({
      message: 'Received Copy for 201 File signed successfully',
      signedByName: signerName,
    });
  } catch (error: any) {
    logger.error('Sign received copy failed:', error);
    const message =
      error?.message?.includes('Unknown column') ||
      error?.code === 'ER_BAD_FIELD_ERROR'
        ? 'Database migration required: run migration_add_received_copy_201_file_signature.sql to add the received_copy_201_file_signature column.'
        : 'Failed to sign received copy';
    return res.status(500).json({
      error: message,
      ...(process.env.NODE_ENV !== 'production' && {
        detail: error?.message,
      }),
    });
  }
}

export async function getAccountabilityFormChecklistsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const currentUserId = req.user!.userID;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const row = await repo.getFormFullDetailById(formId);
    if (!row) {
      return res.status(404).json({ error: 'Accountability form not found' });
    }

    const canView = await userCanViewAccountabilityFormRow(
      {
        user_id: String(row.user_id),
        created_by: row.created_by != null ? String(row.created_by) : null,
      },
      currentUserId
    );
    if (!canView) {
      return res.status(403).json({
        error: 'You do not have permission to view checklists for this form',
      });
    }

    const assignmentIds = await resolveChecklistAssignmentIds({
      assetsDataRaw: row.assets_data,
      fallbackAssignmentId: row.assignment_id,
      userId: row.user_id,
      getActiveAssignmentIdsByAssetIds:
        assignmentRepo.getActiveAssignmentIdsByUserAndAssetIds,
      getActiveAssignmentIdsByAssetCodes:
        assignmentRepo.getActiveAssignmentIdsByUserAndAssetCodes,
      isComputerType: isComputerTypeName,
    });
    const checklists =
      await checklistRepo.getChecklistsByAssignmentIds(assignmentIds);

    return res.status(200).json({ checklists });
  } catch (error) {
    logger.error('Get accountability form checklists failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch accountability form checklists' });
  }
}

export async function signAccountabilityFormChecklistsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const currentUserId = req.user!.userID;
    const bodySignature =
      typeof req.body?.digitalSignature === 'string'
        ? req.body.digitalSignature.trim()
        : '';

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const row = await repo.getFormFullDetailById(formId);
    if (!row) {
      return res.status(404).json({ error: 'Accountability form not found' });
    }

    if (String(row.user_id) !== String(currentUserId)) {
      return res
        .status(403)
        .json({ error: 'You can only sign checklists assigned to you' });
    }

    if (row.status !== 'Pending' && row.status !== 'Signed') {
      return res.status(400).json({
        error:
          'Checklists can only be signed while the accountability form is pending or signed',
      });
    }

    const parsedAcknowledgments = parseMysqlJsonColumn<Record<string, unknown>>(
      row.acknowledgments
    );
    const ackSignature =
      parsedAcknowledgments &&
      typeof parsedAcknowledgments.digitalSignature === 'string'
        ? parsedAcknowledgments.digitalSignature
        : null;

    const digitalSignature = await resolveSigningDigitalSignature(
      currentUserId,
      bodySignature || ackSignature
    );

    const signedCount = await signLinkedChecklistsForAccountabilityForm({
      formId,
      formNumber: row.form_number ?? null,
      assetsDataRaw: row.assets_data,
      fallbackAssignmentId: row.assignment_id,
      userId: row.user_id,
      employeeId: currentUserId,
      digitalSignature,
      req,
    });

    if (signedCount === 0) {
      return res.status(400).json({
        error: 'All checklists for this form are already signed',
      });
    }

    const assignmentIds = await resolveChecklistAssignmentIds({
      assetsDataRaw: row.assets_data,
      fallbackAssignmentId: row.assignment_id,
      userId: row.user_id,
      getActiveAssignmentIdsByAssetIds:
        assignmentRepo.getActiveAssignmentIdsByUserAndAssetIds,
      getActiveAssignmentIdsByAssetCodes:
        assignmentRepo.getActiveAssignmentIdsByUserAndAssetCodes,
      isComputerType: isComputerTypeName,
    });
    const updatedChecklists =
      await checklistRepo.getChecklistsByAssignmentIds(assignmentIds);

    return res.status(200).json({
      message: `Signed ${signedCount} checklist(s) successfully`,
      signedCount,
      checklists: updatedChecklists,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error ?? '');
    logger.error('Sign accountability form checklists failed:', error);
    if (
      typeof message === 'string' &&
      message.includes('employee_signed_at')
    ) {
      return res.status(503).json({
        error:
          'Checklist signing is not available: run db/migration_add_asset_checklist_employee_sign.sql',
      });
    }
    return res
      .status(500)
      .json({ error: 'Failed to sign asset checklists' });
  }
}

export async function getAccountabilityFormByIdHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const currentUserId = req.user!.userID;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const row = await repo.getFormFullDetailById(formId);
    if (!row) {
      return res.status(404).json({ error: 'Accountability form not found' });
    }

    // Visibility mirrors the list endpoints (pending-approvals and
    // pending-admin-copy-signatures): assignee, issuer, HR full-access, HR
    // accountability receivers, anyone with Accountability Form perms, the
    // designated IT/Admin copy signer, and the form user's designated approver
    // or sub-approver may view.
    const isCopySigner = row.admin_copy_signer_id === currentUserId;
    const isApprover =
      (await isDesignatedApprover(currentUserId, row.user_id)) ||
      (await isDesignatedSubApprover(currentUserId, row.user_id));
    if (
      row.user_id !== currentUserId &&
      row.created_by !== currentUserId &&
      !isCopySigner &&
      !isApprover &&
      !(await userCanViewAccountabilityFormRow(row as any, currentUserId))
    ) {
      return res.status(403).json({
        error: 'You can only view forms assigned to you or that you issued',
      });
    }

    const parsedSingle = parseAccountabilityAssetsData(row.assets_data);
    let assets = parsedSingle.assets;
    const formOriginSingle = parsedSingle.formOrigin;

    // If no assets from acknowledgments, use the single asset
    if (assets.length === 0 && row.asset_id) {
      assets = [
        {
          id: row.asset_id,
          code: row.asset_code,
          name: row.asset_name,
          category: row.category_name || row.category_id,
          type: row.type_name || row.type_id,
          serialNo: row.serial,
          modelNo: row.assetModelNo,
        },
      ];
    }

    const form = {
      id: row.formID,
      formNumber: row.form_number,
      assets: assets,
      assignmentIds: parsedSingle.assignmentIds,
      ...(formOriginSingle ? { formOrigin: formOriginSingle } : {}),
      user: {
        id: row.user_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        employeeNumber: row.employeeNumber,
        position: row.position,
        companyLogoUrl: row.user_company_logo_url ?? null,
        company:
          row.user_company_id != null
            ? {
                id: row.user_company_id,
                name: row.user_company_name,
              }
            : undefined,
        department:
          row.user_department_name != null
            ? {
                id: row.user_department_id,
                name: row.user_department_name,
              }
            : undefined,
      },
      assignment: {
        id: row.assignment_id,
        assigned_date: row.assigned_date,
        expected_return_date: row.expected_return_date,
        assignment_notes: row.assignment_notes,
        assigned_by: row.assigned_by
          ? {
              id: row.assigned_by,
              first_name: row.assigned_by_first_name,
              last_name: row.assigned_by_last_name,
              email: row.assigned_by_email,
            }
          : null,
      },
      issuer: row.created_by
        ? {
            id: row.created_by,
            first_name: row.created_by_first_name,
            last_name: row.created_by_last_name,
            email: row.created_by_email,
          }
        : null,
      department: row.department_id
        ? {
            id: row.department_id,
            name: row.department_name,
          }
        : null,
      location: row.location_id
        ? {
            id: row.location_id,
            name: row.location_name,
            floor_unit: row.floor_unit,
            building: row.building,
            room_name: row.room_name,
          }
        : null,
      status: row.status,
      approvalStatus: row.approval_status ?? 'approved',
      adminCopySignerId: row.admin_copy_signer_id ?? null,
      adminCopySignerName:
        row.admin_copy_signer_first_name != null ||
        row.admin_copy_signer_last_name != null
          ? `${row.admin_copy_signer_first_name || ''} ${row.admin_copy_signer_last_name || ''}`.trim() ||
            null
          : null,
      adminCopySignature: row.admin_copy_signature ?? null,
      adminCopyCopyType: row.admin_copy_copy_type ?? null,
      adminCopySignedAt: row.admin_copy_signed_at ?? null,
      approvedBy: row.approved_by ?? null,
      approvedAt: row.approved_at ?? null,
      approvalNotes: row.approval_notes ?? null,
      ...mapDeptHeadFields(row),
      declineReason: row.decline_reason ?? null,
      acknowledgments: parseMysqlJsonColumn(row.acknowledgments),
      issuerSignature: row.issuer_signature,
      itCopySignature: row.it_copy_signature,
      receivedCopy201FileSignature:
        row.received_copy_201_file_signature ?? null,
      receivedCopy201FileSignedAt: row.received_copy_201_file_signed_at ?? null,
      receivedCopy201FileSignedById:
        row.received_copy_201_file_signed_by ?? null,
      receivedCopy201FileSignedByName:
        (row.received_copy_201_file_signed_by_name &&
          String(row.received_copy_201_file_signed_by_name).trim()) ||
        (row.received_copy_signer_first_name != null ||
        row.received_copy_signer_last_name != null
          ? `${row.received_copy_signer_first_name || ''} ${row.received_copy_signer_last_name || ''}`.trim() ||
            null
          : null),
      receivedCopyWetPdfUrl: row.received_copy_wet_pdf_url ?? null,
      signed_at: row.signed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return res.json({ form });
  } catch (error: any) {
    logger.error('Get accountability form by ID failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch accountability form' });
  }
}

/**
 * GET /api/accountability-forms/:formId/audit
 *
 * Returns the audit trail for a single accountability form (created, copy
 * signed, owner signed, approved, HR received, etc.) for the form timeline.
 * Visibility mirrors GET /:formId so regular users can view their own form's
 * trail without audit-admin permission. Returns an empty list when audit
 * logging is disabled — callers fall back to form timestamps.
 */
export async function getAccountabilityFormAuditHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const currentUserId = req.user!.userID;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const row = await repo.getFormFullDetailById(formId);
    if (!row) {
      return res.status(404).json({ error: 'Accountability form not found' });
    }

    // Same visibility rules as GET /:formId.
    const isCopySigner = row.admin_copy_signer_id === currentUserId;
    const isApprover =
      (await isDesignatedApprover(currentUserId, row.user_id)) ||
      (await isDesignatedSubApprover(currentUserId, row.user_id));
    if (
      row.user_id !== currentUserId &&
      row.created_by !== currentUserId &&
      !isCopySigner &&
      !isApprover &&
      !(await userCanViewAccountabilityFormRow(row as any, currentUserId))
    ) {
      return res.status(403).json({
        error: 'You can only view forms assigned to you or that you issued',
      });
    }

    const { default: AuditModel } = await import('../models/audit.model.js');
    const { logs } = await AuditModel.getByAccountabilityFormId(formId);

    return res.json({ logs });
  } catch (error: any) {
    logger.error('Get accountability form audit failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch accountability form audit trail' });
  }
}

/**
 * GET /api/accountability-forms/:formId/movement
 * Build the per-asset movement tree for a form: for each asset in the form,
 * resolve the linked return form, transfer form, and the current
 * (new) accountability form that covers the asset — i.e. where the asset went.
 */
export async function getAccountabilityFormMovementHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const currentUserId = req.user!.userID;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const row = await repo.getFormFullDetailById(formId);
    if (!row) {
      return res.status(404).json({ error: 'Accountability form not found' });
    }

    // Same visibility rules as GET /accountability-forms/:formId
    const isCopySigner = row.admin_copy_signer_id === currentUserId;
    const isApprover =
      (await isDesignatedApprover(currentUserId, row.user_id)) ||
      (await isDesignatedSubApprover(currentUserId, row.user_id));
    if (
      row.user_id !== currentUserId &&
      row.created_by !== currentUserId &&
      !isCopySigner &&
      !isApprover &&
      !(await userCanViewAccountabilityFormRow(row as any, currentUserId))
    ) {
      return res.status(403).json({
        error: 'You can only view forms assigned to you or that you issued',
      });
    }

    const parsed = parseAccountabilityAssetsData(row.assets_data);
    const assets = parsed.assets;
    const assignmentIds = parsed.assignmentIds;

    const assetList: any[] = [];
    if (assets.length === 0 && row.asset_id) {
      assetList.push({
        id: row.asset_id,
        code: row.asset_code,
        name: row.asset_name,
        category: row.category_name || row.category_id,
        type: row.type_name || row.type_id,
        serialNo: row.serial,
        modelNo: row.assetModelNo,
      });
    } else {
      assetList.push(...assets);
    }

    const assetIds = assetList
      .map((a: any) => String(a?.id ?? '').trim())
      .filter(Boolean);
    const uniqueAssetIds = [...new Set(assetIds)];

    // Resolve assignment → asset mapping so return/transfer forms can be
    // attributed to the correct asset in the tree.
    const assignmentMapping = await repo.getAssignmentAssetMapping(
      assignmentIds
    );
    const assignmentToAssetId = new Map<string, string>();
    for (const m of assignmentMapping) {
      assignmentToAssetId.set(m.assignment_id, m.asset_id);
    }
    // Fallback: derive assignment→asset from the form assets if not resolved.
    for (const a of assetList) {
      const id = String(a?.id ?? '');
      if (id && ![...assignmentToAssetId.values()].includes(id)) {
        // assets_data may also store assignment_ids inline per asset
        const inline = a?.assignmentId || a?.assignment_id;
        if (inline) assignmentToAssetId.set(String(inline), id);
      }
    }

    const returnForms = await repo.getReturnFormsByAssignmentIds(
      assignmentIds
    );
    const returnFormIds = [
      ...new Set(returnForms.map(r => r.formID).filter(Boolean)),
    ];
    const transferForms = await repo.getTransferFormsForMovement(
      assignmentIds,
      returnFormIds
    );
    const activeForms = await repo.getActiveAccountabilityFormsForAssetIds(
      uniqueAssetIds,
      formId,
      (row as any).created_at ?? null
    );

    // Direct per-asset return/transfer sheets, used as a fallback when the
    // form's assignmentIds are missing or unresolvable (older forms stored
    // assets without assignment_ids, which previously made return/transfer
    // forms disappear from the movement tree even though the "new
    // accountability form" still showed via asset coverage). Attributed per
    // asset using the same date-window approach as the asset-mode handler:
    // movements in [this form's created_at, new form's created_at] belong to
    // the handover from this form to its replacement. The end boundary is
    // inclusive because a return and its replacement form are often created
    // in the same transaction (identical timestamps).
    const windowStart = row.created_at
      ? new Date(row.created_at).getTime()
      : 0;
    const windowEnd = activeForms[0]?.created_at
      ? new Date(activeForms[0].created_at).getTime()
      : Infinity;
    const directReturnFormsByAsset = new Map<string, any[]>();
    const directTransferFormsByAsset = new Map<string, any[]>();
    for (const assetId of uniqueAssetIds) {
      const [directReturns, directTransfers] = await Promise.all([
        getAssetReturnFormsByAssetId(assetId),
        getAssetTransferFormsByAssetId(assetId),
      ]);
      const inWindow = (createdAt: string | null | undefined) => {
        if (!createdAt) return false;
        const t = new Date(createdAt).getTime();
        return t >= windowStart && t <= windowEnd;
      };
      directReturnFormsByAsset.set(
        assetId,
        directReturns.filter(r => inWindow(r.created_at))
      );
      directTransferFormsByAsset.set(
        assetId,
        directTransfers.filter(t => inWindow(t.created_at))
      );
    }

    // Map active forms to the asset ids they cover (via their assets_data)
    const activeFormAssetIds = new Map<string, Set<string>>();
    for (const f of activeForms) {
      const covered = new Set<string>();
      const raw = f.assets_data;
      if (raw != null) {
        try {
          const data =
            typeof raw === 'string' ? JSON.parse(raw) : raw;
          const fa = data?.assets;
          if (Array.isArray(fa)) {
            for (const a of fa) {
              if (a?.id != null && String(a.id).trim()) {
                covered.add(String(a.id));
              }
            }
          }
        } catch {
          /* ignore malformed assets_data */
        }
      }
      activeFormAssetIds.set(f.formID, covered);
    }

    const assetsResult = assetList.map((a: any) => {
      const assetId = String(a?.id ?? '').trim();
      const matchingAssignments = assignmentIds.filter(
        id => assignmentToAssetId.get(id) === assetId
      );

      const assetReturnForms = dedupeByFormId(
        returnForms.filter(r => matchingAssignments.includes(r.assignment_id))
      );
      const assetTransferForms = dedupeByFormId(
        transferForms.filter(
          t =>
            (t.assignment_id &&
              matchingAssignments.includes(t.assignment_id)) ||
            (t.return_form_id &&
              assetReturnForms.some(r => r.formID === t.return_form_id))
        )
      );
      // Fallback: assignment attribution found nothing but the asset has
      // direct return/transfer sheets in this form's window — use them so the
      // diagram still shows the actual handover.
      const fallbackReturns = directReturnFormsByAsset.get(assetId) ?? [];
      const fallbackTransfers = directTransferFormsByAsset.get(assetId) ?? [];
      const effectiveReturnForms =
        assetReturnForms.length > 0
          ? assetReturnForms.map(r => ({
              formID: r.formID,
              form_number: r.form_number,
              user_id: r.user_id,
              user_name: r.user_name,
              created_at: r.created_at,
            }))
          : fallbackReturns.map(r => ({
              formID: r.id,
              form_number: r.formNumber,
              user_id: r.user?.id ?? '',
              user_name: `${r.user?.first_name ?? ''} ${r.user?.last_name ?? ''}`.trim(),
              created_at: r.created_at,
            }));
      const effectiveTransferForms =
        assetTransferForms.length > 0
          ? assetTransferForms.map(t => ({
              formID: t.formID,
              form_number: t.form_number,
              user_id: t.user_id,
              user_name: t.user_name,
              return_form_id: t.return_form_id ?? null,
              new_assigned_user_id: t.new_assigned_user_id,
              new_user_name: t.new_user_name,
              created_at: t.created_at,
            }))
          : fallbackTransfers.map(t => ({
              formID: t.id,
              form_number: t.formNumber,
              user_id: t.user?.id ?? '',
              user_name: `${t.user?.first_name ?? ''} ${t.user?.last_name ?? ''}`.trim(),
              return_form_id: null,
              new_assigned_user_id: t.new_assigned_user_id ?? null,
              new_user_name: t.new_user
                ? `${t.new_user.first_name ?? ''} ${t.new_user.last_name ?? ''}`.trim()
                : '',
              created_at: t.created_at,
            }));
      const assetNewForms = dedupeByFormId(
        activeForms.filter(f => {
          const covered = activeFormAssetIds.get(f.formID);
          return covered ? covered.has(assetId) : false;
        })
      );

      return {
        asset: {
          id: assetId,
          code: a?.code ?? '',
          name: a?.name ?? a?.code ?? '',
          category: a?.category ?? '',
          type: a?.type ?? '',
          serialNo: a?.serialNo ?? '',
          modelNo: a?.modelNo ?? '',
        },
        returnForms: effectiveReturnForms.map(r => ({
          id: r.formID,
          formNumber: r.form_number,
          userId: r.user_id,
          userName: r.user_name || '',
          created_at: r.created_at,
        })),
        transferForms: effectiveTransferForms.map(t => ({
          id: t.formID,
          formNumber: t.form_number,
          userId: t.user_id,
          userName: t.user_name || '',
          returnFormId: t.return_form_id ?? null,
          newAssignedUserId: t.new_assigned_user_id,
          newUserName: t.new_user_name || '',
          created_at: t.created_at,
        })),
        newAccountabilityForms: assetNewForms.map(f => ({
          id: f.formID,
          formNumber: f.form_number,
          userId: f.user_id,
          userName: f.user_name || '',
          status: f.status,
          created_at: f.created_at,
        })),
      };
    });

    return res.json({
      form: {
        id: row.formID,
        formNumber: row.form_number,
        status: row.status,
      },
      assets: assetsResult,
    });
  } catch (error: any) {
    logger.error('Get accountability form movement failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch accountability form movement' });
  }
}

/**
 * Asset-level movement: for a single asset, resolve the accountability forms it
 * has appeared on and, for each, the return / transfer / new accountability
 * chain showing where the asset went. Returns a per-form tree for the asset.
 */
export async function getAssetMovementHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { assetId } = req.params;
    const currentUserId = req.user!.userID;

    if (!assetId) {
      return res.status(400).json({ error: 'Asset ID is required' });
    }

    // Client sends `asset_code`; DB joins use `assetID`. Resolve first.
    const resolvedAssetId =
      (await resolveAssetIdByCodeOrId(assetId)) ?? assetId;

    const rows = await repo.findFormsByAssetId(resolvedAssetId);
    const result: any[] = [];
    let assetInfo: any = { id: resolvedAssetId, code: '', name: '' };

    // Resolve the asset's own return/transfer sheets directly. Used when the
    // asset has no accessible accountability form but does have movement
    // history (e.g. a fully returned asset with no current/past form).
    const addDirectMovementResolver = async (): Promise<void> => {
      if (result.length > 0) return;
      const directReturnForms = await getAssetReturnFormsByAssetId(resolvedAssetId);
      const directTransferForms = await getAssetTransferFormsByAssetId(resolvedAssetId);
      if (directReturnForms.length > 0 || directTransferForms.length > 0) {
        result.push({
          form: {
            id: 'asset-root',
            formNumber: assetInfo.code || assetInfo.name || 'Asset',
            status: 'Completed',
            userId: '',
            userName: assetInfo.name || '',
            created_at: '',
          },
          returnForms: directReturnForms.map((r: any) => ({
            id: r.id,
            formNumber: r.formNumber,
            userId: r.user?.id ?? '',
            userName: `${r.user?.first_name ?? ''} ${r.user?.last_name ?? ''}`.trim(),
            created_at: r.created_at,
          })),
          transferForms: directTransferForms.map((t: any) => ({
            id: t.id,
            formNumber: t.formNumber,
            userId: t.user?.id ?? '',
            userName: `${t.user?.first_name ?? ''} ${t.user?.last_name ?? ''}`.trim(),
            returnFormId: null,
            newAssignedUserId: null,
            newUserName: t.new_user
              ? `${t.new_user.first_name ?? ''} ${t.new_user.last_name ?? ''}`.trim()
              : '',
            created_at: t.created_at,
          })),
          newAccountabilityForms: [],
        });
      }
    };

    if (rows.length === 0) {
      await addDirectMovementResolver();
      return res.json({ asset: assetInfo, forms: result });
    }
    // Visibility filter + sort oldest→latest for correct chronological attribution.
    // Previously rows were DESC and per-form assignment matching caused all
    // returns/transfers to collapse under the oldest AF (0069) when later AFs'
    // assignmentIds failed to resolve.
    const visibleRows: typeof rows = [];
    for (const r of rows) {
      if (
        await userCanViewAccountabilityFormRow(
          {
            user_id: String(r.user_id),
            created_by: r.created_by != null ? String(r.created_by) : null,
          },
          currentUserId
        )
      ) {
        visibleRows.push(r);
      }
    }
    if (visibleRows.length === 0) {
      await addDirectMovementResolver();
      return res.json({ asset: assetInfo, forms: result });
    }
    visibleRows.sort((a: any, b: any) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (da !== db) return da - db;
      return String(a.form_number).localeCompare(String(b.form_number));
    });
    // Derive assetInfo from the latest visible AF for header
    const lastRow = visibleRows[visibleRows.length - 1] as any;
    assetInfo = {
      id: resolvedAssetId,
      code: lastRow.asset_code ?? '',
      name: lastRow.asset_name ?? '',
      category: lastRow.category_name || lastRow.category_id || '',
      type: lastRow.type_name || lastRow.type_id || '',
      serialNo: lastRow.serial ?? '',
      modelNo: lastRow.assetModelNo ?? '',
    };
    const inlineLast = parseAccountabilityAssetsData(lastRow.assets_data).assets.find(
      (a: any) => String(a?.id ?? '').trim() === String(resolvedAssetId).trim()
    );
    if (inlineLast) {
      assetInfo = {
        id: String(inlineLast.id ?? resolvedAssetId).trim(),
        code: inlineLast.code ?? assetInfo.code,
        name: inlineLast.name ?? assetInfo.name,
        category: inlineLast.category ?? assetInfo.category,
        type: inlineLast.type ?? assetInfo.type,
        serialNo: inlineLast.serialNo ?? assetInfo.serialNo,
        modelNo: inlineLast.modelNo ?? assetInfo.modelNo,
      };
    }

    // Fetch ALL returns/transfers for this asset once and distribute by date
    // window [AF.created_at, nextAF.created_at). This fixes the bug where
    // assignmentIds for newer AFs (0071/0072/0074) failed to resolve and all
    // accessory forms collapsed under the oldest AF (0069).
    const allAssetReturnForms = await getAssetReturnFormsByAssetId(resolvedAssetId);
    const allAssetTransferForms = await getAssetTransferFormsByAssetId(resolvedAssetId);

    for (let idx = 0; idx < visibleRows.length; idx++) {
      const row: any = visibleRows[idx];
      const nextRow: any = visibleRows[idx + 1] ?? null;
      const formId = row.formID;
      const windowStart = row.created_at ? new Date(row.created_at).getTime() : 0;
      const windowEnd = nextRow?.created_at ? new Date(nextRow.created_at).getTime() : Infinity;

      const returnFormsForWindow = allAssetReturnForms.filter((r: any) => {
        const t = r.created_at ? new Date(r.created_at).getTime() : 0;
        return t >= windowStart && t < windowEnd;
      });
      const transferFormsForWindow = allAssetTransferForms.filter((t: any) => {
        const c = t.created_at ? new Date(t.created_at).getTime() : 0;
        return c >= windowStart && c < windowEnd;
      });

      const hasAccessory = returnFormsForWindow.length > 0 || transferFormsForWindow.length > 0;
      const newAccountabilityForWindow =
        hasAccessory && nextRow
          ? [
              {
                id: nextRow.formID,
                formNumber: nextRow.form_number,
                userId: nextRow.user_id,
                userName: `${nextRow.first_name ?? ''} ${nextRow.last_name ?? ''}`.trim(),
                status: nextRow.status,
                created_at: nextRow.created_at,
              },
            ]
          : [];

      result.push({
        form: {
          id: formId,
          formNumber: row.form_number,
          status: row.status,
          userId: row.user_id,
          userName: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
          created_at: row.created_at,
        },
        returnForms: returnFormsForWindow.map((r: any) => ({
          id: r.id,
          formNumber: r.formNumber,
          userId: r.user?.id ?? '',
          userName: `${r.user?.first_name ?? ''} ${r.user?.last_name ?? ''}`.trim(),
          created_at: r.created_at,
        })),
        transferForms: transferFormsForWindow.map((t: any) => ({
          id: t.id,
          formNumber: t.formNumber,
          userId: t.user?.id ?? '',
          userName: `${t.user?.first_name ?? ''} ${t.user?.last_name ?? ''}`.trim(),
          returnFormId: null,
          newAssignedUserId: null,
          newUserName: t.new_user ? `${t.new_user.first_name ?? ''} ${t.new_user.last_name ?? ''}`.trim() : '',
          created_at: t.created_at,
        })),
        // Return/Transfer → New: link accessory forms to the immediate next AF
        // (the "new created accountability form"). This fixes both:
        // - all returns collapsing under 0069
        // - all disabled linking to the same latest new
        newAccountabilityForms: newAccountabilityForWindow,
      });
    }

    // Fallback: when no accessible accountability form was able to surface
    // movement, collect the asset's own return/transfer sheets directly so the
    // Movement tab still reflects the asset's history even if those sheets are
    // not linked to a visible assignment chain.
    await addDirectMovementResolver();

    return res.json({ asset: assetInfo, forms: result });
  } catch (error: any) {
    logger.error('Get asset movement failed:', error);
    return res.status(500).json({ error: 'Failed to fetch asset movement' });
  }
}

/**
 * Unified clearance: GET /api/accountability-forms/clearance/eligibility?userId=
 * Returns whether user has at least one disabled accountability form, 0 active
 * accountability forms and 0 remaining assignments. Used by Profile > Documents
 * generate button.
 */
export async function getClearanceEligibilityHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = String((req.query as any)?.userId ?? '').trim();
    if (!userId) {
      return res.status(400).json({ error: 'userId query param is required' });
    }

    // Disabled forms in last 30 days - for reference list
    const [recentDisabled] = (await pool.execute(
      `SELECT form_number FROM accountability_forms
       WHERE user_id = ? AND deleted_at IS NULL AND status = 'Disabled'
         AND updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       ORDER BY updated_at DESC`,
      [userId]
    )) as any[];

    const disabledFormNumbers: string[] = (recentDisabled as any[]).map(r => String(r.form_number));

    // All-time disabled accountability count (excludes clearance certificates)
    // — button requires at least one disabled accountability, i.e. all
    // accountability disabled / zero active with disabled history.
    const [allDisabled] = (await pool.execute(
      `SELECT COUNT(*) AS cnt FROM accountability_forms
       WHERE user_id = ? AND deleted_at IS NULL AND status = 'Disabled'
         AND (assets_data IS NULL
           OR JSON_UNQUOTE(JSON_EXTRACT(assets_data, '$.form_origin')) IS NULL
           OR JSON_UNQUOTE(JSON_EXTRACT(assets_data, '$.form_origin')) != 'clearance')`,
      [userId]
    )) as any[];
    const disabledCount = Number((allDisabled as any[])?.[0]?.cnt ?? 0);
    const hasAnyDisabled = disabledCount > 0;

    // Check for any active accountability form (Pending or Signed)
    const [activeForms] = (await pool.execute(
      `SELECT formID FROM accountability_forms WHERE user_id=? AND deleted_at IS NULL AND status IN ('Pending','Signed') LIMIT 1`,
      [userId]
    )) as any[];
    const hasActiveForm = (activeForms as any[]).length > 0;

    // Check remaining tangible
    const [remainingTangibles] = (await pool.execute(
      `SELECT asset_id FROM asset_assignments WHERE user_id=? AND status='Active' AND deleted_at IS NULL LIMIT 1`,
      [userId]
    )) as any[];
    const remainingTangible = (remainingTangibles as any[]).length;

    // Check remaining intangible
    const [remainingIntangibles] = (await pool.execute(
      `SELECT intangible_asset_id FROM intangible_asset_assignments WHERE user_id=? AND status='Active' AND deleted_at IS NULL LIMIT 1`,
      [userId]
    )) as any[];
    const remainingIntangible = (remainingIntangibles as any[]).length;

    // Recent unified clearance dedup (90 days)
    const [recentClearance] = (await pool.execute(
      `SELECT formID FROM accountability_forms WHERE user_id=? AND deleted_at IS NULL
         AND JSON_UNQUOTE(JSON_EXTRACT(assets_data, '$.form_origin'))='clearance'
         AND status IN ('Pending','Signed','pending_approval','pending_it','pending_admin','pending_hr')
         AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY) LIMIT 1`,
      [userId]
    )) as any[];
    const hasRecentClearance = (recentClearance as any[]).length > 0;

    const canGenerate = !hasActiveForm && hasAnyDisabled && remainingTangible===0 && remainingIntangible===0 && !hasRecentClearance;
    let reason: string | null = null;
    if (hasRecentClearance) reason = 'A clearance is already pending or signed within last 90 days';
    else if (hasActiveForm) reason = 'You still have active accountability forms';
    else if (!hasAnyDisabled) reason = 'No disabled accountability forms found';
    else if (remainingTangible>0 || remainingIntangible>0) reason = 'You still have assigned assets';

    return res.json({
      userId,
      canGenerate,
      reason,
      disabledFormNumbers,
      hasActiveForm,
      hasAnyDisabled,
      disabledCount,
      remainingTangible,
      remainingIntangible,
      hasRecentClearance,
      // backward compat for old clients
      eligibleScopes: canGenerate ? ['Unified'] : [],
      disabledFormNumbersByScope: { IT: disabledFormNumbers, Admin: disabledFormNumbers, Unified: disabledFormNumbers },
      detailsByScope: {
        IT: { remainingTangible, remainingIntangible, hasOtherActiveForm: hasActiveForm, hasRecentClearance },
        Admin: { remainingTangible, remainingIntangible, hasOtherActiveForm: hasActiveForm, hasRecentClearance },
        Unified: { remainingTangible, remainingIntangible, hasOtherActiveForm: hasActiveForm, hasRecentClearance },
      },
    });
  } catch (error: any) {
    logger.error('Get clearance eligibility failed:', error);
    return res.status(500).json({ error: 'Failed to check clearance eligibility' });
  }
}

/**
 * Unified clearance: POST /api/accountability-forms/clearance
 * Body: { userId } - owner only (req.user must equal userId) or admin generating for self
 * Creates a single unified clearance with 4-step approval: approver -> IT -> Admin -> HR
 */
export async function createClearanceHandler(req: AuthRequest, res: Response) {
  try {
    const requesterId = req.user!.userID;
    const { userId } = req.body as { userId?: string };
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const targetUserId = String(userId).trim();
    // Only owner can generate for themselves (strict owner via profile document)
    if (targetUserId !== requesterId) {
      const roleName = String((req.user as any)?.role?.name ?? '').toLowerCase();
      if (roleName !== 'global admin' && roleName !== 'admin') {
        return res.status(403).json({ error: 'Only the owner can generate their own clearance' });
      }
    }

    // Verify eligibility
    const [activeForms] = (await pool.execute(
      `SELECT formID FROM accountability_forms WHERE user_id=? AND deleted_at IS NULL AND status IN ('Pending','Signed') LIMIT 1`,
      [targetUserId]
    )) as any[];
    if ((activeForms as any[]).length>0) return res.status(400).json({ error: 'You still have active accountability forms - cannot generate clearance' });

    const [allDisabled] = (await pool.execute(
      `SELECT COUNT(*) AS cnt FROM accountability_forms
       WHERE user_id = ? AND deleted_at IS NULL AND status = 'Disabled'
         AND (assets_data IS NULL
           OR JSON_UNQUOTE(JSON_EXTRACT(assets_data, '$.form_origin')) IS NULL
           OR JSON_UNQUOTE(JSON_EXTRACT(assets_data, '$.form_origin')) != 'clearance')`,
      [targetUserId]
    )) as any[];
    if (Number((allDisabled as any[])?.[0]?.cnt ?? 0) === 0) return res.status(400).json({ error: 'No disabled accountability forms found - cannot generate clearance' });

    const [remainingTangibles] = (await pool.execute(
      `SELECT asset_id FROM asset_assignments WHERE user_id=? AND status='Active' AND deleted_at IS NULL LIMIT 1`,
      [targetUserId]
    )) as any[];
    if ((remainingTangibles as any[]).length>0) return res.status(400).json({ error: 'You still have assigned tangible assets' });

    const [remainingIntangibles] = (await pool.execute(
      `SELECT intangible_asset_id FROM intangible_asset_assignments WHERE user_id=? AND status='Active' AND deleted_at IS NULL LIMIT 1`,
      [targetUserId]
    )) as any[];
    if ((remainingIntangibles as any[]).length>0) return res.status(400).json({ error: 'You still have assigned intangible assets' });

    const [recentClearance] = (await pool.execute(
      `SELECT formID, form_number FROM accountability_forms WHERE user_id=? AND deleted_at IS NULL
         AND JSON_UNQUOTE(JSON_EXTRACT(assets_data, '$.form_origin'))='clearance'
         AND approval_status IN ('pending_approval','pending_it','pending_admin','pending_hr')
         AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY) LIMIT 1`,
      [targetUserId]
    )) as any[];
    if ((recentClearance as any[]).length>0) return res.status(400).json({ error: `Clearance already pending: ${(recentClearance as any[])[0].form_number}` });

    // Gather disabled form numbers for reference
    const [recentDisabled] = (await pool.execute(
      `SELECT form_number FROM accountability_forms WHERE user_id=? AND deleted_at IS NULL AND status='Disabled' ORDER BY updated_at DESC LIMIT 20`,
      [targetUserId]
    )) as any[];
    const referenceDisabledFormNumbers: string[] = (recentDisabled as any[]).map(r => String(r.form_number));

    // Get user company/company details for form number generation
    const userDetails = await repo.getUserCompanyAndName(targetUserId);
    let companyId: string | null = userDetails?.company_id ?? null;
    if (!companyId) return res.status(400).json({ error: 'Could not determine company for clearance creation' });

    // Resolve processor signature (requester's signature)
    let processorSignature: string | null = null;
    const bodySig = (req.body as any)?.issuerSignature;
    if (typeof bodySig === 'string' && bodySig.trim() !== '') processorSignature = bodySig.trim();
    else {
      const [sigRows] = (await pool.execute('SELECT digital_signature FROM users WHERE userID=?', [targetUserId])) as any[];
      processorSignature = sigRows[0]?.digital_signature ?? null;
    }

    // Determine department for form (use user's department)
    const [userDeptRows] = (await pool.execute('SELECT department_id FROM users WHERE userID=? LIMIT 1', [targetUserId])) as any[];
    const departmentId = (userDeptRows as any[])[0]?.department_id ?? null;

    const clearanceScope: ClearanceScope = 'Unified';
    let formNumber = '';
    let attempts = 0;
    let resolvedApprovalParams: Awaited<ReturnType<typeof resolveApprovalParams>> = null;
    while (attempts < 5) {
      try {
        formNumber = await generateFormNumber(companyId, [], departmentId, { origin: 'clearance', clearanceScope });
        const assetsDataPayload: Record<string, unknown> = {
          assets: [],
          form_origin: 'clearance',
          clearance_scope: clearanceScope,
          clearance_reason: 'clearance',
          reference_disabled_form_numbers: referenceDisabledFormNumbers,
          cleared_at: new Date().toISOString(),
        };
        try {
          resolvedApprovalParams = await resolveApprovalParams({
            userId: targetUserId,
            assetsForScope: [],
            formOrigin: 'clearance',
            clearanceScope,
            adminCopySignerIdRaw: null,
            adminCopyCopyTypeRaw: null,
          });
        } catch (approvalErr: any) {
          if (approvalErr?.code === 'NO_ADMIN_COPY_SIGNER') {
            return res.status(400).json({ error: 'No designated approver found for this user; cannot create clearance that requires approval' });
          }
          throw approvalErr;
        }
        await repo.insertAccountabilityFormMulti({
          formNumber,
          userId: targetUserId,
          departmentId: departmentId || null,
          locationId: null,
          createdBy: requesterId,
          assetsDataJson: JSON.stringify(assetsDataPayload),
          issuerSignature: processorSignature,
          itCopySignature: processorSignature,
          assignmentId: null,
          approvalStatus: resolvedApprovalParams?.approvalStatus ?? 'approved',
          adminCopySignerId: null,
          adminCopyCopyType: null,
        });
        break;
      } catch (error: any) {
        attempts++;
        if (error.code === 'ER_DUP_ENTRY' && attempts < 5) { await new Promise(r=>setTimeout(r, 100*attempts)); continue; }
        throw error;
      }
    }

    const resolvedFormId = await getFormIdByFormNumber(formNumber);
    if (!resolvedFormId) return res.status(500).json({ error: 'Failed to create clearance certificate' });

    // Stamp the employee's OTP-verified signature (the client only sends this
    // after email-OTP verification via /auth/initials/verify-otp, same trust
    // model as the other post-OTP sign actions) so the clearance PDF
    // "Employee Undergoing Clearance" block renders with sign, date and time.
    // The signature image is optional — date/time still render when the
    // employee has no saved digital signature.
    try {
      const employeeSignatureRaw = (req.body as any)?.employeeSignature;
      const employeeSignature =
        typeof employeeSignatureRaw === 'string' ? employeeSignatureRaw.trim() : '';
      const otpVerified = (req.body as any)?.otpVerified === true;
      if (otpVerified || employeeSignature !== '') {
        const acknowledgmentsPayload = JSON.stringify({
          ...(employeeSignature !== '' ? { digitalSignature: employeeSignature } : {}),
          signedBy: targetUserId,
          otpVerified,
          signedVia: 'clearance_generate_otp',
        });
        await repo.stampClearanceEmployeeSignature(
          resolvedFormId,
          acknowledgmentsPayload,
          req.ip ?? '',
          req.get ? (req.get('User-Agent') ?? 'Unknown') : 'Unknown'
        );
      }
    } catch (stampErr) {
      logger.error('Failed to stamp employee signature on clearance:', stampErr);
    }

    const userName = `${userDetails?.first_name || ''} ${userDetails?.last_name || ''}`.trim() || targetUserId;
    await createAuditLog({
      userId: requesterId,
      action: 'Created Clearance Certificate (Unified)',
      resourceType: 'accountability_form',
      resourceId: resolvedFormId,
      resourceName: formNumber,
      details: `Unified clearance ${formNumber} created for ${userName}`,
      newValues: { form_number: formNumber, user_id: targetUserId, clearance_scope: clearanceScope, reference_disabled_form_numbers: referenceDisabledFormNumbers },
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });

    // Notify first approver (owner's designated approver/sub-approver)
    try {
      const createdByRow = await repo.getUserNameById(requesterId);
      const assignerName = createdByRow ? `${createdByRow.first_name ?? ''} ${createdByRow.last_name ?? ''}`.trim() || requesterId : requesterId;
      if (resolvedApprovalParams && resolvedApprovalParams.approvalStatus !== 'approved') {
        await sendApprovalKickoffNotifications({
          formId: resolvedFormId,
          formNumber,
          ownerUserId: targetUserId,
          ownerName: userName,
          assignerName,
          approvalStatus: resolvedApprovalParams.approvalStatus,
          adminCopySignerId: resolvedApprovalParams.adminCopySignerId,
          adminCopyCopyType: resolvedApprovalParams.adminCopyCopyType,
          ownerApproverId: resolvedApprovalParams.ownerApproverId,
          ownerSubApproverId: resolvedApprovalParams.ownerSubApproverId,
          req,
        });
      } else {
        // No approver configured -> directly to IT (or approved)
        await NotificationService.createNotification({
          user_id: targetUserId,
          title: 'Accountability clearance form submitted',
          message: `Your clearance ${formNumber} has been submitted and is awaiting IT review.`,
          type: 'accountability_form',
          status: 'unread',
          data: JSON.stringify({ route: '/profile?tab=documents', actionTarget: 'profile_documents', formId: resolvedFormId, formNumber }),
        }, requesterId, req.ip, req.get('User-Agent'));
      }
    } catch (e) { logger.error('Failed to send clearance creation notification', e); }

    return res.status(201).json({ message: 'Clearance created', form: { formID: resolvedFormId, form_number: formNumber, user_id: targetUserId, clearanceScope } });
  } catch (error: any) {
    logger.error('Create unified clearance failed:', error);
    return res.status(500).json({ error: 'Failed to create clearance' });
  }
}

/**
 * Unified clearance 4-step approve handler: POST /api/accountability-forms/clearance/:formId/approve
 * Stages: pending_approval (owner approver) -> pending_it (IT Asset) -> pending_admin (Admin Asset) -> pending_hr (HR Receiver) -> approved
 */
export async function approveClearanceStageHandler(req: AuthRequest, res: Response) {
  try {
    const formId = String((req.params as any).formId ?? '').trim();
    if (!formId) return res.status(400).json({ error: 'formId required' });
    const { digitalSignature } = req.body as { digitalSignature?: string };
    const signerId = req.user!.userID;
    const signature = await resolveSigningDigitalSignature(signerId, digitalSignature ?? null);
    if (!signature) return res.status(400).json({ error: 'Digital signature required' });

    const row = await repo.getFormById(formId);
    if (!row) return res.status(404).json({ error: 'Form not found' });
    const assetsData = parseMysqlJsonColumn<{ form_origin?: string; clearance_scope?: string }>(row.assets_data);
    if (assetsData?.form_origin !== 'clearance') return res.status(400).json({ error: 'Not a clearance form' });

    const status = String((row as any).approval_status ?? 'approved');
    const ownerId = String((row as any).user_id);

    // Stage 1: pending_approval -> pending_it (owner's approver/sub-approver)
    if (status === 'pending_approval') {
      const isApprover = await isDesignatedApprover(ownerId, signerId);
      const isSub = await isDesignatedSubApprover(ownerId, signerId);
      if (!isApprover && !isSub) return res.status(403).json({ error: 'Only the requester approver/sub-approver can approve this stage' });
      let approverName: string | null = null;
      try {
        const approverRow = await repo.getUserNameById(signerId);
        if (approverRow) approverName = `${approverRow.first_name ?? ''} ${approverRow.last_name ?? ''}`.trim() || null;
      } catch { /* name is best-effort; dept-head block falls back to approved_by join */ }
      const affected = await repo.updateClearanceApproverToIt(formId, signerId, signature, approverName);
      if (!affected) return res.status(400).json({ error: 'Failed to approve (already processed)' });
      // Notify IT Asset users
      try {
        const [itUsers] = await pool.execute(`SELECT u.userID FROM users u LEFT JOIN asset_mngmnt_roles r ON u.role_id=r.roleID WHERE LOWER(r.name)='it asset' AND u.deleted_at IS NULL`) as any[];
        for (const u of (itUsers as any[])) {
          await createNotificationForApi({ user_id: u.userID, title: `Clearance ${row.form_number} awaiting IT approval`, message: `Please review Unified clearance ${row.form_number}`, type: 'system', data: { route: '/approvals?tab=for-approval', actionTarget: 'clearance_it', formId, formNumber: row.form_number } });
          const io = getIoInstance(); if (io) emitNotification(io, u.userID, 'notification', { title: `Clearance ${row.form_number} awaiting IT approval`, description: 'Unified clearance needs IT sign', type:'system', route:'/approvals?tab=for-approval', formId });
        }
      } catch {}
      await createAuditLog({ userId: signerId, action: 'Approved Clearance (Approver -> IT)', resourceType: 'accountability_form', resourceId: formId, resourceName: row.form_number, details: `Approver ${signerId} approved clearance ${row.form_number}`, ipAddress: req.ip, userAgent: req.get('User-Agent') ?? 'Unknown' });
      return res.json({ message: 'Approved, forwarded to IT department', nextStage: 'pending_it' });
    }

    // Stage 2: pending_it -> pending_admin (IT Asset role)
    if (status === 'pending_it') {
      const hasItRole = await repo.hasRole(signerId, 'IT Asset');
      if (!hasItRole) return res.status(403).json({ error: 'Only IT Asset role can approve this stage' });
      const affected = await repo.updateClearanceItApproval(formId, signerId, signature);
      if (!affected) return res.status(400).json({ error: 'Failed to approve IT stage' });
      // Notify Admin Asset users
      try {
        const [adminUsers] = await pool.execute(`SELECT u.userID FROM users u LEFT JOIN asset_mngmnt_roles r ON u.role_id=r.roleID WHERE LOWER(r.name)='admin asset' AND u.deleted_at IS NULL`) as any[];
        for (const u of (adminUsers as any[])) {
          await createNotificationForApi({ user_id: u.userID, title: `Clearance ${row.form_number} awaiting Admin approval`, message: `Please review Unified clearance ${row.form_number}`, type: 'system', data: { route: '/approvals?tab=for-approval', actionTarget: 'clearance_admin', formId, formNumber: row.form_number } });
          const io = getIoInstance(); if (io) emitNotification(io, u.userID, 'notification', { title: `Clearance ${row.form_number} awaiting Admin approval`, description: 'Unified clearance needs Admin sign', type:'system', route:'/approvals?tab=for-approval', formId });
        }
      } catch {}
      await createAuditLog({ userId: signerId, action: 'Approved Clearance (IT -> Admin)', resourceType: 'accountability_form', resourceId: formId, resourceName: row.form_number, details: `IT ${signerId} approved clearance ${row.form_number}`, ipAddress: req.ip, userAgent: req.get('User-Agent') ?? 'Unknown' });
      return res.json({ message: 'IT approved, forwarded to Admin', nextStage: 'pending_admin' });
    }

    // Stage 3: pending_admin -> pending_hr (Admin Asset role)
    if (status === 'pending_admin') {
      const hasAdminRole = await repo.hasRole(signerId, 'Admin Asset');
      if (!hasAdminRole) return res.status(403).json({ error: 'Only Admin Asset role can approve this stage' });
      const affected = await repo.updateClearanceAdminApproval(formId, signerId, signature);
      if (!affected) return res.status(400).json({ error: 'Failed to approve Admin stage' });
      // Notify HR receivers
      try {
        const hrIds = await getHrAccountabilityReceiverUserIds();
        for (const hrId of hrIds) {
          await createNotificationForApi({ user_id: hrId, title: `Clearance ${row.form_number} awaiting HR approval`, message: `Please review Unified clearance ${row.form_number}`, type: 'system', data: { route: '/approvals?tab=for-approval', actionTarget: 'clearance_hr', formId, formNumber: row.form_number } });
          const io = getIoInstance(); if (io) emitNotification(io, hrId, 'notification', { title: `Clearance ${row.form_number} awaiting HR approval`, description: 'Unified clearance needs HR sign', type:'system', route:'/approvals?tab=for-approval', formId });
        }
      } catch {}
      await createAuditLog({ userId: signerId, action: 'Approved Clearance (Admin -> HR)', resourceType: 'accountability_form', resourceId: formId, resourceName: row.form_number, details: `Admin ${signerId} approved clearance ${row.form_number}`, ipAddress: req.ip, userAgent: req.get('User-Agent') ?? 'Unknown' });
      return res.json({ message: 'Admin approved, forwarded to HR', nextStage: 'pending_hr' });
    }

    // Stage 4: pending_hr -> approved (HR Receiver)
    if (status === 'pending_hr') {
      const hasHr = await userHasHrAccountabilityReceiverAccess(signerId);
      if (!hasHr) return res.status(403).json({ error: 'Only HR Receiver can approve this stage' });
      const affected = await repo.updateClearanceHrApproval(formId, signerId, signature);
      if (!affected) return res.status(400).json({ error: 'Failed to approve HR stage' });
      // Notify owner: approved by all
      try {
        await NotificationService.createNotification({ user_id: ownerId, title: `Accountability clearance ${row.form_number} approved`, message: `Your accountability clearance form has been approved by all participating departments. You can now print it.`, type: 'accountability_form', status: 'unread', data: JSON.stringify({ route: '/profile?tab=documents', actionTarget: 'profile_documents', formId, formNumber: row.form_number }) }, signerId, req.ip, req.get('User-Agent') ?? 'Unknown');
        const io = getIoInstance(); if (io) emitNotification(io, ownerId, 'notification', { title: `Clearance ${row.form_number} approved`, description: 'Approved by all departments. You can now print it.', type:'accountability_form', route:'/profile?tab=documents', formId });
      } catch {}
      await createAuditLog({ userId: signerId, action: 'Approved Clearance (HR -> Approved)', resourceType: 'accountability_form', resourceId: formId, resourceName: row.form_number, details: `HR ${signerId} approved clearance ${row.form_number} - fully approved`, ipAddress: req.ip, userAgent: req.get('User-Agent') ?? 'Unknown' });
      return res.json({ message: 'HR approved - clearance fully approved', nextStage: 'approved' });
    }

    return res.status(400).json({ error: `Cannot approve form with status ${status}` });
  } catch (error: any) {
    logger.error('Approve clearance stage failed:', error);
    return res.status(500).json({ error: 'Failed to approve clearance' });
  }
}

/**
 * Check if a user has unsigned accountability forms
 * Returns list of unsigned forms for the specified user
 */
export async function checkUnsignedAccountabilityFormsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Query for accountability forms that are still pending (not signed)
    const rows = await repo.findUnsignedFormsByUserId(userId);

    const unsignedForms = rows.map((row) => ({
      formId: row.formID,
      formNumber: row.form_number,
      userId: row.user_id,
      status: row.status,
      createdAt: row.created_at,
      assetCode: row.asset_code,
      assetName: row.asset_name,
    }));

    return res.json({
      hasUnsignedForms: unsignedForms.length > 0,
      unsignedForms,
    });
  } catch (error: any) {
    logger.error('Check unsigned accountability forms failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to check unsigned accountability forms' });
  }
}

/** Deduplicate rows by their formID (transfer/return forms can yield one row per assignment). */
function dedupeByFormId<T extends { formID?: string | null }>(
  rows: T[]
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const key = String(r.formID ?? '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}
