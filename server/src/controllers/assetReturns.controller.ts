import type { Response } from 'express';
import { createReadStream } from 'fs';
import crypto from 'crypto';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';
import {
  handleAccountabilityFormOnAssetReturn,
  createReturnAccountabilityFormAndNotify,
} from '../utils/accountabilityFormOnReturn.js';
import { getAssetScope, getDepartmentIdsForScope, classifyDepartmentScopeByName } from '../utils/assetScope.js';

import {
  isUserManagerApprover2,
  isUserSubApprover2,
  getManagerApprover2UserIdsForProcessedReturn,
  getManagerApprover2UserIdsInItAndAdminDepartmentsAndCompany,
  getSubApprover2UserIdsInItAndAdminDepartmentsAndCompany,
  getAssetRoleUsersForAssignmentsAndCompany,
  isDesignatedApprover,
  isDesignatedSubApprover,
  getDesignatedApproverUserIdForRequester,
  getDesignatedSubApproverUserIdForRequester,
  getRequestorMA1Status,
} from '../utils/approverNotifications.js';
import { getRequestersAssignedToApprover } from '../services/userApprovers.service.js';
import { createNotificationForApi } from '../utils/notificationsApi.js';
import { getIoInstance } from '../utils/socketManager.js';
import { emitNotification } from '../sockets/socketHandlers.js';
import { createErrorResponse } from '../utils/responseWrapper.js';
import * as intangibleAssetsService from '../services/intangibleAssets.service.js';
import {
  AssetReturnModel,
  type AssetReturn,
} from '../models/assetReturn.model.js';
import {
  AssetReturnFormModel,
  type AssetReturnForm,
} from '../models/assetReturnForm.model.js';
import { AssetAssignmentModel } from '../models/assetAssignment.model.js';
import {
  uploadReturnConditionImageToCloudinary,
  signedRawUrlFromStoredSecureUrl,
} from '../utils/cloudinary.js';
import { runTransferFormExecution } from './assetTransfers.controller.js';
import {
  ASSET_RETURN_FORMS_LIST_SQL_FULL,
  ASSET_RETURN_FORMS_LIST_SQL_FALLBACK,
  PENDING_DH_APPROVAL_FORMS_SQL_FULL,
  PENDING_DH_APPROVAL_FORMS_SQL_NO_OWNER_ABSENT,
  PENDING_DH_APPROVAL_FORMS_SQL_LEGACY_NO_DECLINED,
  isMysqlUnknownColumnError,
  fetchAssetReturnFormsRowsForUserList,
  fetchPendingDeptHeadApprovalFormRows,
  fetchPendingDeptHeadApprovalFormRowsByCompany,
  fetchUserPosition,
  fetchUserDigitalSignature,
  resolveProcessorReturnTarget,
  type ProcessorReturnTarget,
} from '../repositories/assetReturn.repository.js';
import { resolveReturnFormContext } from '../services/assetReturn.service.js';
import {
  getTransferFormLinksForReturnForms,
  getTransferFormByReturnFormId,
  getTransferFormIdsByReturnFormId,
  getTransferFormAssignments,
  findAccountabilityFormForAsset,
  getActiveAssignmentsByIds,
  getCategoryDepartmentsByAssetIds,
  getDepartmentById,
  getUserById,
  getUserNamesById,
  getUserNamesByIds,
  getUserDepartmentId,
  getReturnFormById,
  getBuilderItemsByAssetIds,
  getBuilderItemCount,
  getAssetCodeByAssetId,
  executeRawWrite,
} from '../repositories/assetTransferForm.repository.js';
import * as checklistRepo from '../repositories/assetChecklist.repository.js';
import { generateChecklistFormNumber, generateChecklistFormNumberFallback } from '../utils/checklistFormNumber.js';
import { getCategoryDepartmentForAssetIds, getCompanyIdByDepartment } from '../repositories/assetReturn.repository.js';
import {
  generateReturnFormNumber,
  generateReturnFormNumberFallback,
} from '../utils/returnFormNumber.js';
import { processorDeclineReturnFormBodySchema } from '../dtos/assetReturns/processorDeclineReturnFormDto.js';

/** Format process_signed_at for API: we store server local time in DB; return ISO UTC so client shows correct local time. */
function formatProcessSignedAtForApi(
  val: string | Date | null | undefined
): string | null {
  if (val == null) return null;
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return null;
    if (s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s)) return s;
    // Stored as server local (YYYY-MM-DD HH:MM:SS); parse as local then send UTC to client
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (val instanceof Date) return val.toISOString();
  return null;
}

/** Format dept_head_signed_at for API (same as process_signed_at). */
function formatDeptHeadSignedAtForApi(
  val: string | Date | null | undefined
): string | null {
  return formatProcessSignedAtForApi(val);
}

/** Format it_manager_signed_at for API (same as process_signed_at). */
function formatItManagerSignedAtForApi(
  val: string | Date | null | undefined
): string | null {
  return formatProcessSignedAtForApi(val);
}

type LinkedTransferProcessorSource = {
  created_by?: string | null;
  process_signed_at?: string | null;
  process_digital_signature?: string | null;
  processor_pending_signed_at?: string | null;
  processor_pending_signature?: string | null;
};

/** IT Staff processor fields for return PDFs; uses linked transfer form when return has none. */
export async function resolveReturnProcessorFieldsForBatch(
form: {
    formID?: string | null;
    user_id?: string | null | undefined;
    created_by?: string | null | undefined;
    process_signed_at?: string | null | undefined;
    process_digital_signature?: string | null | undefined;
    process_signed_by?: string | null | undefined;
  },
  options: {
    processorNames?: Map<string, string>;
    linkedTransfer?: LinkedTransferProcessorSource | null;
  } = {}
): Promise<{
  processed_by: string;
  process_signed_at: string | null;
  process_digital_signature: string | null;
  processor_pending_signed_at: string | null;
  processor_pending_signature: string | null;
}> {
  let processedBy = '';
  let processSignedAt = formatProcessSignedAtForApi(form.process_signed_at);
  let processDigitalSignature =
    (form.process_digital_signature != null &&
      String(form.process_digital_signature).trim()) ||
    null;
  let processorPendingSignedAt: string | null = null;
  let processorPendingSignature: string | null = null;

  const tf =
    options.linkedTransfer ??
    (form.formID
      ? await getTransferFormByReturnFormId(form.formID)
      : null);

  if (tf) {
    if (tf.process_signed_at != null) {
      processSignedAt = formatProcessSignedAtForApi(tf.process_signed_at);
      processDigitalSignature =
        (tf.process_digital_signature != null &&
          String(tf.process_digital_signature).trim()) ||
        null;
    } else if (tf.processor_pending_signed_at != null) {
      processSignedAt = formatProcessSignedAtForApi(
        tf.processor_pending_signed_at
      );
      processDigitalSignature =
        (tf.processor_pending_signature != null &&
          String(tf.processor_pending_signature).trim()) ||
        null;
      processorPendingSignedAt = processSignedAt;
      processorPendingSignature = tf.processor_pending_signature ?? null;
    }
  }

  // Never treat the returner (asset owner) as the processor. In transfer-request
  // flows created_by can be the returner (or the requestor's dept head), so only
  // fall back to created_by when it is a different user than the returner.
  const processorUserId =
    form.process_signed_by ??
    (form.created_by && form.created_by !== form.user_id
      ? (form.created_by ?? null)
      : null);
  if (!processDigitalSignature && processSignedAt && processorUserId) {
    processDigitalSignature =
      await fetchUserDigitalSignature(processorUserId);
  }

  // Only show a processor name when a real processor signature exists and the
  // recorded processor user is known. Forms with no processor signature (e.g.
  // transfer-linked return forms) keep "processed by" empty.
  if (processSignedAt && form.process_signed_by) {
    const cached = options.processorNames?.get(form.process_signed_by);
    if (cached) {
      processedBy = cached;
    } else {
      const procNames = await getUserNamesById(form.process_signed_by);
      processedBy =
        procNames?.first_name && procNames?.last_name
          ? `${procNames.first_name} ${procNames.last_name}`.trim()
          : '';
    }
  }

  return {
    processed_by: processedBy,
    process_signed_at: processSignedAt,
    process_digital_signature: processDigitalSignature,
    processor_pending_signed_at: processorPendingSignedAt,
    processor_pending_signature: processorPendingSignature,
  };
}

/** Department sort order for return forms: IT department first, admin department second, then others. */
function getDepartmentSortOrder(
  departmentName: string | null | undefined
): number {
  if (!departmentName || typeof departmentName !== 'string') return 2;
  const lower = departmentName.toLowerCase();
  if (lower.includes('information technology') || /\bit\b/.test(lower))
    return 0;
  if (lower.includes('administration') || lower.includes('admin')) return 1;
  return 2;
}

/** Normalize to Returned, Offboarding, or Returned,Offboarding (same as process flow). */
function normalizeReturnTypeString(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string') return null;
  const tokens = raw.split(',').map(t => t.trim()).filter(Boolean);
  const set = new Set<string>();
  for (const t of tokens) {
    const lower = t.toLowerCase();
    if (
      lower === 'returned' ||
      lower === 'return' ||
      lower === 'regular return' ||
      lower === 'regular_return'
    ) {
      set.add('Returned');
    } else if (lower === 'offboarding') {
      set.add('Offboarding');
    }
  }
  if (set.size === 0) return null;
  const out: string[] = [];
  if (set.has('Returned')) out.push('Returned');
  if (set.has('Offboarding')) out.push('Offboarding');
  return out.join(',');
}

async function isReturnFormInPendingStaffScope(
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

/** Returner or IT/Admin staff in same asset scope as pending-staff list. */
async function canViewAssetReturnWetPdf(
  formRow: {
    user_id: string;
    department_id?: string | null;
    form_company_id?: string | null;
  },
  viewerUserId: string
): Promise<boolean> {
  if (formRow.user_id === viewerUserId) return true;
  return isReturnFormInPendingStaffScope(
    {
      department_id: formRow.department_id ?? null,
      form_company_id: formRow.form_company_id ?? null,
    },
    viewerUserId
  );
}

/** POST /asset-returns/submit-request: returner submits return request; creates form with returner signature only, form appears in Approvals. */
export async function submitAssetReturnRequestHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const body = req.body as {
      assignmentIds: string[];
      returnConditions?:
        | Record<string, string>
        | { assignmentId: string; condition: string; notes?: string }[];
      returnNotes?: string;
      returnType?: string;
      return_type?: string;
      digitalSignature?: string;
      intangibleAssetIds?: string[];
      adminCopySignerId?: string | null;
      adminCopyCopyType?: 'IT' | 'Admin' | null;
    };
    const { assignmentIds, returnConditions, returnNotes, intangibleAssetIds, adminCopySignerId, adminCopyCopyType } = body;
    const returnTypeRaw = body.returnType ?? body.return_type;

    const normalizedReturnType = normalizeReturnTypeString(returnTypeRaw);
    if (
      returnTypeRaw != null &&
      String(returnTypeRaw).trim() !== '' &&
      !normalizedReturnType
    ) {
      return res.status(400).json({
        error:
          'Invalid returnType. Use Returned, Offboarding, return, offboarding, or both comma-separated.',
      });
    }
    if (!normalizedReturnType) {
      return res.status(400).json({
        error: 'returnType is required (Returned and/or Offboarding)',
      });
    }

    if (
      !assignmentIds ||
      !Array.isArray(assignmentIds) ||
      assignmentIds.length === 0
    ) {
      return res.status(400).json({
        error: 'assignmentIds array is required',
      });
    }

    const currentUserId = req.user!.userID;
    const assignmentRows = await getActiveAssignmentsByIds(assignmentIds);

    if (assignmentRows.length !== assignmentIds.length) {
      return res
        .status(404)
        .json({ error: 'One or more assignments not found or not active' });
    }

    for (const row of assignmentRows as any[]) {
      if (row.user_id !== currentUserId) {
        return res.status(403).json({
          error: 'You can only submit return requests for your own assignments',
        });
      }
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

    // Get user's own department as fallback (same for all assignments since same user)
    const returnerUserDeptId = assignmentRows[0]?.user_id
      ? await getUserDepartmentId(assignmentRows[0].user_id)
      : null;

    // Group assignments by effective department
    const assignmentsByDept = new Map<string, any[]>();
    for (const row of assignmentRows as any[]) {
      const deptId = assetDeptMap.get(row.asset_id)
        ?? returnerUserDeptId
        ?? row.department_id
        ?? '__unknown__';
      if (!assignmentsByDept.has(deptId)) {
        assignmentsByDept.set(deptId, []);
      }
      assignmentsByDept.get(deptId)!.push(row);
    }

    const validConditions = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];
    const getCondition = (assignmentId: string): string => {
      if (typeof returnConditions === 'object' && returnConditions !== null) {
        if (Array.isArray(returnConditions)) {
          const item = (
            returnConditions as { assignmentId: string; condition: string }[]
          ).find(
            (x: { assignmentId: string }) => x.assignmentId === assignmentId
          );
          const c = item?.condition ?? 'Good';
          return validConditions.includes(c) ? c : 'Good';
        }
        const c =
          (returnConditions as Record<string, string>)[assignmentId] ?? 'Good';
        return validConditions.includes(c) ? c : 'Good';
      }
      return 'Good';
    };
    const getNotes = (assignmentId: string): string => {
      if (
        typeof returnConditions === 'object' &&
        returnConditions !== null &&
        Array.isArray(returnConditions)
      ) {
        const item = (
          returnConditions as { assignmentId: string; notes?: string }[]
        ).find(
          (x: { assignmentId: string }) => x.assignmentId === assignmentId
        );
        return item?.notes ?? returnNotes ?? '';
      }
      return returnNotes ?? '';
    };

    const createdForms: Array<{ formID: string; form_number: string | null }> = [];
    let firstForm: { formID: string; form_number: string | null } | null = null;

    for (const [deptId, deptAssignments] of assignmentsByDept) {
      const effectiveDepartmentId = deptId === '__unknown__' ? null : deptId;

      // Resolve company and form number for this department
      let companyId: string | null = null;
      if (effectiveDepartmentId) {
        const dept = await getDepartmentById(effectiveDepartmentId);
        companyId = dept?.company_id ?? null;
      }
      if (!companyId && assignmentRows[0]?.user_id) {
        const user = await getUserById(assignmentRows[0].user_id);
        companyId = user?.company_id ?? null;
      }
      const formNumber =
        companyId != null
          ? await generateReturnFormNumber(companyId, effectiveDepartmentId)
          : await generateReturnFormNumberFallback();

      const firstDeptAssignment = deptAssignments[0];
      const returnForm = await AssetReturnFormModel.createWithReturnerSignature({
        form_number: formNumber,
        user_id: firstDeptAssignment.user_id,
        department_id: effectiveDepartmentId,
        location_id: firstDeptAssignment.location_id ?? null,
        location_room_id: firstDeptAssignment.location_room_id ?? null,
        created_by: currentUserId,
        signed_by: currentUserId,
        signed_digital_signature: body.digitalSignature || null,
        return_type: normalizedReturnType,
      });
      const form_id = returnForm!.formID;
      createdForms.push({ formID: form_id, form_number: returnForm!.form_number });
      if (!firstForm) {
        const last = createdForms.at(-1);
        if (last) firstForm = last;
      }

      // Create asset return records for this department group
      for (const row of deptAssignments) {
        const assignmentId = row.assignmentID;
        await AssetReturnModel.create({
          assignment_id: assignmentId,
          user_id: row.user_id,
          return_condition: getCondition(assignmentId),
          return_notes: getNotes(assignmentId),
          return_location_id: row.location_id ?? undefined,
          return_location_room_id: row.location_room_id ?? undefined,
          return_department_id: row.department_id ?? undefined,
          form_id,
        });
      }

      // Send notification to designated Approver for the company
      if (companyId) {
        try {
          // Check if requestor has MA1 custodian access - if so, route to same approver (MA3 capacity)
          const requestorHasMA1 = await getRequestorMA1Status(firstDeptAssignment.user_id);
          // Use the requester's designated approver (user-level, local-admin fallback)
          const approverUserId = await getDesignatedApproverUserIdForRequester(firstDeptAssignment.user_id);
          const subApproverUserId = await getDesignatedSubApproverUserIdForRequester(firstDeptAssignment.user_id);
          
          const requesterRow = await getUserNamesById(firstDeptAssignment.user_id);
          const requesterName = requesterRow ? `${requesterRow.first_name} ${requesterRow.last_name}`.trim() : 'A user';
          const assetCount = deptAssignments.length;

          const io = getIoInstance();
          const notifyUsers = [approverUserId, subApproverUserId].filter((id): id is string => id !== null && id !== currentUserId);
          
          for (const approverUserId of notifyUsers) {
            logger.info(`Sending notification to user ${approverUserId}`);
            await createNotificationForApi({
              user_id: approverUserId,
              title: 'Asset Return Request Approval Needed',
              message: `${requesterName} has submitted an asset return request for ${assetCount} asset${assetCount !== 1 ? 's' : ''} and requires your approval.`,
              type: 'system',
              data: {
                form_id: form_id,
                form_number: returnForm!.form_number,
                requester_id: currentUserId,
                requester_name: requesterName,
                asset_count: assetCount,
                route: '/approvals',
                actionTarget: 'return_request_approval',
              },
            });
            // Real-time socket push so the notification pops immediately
            if (io) {
              emitNotification(io, approverUserId, 'notification', {
                id: form_id,
                title: 'Asset Return Request Approval Needed',
                message: `${requesterName} has submitted an asset return request for ${assetCount} asset${assetCount !== 1 ? 's' : ''} and requires your approval.`,
                type: 'system',
                data: {
                  form_id,
                  form_number: returnForm!.form_number,
                  requester_id: currentUserId,
                  requester_name: requesterName,
                  asset_count: assetCount,
                  route: '/approvals',
                  actionTarget: 'return_request_approval',
                },
                time: new Date().toISOString(),
              });
            }
            logger.info(`Notification + socket push sent successfully to user ${approverUserId}`);
          }
          logger.info(`Sent return request notifications to designated approvers for company ${companyId}`);
        } catch (notifError) {
          logger.error('Failed to send return request notifications:', notifError);
        }
      }

      // Second notification to the requester: return form created + IT/Admin condition-check routing
      try {
        const deptForScope = effectiveDepartmentId ? await getDepartmentById(effectiveDepartmentId) : null;
        const scope = classifyDepartmentScopeByName(deptForScope?.name ?? null);
        const targetDeptLabel =
          scope === 'IT'
            ? 'IT Department'
            : scope === 'Admin'
              ? 'Admin Department'
              : deptForScope?.name?.trim() || 'department';
        const returnFormNumberForMsg = returnForm!.form_number ?? formNumber;
        const deptHint = scope === 'IT' ? 'IT asset' : scope === 'Admin' ? 'Admin asset' : 'asset';
        const assetCount = deptAssignments.length;
        const message =
          `A return form (${returnFormNumberForMsg}) has also been created for the asset to be returned first to the ${targetDeptLabel} for asset condition checking (${deptHint}). When approved, please bring the asset to the ${targetDeptLabel}.`;
        const io2 = getIoInstance();
        await createNotificationForApi({
          user_id: currentUserId,
          title: 'Return Form Created for Condition Checking',
          message,
          type: 'system',
          data: {
            form_id,
            form_number: returnForm!.form_number ?? formNumber,
            asset_count: assetCount,
            scope,
            target_department: targetDeptLabel,
            route: '/profile?tab=documents&docTab=returns',
            actionTarget: 'my_return_requests',
          },
        });
        if (io2) {
          emitNotification(io2, currentUserId, 'notification', {
            id: form_id,
            title: 'Return Form Created for Condition Checking',
            message,
            type: 'system',
            data: {
              form_id,
              form_number: returnForm!.form_number ?? formNumber,
              asset_count: assetCount,
              scope,
              target_department: targetDeptLabel,
              route: '/profile?tab=documents&docTab=returns',
              actionTarget: 'my_return_requests',
            },
            time: new Date().toISOString(),
          });
        }
      } catch (requesterNotifErr) {
        logger.error('Failed to send return-form condition-check notification to requester:', requesterNotifErr);
      }

    }

    // Process intangible assets tied to the first created form
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
              action: 'Requested Return of Intangible Asset',
              resourceType: 'intangible_asset',
              resourceId: assetId,
              resourceName: assetId,
              details: `Intangible asset return requested as part of return form ${firstForm.form_number}`,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              companyId,
            });
          } catch (err) {
            logger.error('Failed to unassign intangible asset on return request', { id: assetId, err });
          }
        }
      }
    }

    // Audit log for each created form
    for (const f of createdForms) {
      createAuditLog({
        userId: currentUserId,
        action: 'Submitted Return Request',
        resourceType: 'asset_return_form',
        resourceId: f.formID,
        resourceName: f.form_number ?? undefined,
        details: `Return request submitted for ${assignmentIds.length} asset(s) with type: ${normalizedReturnType}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        companyId: undefined,
      }).catch((err) => logger.warn('Failed to create return request audit log:', err));
    }

    return res.status(201).json({
      message: `Return request(s) submitted successfully (${createdForms.length} form${createdForms.length !== 1 ? 's' : ''})`,
      forms: createdForms,
      formID: firstForm?.formID,
      form_number: firstForm?.form_number,
    });
  } catch (error: any) {
    logger.error('Submit asset return request failed:', error);
    return res.status(500).json({
      error: 'Failed to submit return request',
    });
  }
}

export async function createAssetReturnHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      assetReturns,
      processSignature,
      returnType,
      assignToProcessor = false,
      ownerAbsent: ownerAbsentRaw,
      intangibleAssetReturnItems,
      adminCopySignerId,
      adminCopyCopyType,
    } = req.body;
    const ownerAbsent =
      ownerAbsentRaw === true ||
      ownerAbsentRaw === 'true' ||
      ownerAbsentRaw === 1 ||
      ownerAbsentRaw === '1';
    if (ownerAbsent && !assignToProcessor) {
      return res.status(400).json({
        error:
          'ownerAbsent is only allowed when assigning returned assets to the processor (hold flow)',
      });
    }

    const hasIntangibleItems = intangibleAssetReturnItems && Array.isArray(intangibleAssetReturnItems) && intangibleAssetReturnItems.length > 0;
    if (
      !assetReturns ||
      !Array.isArray(assetReturns) ||
      (assetReturns.length === 0 && !hasIntangibleItems)
    ) {
      if (!hasIntangibleItems) {
        return res.status(400).json({
          error: 'Asset returns array is required',
        });
      }
    }

    // Validate all assignments exist and are active
    const assignmentIds = assetReturns.map((item: any) => item.assignmentId);

    const assignmentRows = await getActiveAssignmentsByIds(assignmentIds);

    if (assignmentRows.length !== assetReturns.length) {
      return res
        .status(404)
        .json({ error: 'One or more assignments not found or not active' });
    }

    const firstAssignment = assignmentRows[0] as any;

    // One return form per submission: create asset_return_forms row first
    // Derive department from asset category (not return location) for form number
    const assetIdsForCategoryDept = assignmentRows.map((r: any) => r.asset_id);

    const categoryDeptRows = await getCategoryDepartmentsByAssetIds(assetIdsForCategoryDept);
    const categoryDeptId = (categoryDeptRows[0] as any)?.departmentID ?? null;

    let companyId: string | null = null;
    const deptIdForCompany = categoryDeptId || firstAssignment.department_id;
    if (deptIdForCompany) {
      const dept = await getDepartmentById(deptIdForCompany);
      companyId = dept?.company_id ?? null;
    }
    if (!companyId && firstAssignment.user_id) {
      const user = await getUserById(firstAssignment.user_id);
      companyId = user?.company_id ?? null;
    }
    const form_number =
      companyId != null
        ? await generateReturnFormNumber(companyId, categoryDeptId)
        : await generateReturnFormNumberFallback();
    // MySQL DATETIME: store in server local time (same as created_at) so DB shows the time user sees
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
    const processorPosition = await fetchUserPosition(req.user!.userID);
    const processDigitalSignature =
      processSignature?.digital_signature?.trim() ||
      (processSignedAtForDb
        ? await fetchUserDigitalSignature(req.user!.userID)
        : null);
    const returnForm = await AssetReturnFormModel.create({
      form_number,
      user_id: firstAssignment.user_id,
      department_id: categoryDeptId ?? firstAssignment.department_id ?? null,
      location_id: firstAssignment.location_id ?? null,
      location_room_id: firstAssignment.location_room_id ?? null,
      created_by: req.user!.userID,
      process_signed_at: processSignedAtForDb,
      process_digital_signature: processDigitalSignature,
      process_signed_by: processSignedAtForDb ? req.user!.userID : null,
      return_type: normalizeReturnTypeString(returnType) ?? null,
      // Required for manager-approval execution path (processor-initiated hold flow).
      received_by: assignToProcessor ? req.user!.userID : null,
      process_user_position: processorPosition,
      owner_absent: ownerAbsent ? 1 : 0,
    });
    const form_id = returnForm!.formID;
    const return_batch_id = crypto.randomUUID(); // keep for backward compat

    // Compute which builders have ALL their assets in this return batch (full return)
    const returnedAssetIds = new Set(
      assignmentRows.map((r: any) => r.asset_id)
    );
    const fullyReturnedBuilderIds = new Set<string>();
    if (returnedAssetIds.size > 0) {
      const builderAssetRows = await getBuilderItemsByAssetIds(Array.from(returnedAssetIds) as string[]);

      const builderReturnedCount = new Map<string, number>();
      for (const row of builderAssetRows) {
        const bid = row.builder_id;
        builderReturnedCount.set(bid, (builderReturnedCount.get(bid) || 0) + 1);
      }
      for (const bid of builderReturnedCount.keys()) {
        const total = await getBuilderItemCount(bid);
        const returned = builderReturnedCount.get(bid) ?? 0;
        if (total > 0 && total === returned) {
          fullyReturnedBuilderIds.add(bid);
        }
      }
    }

    // Hold path: when assignToProcessor, only create form + asset_returns; returner must sign, then manager approve; execution happens in approveReturnFormHandler
    if (assignToProcessor) {
      const holdReturns: Array<{
        return_id: string;
        assignment_id: string;
        user_id: string;
        return_condition: string;
        return_notes: string;
        created_at: string;
      }> = [];
      for (const returnData of assetReturns) {
        const assignment = assignmentRows.find(
          (row: any) => row.assignmentID === returnData.assignmentId
        ) as any;
        if (!assignment) {
          throw new Error(`Assignment ${returnData.assignmentId} not found`);
        }
        const validConditions = [
          'Excellent',
          'Good',
          'Fair',
          'Poor',
          'Damaged',
        ];
        let returnCondition = returnData.condition || 'Good';
        if (typeof returnCondition !== 'string')
          returnCondition = String(returnCondition);
        if (!validConditions.includes(returnCondition))
          returnCondition = 'Good';
        if (returnCondition.length > 50)
          returnCondition = returnCondition.substring(0, 50);

        const assetReturn = await AssetReturnModel.create({
          assignment_id: returnData.assignmentId,
          user_id: assignment.user_id,
          return_condition: returnCondition,
          return_notes: returnData.notes || '',
          return_location_id:
            returnData.returnLocationId || assignment.location_id,
          return_location_room_id:
            returnData.returnAreaId || assignment.location_room_id,
          return_department_id:
            returnData.returnDepartmentId || assignment.department_id,
          return_batch_id,
          form_id,
          condition_images:
            returnData.imageUrls && returnData.imageUrls.length > 0
              ? returnData.imageUrls
              : null,
        });
        if (assetReturn) {
          holdReturns.push({
            return_id: assetReturn.return_id,
            assignment_id: assetReturn.assignment_id,
            user_id: assetReturn.user_id,
            return_condition: assetReturn.return_condition,
            return_notes: assetReturn.return_notes,
            created_at: assetReturn.created_at,
          });
        }
      }
      // Process intangible asset return items (unassign from user)
      if (hasIntangibleItems && companyId) {
        for (const item of intangibleAssetReturnItems) {
          try {
            await intangibleAssetsService.unassignIntangibleAsset(
              item.id,
              firstAssignment.user_id,
              companyId
            );
            await createAuditLog({
              userId: req.user!.userID,
              action: 'Returned Intangible Asset',
              resourceType: 'intangible_asset',
              resourceId: item.id,
              resourceName: item.id,
              details: `Intangible asset returned via Asset Return page`,
              ipAddress: req.ip,
              userAgent: req.get ? req.get('User-Agent') : 'Unknown',
              companyId,
            });
          } catch (err) {
            logger.error('Failed to unassign intangible asset on return', { id: item.id, err });
          }
        }
      }

      // Notify asset owners (excluding the processor) to sign the return form,
      // unless the owner is marked absent (owner-absent flow skips the owner signature).
      if (!ownerAbsent) {
        try {
          const ownerUserIds = [
            ...new Set(assignmentRows.map((r: any) => r.user_id)),
          ].filter((id: string) => id !== req.user!.userID);
          const io = getIoInstance();
          for (const ownerId of ownerUserIds) {
            await createNotificationForApi({
              user_id: ownerId,
              title: 'An asset return has been initialized',
              message:
                'Your assets are being returned. Sign your return form to process this return.',
              type: 'system',
              data: {
                form_id,
                form_number: returnForm?.form_number ?? null,
                route: '/profile?tab=documents&docTab=returns',
                actionTarget: 'my_return_requests',
              },
            });
            if (io) {
              emitNotification(io, ownerId, 'notification', {
                id: form_id,
                title: 'An asset return has been initialized',
                message:
                  'Your assets are being returned. Sign your return form to process this return.',
                type: 'system',
                data: {
                  form_id,
                  form_number: returnForm?.form_number ?? null,
                  route: '/profile?tab=documents&docTab=returns',
                  actionTarget: 'my_return_requests',
                },
              });
            }
          }
        } catch (notifErr) {
          logger.error(
            'Failed to notify asset owners about initialized return:',
            notifErr
          );
        }
      }

      // Owner-absent flow: route directly to the asset owner's Manager Approver 1.
      // The owner will not sign, so the form is routed for department-head approval
      // first; Manager Approver 2 is notified after approval (see approveReturnFormHandler).
      if (ownerAbsent) {
        try {
          const ownerDeptId = firstAssignment.user_id
            ? await getUserDepartmentId(firstAssignment.user_id)
            : null;
          // Use the asset owner's designated approver (user-level, local-admin fallback)
          const approverUserId = firstAssignment.user_id
            ? await getDesignatedApproverUserIdForRequester(firstAssignment.user_id)
            : null;
          const subApproverUserId = firstAssignment.user_id
            ? await getDesignatedSubApproverUserIdForRequester(firstAssignment.user_id)
            : null;
          const ownerNames = await getUserNamesById(firstAssignment.user_id);
          const ownerName = ownerNames
            ? `${ownerNames.first_name || ''} ${ownerNames.last_name || ''}`.trim()
            : 'The asset owner';
          const assetCount = assetReturns.length;
          const io = getIoInstance();
          const notifyUsers = [approverUserId, subApproverUserId].filter((id): id is string => id !== null && id !== req.user!.userID);
          for (const approverUserId of notifyUsers) {
            const approvalMessage = `${ownerName} is no longer in office. An asset return has been initialized for ${assetCount} asset${assetCount !== 1 ? 's' : ''} and requires your approval as the asset owner's department head.`;
            await createNotificationForApi({
              user_id: approverUserId,
              title: 'Asset Return Request Approval Needed',
              message: approvalMessage,
              type: 'system',
              data: {
                form_id,
                form_number: returnForm?.form_number ?? null,
                requester_id: req.user!.userID,
                requester_name: ownerName,
                asset_count: assetCount,
                route: '/approvals',
                actionTarget: 'return_request_approval',
              },
            });
            if (io) {
              emitNotification(io, approverUserId, 'notification', {
                id: form_id,
                title: 'Asset Return Request Approval Needed',
                message: approvalMessage,
                type: 'system',
                data: {
                  form_id,
                  form_number: returnForm?.form_number ?? null,
                  requester_id: req.user!.userID,
                  requester_name: ownerName,
                  asset_count: assetCount,
                  route: '/approvals',
                  actionTarget: 'return_request_approval',
                },
                time: new Date().toISOString(),
              });
            }
          }
        } catch (notifErr) {
          logger.error(
            'Failed to notify Manager Approver 1 about owner-absent return:',
            notifErr
          );
        }
      }

      return res.status(201).json({
        message: ownerAbsent
          ? 'Return request created. The asset owner was marked absent, the department head can approve in Approvals. Assets will be assigned to you after approval.'
          : `Return has been initialized. The returner must sign the form in Profile → Documents, then the department head must approve before assets are assigned to you.`,
        assetReturns: holdReturns,
        returnForm: returnForm
          ? { formID: returnForm.formID, form_number: returnForm.form_number }
          : null,
        ownerAbsent: ownerAbsent || undefined,
      });
    }

    // Create asset return records (with form_id) and update assignments (full execute path when not assignToProcessor)
    const returnPromises = assetReturns.map(async (returnData: any) => {
      let processorAssignAuditData: {
        processorId: string;
        newAssignmentId: string;
        ac: string;
        assetId: string;
        returnDeptId: string | null;
        returnLocId: string | null;
      } | null = null;
      const assignment = assignmentRows.find(
        (row: any) => row.assignmentID === returnData.assignmentId
      );

      if (!assignment) {
        throw new Error(`Assignment ${returnData.assignmentId} not found`);
      }

      // Validate and sanitize condition
      const validConditions = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];
      let returnCondition = returnData.condition || 'Good';

      // Ensure condition is a string
      if (typeof returnCondition !== 'string') {
        returnCondition = String(returnCondition);
      }

      // If condition is not in valid enum values, use 'Good' as default
      if (!validConditions.includes(returnCondition)) {
        returnCondition = 'Good';
      }

      // Ensure condition doesn't exceed 50 characters (database constraint)
      if (returnCondition.length > 50) {
        returnCondition = returnCondition.substring(0, 50);
      }

      const processorId = req.user!.userID;
      const processorTarget = assignToProcessor
        ? await resolveProcessorReturnTarget(processorId)
        : null;
      const returnDeptId = assignToProcessor
        ? processorTarget?.departmentId ??
          returnData.returnDepartmentId ??
          assignment.department_id
        : returnData.returnDepartmentId || assignment.department_id;
      const returnLocId = assignToProcessor
        ? processorTarget?.locationId ??
          returnData.returnLocationId ??
          assignment.location_id
        : returnData.returnLocationId || assignment.location_id;
      const returnRoomId = assignToProcessor
        ? processorTarget?.locationRoomId ??
          returnData.returnAreaId ??
          assignment.location_room_id
        : returnData.returnAreaId || assignment.location_room_id;

      // Create asset return record (form_id links to asset_return_forms)
      const assetReturn = await AssetReturnModel.create({
        assignment_id: returnData.assignmentId,
        user_id: assignment.user_id, // Store the assigned user (the person returning the asset)
        return_condition: returnCondition,
        return_notes: returnData.notes || '',
        return_location_id: returnLocId,
        return_location_room_id: returnRoomId,
        return_department_id: returnDeptId,
        return_batch_id,
        form_id,
        condition_images:
          returnData.imageUrls && returnData.imageUrls.length > 0
            ? returnData.imageUrls
            : null,
      });

      // Update assignment status to Returned using stored procedure
      await pool.execute('CALL sp_mark_assignment_returned(?, ?, ?)', [
        returnData.assignmentId,
        returnData.notes || '',
        returnCondition,
      ]);

      if (assignToProcessor) {
        // Create new assignment for processor using stored procedure; asset stays Assigned
        const newAssignmentId = crypto.randomUUID();
        await pool.execute(
          'CALL sp_create_assignment(?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            newAssignmentId,
            assignment.asset_id,
            processorId,
            returnDeptId || null,
            returnLocId || null,
            returnRoomId || null,
            null,
            'Assigned via asset return (assign to processor)',
            processorId,
          ]
        );
        await executeRawWrite(
          'UPDATE assets SET status = "Assigned", location_id = ?, location_room_id = ?, department_id = ?, `condition` = ?, updated_by = ?, updated_at = NOW() WHERE assetID = ?',
          [
            returnLocId,
            returnRoomId,
            returnDeptId,
            returnCondition || 'Good',
            processorId,
            assignment.asset_id,
          ]
        );
        const assetCodeRow = await getAssetCodeByAssetId(assignment.asset_id);
        const ac = assetCodeRow?.asset_code || assignment.asset_id;
        // Audit log created after "Returned Asset" so it appears first in timeline (newest-first)
        processorAssignAuditData = {
          processorId,
          newAssignmentId,
          ac,
          assetId: assignment.asset_id,
          returnDeptId,
          returnLocId,
        };
      } else {
        // Update asset status back to 'Available'
        await executeRawWrite(
          'UPDATE assets SET status = "Available", location_id = ?, location_room_id = ?, department_id = ?, `condition` = ?, updated_by = ?, updated_at = NOW() WHERE assetID = ?',
          [
            returnLocId,
            returnRoomId,
            returnDeptId,
            returnCondition || 'Good',
            processorId,
            assignment.asset_id,
          ]
        );
      }

      // Get asset code for audit log
      const assetCodeRow = await getAssetCodeByAssetId(assignment.asset_id);
      const assetCodeForReturn = assetCodeRow?.asset_code || assignment.asset_id;

      // Collect builder info for status update - do NOT create audit log here
      // (handled in single pass after all returns to avoid duplicates)
      let builderTransition: {
        builderID: string;
        // ... (rest of the code remains the same)
        builderName: string;
        returnedAssetCode: string;
      } | null = null;
      const [builderRows] = (await pool.execute(
        `SELECT ab.builderID, ab.name, ab.status as builder_status
         FROM asset_builder_items abi
         JOIN asset_builders ab ON abi.builder_id = ab.builderID
         WHERE abi.asset_id = ? AND ab.deleted_at IS NULL`,
        [assignment.asset_id]
      )) as any[];

      if (builderRows.length > 0) {
        const builder = builderRows[0];
        const assignedCount = await getBuilderItemCount(builder.builderID);

        if (assignedCount === 0 && builder.builder_status === 'Assigned') {
          await executeRawWrite(
            'UPDATE asset_builders SET status = "Available", updated_by = ?, updated_at = NOW() WHERE builderID = ?',
            [req.user!.userID, builder.builderID]
          );
          builderTransition = {
            builderID: builder.builderID,
            builderName: builder.name,
            returnedAssetCode: assetCodeForReturn,
          };
        }

        // Full return: all assets in builder returned - keep assets in builder.
        // Partial return: only some returned - remove returned asset from builder.
        const isFullReturnForAllBuilders = (builderRows as any[]).every(
          (b: any) => fullyReturnedBuilderIds.has(b.builderID)
        );
        if (!isFullReturnForAllBuilders) {
          await executeRawWrite(
            'DELETE FROM asset_builder_items WHERE asset_id = ?',
            [assignment.asset_id]
          );
          await createAuditLog({
            userId: req.user!.userID,
            action: 'Removed from Asset Builder',
            resourceType: 'asset',
            resourceId: assetCodeForReturn,
            resourceName: assetCodeForReturn,
            details: `Asset "${assetCodeForReturn}" removed from asset builder due to partial return`,
            oldValues: {
              builder_ids: builderRows.map((b: any) => b.builderID),
            },
            ipAddress: req.ip,
            userAgent: req.get ? req.get('User-Agent') : 'Unknown',
          });
          for (const b of builderRows) {
            await createAuditLog({
              userId: req.user!.userID,
              action: 'Removed from Asset Builder',
              resourceType: 'asset_builder',
              resourceId: b.builderID,
              resourceName: b.name,
              details: `Asset "${assetCodeForReturn}" removed from asset builder due to partial return`,
              oldValues: {
                asset_id: assignment.asset_id,
                asset_code: assetCodeForReturn,
              },
              ipAddress: req.ip,
              userAgent: req.get ? req.get('User-Agent') : 'Unknown',
            });
          }
        }
      }

      // Get user information for better audit log details
      const returnedByNames = await getUserNamesById(req.user!.userID);
      const returnedByUser =
        returnedByNames?.first_name && returnedByNames?.last_name
          ? `${returnedByNames.first_name} ${returnedByNames.last_name}`
          : req.user!.userID;

      // Get assigned user information
      const assignedToNames = await getUserNamesById(assignment.user_id);
      const assignedToUser =
        assignedToNames?.first_name && assignedToNames?.last_name
          ? `${assignedToNames.first_name} ${assignedToNames.last_name}`
          : assignment.user_id;

      // Use asset code from earlier fetch
      const assetCode = assetCodeForReturn;

      // Get return location and room names if provided
      let returnLocationName = '';
      let returnRoomName = '';

      if (returnData.returnLocationId) {
        const [locRows] = (await pool.execute(
          'SELECT name FROM asset_mngmnt_locations WHERE locationID = ? AND deleted_at IS NULL',
          [returnData.returnLocationId]
        )) as any[];
        returnLocationName =
          locRows.length > 0 ? locRows[0].name : returnData.returnLocationId;
      }

      if (returnData.returnAreaId) {
        const [roomRows] = (await pool.execute(
          'SELECT room_name FROM asset_mngmnt_location_rooms WHERE roomID = ? AND deleted_at IS NULL',
          [returnData.returnAreaId]
        )) as any[];
        returnRoomName =
          roomRows.length > 0 ? roomRows[0].room_name : returnData.returnAreaId;
      }

      // Create audit log for asset return (first - older timestamp)
      await createAuditLog({
        userId: req.user!.userID,
        action: 'Returned Asset',
        resourceType: 'asset_assignment',
        resourceId: returnData.assignmentId,
        resourceName: `Asset ${assetCode}`,
        details: `Asset ${assetCode} returned by ${assignedToUser} processed by ${returnedByUser} via Asset Return page with condition: ${returnCondition}${returnData.notes ? ` - Return notes: ${returnData.notes}` : ' - No return notes provided'}${returnLocationName ? ` - Return location: ${returnLocationName}${returnRoomName ? ` - Room/Area: ${returnRoomName}` : ''}` : ''}`,
        oldValues: {
          status: 'Active',
          assigned_to: assignment.user_id,
          department: assignment.department_id,
          location: assignment.location_id,
        },
        newValues: {
          status: 'Returned',
          actual_return_date: new Date(),
          return_condition: returnCondition,
          return_notes: returnData.notes || '',
          return_location:
            returnData.returnLocationId || assignment.location_id,
          return_location_room:
            returnData.returnAreaId || assignment.location_room_id,
          returned_by: req.user!.userID,
        },
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });

      // Create "Assign to Processor" audit log after "Returned Asset" so it appears first (newest-first sort)
      if (processorAssignAuditData) {
        const processorNames = await getUserNamesById(processorAssignAuditData.processorId);
        const processorFullName =
          processorNames?.first_name && processorNames?.last_name
            ? `${processorNames.first_name || ''} ${processorNames.last_name || ''}`.trim() ||
              'Unknown'
            : 'Unknown';
        await createAuditLog({
          userId: processorAssignAuditData.processorId,
          action: 'Assign to Processor on Return',
          resourceType: 'asset_assignment',
          resourceId: processorAssignAuditData.newAssignmentId,
          resourceName: `Asset ${processorAssignAuditData.ac}`,
          details: `Asset "${processorAssignAuditData.ac}" assigned to ${processorFullName} custody temporarily because of asset return.`,
          newValues: {
            asset_id: processorAssignAuditData.assetId,
            user_id: processorAssignAuditData.processorId,
            department_id: processorAssignAuditData.returnDeptId,
            location_id: processorAssignAuditData.returnLocId,
          },
          ipAddress: req.ip,
          userAgent: req.get ? req.get('User-Agent') : 'Unknown',
        });
      }

      return {
        return_id: assetReturn!.return_id,
        assignment_id: assetReturn!.assignment_id,
        user_id: assetReturn!.user_id,
        return_condition: assetReturn!.return_condition,
        return_notes: assetReturn!.return_notes,
        created_at: assetReturn!.created_at,
        builderTransition,
      };
    });

    const createdReturns = await Promise.all(returnPromises);

    // Create ONE audit log per builder that transitioned to Available (avoids duplicates)
    // Include bullet list of returned assets
    const builderTransitionsMap = new Map<
      string,
      { builderName: string; assetCodes: string[] }
    >();
    for (const r of createdReturns as any[]) {
      const bt = r.builderTransition;
      if (bt) {
        const existing = builderTransitionsMap.get(bt.builderID);
        if (existing) {
          existing.assetCodes.push(bt.returnedAssetCode);
        } else {
          builderTransitionsMap.set(bt.builderID, {
            builderName: bt.builderName,
            assetCodes: [bt.returnedAssetCode],
          });
        }
      }
    }
    for (const [
      builderID,
      { builderName, assetCodes },
    ] of builderTransitionsMap) {
      const assetListBullet =
        assetCodes.length > 0 ? '\n• ' + assetCodes.join('\n• ') : '';
      await createAuditLog({
        userId: req.user!.userID,
        action: 'Updated Asset Builder Status',
        resourceType: 'asset_builder',
        resourceId: builderID,
        resourceName: builderName,
        details: `Asset builder "${builderName}" status updated to "Available" due to asset return. Assets returned:${assetListBullet}`,
        oldValues: { status: 'Assigned' },
        newValues: { status: 'Available', returned_asset_codes: assetCodes },
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });
      await createAuditLog({
        userId: req.user!.userID,
        action: 'Asset Builder Returned',
        resourceType: 'asset_builder',
        resourceId: builderID,
        resourceName: builderName,
        details: `Asset builder "${builderName}" returned. Assets returned:${assetListBullet}`,
        newValues: { returned_asset_codes: assetCodes },
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });
    }

    await runAfterReturnAccountabilityAndProcessorAssign(assignmentRows, {
      processorId: req.user!.userID,
      req,
      processSignature: processSignature ?? undefined,
      assignToProcessor: !!assignToProcessor,
      adminCopySignerId: adminCopySignerId ?? null,
      adminCopyCopyType: adminCopyCopyType ?? null,
    });

    // Build userReturnMap from assignmentRows for returner notifications (returner notification difference retained)
    const userReturnMap = new Map<
      string,
      {
        returnedAssetIds: string[];
        departmentId: string | null;
        locationId: string | null;
        locationRoomId: string | null;
      }
    >();
    for (const assignment of assignmentRows as any[]) {
      const uid = assignment.user_id;
      const existing = userReturnMap.get(uid);
      if (existing) {
        existing.returnedAssetIds.push(assignment.asset_id);
      } else {
        userReturnMap.set(uid, {
          returnedAssetIds: [assignment.asset_id],
          departmentId: assignment.department_id,
          locationId: assignment.location_id,
          locationRoomId: assignment.location_room_id,
        });
      }
    }

    // Process intangible asset return items (unassign from user)
    if (hasIntangibleItems && companyId) {
      for (const item of intangibleAssetReturnItems) {
        try {
          await intangibleAssetsService.unassignIntangibleAsset(
            item.id,
            firstAssignment.user_id,
            companyId
          );
          await createAuditLog({
            userId: req.user!.userID,
            action: 'Returned Intangible Asset',
            resourceType: 'intangible_asset',
            resourceId: item.id,
            resourceName: item.id,
            details: `Intangible asset returned via Asset Return page`,
            ipAddress: req.ip,
            userAgent: req.get ? req.get('User-Agent') : 'Unknown',
            companyId,
          });
        } catch (err) {
          logger.error('Failed to unassign intangible asset on return', { id: item.id, err });
        }
      }
    }

    // Notify Manager Approver 2 users in the asset scope department that the return was processed, checked and verified
    await notifyManagerApprover2OfProcessedReturn({
      formId: form_id,
      formNumber: returnForm?.form_number ?? null,
      companyId: companyId,
      departmentId: categoryDeptId ?? firstAssignment.department_id ?? null,
      returnRequestorUserId: firstAssignment.user_id,
      processorUserId: req.user!.userID,
    });

    return res.status(201).json({
      message: `Successfully returned ${assetReturns.length} asset(s)${hasIntangibleItems ? ` and ${intangibleAssetReturnItems.length} intangible asset(s)` : ''}`,
      assetReturns: createdReturns,
      returnForm: returnForm
        ? { formID: returnForm.formID, form_number: returnForm.form_number }
        : null,
    });
  } catch (error: any) {
    logger.error('Create asset returns failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to create asset return forms' });
  }
}

/** Notify the requestor where to return an approved asset for processing. */
async function notifyRequesterToReturnAsset(params: {
  formId: string;
  formNumber: string | null;
  requesterUserId: string;
  departmentName: string | null | undefined;
}): Promise<void> {
  const scope = classifyDepartmentScopeByName(params.departmentName);
  if (scope !== 'IT' && scope !== 'Admin') return;

  const destinationDepartment = scope === 'IT' ? 'IT' : 'Admin';
  await createNotificationForApi({
    user_id: params.requesterUserId,
    title: 'Return Asset Now',
    message: `Please return the asset to the ${destinationDepartment} Department for return processing and asset condition checking.`,
    type: 'system',
    data: {
      form_id: params.formId,
      form_number: params.formNumber,
      asset_scope: scope,
      destination_department: destinationDepartment,
      route: '/profile?tab=documents&docTab=returns',
      actionTarget: 'return_asset_now',
    },
  });
}

async function notifyManagerApprover2OfProcessedReturn(params: {
  formId: string;
  formNumber: string | null;
  companyId: string | null;
  departmentId: string | null;
  returnRequestorUserId: string;
  processorUserId: string;
}): Promise<void> {
  const {
    formId,
    formNumber,
    companyId,
    departmentId,
    returnRequestorUserId,
    processorUserId,
  } = params;

  const requestorRow = await getUserNamesById(returnRequestorUserId);
  const returnRequestorName = requestorRow
    ? `${requestorRow.first_name || ''} ${requestorRow.last_name || ''}`.trim() ||
      returnRequestorUserId
    : returnRequestorUserId;
  const processorRow = await getUserNamesById(processorUserId);
  const processorName = processorRow
    ? `${processorRow.first_name || ''} ${processorRow.last_name || ''}`.trim() ||
      processorUserId
    : processorUserId;

  const managerApprover2UserIds =
    await getManagerApprover2UserIdsForProcessedReturn(companyId, departmentId);
  const subApprover2UserIds =
    await getSubApprover2UserIdsInItAndAdminDepartmentsAndCompany(companyId);
  const receiveApproverUserIds = [
    ...new Set([...managerApprover2UserIds, ...subApprover2UserIds]),
  ];
  const io = getIoInstance();
  for (const approverUserId of receiveApproverUserIds) {
    if (approverUserId === processorUserId) continue;
    const payload = {
      user_id: approverUserId,
      title: 'An asset has been returned, checked and verified',
      message: `${processorName} has processed return request of ${returnRequestorName}`,
      type: 'system' as const,
      data: {
        form_id: formId,
        form_number: formNumber,
        processor_id: processorUserId,
        processor_name: processorName,
        return_requestor_id: returnRequestorUserId,
        return_requestor_name: returnRequestorName,
        route: '/approvals?tab=receive',
        actionTarget: 'approvals',
      },
    };
    await createNotificationForApi(payload);
    if (io) {
      emitNotification(io, approverUserId, 'notification', {
        id: formId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        data: payload.data,
        time: new Date().toISOString(),
      });
    }
  }
}

/** Shared logic after marking returns: returner accountability (disable/create forms) and, when assignToProcessor, processor accountability + notification. Used by createAssetReturnHandler and processReturnFormHandler. */
async function runAfterReturnAccountabilityAndProcessorAssign(
  assignmentRows: Array<{
    user_id: string;
    asset_id: string;
    department_id: string | null;
    location_id: string | null;
    location_room_id: string | null;
  }>,
  options: {
    processorId: string;
    req: AuthRequest;
    processSignature?: {
      signed_at?: string;
      digital_signature?: string;
    } | null;
    assignToProcessor: boolean;
    skipProcessorAccountability?: boolean;
    adminCopySignerId?: string | null;
    adminCopyCopyType?: 'IT' | 'Admin' | null;
  }
): Promise<void> {
  const {
    processorId,
    req,
    processSignature,
    assignToProcessor,
    skipProcessorAccountability = false,
    adminCopySignerId,
    adminCopyCopyType,
  } = options;

  const userReturnMap = new Map<
    string,
    {
      returnedAssetIds: string[];
      departmentId: string | null;
      locationId: string | null;
      locationRoomId: string | null;
    }
  >();
  for (const assignment of assignmentRows) {
    const uid = assignment.user_id;
    const existing = userReturnMap.get(uid);
    if (existing) {
      existing.returnedAssetIds.push(assignment.asset_id);
    } else {
      userReturnMap.set(uid, {
        returnedAssetIds: [assignment.asset_id],
        departmentId: assignment.department_id,
        locationId: assignment.location_id,
        locationRoomId: assignment.location_room_id,
      });
    }
  }
  for (const [uid, data] of userReturnMap) {
    try {
      await handleAccountabilityFormOnAssetReturn(
        uid,
        data.returnedAssetIds,
        null,
        data.locationId,
        data.locationRoomId,
        processorId,
        req,
        processSignature ?? undefined,
        { adminCopySignerId, adminCopyCopyType }
      );
    } catch (formErr) {
      logger.error('Accountability form update on return failed:', formErr);
    }
  }

  if (
    assignToProcessor &&
    !skipProcessorAccountability &&
    assignmentRows.length > 0
  ) {
    const assignedAssetIds = assignmentRows.map(a => String(a.asset_id));
    const placeholders = assignedAssetIds.map(() => '?').join(',');

    // Per returned asset: category-linked asset_mngmnt department (IT vs Admin, etc.)
    const assetDeptRows = await getCategoryDepartmentsByAssetIds(assignedAssetIds);

    const assetToDeptKey = new Map<string, string>();
    for (const row of assetDeptRows as any[]) {
      const aid = String(row.assetID);
      const key = row.departmentID ? String(row.departmentID) : 'other';
      assetToDeptKey.set(aid, key);
    }

    const buckets = new Map<string, string[]>();
    const seenAsset = new Set<string>();
    for (const aid of assignedAssetIds) {
      if (seenAsset.has(aid)) continue;
      seenAsset.add(aid);
      const deptKey = assetToDeptKey.get(aid) ?? 'other';
      const list = buckets.get(deptKey);
      if (list) list.push(aid);
      else buckets.set(deptKey, [aid]);
    }

    let formsCreatedCount = 0;

    const actingUserId = req.user?.userID ?? processorId;
    const processorDigitalSignature =
      processSignature?.digital_signature?.trim() ||
      (await fetchUserDigitalSignature(processorId));

    for (const [deptKey, assetIdsInBucket] of buckets) {
      if (assetIdsInBucket.length === 0) continue;

      const ph = assetIdsInBucket.map(() => '?').join(',');
      const [bucketAssetRows] = (await pool.execute(
        `SELECT a.assetID, a.asset_code, a.name, a.serial, a.model, a.brand, a.category_id,
                ac.name as category_name, at.name as type_name, d.name as department_name
         FROM assets a
         LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
         LEFT JOIN asset_types at ON a.type_id = at.typeID
         LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
         WHERE a.assetID IN (${ph}) AND a.deleted_at IS NULL`,
        assetIdsInBucket
      )) as any[];

      const rowById = new Map(
        (bucketAssetRows as any[]).map((r: any) => [String(r.assetID), r])
      );
      const orderedRows = assetIdsInBucket
        .map(id => rowById.get(id))
        .filter(Boolean) as any[];

      if (orderedRows.length === 0) continue;

      const deptName =
        (orderedRows[0].department_name as string | null | undefined) || 'Other';

      const [existingProcReturnForms] = (await pool.execute(
        `SELECT formID, form_number, status, assets_data FROM accountability_forms
         WHERE user_id = ?
           AND deleted_at IS NULL
           AND status NOT IN ('Disabled', 'Revoked', 'Declined')
           AND JSON_UNQUOTE(JSON_EXTRACT(assets_data, '$.form_origin')) = 'processor_return'
           AND JSON_UNQUOTE(JSON_EXTRACT(assets_data, '$.assets[0].department')) = ?`,
        [processorId, deptName]
      )) as any[];

      // Only assets from this return plus prior temporary processor_return forms for this
      // department—not every asset assigned to the processor in the bucket.
      const mergedReturnChainAssetIds = new Set<string>(
        assetIdsInBucket.map(id => String(id))
      );
      for (const form of existingProcReturnForms as any[]) {
        const raw = form.assets_data;
        if (raw == null) continue;
        try {
          const data =
            typeof raw === 'string' ? JSON.parse(raw) : raw;
          const assets = data?.assets;
          if (!Array.isArray(assets)) continue;
          for (const a of assets) {
            if (a?.id != null && String(a.id).trim() !== '') {
              mergedReturnChainAssetIds.add(String(a.id));
            }
          }
        } catch {
          /* ignore invalid JSON */
        }
      }

      for (const form of existingProcReturnForms as any[]) {
        await executeRawWrite(
          'UPDATE accountability_forms SET status = "Disabled", updated_at = NOW() WHERE formID = ?',
          [form.formID]
        );
        await createAuditLog({
          userId: actingUserId,
          action: 'Disabled Accountability Form',
          resourceType: 'accountability_form',
          resourceId: form.formID,
          resourceName: form.form_number,
          details:
            'Previous processor return accountability disabled; replaced with merged return-chain assets',
          oldValues: { status: form.status },
          newValues: { status: 'Disabled' },
          ipAddress: req.ip,
          userAgent: req.get ? req.get('User-Agent') : 'Unknown',
        });
      }

      const mergedIds = [...mergedReturnChainAssetIds];
      if (mergedIds.length === 0) {
        logger.warn(
          `Processor return accountability: no asset ids to merge for deptKey=${deptKey}; skipping form`
        );
        continue;
      }
      const mergedPh = mergedIds.map(() => '?').join(',');
      const [expandedRows] = (await pool.execute(
        `SELECT
            a.assetID, a.asset_code, a.name, a.serial, a.model, a.brand,
            ac.name as category_name, at.name as type_name, d.name as department_name,
            d.departmentID as department_id
         FROM asset_assignments aa
         JOIN assets a ON aa.asset_id = a.assetID
         LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
         LEFT JOIN asset_types at ON a.type_id = at.typeID
         LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
         WHERE aa.user_id = ? AND aa.status = 'Active' AND aa.deleted_at IS NULL
           AND a.assetID IN (${mergedPh})
         ORDER BY aa.assigned_date ASC`,
        [processorId, ...mergedIds]
      )) as any[];

      const expandedList = (expandedRows as any[]) ?? [];
      if (expandedList.length === 0) {
        logger.warn(
          `Processor return accountability: no active assignments for processor ${processorId} among merged return-chain assets (deptKey=${deptKey}); skipping form`
        );
        continue;
      }

      const departmentAssets = expandedList.map((row: any) => ({
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

      const [firstAssignment] = (await pool.execute(
        `SELECT department_id, location_id FROM asset_assignments
         WHERE user_id = ? AND status = 'Active' AND deleted_at IS NULL
         AND asset_id IN (${departmentAssets.map(() => '?').join(',')})
         LIMIT 1`,
        [processorId, ...departmentAssets.map((a: { id: string }) => a.id)]
      )) as any[];
      const loc = firstAssignment?.[0];

      // Use the asset category's department (IT/Admin scope) — same source used by regular accountability forms
      const originalDeptId = expandedList[0]?.department_id || null;

      const processorCopyScope = classifyDepartmentScopeByName(deptName);
      const accountabilityFormReq = {
        ...req,
        user: { userID: processorId },
        body: {
          assets: departmentAssets,
          userId: processorId,
          departmentId: originalDeptId,
          locationId: loc?.location_id || null,
          formOrigin: 'processor_return',
          issuerSignature: processorDigitalSignature,
          itCopySignature: processorDigitalSignature,
          adminCopySignerId: options?.adminCopySignerId ?? null,
          // Preserve the category department's scope so processor-return forms
          // enter the copy-signing workflow for the processor's approvers.
          adminCopyCopyType:
            options?.adminCopyCopyType ??
            (processorCopyScope === 'IT' || processorCopyScope === 'Admin'
              ? processorCopyScope
              : null),
        },
      } as AuthRequest;
      try {
        await createReturnAccountabilityFormAndNotify(
          accountabilityFormReq,
          processorId,
          actingUserId,
          req,
          null
        );
        formsCreatedCount++;
      } catch (formErr) {
        logger.error(
          'Accountability form for processor on assign-to-return failed',
          formErr
        );
      }
    }

  }
}

/**
 * Execute a processor-initiated hold return after manager approval: mark assignments returned,
 * assign assets to processor (or set Available), run accountability. Used by approveReturnFormHandler.
 */
async function executeReturnFormAfterApproval(
  formId: string,
  form: {
    user_id: string;
    form_number: string;
    process_signed_at?: string | null;
    process_digital_signature?: string | null;
    received_by?: string | null;
  },
  req: AuthRequest,
  options?: { adminCopySignerId?: string | null; adminCopyCopyType?: 'IT' | 'Admin' | null }
): Promise<void> {
  const returnsList = await AssetReturnModel.findByFormId(formId);
  if (returnsList.length === 0) return;

  const assignmentIds = returnsList.map(r => r.assignment_id);
  const placeholders = assignmentIds.map(() => '?').join(',');
  const [assignmentRows] = (await pool.execute(
    `SELECT * FROM asset_assignments WHERE assignmentID IN (${placeholders}) AND deleted_at IS NULL`,
    assignmentIds
  )) as any[];

  let processorId = form.received_by || req.user!.userID;
  let assignToProcessor = !!form.received_by;

  // received_by may store role labels (e.g. "IT Staff") from the client; asset_assignments.user_id must reference users.userID.
  if (form.received_by) {
    const receivedByUser = await getUserById(form.received_by);
    if (!receivedByUser) {
      logger.warn(
        `executeReturnFormAfterApproval: received_by "${form.received_by}" is not a valid user ID, skipping assign to processor`
      );
      processorId = req.user!.userID;
      assignToProcessor = false;
    }
  }
  const processorTarget = assignToProcessor
    ? await resolveProcessorReturnTarget(processorId)
    : null;

  // For audit logs: get returner name, processor name, and asset codes
  let returnerFullName = 'Unknown';
  let processorFullName = 'Unknown';
  const assetCodeByAssetId = new Map<string, string>();
  if (assignmentRows.length > 0) {
    const returnerNames = await getUserNamesById(form.user_id);
    if (returnerNames) {
      returnerFullName =
        `${returnerNames.first_name || ''} ${returnerNames.last_name || ''}`.trim() || 'Unknown';
    }
    const processorNames = await getUserNamesById(processorId);
    if (processorNames) {
      processorFullName =
        `${processorNames.first_name || ''} ${processorNames.last_name || ''}`.trim() || 'Unknown';
    }
    const assetIds = (assignmentRows as any[]).map((a: any) => a.asset_id);
    const placeholdersAsset = assetIds.map(() => '?').join(',');
    const [assetCodeRows] = (await pool.execute(
      `SELECT assetID, asset_code FROM assets WHERE assetID IN (${placeholdersAsset}) AND deleted_at IS NULL`,
      assetIds
    )) as any[];
    for (const row of (assetCodeRows || []) as any[]) {
      if (row.assetID && row.asset_code) {
        assetCodeByAssetId.set(row.assetID, row.asset_code);
      }
    }
  }

  // Compute which builders have ALL their assets in this return batch (for full vs partial return)
  const returnedAssetIds = new Set(
    (assignmentRows as any[]).map((a: any) => a.asset_id)
  );
  const fullyReturnedBuilderIds = new Set<string>();
  if (returnedAssetIds.size > 0) {
    const assetPlaceholders = [...returnedAssetIds].map(() => '?').join(',');
    const [builderAssetRows] = (await pool.execute(
      `SELECT abi.builder_id, abi.asset_id
       FROM asset_builder_items abi
       JOIN asset_builders ab ON abi.builder_id = ab.builderID
       WHERE abi.asset_id IN (${assetPlaceholders}) AND ab.deleted_at IS NULL`,
      [...returnedAssetIds]
    )) as any[];
    const builderReturnedCount = new Map<string, number>();
    for (const row of builderAssetRows as any[]) {
      const bid = row.builder_id;
      builderReturnedCount.set(bid, (builderReturnedCount.get(bid) || 0) + 1);
    }
    for (const bid of builderReturnedCount.keys()) {
      const total = await getBuilderItemCount(bid);
      const returned = builderReturnedCount.get(bid) ?? 0;
      if (total > 0 && total === returned) {
        fullyReturnedBuilderIds.add(bid);
      }
    }
  }

  const executeApprovalBuilderTransitions: Array<{
    builderID: string;
    builderName: string;
    returnedAssetCode: string;
  }> = [];
  const executeApprovalBuildersAssignedToProcessorMap = new Map<
    string,
    string
  >();

  for (const assignment of assignmentRows as any[]) {
    const ret = returnsList.find(
      r => r.assignment_id === assignment.assignmentID
    );
    const returnCondition = ret?.return_condition ?? 'Good';
    const returnNotes = ret?.return_notes ?? '';

    await pool.execute('CALL sp_mark_assignment_returned(?, ?, ?)', [
      assignment.assignmentID,
      returnNotes,
      returnCondition,
    ]);

    const returnDeptId = assignToProcessor
      ? processorTarget?.departmentId ?? assignment.department_id
      : assignment.department_id;
    const returnLocId = assignToProcessor
      ? processorTarget?.locationId ?? assignment.location_id
      : assignment.location_id;
    const returnRoomId = assignToProcessor
      ? processorTarget?.locationRoomId ?? assignment.location_room_id
      : assignment.location_room_id;
    if (ret?.return_id) {
      await executeRawWrite(
        `UPDATE asset_returns
         SET return_department_id = ?, return_location_id = ?, return_location_room_id = ?, updated_at = NOW()
         WHERE return_id = ? AND deleted_at IS NULL`,
        [returnDeptId, returnLocId, returnRoomId, ret.return_id]
      );
    }

    const assetCode =
      assetCodeByAssetId.get(assignment.asset_id) || assignment.asset_id;
    // Create "Returned Asset" audit log first so it appears before "Assign to Processor on Return" in timeline order
    await createAuditLog({
      userId: req.user!.userID,
      action: 'Returned Asset',
      resourceType: 'asset_assignment',
      resourceId: assignment.assignmentID,
      resourceName: `Asset ${assetCode}`,
      details: `Asset ${assetCode} returned by ${returnerFullName} processed by ${processorFullName} via return form approval with condition: ${returnCondition}${returnNotes ? ` - Return notes: ${returnNotes}` : ''}`,
      oldValues: {
        status: 'Active',
        assigned_to: assignment.user_id,
        department: assignment.department_id,
        location: assignment.location_id,
      },
      newValues: {
        status: 'Returned',
        actual_return_date: new Date(),
        return_condition: returnCondition,
        return_notes: returnNotes,
        return_location: returnLocId,
        return_location_room: returnRoomId,
        returned_by: req.user!.userID,
      },
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });

    if (assignToProcessor) {
      const newAssignmentId = crypto.randomUUID();
      await pool.execute(
        'CALL sp_create_assignment(?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          newAssignmentId,
          assignment.asset_id,
          processorId,
          returnDeptId || null,
          returnLocId || null,
          returnRoomId || null,
          null,
          'Assigned via asset return (assign to processor)',
          processorId,
        ]
      );
      await executeRawWrite(
        'UPDATE assets SET status = "Assigned", location_id = ?, location_room_id = ?, department_id = ?, `condition` = ?, updated_by = ?, updated_at = NOW() WHERE assetID = ?',
        [
          returnLocId,
          returnRoomId,
          returnDeptId,
          returnCondition || 'Good',
          processorId,
          assignment.asset_id,
        ]
      );
      await createAuditLog({
        userId: processorId,
        action: 'Assign to Processor on Return',
        resourceType: 'asset_assignment',
        resourceId: newAssignmentId,
        resourceName: `Asset ${assetCode}`,
        details: `Asset "${assetCode}" assigned to ${processorFullName} custody temporarily because of asset return.`,
        newValues: {
          asset_id: assignment.asset_id,
          user_id: processorId,
          department_id: returnDeptId,
          location_id: returnLocId,
        },
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });
      const [builderRowsForProcessor] = (await pool.execute(
        `SELECT ab.builderID, ab.name
         FROM asset_builder_items abi
         JOIN asset_builders ab ON abi.builder_id = ab.builderID
         WHERE abi.asset_id = ? AND ab.deleted_at IS NULL`,
        [assignment.asset_id]
      )) as any[];
      for (const b of builderRowsForProcessor ?? []) {
        if (
          b.builderID &&
          !executeApprovalBuildersAssignedToProcessorMap.has(b.builderID) &&
          fullyReturnedBuilderIds.has(b.builderID)
        ) {
          executeApprovalBuildersAssignedToProcessorMap.set(
            b.builderID,
            b.name ?? 'Unnamed Builder'
          );
        }
      }
    } else {
      await executeRawWrite(
        'UPDATE assets SET status = "Available", location_id = ?, location_room_id = ?, department_id = ?, `condition` = ?, updated_by = ?, updated_at = NOW() WHERE assetID = ?',
        [
          returnLocId,
          returnRoomId,
          returnDeptId,
          returnCondition || 'Good',
          req.user!.userID,
          assignment.asset_id,
        ]
      );
    }

    // Builder logic and audit (mirror createAssetReturnHandler / processReturnFormHandler)
    const [builderRows] = (await pool.execute(
      `SELECT ab.builderID, ab.name, ab.status as builder_status
       FROM asset_builder_items abi
       JOIN asset_builders ab ON abi.builder_id = ab.builderID
       WHERE abi.asset_id = ? AND ab.deleted_at IS NULL`,
      [assignment.asset_id]
    )) as any[];
    if (builderRows.length > 0) {
      const builder = builderRows[0];
      const assignedCount = await getBuilderItemCount(builder.builderID);
      if (assignedCount === 0 && builder.builder_status === 'Assigned') {
        await executeRawWrite(
          'UPDATE asset_builders SET status = "Available", updated_by = ?, updated_at = NOW() WHERE builderID = ?',
          [req.user!.userID, builder.builderID]
        );
        executeApprovalBuilderTransitions.push({
          builderID: builder.builderID,
          builderName: builder.name,
          returnedAssetCode: assetCode,
        });
      }
      const isFullReturnForAllBuilders = (builderRows as any[]).every(
        (b: any) => fullyReturnedBuilderIds.has(b.builderID)
      );
      if (!isFullReturnForAllBuilders) {
        await executeRawWrite(
          'DELETE FROM asset_builder_items WHERE asset_id = ?',
          [assignment.asset_id]
        );
        await createAuditLog({
          userId: req.user!.userID,
          action: 'Removed from Asset Builder',
          resourceType: 'asset',
          resourceId: assetCode,
          resourceName: assetCode,
          details: `Asset "${assetCode}" removed from asset builder due to partial return`,
          oldValues: {
            builder_ids: builderRows.map((b: any) => b.builderID),
          },
          ipAddress: req.ip,
          userAgent: req.get ? req.get('User-Agent') : 'Unknown',
        });
        for (const b of builderRows as any[]) {
          await createAuditLog({
            userId: req.user!.userID,
            action: 'Removed from Asset Builder',
            resourceType: 'asset_builder',
            resourceId: b.builderID,
            resourceName: b.name,
            details: `Asset "${assetCode}" removed from asset builder due to partial return`,
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

  // Builder status transition audit logs (one per builder that became Available) – for builder timeline
  const executeApprovalBuilderTransitionsMap = new Map<
    string,
    { builderName: string; assetCodes: string[] }
  >();
  for (const bt of executeApprovalBuilderTransitions) {
    const existing = executeApprovalBuilderTransitionsMap.get(bt.builderID);
    if (existing) {
      existing.assetCodes.push(bt.returnedAssetCode);
    } else {
      executeApprovalBuilderTransitionsMap.set(bt.builderID, {
        builderName: bt.builderName,
        assetCodes: [bt.returnedAssetCode],
      });
    }
  }
  for (const [
    builderID,
    { builderName, assetCodes },
  ] of executeApprovalBuilderTransitionsMap) {
    const assetListBullet =
      assetCodes.length > 0 ? '\n• ' + assetCodes.join('\n• ') : '';
    await createAuditLog({
      userId: req.user!.userID,
      action: 'Updated Asset Builder Status',
      resourceType: 'asset_builder',
      resourceId: builderID,
      resourceName: builderName,
      details: `Asset builder "${builderName}" status updated to "Available" due to asset return (approved by Department Head). Assets returned:${assetListBullet}`,
      oldValues: { status: 'Assigned' },
      newValues: { status: 'Available', returned_asset_codes: assetCodes },
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });
    await createAuditLog({
      userId: req.user!.userID,
      action: 'Asset Builder Returned',
      resourceType: 'asset_builder',
      resourceId: builderID,
      resourceName: builderName,
      details: `Asset builder "${builderName}" returned (approved by Department Head). Assets returned:${assetListBullet}`,
      newValues: { returned_asset_codes: assetCodes },
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });
  }

  for (const [
    builderID,
    builderName,
  ] of executeApprovalBuildersAssignedToProcessorMap) {
    await createAuditLog({
      userId: req.user!.userID,
      action: 'Assigned to Processor on Return',
      resourceType: 'asset_builder',
      resourceId: builderID,
      resourceName: builderName,
      details: `Assigned to ${processorFullName} temporarily because of asset return.`,
      newValues: { processor_name: processorFullName },
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });
  }

  await runAfterReturnAccountabilityAndProcessorAssign(
    assignmentRows as Array<{
      user_id: string;
      asset_id: string;
      department_id: string | null;
      location_id: string | null;
      location_room_id: string | null;
    }>,
    {
      processorId,
      req,
      processSignature: form.process_signed_at
        ? {
            signed_at: form.process_signed_at,
            ...(form.process_digital_signature?.trim()
              ? { digital_signature: form.process_digital_signature }
              : {}),
          }
        : null,
      assignToProcessor,
      adminCopySignerId: options?.adminCopySignerId ?? null,
      adminCopyCopyType: options?.adminCopyCopyType ?? null,
    }
  );

}

async function enrichReturnWithDetails(
  returnRecord: AssetReturn
): Promise<AssetReturn & { processed_by: string; assignment: any }> {
  const [assignmentRows] = (await pool.execute(
    `SELECT aa.*, a.asset_code, a.name as asset_name, a.category_id, a.type_id,
          ac.name as category_name, at.name as type_name,
          u.first_name, u.last_name, u.email, u.employee_number, u.position,
          d.name as department_name, l.name as location_name, l.floor_unit, l.building,
          lr.room_name,
          uc.companyID as user_company_id, uc.name as user_company_name,
          ud.departmentID as user_department_id, ud.name as user_department_name
     FROM asset_assignments aa
     LEFT JOIN assets a ON aa.asset_id = a.assetID
     LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
     LEFT JOIN asset_types at ON a.type_id = at.typeID
     LEFT JOIN users u ON aa.user_id = u.userID
     LEFT JOIN companies uc ON u.company_id = uc.companyID AND uc.deleted_at IS NULL
     LEFT JOIN asset_mngmnt_departments ud ON u.department_id = ud.departmentID AND ud.deleted_at IS NULL
     LEFT JOIN asset_mngmnt_departments d ON aa.department_id = d.departmentID
     LEFT JOIN asset_mngmnt_locations l ON aa.location_id = l.locationID
     LEFT JOIN asset_mngmnt_location_rooms lr ON aa.location_room_id = lr.roomID
     WHERE aa.assignmentID = ?`,
    [returnRecord.assignment_id]
  )) as any[];
  const assignment = assignmentRows[0];
  const [processorAssignmentRows] = assignment?.asset_id
    ? ((await pool.execute(
        `SELECT user_id
         FROM asset_assignments
         WHERE asset_id = ?
           AND status = 'Active'
           AND deleted_at IS NULL
           AND assignment_notes LIKE 'Assigned via asset return%'
         ORDER BY assigned_date DESC
         LIMIT 1`,
        [assignment.asset_id]
      )) as any[])
    : ([[]] as any[]);
  const processorAssignment = processorAssignmentRows?.[0] ?? null;
  const processorTarget =
    processorAssignment?.user_id != null
      ? await resolveProcessorReturnTarget(String(processorAssignment.user_id))
      : null;
  const fallbackProcessorNames = await getUserNamesById(returnRecord.user_id);
  const fallbackProcessorRows = fallbackProcessorNames ? [fallbackProcessorNames] : [];
  const fallbackProcessor = fallbackProcessorRows[0];
  const processedBy =
    processorTarget?.processorName && processorTarget.processorName !== 'Unknown'
      ? processorTarget.processorName
      : fallbackProcessor
        ? `${fallbackProcessor.first_name || ''} ${fallbackProcessor.last_name || ''}`.trim() ||
          'Unknown'
        : 'Unknown';
  const historyDepartment =
    processorTarget?.departmentId != null
      ? {
          id: processorTarget.departmentId,
          name: processorTarget.departmentName ?? 'Unknown',
        }
      : assignment?.department_id
        ? {
            id: assignment.department_id,
            name: assignment.department_name,
          }
        : null;
  const historyLocation =
    processorTarget?.locationId != null
      ? {
          id: processorTarget.locationId,
          name: processorTarget.locationName ?? 'Unknown',
          floor_unit: processorTarget.locationFloorUnit,
          building: processorTarget.locationBuilding,
          room_name: processorTarget.locationRoomName,
        }
      : assignment?.location_id
        ? {
            id: assignment.location_id,
            name: assignment.location_name,
            floor_unit: assignment.floor_unit ?? '',
            building: assignment.building ?? '',
            room_name: assignment.room_name ?? null,
          }
        : null;
  return {
    ...returnRecord,
    processed_by: processedBy,
    assignment: assignment
      ? {
          assignmentID: assignment.assignmentID,
          asset: {
            id: assignment.asset_id,
            code: assignment.asset_code,
            name: assignment.asset_name,
            category_id: assignment.category_id,
            category_name: assignment.category_name,
            type_id: assignment.type_id,
            type_name: assignment.type_name,
          },
          user: {
            id: assignment.user_id,
            first_name: assignment.first_name,
            last_name: assignment.last_name,
            email: assignment.email,
            employeeNumber: assignment.employee_number,
            position: assignment.position ?? null,
            company:
              assignment.user_company_id != null
                ? {
                    id: assignment.user_company_id,
                    name: assignment.user_company_name,
                  }
                : undefined,
            department:
              assignment.user_department_id != null
                ? {
                    id: assignment.user_department_id,
                    name: assignment.user_department_name,
                  }
                : undefined,
          },
          department: historyDepartment,
          location: historyLocation,
          assigned_date: assignment.assigned_date,
          expected_return_date: assignment.expected_return_date,
          actual_return_date: assignment.actual_return_date,
        }
      : null,
  };
}

export async function getAssetReturnsHandler(req: AuthRequest, res: Response) {
  try {
    const requestedUserId = req.params?.userId;
    if (requestedUserId && req.user!.userID !== requestedUserId) {
      return createErrorResponse(
        res,
        'FORBIDDEN',
        [],
        403,
        'You can only view your own return requests'
      );
    }

    // Get scope from query param (for Global Admin to switch between IT/Admin)
    const scope = req.query.scope as 'it' | 'admin' | undefined;

    const assetReturns = requestedUserId
      ? await AssetReturnModel.findByUserId(requestedUserId)
      : await AssetReturnModel.findAll();
    const returnsWithDetails = await Promise.all(
      assetReturns.map((r: AssetReturn) => enrichReturnWithDetails(r))
    );

    // Scope list by the user's company and IT/Admin department scope.
    const assetScope = await getAssetScope(pool, req.user!.userID);
    const scopeCompanyId = assetScope.companyId ?? undefined;
    const scopeDeptIds = assetScope.departmentIds?.length
      ? assetScope.departmentIds
      : undefined;
    const isSuperAdmin = assetScope.isSuperAdmin;

    // For Global Admin with scope param, get category IDs for that scope
    let scopeCategoryIds: string[] | null = null;
    if (isSuperAdmin && scope) {
      const departmentIds = await getDepartmentIdsForScope(pool, scope, scopeCompanyId);
      if (departmentIds.length > 0) {
        const placeholders = departmentIds.map(() => '?').join(',');
        const [rows] = (await pool.execute(
          `SELECT categoryID FROM asset_categories WHERE department_id IN (${placeholders}) AND deleted_at IS NULL`,
          departmentIds
        )) as any[];
        scopeCategoryIds = (rows as any[]).map(r => String(r.categoryID));
      }
    }

    // Fetch all return forms (including declined) for full history and status.
    // Department scope applies to the general listing only; a self-view
    // (requestedUserId) stays company-scoped so the user's own returns are
    // never hidden by their asset scope.
    const formsRows = await fetchAssetReturnFormsRowsForUserList(
      scopeCompanyId,
      requestedUserId ? undefined : scopeDeptIds
    );
    let forms = (formsRows ?? []) as (AssetReturnForm & {
      declined_at?: string | null;
      declined_by?: string | null;
    })[];
    if (requestedUserId) {
      forms = forms.filter(
        (f: any) =>
          f.user_id === requestedUserId &&
          Number(f.owner_absent) !== 1
      );
    }

    // Transfer form link: return_form_id -> transfer form (for dept head status and "via asset transfer" note)
    const transferLinkRows = await getTransferFormLinksForReturnForms();
    const transferByReturnFormId = new Map<
      string,
      { dept_head_signed_at?: string | null; declined_at?: string | null }
    >();
    for (const row of transferLinkRows ?? []) {
      if (row.return_form_id) {
        transferByReturnFormId.set(row.return_form_id, {
          dept_head_signed_at: row.dept_head_signed_at ?? null,
          declined_at: row.declined_at ?? null,
        });
      }
    }

    function getReturnStatus(
      form: AssetReturnForm & {
        declined_at?: string | null;
        process_signed_at?: string | null;
        processor_declined_at?: string | null;
      }
    ): string {
      const linked = form.formID
        ? transferByReturnFormId.get(form.formID)
        : null;
      const declined = linked?.declined_at ?? (form as any).declined_at;
      const deptApproved =
        linked?.dept_head_signed_at ?? (form as any).dept_head_signed_at;
      const processSigned = (form as any).process_signed_at;
      const processorDeclined = (form as any).processor_declined_at;
      // Processor-initiated (hold) forms set process_signed_at at creation, so
      // they are only truly "Processed" once the dept head approved (which
      // executes the return). Non-hold flows set process_signed_at only when
      // processing actually happens, so they are unaffected.
      const holdStyle = Boolean((form as any).received_by);
      if (processSigned && (!holdStyle || deptApproved)) return 'Processed';
      if (processorDeclined) return 'Declined by processor';
      if (declined) return 'Declined by dept head';
      if (deptApproved) return 'Approved by dept head';
      return 'Pending';
    }

    function isViaAssetTransfer(formId: string | null | undefined): boolean {
      return !!(formId && transferByReturnFormId.has(formId));
    }

    // Enrich returnsWithDetails with status and viaAssetTransfer
    const formById = new Map(forms.map((f: any) => [f.formID, f]));
    for (const r of returnsWithDetails as any[]) {
      const form = r.form_id ? formById.get(r.form_id) : null;
      r.status = form ? getReturnStatus(form) : 'Processed';
      r.viaAssetTransfer = isViaAssetTransfer(r.form_id);
    }
    const returnsByFormId = new Map<string, (typeof returnsWithDetails)[0][]>();
    for (const r of returnsWithDetails as (typeof returnsWithDetails)[0][]) {
      const fid = (r as AssetReturn & { form_id?: string | null }).form_id;
      if (fid) {
        if (!returnsByFormId.has(fid)) returnsByFormId.set(fid, []);
        returnsByFormId.get(fid)!.push(r);
      }
    }

    // Processed-by for forms: resolve created_by / process_signed_by user names
    const processorNameUserIds = [
      ...new Set([
        ...forms.map(f => f.created_by),
        ...forms.map(
          f =>
            (f as AssetReturnForm & { process_signed_by?: string | null })
              .process_signed_by
        ),
      ]),
    ].filter(Boolean) as string[];
    const processorNames = new Map<string, string>();
    if (processorNameUserIds.length > 0) {
      const userRows = await getUserNamesByIds(processorNameUserIds);
      for (const u of userRows) {
        processorNames.set(
          u.userID,
          `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'
        );
      }
    }

    // Dept head approver names for forms
    const deptHeadSignedByIds = [
      ...new Set(
        forms
          .map(
            f =>
              (f as AssetReturnForm & { dept_head_signed_by?: string | null })
                .dept_head_signed_by
          )
          .filter(Boolean)
      ),
    ] as string[];
    const deptHeadNames = new Map<string, string>();
    const deptHeadPositions = new Map<string, string>();
    if (deptHeadSignedByIds.length > 0) {
      const userRows = await getUserNamesByIds(deptHeadSignedByIds);
      for (const u of userRows) {
        deptHeadNames.set(
          u.userID,
          `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'
        );
        if (u.position) deptHeadPositions.set(u.userID, String(u.position));
      }
    }

    // IT Manager approver names for forms
    const itManagerSignedByIds = [
      ...new Set(
        forms
          .map(
            f =>
              (f as AssetReturnForm & { it_manager_signed_by?: string | null })
                .it_manager_signed_by
          )
          .filter(Boolean)
      ),
    ] as string[];
    const itManagerNames = new Map<string, string>();
    const itManagerPositions = new Map<string, string>();
    if (itManagerSignedByIds.length > 0) {
      const userRows = await getUserNamesByIds(itManagerSignedByIds);
      for (const u of userRows) {
        itManagerNames.set(
          u.userID,
          `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'
        );
        if (u.position) itManagerPositions.set(u.userID, String(u.position));
      }
    }

    /** Submitter-facing status: Declined by processor | Returned | Approved by Department head | Submitted */
    function getSubmitterStatus(
      processSignedAt: string | null | undefined,
      deptHeadSignedAt: string | null | undefined,
      processorDeclinedAt: string | null | undefined
    ): string {
      if (processorDeclinedAt) return 'Declined by processor';
      // A processor-initiated (hold) form sets process_signed_at at creation;
      // it is only "Returned" once the dept head approved (which executed it).
      if (processSignedAt && deptHeadSignedAt) return 'Returned';
      if (deptHeadSignedAt) return 'Approved by Department head';
      return 'Submitted';
    }

    const assetReturnForms: {
      formID: string | null;
      form_number: string | null;
      return_batch_id: string | null;
      created_at: string;
      user_id: string;
      processed_by: string;
      signed_at?: string | null;
      signed_by?: string | null;
      signed_digital_signature?: string | null;
      process_signed_at?: string | null;
      process_digital_signature?: string | null;
      processor_pending_signed_at?: string | null;
      processor_pending_signature?: string | null;
      return_type?: string | null;
      received_by?: string | null;
      process_user_position?: string | null;
      processor_declined_at?: string | null;
      processor_decline_reason?: string | null;
      dept_head_signed_at?: string | null;
      dept_head_digital_signature?: string | null;
      dept_head_signed_by?: string | null;
      dept_head_user_name?: string | null;
      dept_head_position?: string | null;
      it_manager_signed_at?: string | null;
      it_manager_digital_signature?: string | null;
      it_manager_signed_by?: string | null;
      it_manager_user_name?: string | null;
      it_manager_position?: string | null;
      status?: string;
      form_department?: { id: string; name: string } | null;
      owner_absent?: boolean;
      returns: (typeof returnsWithDetails)[0][];
    }[] = [];

    for (const form of forms) {
      let returns = returnsByFormId.get(form.formID) ?? [];
      if (returns.length === 0) {
        const tfIds = await getTransferFormIdsByReturnFormId(form.formID);
        if (tfIds.length > 0) {
          const transferFormId = tfIds[0]!;
          const tfaRows = await getTransferFormAssignments(transferFormId);
          const tfaByAssignment = new Map<
            string,
            { condition: string | null; notes: string | null }
          >();
          for (const r of tfaRows ?? []) {
            tfaByAssignment.set(r.assignment_id, {
              condition: r.transfer_condition ?? null,
              notes: r.transfer_notes ?? null,
            });
          }
          const assignmentIds = (tfaRows ?? []).map(
            (r: any) => r.assignment_id
          );
          const syntheticReturns: any[] = [];
          for (const assignmentId of assignmentIds) {
            const [assignRows] = (await pool.execute(
              `SELECT aa.*, a.asset_code, a.name as asset_name, a.category_id, a.type_id,
                    ac.name as category_name, at.name as type_name,
                    u.first_name, u.last_name, u.email, u.employee_number, u.position,
                    d.name as department_name, l.name as location_name,
                    lr.room_name, l.floor_unit, l.building,
                    uc.companyID as user_company_id, uc.name as user_company_name,
                    ud.departmentID as user_department_id, ud.name as user_department_name
               FROM asset_assignments aa
               LEFT JOIN assets a ON aa.asset_id = a.assetID
               LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
               LEFT JOIN asset_types at ON a.type_id = at.typeID
               LEFT JOIN users u ON aa.user_id = u.userID
               LEFT JOIN companies uc ON u.company_id = uc.companyID AND uc.deleted_at IS NULL
               LEFT JOIN asset_mngmnt_departments ud ON u.department_id = ud.departmentID AND ud.deleted_at IS NULL
               LEFT JOIN asset_mngmnt_departments d ON aa.department_id = d.departmentID
               LEFT JOIN asset_mngmnt_locations l ON aa.location_id = l.locationID
               LEFT JOIN asset_mngmnt_location_rooms lr ON aa.location_room_id = lr.roomID
               WHERE aa.assignmentID = ? AND aa.deleted_at IS NULL`,
              [assignmentId]
            )) as any[];
            const assignment = assignRows?.[0];
            if (!assignment) continue;
            const tfa = tfaByAssignment.get(assignmentId);
            const status = getReturnStatus(form as any);
            const viaAssetTransfer = isViaAssetTransfer(form.formID);
            syntheticReturns.push({
              return_id: `synthetic-${form.formID}-${assignmentId}`,
              assignment_id: assignmentId,
              user_id: form.user_id,
              form_id: form.formID,
              return_condition: tfa?.condition ?? null,
              return_notes: tfa?.notes ?? null,
              processed_by:
                processorNames.get(form.created_by ?? '') ?? 'Unknown',
              created_at: form.created_at,
              status,
              viaAssetTransfer,
              assignment: {
                assignmentID: assignment.assignmentID,
                asset: {
                  id: assignment.asset_id,
                  code: assignment.asset_code,
                  name: assignment.asset_name,
                  category_id: assignment.category_id,
                  category_name: assignment.category_name,
                  type_id: assignment.type_id,
                  type_name: assignment.type_name,
                },
                user: {
                  id: assignment.user_id,
                  first_name: assignment.first_name,
                  last_name: assignment.last_name,
                  email: assignment.email,
                  employeeNumber: assignment.employee_number,
                  position: assignment.position ?? null,
                  company:
                    assignment.user_company_id != null
                      ? {
                          id: assignment.user_company_id,
                          name: assignment.user_company_name,
                        }
                      : undefined,
                  department:
                    assignment.user_department_id != null
                      ? {
                          id: assignment.user_department_id,
                          name: assignment.user_department_name,
                        }
                      : undefined,
                },
                department: assignment.department_id
                  ? {
                      id: assignment.department_id,
                      name: assignment.department_name,
                    }
                  : null,
                location: assignment.location_id
                  ? {
                      id: assignment.location_id,
                      name: assignment.location_name,
                      floor_unit: assignment.floor_unit ?? '',
                      building: assignment.building ?? '',
                      room_name: assignment.room_name ?? null,
                    }
                  : null,
                assigned_date: assignment.assigned_date,
                expected_return_date: assignment.expected_return_date,
                actual_return_date: assignment.actual_return_date,
              },
            } as unknown as (typeof returnsWithDetails)[0]);
          }
          returns = syntheticReturns;
        }
      }
      if (returns.length === 0) continue;
      const formWithProcess = form as AssetReturnForm & {
        signed_digital_signature?: string | null;
        process_signed_at?: string | null;
        process_digital_signature?: string | null;
        return_type?: string | null;
        received_by?: string | null;
        process_user_position?: string | null;
          processor_declined_at?: string | null;
        processor_decline_reason?: string | null;
        dept_head_signed_at?: string | null;
        dept_head_digital_signature?: string | null;
        dept_head_signed_by?: string | null;
        it_manager_signed_at?: string | null;
        it_manager_digital_signature?: string | null;
        it_manager_signed_by?: string | null;
      };
      const deptHeadSignedBy = formWithProcess.dept_head_signed_by ?? null;
      const itManagerSignedBy = formWithProcess.it_manager_signed_by ?? null;

      const processorFields = await resolveReturnProcessorFieldsForBatch(
        {
          formID: form.formID,
          user_id: form.user_id,
          created_by: form.created_by,
          process_signed_at: formWithProcess.process_signed_at,
          process_digital_signature: formWithProcess.process_digital_signature,
          process_signed_by: (form as { process_signed_by?: string | null })
            .process_signed_by,
        },
        { processorNames }
      );

      const linkedForStatus = form.formID
        ? transferByReturnFormId.get(form.formID)
        : null;
      const deptHeadApproved =
        linkedForStatus?.dept_head_signed_at ??
        formWithProcess.dept_head_signed_at;
      const processorDeclinedAt = formatProcessSignedAtForApi(
        (form as { processor_declined_at?: string | null })
          .processor_declined_at
      );
      const submitterStatus = getSubmitterStatus(
        processorFields.process_signed_at,
        deptHeadApproved,
        processorDeclinedAt
      );

      assetReturnForms.push({
        formID: form.formID,
        form_number: form.form_number,
        return_batch_id: null,
        created_at: form.created_at,
        user_id: form.user_id,
        processed_by: processorFields.processed_by,
        signed_at: (form as { signed_at?: string | null }).signed_at ?? null,
        signed_by: (form as { signed_by?: string | null }).signed_by ?? null,
        signed_digital_signature:
          formWithProcess.signed_digital_signature ?? null,
        process_signed_at: processorFields.process_signed_at,
        process_digital_signature: processorFields.process_digital_signature,
        processor_pending_signed_at: processorFields.processor_pending_signed_at,
        processor_pending_signature: processorFields.processor_pending_signature,
        return_type: formWithProcess.return_type ?? null,
        received_by: formWithProcess.received_by ?? null,
        process_user_position:
          (form as { process_user_position?: string | null })
            .process_user_position ?? null,
        processor_declined_at: processorDeclinedAt,
        processor_decline_reason:
          (form as { processor_decline_reason?: string | null })
            .processor_decline_reason ?? null,
        dept_head_signed_at: formatDeptHeadSignedAtForApi(
          formWithProcess.dept_head_signed_at
        ),
        dept_head_digital_signature:
          formWithProcess.dept_head_digital_signature ?? null,
        dept_head_signed_by: deptHeadSignedBy,
        dept_head_user_name: deptHeadSignedBy
          ? (deptHeadNames.get(deptHeadSignedBy) ?? null)
          : null,
        dept_head_position: deptHeadSignedBy
          ? (deptHeadPositions.get(deptHeadSignedBy) ?? null)
          : null,
        it_manager_signed_at: formatItManagerSignedAtForApi(
          formWithProcess.it_manager_signed_at
        ),
        it_manager_digital_signature:
          formWithProcess.it_manager_digital_signature ?? null,
        it_manager_signed_by: itManagerSignedBy,
        it_manager_user_name: itManagerSignedBy
          ? (itManagerNames.get(itManagerSignedBy) ?? null)
          : null,
        it_manager_position: itManagerSignedBy
          ? (itManagerPositions.get(itManagerSignedBy) ?? null)
          : null,
        status: submitterStatus,
        form_department:
          form.department_id && (form as any).form_department_name
            ? {
                id: form.department_id,
                name: (form as any).form_department_name,
              }
            : null,
        owner_absent: Number((form as { owner_absent?: number }).owner_absent) === 1,
        returns,
      });
    }

    // Legacy: returns with no form_id, group by return_batch_id ?? return_id
    const legacyReturns = returnsWithDetails.filter(
      (r: any) => !r.form_id
    ) as (typeof returnsWithDetails)[0][];
    const batchKey = (r: any) => r.return_batch_id ?? r.return_id;
    const byBatch = new Map<string, (typeof returnsWithDetails)[0][]>();
    for (const r of legacyReturns) {
      const key = batchKey(r);
      if (!byBatch.has(key)) byBatch.set(key, []);
      byBatch.get(key)!.push(r);
    }
    for (const [, returns] of byBatch) {
      if (returns.length === 0) continue;
      const first = returns[0]!;
      assetReturnForms.push({
        formID: null,
        form_number: null,
        return_batch_id: first.return_batch_id ?? null,
        created_at: first.created_at,
        user_id: first.user_id,
        processed_by: first.processed_by,
        signed_at: null,
        signed_by: null,
        signed_digital_signature: null,
        process_signed_at: null,
        process_digital_signature: null,
        return_type: null,
        received_by: null,
        process_user_position: null,
        processor_declined_at: null,
        processor_decline_reason: null,
        dept_head_signed_at: null,
        dept_head_digital_signature: null,
        dept_head_signed_by: null,
        dept_head_user_name: null,
        it_manager_signed_at: null,
        it_manager_digital_signature: null,
        it_manager_signed_by: null,
        it_manager_user_name: null,
        status: 'Submitted',
        form_department: null,
        owner_absent: false,
        returns,
      });
    }

    assetReturnForms.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Build flat list for Return History: DB returns + synthetic (hold-flow) returns
    const seenIds = new Set(
      (returnsWithDetails as any[]).map((r: any) =>
        r.return_id ? String(r.return_id) : `${r.form_id}-${r.assignment_id}`
      )
    );
    const syntheticFromForms: any[] = [];
    for (const form of assetReturnForms) {
      for (const r of form.returns as any[]) {
        const id = r.return_id ?? `${r.form_id}-${r.assignment_id}`;
        if (String(id).startsWith('synthetic-') && !seenIds.has(id)) {
          seenIds.add(id);
          syntheticFromForms.push(r);
        }
      }
    }
    const flatReturnHistory = [
      ...(returnsWithDetails as any[]),
      ...syntheticFromForms,
    ].sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );

    // Filter by scope category IDs (for Global Admin with IT/Admin scope)
    if (scopeCategoryIds && scopeCategoryIds.length > 0) {
      const categorySet = new Set(scopeCategoryIds);
      const filterFn = (r: any) => {
        const catId = r.assignment?.asset?.category_id ?? r.asset?.category_id ?? null;
        return catId && categorySet.has(String(catId));
      };
      // Filter flat history
      const filteredHistory = flatReturnHistory.filter(filterFn);
      flatReturnHistory.length = 0;
      flatReturnHistory.push(...filteredHistory);

      // Filter assetReturnForms - keep only forms that have returns matching the scope
      for (const form of assetReturnForms) {
        form.returns = form.returns.filter(filterFn);
      }
      // Remove forms with no returns
      const filteredForms = assetReturnForms.filter(f => f.returns.length > 0);
      assetReturnForms.length = 0;
      assetReturnForms.push(...filteredForms);
    }

    // Attach return form number to each flattened history row
    for (const r of flatReturnHistory as any[]) {
      const form = r.form_id ? formById.get(r.form_id) : null;
      r.form_number = form ? form.form_number : null;
    }

    // Attach accountability form numbers (from / new) and the temp-form owner
    await Promise.all(
      (flatReturnHistory as any[]).map(async (r: any) => {
        const assetId =
          r.assignment?.asset?.id ?? r.asset?.id ?? r.asset_id ?? null;
        const returnerUserId = r.assignment?.user?.id ?? r.user_id ?? null;
        const boundary = r.created_at ?? null;
        if (!assetId) {
          r.fromAccountabilityFormNumber = null;
          r.toAccountabilityFormNumber = null;
          r.newOwnerName = null;
          return;
        }
        const [fromForm, toForm] = await Promise.all([
          findAccountabilityFormForAsset({
            assetId,
            userId: returnerUserId,
            dateBoundary: boundary,
            direction: 'before',
          }),
          findAccountabilityFormForAsset({
            assetId,
            dateBoundary: boundary,
            direction: 'after',
            formOrigin: 'processor_return',
          }),
        ]);
        r.fromAccountabilityFormNumber = fromForm?.form_number ?? null;
        r.toAccountabilityFormNumber = toForm?.form_number ?? null;
        r.newOwnerName =
          toForm?.owner_first_name && toForm?.owner_last_name
            ? `${toForm.owner_first_name} ${toForm.owner_last_name}`
            : null;
      })
    );

    return res.json({
      assetReturns: flatReturnHistory,
      assetReturnForms,
    });
  } catch (error: any) {
    logger.error('Get asset returns failed:', error);
    return res.status(500).json({ error: 'Failed to fetch asset returns' });
  }
}

export async function getAssetReturnByIdHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { id } = req.params;

    const assetReturn = await AssetReturnModel.findById(id || '');

    if (!assetReturn) {
      return res.status(404).json({ error: 'Asset return not found' });
    }

    // Get assignment details
    const [assignmentRows] = (await pool.execute(
      `SELECT aa.*, a.asset_code, a.name as asset_name, a.category_id, a.type_id,
              ac.name as category_name, at.name as type_name,
              u.first_name, u.last_name, u.email, u.employee_number, u.position,
              d.name as department_name, l.name as location_name
       FROM asset_assignments aa
       LEFT JOIN assets a ON aa.asset_id = a.assetID
       LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
       LEFT JOIN asset_types at ON a.type_id = at.typeID
       LEFT JOIN users u ON aa.user_id = u.userID
       LEFT JOIN asset_mngmnt_departments d ON aa.department_id = d.departmentID
       LEFT JOIN asset_mngmnt_locations l ON aa.location_id = l.locationID
       WHERE aa.assignmentID = ?`,
      [assetReturn.assignment_id]
    )) as any[];

    const assignment = assignmentRows[0];

    const returnWithDetails = {
      ...assetReturn,
      assignment: assignment
        ? {
            assignmentID: assignment.assignmentID,
            asset: {
              id: assignment.asset_id,
              code: assignment.asset_code,
              name: assignment.asset_name,
              category_id: assignment.category_id,
              category_name: assignment.category_name,
              type_id: assignment.type_id,
              type_name: assignment.type_name,
            },
            user: {
              id: assignment.user_id,
              first_name: assignment.first_name,
              last_name: assignment.last_name,
              email: assignment.email,
              employeeNumber: assignment.employee_number,
              position: assignment.position ?? null,
            },
            department: assignment.department_id
              ? {
                  id: assignment.department_id,
                  name: assignment.department_name,
                }
              : null,
            location: assignment.location_id
              ? {
                  id: assignment.location_id,
                  name: assignment.location_name,
                }
              : null,
            assigned_date: assignment.assigned_date,
            expected_return_date: assignment.expected_return_date,
            actual_return_date: assignment.actual_return_date,
          }
        : null,
    };

    return res.json({ assetReturn: returnWithDetails });
  } catch (error: any) {
    logger.error('Get asset return by ID failed:', error);
    return res.status(500).json({ error: 'Failed to fetch asset return' });
  }
}

export async function signAssetReturnFormHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const userId = req.user!.userID;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const formRow = await getReturnFormById(formId);

    if (!formRow) {
      return res.status(404).json({ error: 'Asset return form not found' });
    }

    const form = formRow;

    if (form.user_id !== userId) {
      return res
        .status(403)
        .json({ error: 'You can only sign return forms assigned to you' });
    }

    const formOwnerAbsent = Number((form as { owner_absent?: number }).owner_absent) === 1;
    if (formOwnerAbsent && !form.signed_at) {
      return res.status(400).json({
        error:
          'This return form was submitted with the asset owner absent. Obtain the department head’s signature on the printed form instead of signing here.',
      });
    }

    if (form.signed_at) {
      return res
        .status(400)
        .json({ error: 'This return form is already signed' });
    }

    const body = req.body as {
      digitalSignature?: string | null;
      digital_signature?: string | null;
    };
    const returnerDigitalSignature =
      (typeof body.digitalSignature === 'string'
        ? body.digitalSignature.trim()
        : '') ||
      (typeof body.digital_signature === 'string'
        ? body.digital_signature.trim()
        : '') ||
      (await fetchUserDigitalSignature(userId));

    await executeRawWrite(
      `UPDATE asset_return_forms
       SET signed_at = NOW(), signed_by = ?, signed_digital_signature = ?, updated_at = NOW()
       WHERE formID = ?`,
      [userId, returnerDigitalSignature, formId]
    );

    await createAuditLog({
      userId,
      action: 'Signed Asset Return Form',
      resourceType: 'asset_return_form',
      resourceId: formId,
      details: `User signed asset return form ${form.form_number}`,
      newValues: { signed_at: new Date().toISOString(), signed_by: userId },
    });

    // Auto-sign linked offboarding checklists as employee
    try {
      const assignmentIds = await getAssignmentIdsByReturnFormId(formId);
      if (assignmentIds.length > 0) {
        const checklists = await checklistRepo.getChecklistsByAssignmentIds(assignmentIds);
        const unsignedChecklists = checklists.filter(
          (c: any) => !c.employee_signed_at
        );
        if (unsignedChecklists.length > 0) {
          await checklistRepo.signChecklistsAsEmployee({
            checklistIds: unsignedChecklists.map((c: any) => c.id),
            employeeId: userId,
            digitalSignature: returnerDigitalSignature,
          });
          await checklistRepo.backfillEmployeeChecklistSignatures({
            checklistIds: unsignedChecklists.map((c: any) => c.id),
            employeeId: userId,
            digitalSignature: returnerDigitalSignature ?? '',
          });
        }
      }
    } catch (checklistErr) {
      logger.error('Failed to auto-sign offboarding checklists:', checklistErr);
    }

    // Notify Manager Approver 1 users in the returner's department AND company
    // that the form has been signed and needs approval (mirrors the return request flow).
    try {
      const returnerUserDeptId = await getUserDepartmentId(form.user_id);
      let signCompanyId = form.company_id || null;
      if (!signCompanyId) {
        const deptRow = await getDepartmentById(form.department_id);
        signCompanyId = deptRow?.company_id ?? null;
      }
      if (!signCompanyId) {
const signerUser = await getUserById(form.user_id);
      signCompanyId = signerUser?.company_id ?? null;
    }
    if (signCompanyId && form.user_id) {
      const approverUserId = await getDesignatedApproverUserIdForRequester(form.user_id);
      const subApproverUserId = await getDesignatedSubApproverUserIdForRequester(form.user_id);
      const signerRow = await getUserNamesById(userId);
      const signerName = signerRow
        ? `${signerRow.first_name} ${signerRow.last_name}`.trim()
        : 'A user';
      const returnsForForm = await AssetReturnModel.findByFormId(formId);
      let assetCount = Array.isArray(returnsForForm)
        ? returnsForForm.length
        : 0;
      // Held-transfer flow: asset_returns rows are only created at execution time,
      // so derive the count from the linked transfer form's assignments instead.
      if (assetCount === 0) {
        const linkedTransferFormIds = await getTransferFormIdsByReturnFormId(formId);
        for (const linkedTransferFormId of linkedTransferFormIds) {
          const linkedAssignments = await getTransferFormAssignments(linkedTransferFormId);
          assetCount += (linkedAssignments || []).length;
        }
      }

const io = getIoInstance();
      const notifyUsers = [approverUserId, subApproverUserId].filter((id): id is string => id !== null && id !== userId);
      for (const approverUserId of notifyUsers) {
        const message = `${signerName} has signed the asset return form for ${assetCount} asset${assetCount !== 1 ? 's' : ''} and requires your approval.`;
        const payloadData = {
          form_id: formId,
          form_number: form.form_number,
          requester_id: form.user_id,
          requester_name: signerName,
          asset_count: assetCount,
          route: '/approvals',
          actionTarget: 'return_request_approval',
        };
        await createNotificationForApi({
          user_id: approverUserId,
          title: 'Asset Return Request Approval Needed',
          message,
          type: 'system',
          data: payloadData,
        });
        if (io) {
          emitNotification(io, approverUserId, 'notification', {
            id: formId,
            title: 'Asset Return Request Approval Needed',
            message,
            type: 'system',
            data: payloadData,
            time: new Date().toISOString(),
          });
        }
      }
    }
  } catch (notifError) {
    logger.error(
      'Failed to send Manager Approver 1 notification after return form sign:',
      notifError
    );
  }

  return res.json({
    message: 'Return form signed successfully',
    formID: formId,
    signed_at: new Date().toISOString(),
  });
} catch (error: any) {
    const message = error?.message ?? '';
    logger.error('Sign asset return form failed:', error);
    if (
      typeof message === 'string' &&
      (message.includes('Unknown column') ||
        message.includes('signed_at') ||
        message.includes('signed_by') ||
        message.includes('signed_digital_signature'))
    ) {
      return res.status(503).json({
        error:
          'Return form signing is not available: database schema may be outdated. Please run migration_add_asset_return_form_signed.sql and migration_add_returner_signature_asset_return_forms.sql',
      });
    }
    return res.status(500).json({ error: 'Failed to sign return form' });
  }
}

/** GET pending approvals: return forms with Returner signed but no Dept Head signature. Only designated Approver/Sub Approver users for the company. */
export async function getPendingApprovalsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.user!.userID;

    const { companyId, isSuperAdmin, isAdmin } = await getAssetScope(pool, userId);
    if (!companyId) {
      return res.json({ assetReturnForms: [] });
    }

    if (isSuperAdmin || isAdmin) {
      // Global Admin: show all forms in the active company. Local Admin: show all forms in own company.
      const pendingForms = await fetchPendingDeptHeadApprovalFormRowsByCompany(companyId);
      const formIds = pendingForms.map((r: any) => r.formID);

      if (formIds.length === 0) {
        return res.json({ assetReturnForms: [] });
      }
      // ... rest of processing (same as before)
      const assetReturns = await AssetReturnModel.findAll();
      const returnsWithDetails = await Promise.all(
        assetReturns.map((r: AssetReturn) => enrichReturnWithDetails(r))
      );
      const returnsByFormId = new Map<string, (typeof returnsWithDetails)[0][]>();
      for (const r of returnsWithDetails as (typeof returnsWithDetails)[0][]) {
        const fid = (r as AssetReturn & { form_id?: string | null }).form_id;
        if (fid && formIds.includes(fid)) {
          if (!returnsByFormId.has(fid)) returnsByFormId.set(fid, []);
          returnsByFormId.get(fid)!.push(r);
        }
      }

      const processorNameUserIds = [
        ...new Set([
          ...pendingForms.map((f: any) => f.created_by),
          ...pendingForms.map((f: any) => f.process_signed_by),
        ]),
      ].filter(Boolean) as string[];
      const processorNames = new Map<string, string>();
      if (processorNameUserIds.length > 0) {
        const userRows2 = await getUserNamesByIds(processorNameUserIds);
        for (const u of userRows2) {
          processorNames.set(
            u.userID,
            `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'
          );
        }
      }

      const assetReturnForms: {
        formID: string;
        form_number: string | null;
        return_batch_id: string | null;
        created_at: string;
        user_id: string;
        processed_by: string;
        signed_at?: string | null;
        signed_by?: string | null;
        signed_digital_signature?: string | null;
        process_signed_at?: string | null;
        process_digital_signature?: string | null;
        processor_pending_signed_at?: string | null;
        processor_pending_signature?: string | null;
        return_type?: string | null;
        received_by?: string | null;
        dept_head_signed_at?: string | null;
        dept_head_digital_signature?: string | null;
        dept_head_signed_by?: string | null;
        dept_head_user_name?: string | null;
        dept_head_position?: string | null;
        it_manager_signed_at?: string | null;
        it_manager_digital_signature?: string | null;
        it_manager_signed_by?: string | null;
        it_manager_user_name?: string | null;
        it_manager_position?: string | null;
        sub_approver_1_signed_at?: string | null;
        sub_approver_1_digital_signature?: string | null;
        sub_approver_1_signed_by?: string | null;
        sub_approver_1_user_name?: string | null;
        sub_approver_2_signed_at?: string | null;
        sub_approver_2_digital_signature?: string | null;
        sub_approver_2_signed_by?: string | null;
        sub_approver_2_user_name?: string | null;
        form_department?: { id: string; name: string } | null;
        owner_absent?: boolean;
        returns: (typeof returnsWithDetails)[0][];
      }[] = [];

      const sortOrder = (a: any, b: any) => {
        const oa = getDepartmentSortOrder(a.form_department_name);
        const ob = getDepartmentSortOrder(b.form_department_name);
        if (oa !== ob) return oa - ob;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      };
      pendingForms.sort(sortOrder);

      for (const form of pendingForms) {
        let returns = returnsByFormId.get(form.formID) ?? [];
        if (returns.length === 0) {
          const tfIds = await getTransferFormIdsByReturnFormId(form.formID);
          if (tfIds.length > 0) {
            const transferFormId = tfIds[0]!;
            const tfaRows = await getTransferFormAssignments(transferFormId);
            const tfaByAssignment = new Map<
              string,
              { condition: string | null; notes: string | null }
            >();
            for (const r of tfaRows ?? []) {
              tfaByAssignment.set(r.assignment_id, {
                condition: r.transfer_condition ?? null,
                notes: r.transfer_notes ?? null,
              });
            }
            const assignmentIds = (tfaRows ?? []).map(
              (r: any) => r.assignment_id
            );
            const syntheticReturns: (typeof returnsWithDetails)[0][] = [];
            for (const assignmentId of assignmentIds) {
              const [assignRows] = (await pool.execute(
                `SELECT aa.*, a.asset_code, a.name as asset_name, a.category_id, a.type_id,
                      ac.name as category_name, at.name as type_name,
                      u.first_name, u.last_name, u.email, u.employee_number, u.position,
                      d.name as department_name, l.name as location_name,
                      lr.room_name, l.floor_unit, l.building,
                      uc.companyID as user_company_id, uc.name as user_company_name,
                      ud.departmentID as user_department_id, ud.name as user_department_name
                 FROM asset_assignments aa
                 LEFT JOIN assets a ON aa.asset_id = a.assetID
                 LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
                 LEFT JOIN asset_types at ON a.type_id = at.typeID
                 LEFT JOIN users u ON aa.user_id = u.userID
                 LEFT JOIN companies uc ON u.company_id = uc.companyID AND uc.deleted_at IS NULL
                 LEFT JOIN asset_mngmnt_departments ud ON u.department_id = ud.departmentID AND ud.deleted_at IS NULL
                 LEFT JOIN asset_mngmnt_departments d ON aa.department_id = d.departmentID
                 LEFT JOIN asset_mngmnt_locations l ON aa.location_id = l.locationID
                 LEFT JOIN asset_mngmnt_location_rooms lr ON aa.location_room_id = lr.roomID
                WHERE aa.assignmentID = ? AND aa.deleted_at IS NULL`,
                [assignmentId]
              )) as any[];
              if (assignRows.length > 0) {
                const a = assignRows[0];
                const tfaInfo = tfaByAssignment.get(assignmentId) ?? { condition: null, notes: null };
                const historyDepartment = a.department_id
                  ? { id: a.department_id, name: a.department_name }
                  : null;
                const historyLocation = a.location_id
                  ? {
                      id: a.location_id,
                      name: a.location_name,
                      floor_unit: a.floor_unit ?? '',
                      building: a.building ?? '',
                      room_name: a.room_name ?? null,
                    }
                  : null;
                syntheticReturns.push({
                  return_id: `synthetic-${assignmentId}`,
                  assignment_id: assignmentId,
                  form_id: form.formID,
                  user_id: form.user_id,
                  return_condition: tfaInfo.condition ?? 'Good',
                  return_notes: tfaInfo.notes ?? '',
                  return_batch_id: form.return_batch_id ?? null,
                  return_location_id: a.location_id ?? null,
                  return_location_room_id: a.location_room_id ?? null,
                  return_department_id: a.department_id ?? null,
                  condition_images: null,
                  created_at: form.created_at,
                  updated_at: form.updated_at,
                  deleted_at: null,
                  processed_by: form.processed_by ?? 'Unknown',
                  assignment: a
                    ? {
                        assignmentID: a.assignmentID,
                        asset: {
                          id: a.asset_id,
                          code: a.asset_code,
                          name: a.asset_name,
                          category_id: a.category_id,
                          category_name: a.category_name,
                          type_id: a.type_id,
                          type_name: a.type_name,
                        },
                        user: {
                          id: a.user_id,
                          first_name: a.first_name,
                          last_name: a.last_name,
                          email: a.email,
                          employeeNumber: a.employee_number,
                          position: a.position ?? null,
                          company:
                            a.user_company_id != null
                              ? { id: a.user_company_id, name: a.user_company_name }
                              : undefined,
                          department:
                            a.user_department_id != null
                              ? {
                                  id: a.user_department_id,
                                  name: a.user_department_name,
                                }
                              : undefined,
                        },
                        department: historyDepartment,
                        location: historyLocation,
                        assigned_date: a.assigned_date,
                        expected_return_date: a.expected_return_date,
                        actual_return_date: a.actual_return_date,
                        assignment_notes: a.assignment_notes,
                        status: 'Returned',
                        assigned_by: {
                          id: a.assigned_by ?? '',
                          first_name: a.assigned_by_first_name ?? '',
                          last_name: a.assigned_by_last_name ?? '',
                        },
                      }
                    : null,
                } as any);
              }
            }
            returns = syntheticReturns;
          }
        }
        const requesterRow = returns[0];
        const requesterName = requesterRow?.assignment?.user
          ? `${requesterRow.assignment.user.first_name || ''} ${requesterRow.assignment.user.last_name || ''}`.trim()
          : 'Unknown';
        const formDept = form.form_department_name
          ? { id: form.department_id ?? '', name: form.form_department_name }
          : null;
        assetReturnForms.push({
          formID: form.formID,
          form_number: form.form_number,
          return_batch_id: form.return_batch_id,
          created_at: form.created_at,
          user_id: form.user_id,
          processed_by: form.processed_by,
          signed_at: form.signed_at,
          signed_by: form.signed_by,
          signed_digital_signature: form.signed_digital_signature,
          process_signed_at: form.process_signed_at,
          process_digital_signature: form.process_digital_signature,
          processor_pending_signed_at: form.processor_pending_signed_at,
          processor_pending_signature: form.processor_pending_signature,
          return_type: form.return_type,
          received_by: form.received_by,
          dept_head_signed_at: form.dept_head_signed_at,
          dept_head_digital_signature: form.dept_head_digital_signature,
          dept_head_signed_by: form.dept_head_signed_by,
          dept_head_user_name: processorNames.get(form.dept_head_signed_by ?? '') ?? null,
          sub_approver_1_signed_at: form.sub_approver_1_signed_at,
          sub_approver_1_digital_signature: form.sub_approver_1_digital_signature,
          sub_approver_1_signed_by: form.sub_approver_1_signed_by,
          sub_approver_1_user_name: processorNames.get(form.sub_approver_1_signed_by ?? '') ?? null,
          sub_approver_2_signed_at: form.sub_approver_2_signed_at,
          sub_approver_2_digital_signature: form.sub_approver_2_digital_signature,
          sub_approver_2_signed_by: form.sub_approver_2_signed_by,
          sub_approver_2_user_name: processorNames.get(form.sub_approver_2_signed_by ?? '') ?? null,
          form_department: formDept,
          owner_absent: form.owner_absent === 1,
          returns,
        });
      }

      return res.json({ assetReturnForms });
    }

    // Only see pending forms for requesters assigned to this user as approver
    const requesterIds = await getRequestersAssignedToApprover(userId, companyId);
    if (requesterIds.length === 0) {
      return res.json({ assetReturnForms: [] });
    }
    const requesterSet = new Set(requesterIds);

    const allPendingForms = await fetchPendingDeptHeadApprovalFormRowsByCompany(companyId);
    const pendingForms = allPendingForms.filter((r: any) => requesterSet.has(String(r.user_id)));
    const formIds = pendingForms.map((r: any) => r.formID);

    if (formIds.length === 0) {
      return res.json({ assetReturnForms: [] });
    }

    const assetReturns = await AssetReturnModel.findAll();
    const returnsWithDetails = await Promise.all(
      assetReturns.map((r: AssetReturn) => enrichReturnWithDetails(r))
    );
    const returnsByFormId = new Map<string, (typeof returnsWithDetails)[0][]>();
    for (const r of returnsWithDetails as (typeof returnsWithDetails)[0][]) {
      const fid = (r as AssetReturn & { form_id?: string | null }).form_id;
      if (fid && formIds.includes(fid)) {
        if (!returnsByFormId.has(fid)) returnsByFormId.set(fid, []);
        returnsByFormId.get(fid)!.push(r);
      }
    }

    const processorNameUserIds = [
      ...new Set([
        ...pendingForms.map((f: any) => f.created_by),
        ...pendingForms.map((f: any) => f.process_signed_by),
      ]),
    ].filter(Boolean) as string[];
    const processorNames = new Map<string, string>();
    if (processorNameUserIds.length > 0) {
      const userRows2 = await getUserNamesByIds(processorNameUserIds);
      for (const u of userRows2) {
        processorNames.set(
          u.userID,
          `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'
        );
      }
    }

    const assetReturnForms: {
      formID: string;
      form_number: string | null;
      return_batch_id: string | null;
      created_at: string;
      user_id: string;
      processed_by: string;
      signed_at?: string | null;
      signed_by?: string | null;
      signed_digital_signature?: string | null;
      process_signed_at?: string | null;
      process_digital_signature?: string | null;
      processor_pending_signed_at?: string | null;
      processor_pending_signature?: string | null;
      return_type?: string | null;
      received_by?: string | null;
      dept_head_signed_at?: string | null;
      dept_head_digital_signature?: string | null;
      dept_head_signed_by?: string | null;
      dept_head_user_name?: string | null;
      sub_approver_1_signed_at?: string | null;
      sub_approver_1_digital_signature?: string | null;
      sub_approver_1_signed_by?: string | null;
      sub_approver_1_user_name?: string | null;
      sub_approver_2_signed_at?: string | null;
      sub_approver_2_digital_signature?: string | null;
      sub_approver_2_signed_by?: string | null;
      sub_approver_2_user_name?: string | null;
      form_department?: { id: string; name: string } | null;
      owner_absent?: boolean;
      returns: (typeof returnsWithDetails)[0][];
    }[] = [];

    const sortOrder = (a: any, b: any) => {
      const oa = getDepartmentSortOrder(a.form_department_name);
      const ob = getDepartmentSortOrder(b.form_department_name);
      if (oa !== ob) return oa - ob;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    };
    pendingForms.sort(sortOrder);

    for (const form of pendingForms) {
      let returns = returnsByFormId.get(form.formID) ?? [];
      if (returns.length === 0) {
        const tfIds = await getTransferFormIdsByReturnFormId(form.formID);
        if (tfIds.length > 0) {
          const transferFormId = tfIds[0]!;
          const tfaRows = await getTransferFormAssignments(transferFormId);
          const tfaByAssignment = new Map<
            string,
            { condition: string | null; notes: string | null }
          >();
          for (const r of tfaRows ?? []) {
            tfaByAssignment.set(r.assignment_id, {
              condition: r.transfer_condition ?? null,
              notes: r.transfer_notes ?? null,
            });
          }
          const assignmentIds = (tfaRows ?? []).map(
            (r: any) => r.assignment_id
          );
          const syntheticReturns: (typeof returnsWithDetails)[0][] = [];
          for (const assignmentId of assignmentIds) {
            const [assignRows] = (await pool.execute(
              `SELECT aa.*, a.asset_code, a.name as asset_name, a.category_id, a.type_id,
                    ac.name as category_name, at.name as type_name,
                    u.first_name, u.last_name, u.email, u.employee_number, u.position,
                    d.name as department_name, l.name as location_name,
                    lr.room_name, l.floor_unit, l.building,
                    uc.companyID as user_company_id, uc.name as user_company_name,
                    ud.departmentID as user_department_id, ud.name as user_department_name
               FROM asset_assignments aa
               LEFT JOIN assets a ON aa.asset_id = a.assetID
               LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
               LEFT JOIN asset_types at ON a.type_id = at.typeID
               LEFT JOIN users u ON aa.user_id = u.userID
               LEFT JOIN companies uc ON u.company_id = uc.companyID AND uc.deleted_at IS NULL
               LEFT JOIN asset_mngmnt_departments ud ON u.department_id = ud.departmentID AND ud.deleted_at IS NULL
               LEFT JOIN asset_mngmnt_departments d ON aa.department_id = d.departmentID
               LEFT JOIN asset_mngmnt_locations l ON aa.location_id = l.locationID
               LEFT JOIN asset_mngmnt_location_rooms lr ON aa.location_room_id = lr.roomID
               WHERE aa.assignmentID = ? AND aa.deleted_at IS NULL`,
              [assignmentId]
            )) as any[];
            const assignment = assignRows?.[0];
            if (!assignment) continue;
            const tfa = tfaByAssignment.get(assignmentId);
            syntheticReturns.push({
              assignment_id: assignmentId,
              user_id: form.user_id,
              form_id: form.formID,
              return_condition: tfa?.condition ?? null,
              return_notes: tfa?.notes ?? null,
              processed_by:
                processorNames.get(form.created_by ?? '') ?? 'Unknown',
              assignment: {
                assignmentID: assignment.assignmentID,
                asset: {
                  id: assignment.asset_id,
                  code: assignment.asset_code,
                  name: assignment.asset_name,
                  category_id: assignment.category_id,
                  category_name: assignment.category_name,
                  type_id: assignment.type_id,
                  type_name: assignment.type_name,
                },
                user: {
                  id: assignment.user_id,
                  first_name: assignment.first_name,
                  last_name: assignment.last_name,
                  email: assignment.email,
                  employeeNumber: assignment.employee_number,
                  position: assignment.position ?? null,
                  company:
                    assignment.user_company_id != null
                      ? {
                          id: assignment.user_company_id,
                          name: assignment.user_company_name,
                        }
                      : undefined,
                  department:
                    assignment.user_department_id != null
                      ? {
                          id: assignment.user_department_id,
                          name: assignment.user_department_name,
                        }
                      : undefined,
                },
                department: assignment.department_id
                  ? {
                      id: assignment.department_id,
                      name: assignment.department_name,
                    }
                  : null,
                location: assignment.location_id
                  ? {
                      id: assignment.location_id,
                      name: assignment.location_name,
                      floor_unit: assignment.floor_unit ?? '',
                      building: assignment.building ?? '',
                      room_name: assignment.room_name ?? null,
                    }
                  : null,
                assigned_date: assignment.assigned_date,
                expected_return_date: assignment.expected_return_date,
                actual_return_date: assignment.actual_return_date,
              },
            } as unknown as (typeof returnsWithDetails)[0]);
          }
          returns = syntheticReturns;
        }
      }
      if (returns.length === 0) continue;

      const processorFields = await resolveReturnProcessorFieldsForBatch(
        {
          formID: form.formID,
          user_id: form.user_id,
          created_by: form.created_by,
          process_signed_at: form.process_signed_at,
          process_digital_signature: form.process_digital_signature,
          process_signed_by: (form as { process_signed_by?: string | null })
            .process_signed_by,
        },
        { processorNames }
      );

      assetReturnForms.push({
        formID: form.formID,
        form_number: form.form_number,
        return_batch_id: null,
        created_at: form.created_at,
        user_id: form.user_id,
        processed_by: processorFields.processed_by,
        signed_at: form.signed_at ?? null,
        signed_by: form.signed_by ?? null,
        signed_digital_signature: form.signed_digital_signature ?? null,
        process_signed_at: processorFields.process_signed_at,
        process_digital_signature: processorFields.process_digital_signature,
        processor_pending_signed_at: processorFields.processor_pending_signed_at,
        processor_pending_signature: processorFields.processor_pending_signature,
        return_type: form.return_type ?? null,
        received_by: form.received_by ?? null,
        dept_head_signed_at: null,
        dept_head_digital_signature: null,
        dept_head_signed_by: null,
        dept_head_user_name: null,
        sub_approver_1_signed_at: null,
        sub_approver_1_digital_signature: null,
        sub_approver_1_signed_by: null,
        sub_approver_1_user_name: null,
        sub_approver_2_signed_at: null,
        sub_approver_2_digital_signature: null,
        sub_approver_2_signed_by: null,
        sub_approver_2_user_name: null,
        form_department:
          form.department_id && form.form_department_name
            ? { id: form.department_id, name: form.form_department_name }
            : null,
        owner_absent: Number((form as { owner_absent?: number }).owner_absent) === 1,
        returns,
      });
    }

    return res.json({ assetReturnForms });
  } catch (error: any) {
    logger.error('Get pending approvals failed:', error);
    return res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
}

/** GET forms approved by the current user (dept_head_signed_by = userId). */
export async function getApprovedByMeHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userID;

    const [formRows] = (await pool.execute(
      `SELECT arf.formID, arf.form_number, arf.user_id, arf.department_id, arf.location_id, arf.location_room_id, arf.created_by, arf.created_at, arf.updated_at, arf.deleted_at,
        arf.signed_at, arf.signed_by, arf.signed_digital_signature,
        DATE_FORMAT(arf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
        arf.process_digital_signature, arf.process_signed_by, arf.return_type, arf.received_by,
        DATE_FORMAT(arf.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
        arf.dept_head_digital_signature, arf.dept_head_signed_by,
        DATE_FORMAT(arf.it_manager_signed_at, '%Y-%m-%d %H:%i:%s') AS it_manager_signed_at,
        arf.it_manager_digital_signature, arf.it_manager_signed_by,
        DATE_FORMAT(arf.sub_approver_1_signed_at, '%Y-%m-%d %H:%i:%s') AS sub_approver_1_signed_at,
        arf.sub_approver_1_digital_signature, arf.sub_approver_1_signed_by,
        DATE_FORMAT(arf.sub_approver_2_signed_at, '%Y-%m-%d %H:%i:%s') AS sub_approver_2_signed_at,
        arf.sub_approver_2_digital_signature, arf.sub_approver_2_signed_by,
        d.name AS form_department_name
       FROM asset_return_forms arf
       LEFT JOIN asset_mngmnt_departments d ON arf.department_id = d.departmentID
       WHERE arf.deleted_at IS NULL AND arf.dept_head_signed_at IS NOT NULL
         AND (arf.dept_head_signed_by = ?
              OR arf.it_manager_signed_by = ?
              OR arf.sub_approver_1_signed_by = ?
              OR arf.sub_approver_2_signed_by = ?)`,
      [userId, userId, userId, userId]
    )) as any[];

    if (formRows.length === 0) {
      return res.json({ assetReturnForms: [] });
    }

    const formIds = formRows.map((r: any) => r.formID);
    const assetReturns = await AssetReturnModel.findAll();
    const returnsWithDetails = await Promise.all(
      assetReturns.map((r: AssetReturn) => enrichReturnWithDetails(r))
    );
    const returnsByFormId = new Map<string, (typeof returnsWithDetails)[0][]>();
    for (const r of returnsWithDetails as (typeof returnsWithDetails)[0][]) {
      const fid = (r as AssetReturn & { form_id?: string | null }).form_id;
      if (fid && formIds.includes(fid)) {
        if (!returnsByFormId.has(fid)) returnsByFormId.set(fid, []);
        returnsByFormId.get(fid)!.push(r);
      }
    }

    const processorNameUserIds = [
      ...new Set([
        ...formRows.map((f: any) => f.created_by),
        ...formRows.map((f: any) => f.process_signed_by),
      ]),
    ].filter(Boolean) as string[];
    const processorNames = new Map<string, string>();
    if (processorNameUserIds.length > 0) {
      const userRows2 = await getUserNamesByIds(processorNameUserIds);
      for (const u of userRows2) {
        processorNames.set(
          u.userID,
          `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'
        );
      }
    }

    const deptHeadSignedByIds = [
      ...new Set(
        formRows.map((f: any) => f.dept_head_signed_by).filter(Boolean)
      ),
    ] as string[];
    const deptHeadNames = new Map<string, string>();
    const deptHeadPositions = new Map<string, string>();
    if (deptHeadSignedByIds.length > 0) {
      const deptHeadUserRows = await getUserNamesByIds(deptHeadSignedByIds);
      for (const u of deptHeadUserRows) {
        deptHeadNames.set(
          u.userID,
          `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'
        );
        if (u.position) deptHeadPositions.set(u.userID, String(u.position));
      }
    }

    const itManagerSignedByIds = [
      ...new Set(
        formRows.map((f: any) => f.it_manager_signed_by).filter(Boolean)
      ),
    ] as string[];
    const itManagerNames = new Map<string, string>();
    const itManagerPositions = new Map<string, string>();
    if (itManagerSignedByIds.length > 0) {
      const userRows3 = await getUserNamesByIds(itManagerSignedByIds);
      for (const u of userRows3) {
        itManagerNames.set(
          u.userID,
          `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'
        );
        if (u.position) itManagerPositions.set(u.userID, String(u.position));
      }
    }

    const subApprover1SignedByIds = [
      ...new Set(
        formRows.map((f: any) => f.sub_approver_1_signed_by).filter(Boolean)
      ),
    ] as string[];
    const subApprover1Names = new Map<string, string>();
    const subApprover1Positions = new Map<string, string>();
    if (subApprover1SignedByIds.length > 0) {
      const userRows4 = await getUserNamesByIds(subApprover1SignedByIds);
      for (const u of userRows4) {
        subApprover1Names.set(
          u.userID,
          `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'
        );
        if (u.position) subApprover1Positions.set(u.userID, String(u.position));
      }
    }

    const subApprover2SignedByIds = [
      ...new Set(
        formRows.map((f: any) => f.sub_approver_2_signed_by).filter(Boolean)
      ),
    ] as string[];
    const subApprover2Names = new Map<string, string>();
    const subApprover2Positions = new Map<string, string>();
    if (subApprover2SignedByIds.length > 0) {
      const userRows5 = await getUserNamesByIds(subApprover2SignedByIds);
      for (const u of userRows5) {
        subApprover2Names.set(
          u.userID,
          `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'
        );
        if (u.position) subApprover2Positions.set(u.userID, String(u.position));
      }
    }

    const assetReturnForms: {
      formID: string;
      form_number: string | null;
      return_batch_id: string | null;
      created_at: string;
      user_id: string;
      processed_by: string;
      signed_at?: string | null;
      signed_by?: string | null;
      signed_digital_signature?: string | null;
      process_signed_at?: string | null;
      process_digital_signature?: string | null;
      processor_pending_signed_at?: string | null;
      processor_pending_signature?: string | null;
      return_type?: string | null;
      received_by?: string | null;
      dept_head_signed_at?: string | null;
      dept_head_digital_signature?: string | null;
      dept_head_signed_by?: string | null;
      dept_head_user_name?: string | null;
      dept_head_position?: string | null;
      it_manager_signed_at?: string | null;
      it_manager_digital_signature?: string | null;
      it_manager_signed_by?: string | null;
      it_manager_user_name?: string | null;
      it_manager_position?: string | null;
      sub_approver_1_signed_at?: string | null;
      sub_approver_1_digital_signature?: string | null;
      sub_approver_1_signed_by?: string | null;
      sub_approver_1_user_name?: string | null;
      sub_approver_1_position?: string | null;
      sub_approver_2_signed_at?: string | null;
      sub_approver_2_digital_signature?: string | null;
      sub_approver_2_signed_by?: string | null;
      sub_approver_2_user_name?: string | null;
      sub_approver_2_position?: string | null;
      form_department?: { id: string; name: string } | null;
      returns: (typeof returnsWithDetails)[0][];
    }[] = [];

    formRows.sort(
      (a: any, b: any) =>
        new Date(b.dept_head_signed_at).getTime() -
        new Date(a.dept_head_signed_at).getTime()
    );

    for (const form of formRows) {
      const returns = returnsByFormId.get(form.formID) ?? [];
      if (returns.length === 0) continue;
      const processorFields = await resolveReturnProcessorFieldsForBatch(
        {
          formID: form.formID,
          user_id: form.user_id,
          created_by: form.created_by,
          process_signed_at: form.process_signed_at,
          process_digital_signature: form.process_digital_signature,
          process_signed_by: (form as { process_signed_by?: string | null })
            .process_signed_by,
        },
        { processorNames }
      );
      assetReturnForms.push({
        formID: form.formID,
        form_number: form.form_number,
        return_batch_id: null,
        created_at: form.created_at,
        user_id: form.user_id,
        processed_by: processorFields.processed_by,
        signed_at: form.signed_at ?? null,
        signed_by: form.signed_by ?? null,
        signed_digital_signature: form.signed_digital_signature ?? null,
        process_signed_at: processorFields.process_signed_at,
        process_digital_signature: processorFields.process_digital_signature,
        processor_pending_signed_at: processorFields.processor_pending_signed_at,
        processor_pending_signature: processorFields.processor_pending_signature,
        return_type: form.return_type ?? null,
        received_by: form.received_by ?? null,
        dept_head_signed_at: formatDeptHeadSignedAtForApi(
          form.dept_head_signed_at
        ),
        dept_head_digital_signature: form.dept_head_digital_signature ?? null,
        dept_head_signed_by: form.dept_head_signed_by ?? null,
        dept_head_user_name: form.dept_head_signed_by
          ? (deptHeadNames.get(form.dept_head_signed_by) ?? null)
          : null,
        dept_head_position: form.dept_head_signed_by
          ? (deptHeadPositions.get(form.dept_head_signed_by) ?? null)
          : null,
        it_manager_signed_at: formatItManagerSignedAtForApi(
          form.it_manager_signed_at
        ),
        it_manager_digital_signature: form.it_manager_digital_signature ?? null,
        it_manager_signed_by: form.it_manager_signed_by ?? null,
        it_manager_user_name: form.it_manager_signed_by
          ? (itManagerNames.get(form.it_manager_signed_by) ?? null)
          : null,
        it_manager_position: form.it_manager_signed_by
          ? (itManagerPositions.get(form.it_manager_signed_by) ?? null)
          : null,
        sub_approver_1_signed_at: formatItManagerSignedAtForApi(
          form.sub_approver_1_signed_at
        ),
        sub_approver_1_digital_signature:
          form.sub_approver_1_digital_signature ?? null,
        sub_approver_1_signed_by: form.sub_approver_1_signed_by ?? null,
        sub_approver_1_user_name: form.sub_approver_1_signed_by
          ? (subApprover1Names.get(form.sub_approver_1_signed_by) ?? null)
          : null,
        sub_approver_1_position: form.sub_approver_1_signed_by
          ? (subApprover1Positions.get(form.sub_approver_1_signed_by) ?? null)
          : null,
        sub_approver_2_signed_at: formatItManagerSignedAtForApi(
          form.sub_approver_2_signed_at
        ),
        sub_approver_2_digital_signature:
          form.sub_approver_2_digital_signature ?? null,
        sub_approver_2_signed_by: form.sub_approver_2_signed_by ?? null,
        sub_approver_2_user_name: form.sub_approver_2_signed_by
          ? (subApprover2Names.get(form.sub_approver_2_signed_by) ?? null)
          : null,
        sub_approver_2_position: form.sub_approver_2_signed_by
          ? (subApprover2Positions.get(form.sub_approver_2_signed_by) ?? null)
          : null,
        form_department:
          form.department_id && form.form_department_name
            ? { id: form.department_id, name: form.form_department_name }
            : null,
        returns,
      });
    }

    return res.json({ assetReturnForms });
  } catch (error: any) {
    logger.error('Get approved by me failed:', error);
    return res.status(500).json({ error: 'Failed to fetch approved forms' });
  }
}

/** GET pending-staff: forms approved by Dept Head but not yet process-signed. Filter by company and by current user role asset_type (it -> IT dept forms, admin -> Admin dept forms). */
export async function getPendingStaffHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userID;
    const { companyId, departmentIds } = await getAssetScope(pool, userId);
    if (!companyId) {
      return res.json({ assetReturnForms: [] });
    }

    const [formRows] = (await pool.execute(
      `SELECT arf.formID, arf.form_number, arf.user_id, arf.department_id, arf.location_id, arf.location_room_id, arf.created_by, arf.created_at, arf.updated_at, arf.deleted_at,
        arf.signed_at, arf.signed_by, arf.signed_digital_signature,
        DATE_FORMAT(arf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
        arf.process_digital_signature, arf.process_signed_by, arf.return_type, arf.received_by,
        DATE_FORMAT(arf.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
        DATE_FORMAT(arf.sub_approver_1_signed_at, '%Y-%m-%d %H:%i:%s') AS sub_approver_1_signed_at,
        arf.dept_head_digital_signature, arf.dept_head_signed_by,
        d.company_id AS form_company_id, d.name AS form_department_name
       FROM asset_return_forms arf
       LEFT JOIN asset_mngmnt_departments d ON arf.department_id = d.departmentID
       WHERE arf.deleted_at IS NULL
         AND arf.signed_at IS NOT NULL
         AND (arf.dept_head_signed_at IS NOT NULL OR arf.sub_approver_1_signed_at IS NOT NULL)
         AND arf.process_signed_at IS NULL
         AND (arf.processor_declined_at IS NULL)`
    )) as any[];

    let pendingForms = formRows.filter(
      (row: any) => row.form_company_id === companyId
    );

    // Align IT/Admin scope with asset list/dashboard: if the user's role
    // is scoped to specific departments, only show forms for those departments.
    if (departmentIds && departmentIds.length > 0) {
      const allowed = new Set(departmentIds);
      pendingForms = pendingForms.filter(
        (row: any) =>
          row.department_id && allowed.has(String(row.department_id))
      );
    }

    const formIds = pendingForms.map((r: any) => r.formID);
    if (formIds.length === 0) {
      return res.json({ assetReturnForms: [] });
    }

    const assetReturns = await AssetReturnModel.findAll();
    const returnsWithDetails = await Promise.all(
      assetReturns.map((r: AssetReturn) => enrichReturnWithDetails(r))
    );
    const returnsByFormId = new Map<string, (typeof returnsWithDetails)[0][]>();
    for (const r of returnsWithDetails as (typeof returnsWithDetails)[0][]) {
      const fid = (r as AssetReturn & { form_id?: string | null }).form_id;
      if (fid && formIds.includes(fid)) {
        if (!returnsByFormId.has(fid)) returnsByFormId.set(fid, []);
        returnsByFormId.get(fid)!.push(r);
      }
    }

    const sortOrder = (a: any, b: any) => {
      const oa = getDepartmentSortOrder(a.form_department_name);
      const ob = getDepartmentSortOrder(b.form_department_name);
      if (oa !== ob) return oa - ob;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    };
    pendingForms.sort(sortOrder);

    const assetReturnForms: {
      formID: string;
      form_number: string | null;
      created_at: string;
      user_id: string;
      processed_by: string;
      signed_at?: string | null;
      signed_by?: string | null;
      signed_digital_signature?: string | null;
      process_signed_at?: string | null;
      process_digital_signature?: string | null;
      processor_pending_signed_at?: string | null;
      processor_pending_signature?: string | null;
      return_type?: string | null;
      received_by?: string | null;
      dept_head_signed_at?: string | null;
      sub_approver_1_signed_at?: string | null;
      dept_head_digital_signature?: string | null;
      dept_head_signed_by?: string | null;
      returns: (typeof returnsWithDetails)[0][];
    }[] = [];

    for (const form of pendingForms) {
      const returns = returnsByFormId.get(form.formID) ?? [];
      if (returns.length === 0) continue;
      assetReturnForms.push({
        formID: form.formID,
        form_number: form.form_number,
        created_at: form.created_at,
        user_id: form.user_id,
        processed_by: '',
        signed_at: form.signed_at ?? null,
        signed_by: form.signed_by ?? null,
        signed_digital_signature: form.signed_digital_signature ?? null,
        process_signed_at: null,
        process_digital_signature: null,
        return_type:
          form.return_type ??
          (form as { RETURN_TYPE?: string | null }).RETURN_TYPE ??
          null,
        received_by: form.received_by ?? null,
        dept_head_signed_at: formatDeptHeadSignedAtForApi(
          form.dept_head_signed_at
        ),
        sub_approver_1_signed_at: formatDeptHeadSignedAtForApi(
          form.sub_approver_1_signed_at
        ),
        dept_head_digital_signature: form.dept_head_digital_signature ?? null,
        dept_head_signed_by: form.dept_head_signed_by ?? null,
        returns,
      });
    }

    return res.json({ assetReturnForms });
  } catch (error: any) {
    logger.error('Get pending-staff failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch pending staff forms' });
  }
}

/** GET return forms processed by the current user. Mirrors getPendingStaffHandler but filters forms where process_signed_at is set and process_signed_by matches the current user. For admins (global admin, admin role), shows all processed forms in their company scope. Supports optional scope filter (it | admin). */
export async function getReturnProcessedByMeHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.user!.userID;
    const scope = (req.query.scope as 'it' | 'admin' | undefined)?.toLowerCase();
    const { companyId, departmentIds, isSuperAdmin } = await getAssetScope(pool, userId);
    if (!companyId) {
      return res.json({ assetReturnForms: [] });
    }

    const isAdminScope = isSuperAdmin || departmentIds === null;

    // For admins (global admin, admin), apply scope filter to department IDs
    let effectiveDeptIds = departmentIds;
    if ((isSuperAdmin || departmentIds === null) && scope) {
      const targetDeptPattern = scope === 'it' ? '%IT%' : '%Admin%';
      const patterns = [
        targetDeptPattern,
        targetDeptPattern === '%IT%'
          ? '%Information Technology%'
          : '%Administration%',
      ];
      let sql = `SELECT departmentID 
         FROM asset_mngmnt_departments 
         WHERE (name LIKE ? OR name LIKE ?) AND deleted_at IS NULL AND company_id = ?`;
      const params = [...patterns, companyId];
      const [deptRows] = (await pool.execute(sql, params)) as any[];
      effectiveDeptIds = deptRows.map((row: any) => row.departmentID);
    }

    const [formRows] = (await pool.execute(
      `SELECT arf.formID, arf.form_number, arf.user_id, arf.department_id, arf.location_id, arf.location_room_id, arf.created_by, arf.created_at, arf.updated_at, arf.deleted_at,
        arf.signed_at, arf.signed_by, arf.signed_digital_signature,
        DATE_FORMAT(arf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
        arf.process_digital_signature, arf.process_signed_by, arf.return_type, arf.received_by,
        DATE_FORMAT(arf.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
        arf.dept_head_digital_signature, arf.dept_head_signed_by,
        d.company_id AS form_company_id, d.name AS form_department_name
       FROM asset_return_forms arf
       LEFT JOIN asset_mngmnt_departments d ON arf.department_id = d.departmentID
       WHERE arf.deleted_at IS NULL
         AND arf.process_signed_at IS NOT NULL
         AND d.company_id = ?
         ${!isAdminScope ? 'AND arf.process_signed_by = ?' : ''}
       ORDER BY arf.process_signed_at DESC`,
      isAdminScope ? [companyId] : [companyId, userId]
    )) as any[];

    // Apply department scope filter (effectiveDeptIds includes scope filter for admins)
    const filteredRows = effectiveDeptIds && effectiveDeptIds.length > 0
      ? (formRows as any[]).filter((r: any) => r.department_id && effectiveDeptIds.includes(String(r.department_id)))
      : formRows;

    const formIds = (filteredRows as any[]).map((r: any) => r.formID);
    if (formIds.length === 0) {
      return res.json({ assetReturnForms: [] });
    }

    const assetReturns = await AssetReturnModel.findAll();
    const returnsWithDetails = await Promise.all(
      assetReturns.map((r: AssetReturn) => enrichReturnWithDetails(r))
    );
    const returnsByFormId = new Map<string, (typeof returnsWithDetails)[0][]>();
    for (const r of returnsWithDetails as (typeof returnsWithDetails)[0][]) {
      const fid = (r as AssetReturn & { form_id?: string | null }).form_id;
      if (fid && formIds.includes(fid)) {
        if (!returnsByFormId.has(fid)) returnsByFormId.set(fid, []);
        returnsByFormId.get(fid)!.push(r);
      }
    }

    // For admin scope, we need the actual processor name per form
    const processorNamesCache = new Map<string, string>();

    const assetReturnForms: {
      formID: string;
      form_number: string | null;
      created_at: string;
      user_id: string;
      processed_by: string;
      signed_at?: string | null;
      signed_by?: string | null;
      signed_digital_signature?: string | null;
      process_signed_at?: string | null;
      process_digital_signature?: string | null;
      processor_pending_signed_at?: string | null;
      processor_pending_signature?: string | null;
      return_type?: string | null;
      received_by?: string | null;
      dept_head_signed_at?: string | null;
      dept_head_digital_signature?: string | null;
      dept_head_signed_by?: string | null;
      returns: (typeof returnsWithDetails)[0][];
    }[] = [];

    for (const form of filteredRows as any[]) {
      const returns = returnsByFormId.get(form.formID) ?? [];
      if (returns.length === 0) continue;

      let processedByName: string;
      if (isAdminScope) {
        // Get the actual processor name for this form
        if (!processorNamesCache.has(form.process_signed_by)) {
          const processorNames = await getUserNamesById(form.process_signed_by);
          processedByName = processorNames
            ? `${processorNames.first_name || ''} ${processorNames.last_name || ''}`
                .trim() || 'Unknown'
            : 'Unknown';
          processorNamesCache.set(form.process_signed_by, processedByName);
        } else {
          processedByName = processorNamesCache.get(form.process_signed_by)!;
        }
      } else {
        // Regular user: they are the processor
        const myNames = await getUserNamesById(userId);
        processedByName = myNames
          ? `${myNames.first_name || ''} ${myNames.last_name || ''}`.trim() || 'Unknown'
          : 'Unknown';
      }

      assetReturnForms.push({
        formID: form.formID,
        form_number: form.form_number,
        created_at: form.created_at,
        user_id: form.user_id,
        processed_by: processedByName,
        signed_at: form.signed_at ?? null,
        signed_by: form.signed_by ?? null,
        signed_digital_signature: form.signed_digital_signature ?? null,
        process_signed_at: formatProcessSignedAtForApi(form.process_signed_at),
        process_digital_signature: form.process_digital_signature ?? null,
        return_type:
          form.return_type ??
          (form as { RETURN_TYPE?: string | null }).RETURN_TYPE ??
          null,
        received_by: form.received_by ?? null,
        dept_head_signed_at: formatDeptHeadSignedAtForApi(
          form.dept_head_signed_at
        ),
        dept_head_digital_signature: form.dept_head_digital_signature ?? null,
        dept_head_signed_by: form.dept_head_signed_by ?? null,
        returns,
      });
    }

    return res.json({ assetReturnForms });
  } catch (error: any) {
    logger.error('Get return processed by me failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch processed return forms' });
  }
}

/** GET receive-pending approvals: forms where only IT Manager / IT Department Head signature is missing. Requires manager_approver_2. Sorted by department (IT, admin, others) then created_at DESC. */
export async function getReceivePendingApprovalsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const userId = req.user!.userID;

    const managerApprover2 = await isUserManagerApprover2(userId);
    const subApprover2 = await isUserSubApprover2(userId);
    const { companyId, departmentIds, isSuperAdmin, isAdmin } = await getAssetScope(pool, userId);
    if (!isSuperAdmin && !isAdmin && !managerApprover2 && !subApprover2) {
      return res.json({ assetReturnForms: [] });
    }

    if (!companyId) {
      return res.json({ assetReturnForms: [] });
    }

    const [formRows] = (await pool.execute(
      `SELECT arf.formID, arf.form_number, arf.user_id, arf.department_id, arf.location_id, arf.location_room_id, arf.created_by, arf.created_at, arf.updated_at, arf.deleted_at,
        arf.signed_at, arf.signed_by, arf.signed_digital_signature,
        DATE_FORMAT(arf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
        arf.process_digital_signature, arf.process_signed_by, arf.return_type, arf.received_by,
        DATE_FORMAT(arf.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
        arf.dept_head_digital_signature, arf.dept_head_signed_by,
        DATE_FORMAT(arf.it_manager_signed_at, '%Y-%m-%d %H:%i:%s') AS it_manager_signed_at,
        arf.it_manager_digital_signature, arf.it_manager_signed_by,
        DATE_FORMAT(arf.sub_approver_1_signed_at, '%Y-%m-%d %H:%i:%s') AS sub_approver_1_signed_at,
        arf.sub_approver_1_digital_signature, arf.sub_approver_1_signed_by,
        DATE_FORMAT(arf.sub_approver_2_signed_at, '%Y-%m-%d %H:%i:%s') AS sub_approver_2_signed_at,
        arf.sub_approver_2_digital_signature, arf.sub_approver_2_signed_by,
        arf.owner_absent,
        d.company_id AS form_company_id, d.name AS form_department_name
       FROM asset_return_forms arf
       LEFT JOIN asset_mngmnt_departments d ON arf.department_id = d.departmentID
       WHERE arf.deleted_at IS NULL
         AND (arf.signed_at IS NOT NULL OR arf.owner_absent = 1)
         AND arf.dept_head_signed_at IS NOT NULL
         AND arf.it_manager_signed_at IS NULL
         AND arf.sub_approver_2_signed_at IS NULL
         AND (
           arf.process_signed_at IS NOT NULL
           OR EXISTS (
             SELECT 1 FROM asset_transfer_forms atf
             WHERE atf.return_form_id = arf.formID AND atf.deleted_at IS NULL
               AND (atf.process_signed_at IS NOT NULL OR atf.processor_pending_signed_at IS NOT NULL)
           )
         )`
    )) as any[];

    let pendingForms = formRows.filter(
      (row: any) => row.form_company_id === companyId
    );

    // Apply same department-based scope used by assets/dashboard when the role
    // is limited to particular departments (IT/Admin).
    if (departmentIds && departmentIds.length > 0) {
      const allowed = new Set(departmentIds);
      pendingForms = pendingForms.filter(
        (row: any) =>
          row.department_id && allowed.has(String(row.department_id))
      );
    }

    const formIds = pendingForms.map((r: any) => r.formID);

    if (formIds.length === 0) {
      return res.json({ assetReturnForms: [] });
    }

    const assetReturns = await AssetReturnModel.findAll();
    const returnsWithDetails = await Promise.all(
      assetReturns.map((r: AssetReturn) => enrichReturnWithDetails(r))
    );
    const returnsByFormId = new Map<string, (typeof returnsWithDetails)[0][]>();
    for (const r of returnsWithDetails as (typeof returnsWithDetails)[0][]) {
      const fid = (r as AssetReturn & { form_id?: string | null }).form_id;
      if (fid && formIds.includes(fid)) {
        if (!returnsByFormId.has(fid)) returnsByFormId.set(fid, []);
        returnsByFormId.get(fid)!.push(r);
      }
    }

    const processorNameUserIds = [
      ...new Set([
        ...pendingForms.map((f: any) => f.created_by),
        ...pendingForms.map((f: any) => f.process_signed_by),
      ]),
    ].filter(Boolean) as string[];
    const processorNames = new Map<string, string>();
    if (processorNameUserIds.length > 0) {
      const userRows2 = await getUserNamesByIds(processorNameUserIds);
      for (const u of userRows2) {
        processorNames.set(
          u.userID,
          `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'
        );
      }
    }

    const sortOrder = (a: any, b: any) => {
      const oa = getDepartmentSortOrder(a.form_department_name);
      const ob = getDepartmentSortOrder(b.form_department_name);
      if (oa !== ob) return oa - ob;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    };
    pendingForms.sort(sortOrder);

    const assetReturnForms: {
      formID: string;
      form_number: string | null;
      return_batch_id: string | null;
      created_at: string;
      user_id: string;
      processed_by: string;
      signed_at?: string | null;
      signed_by?: string | null;
      signed_digital_signature?: string | null;
      process_signed_at?: string | null;
      process_digital_signature?: string | null;
      processor_pending_signed_at?: string | null;
      processor_pending_signature?: string | null;
      return_type?: string | null;
      received_by?: string | null;
      dept_head_signed_at?: string | null;
      dept_head_digital_signature?: string | null;
      dept_head_signed_by?: string | null;
      dept_head_user_name?: string | null;
      dept_head_position?: string | null;
      it_manager_signed_at?: string | null;
      it_manager_digital_signature?: string | null;
      it_manager_signed_by?: string | null;
      it_manager_user_name?: string | null;
      it_manager_position?: string | null;
      sub_approver_1_signed_at?: string | null;
      sub_approver_1_digital_signature?: string | null;
      sub_approver_1_signed_by?: string | null;
      sub_approver_1_user_name?: string | null;
      sub_approver_1_position?: string | null;
      sub_approver_2_signed_at?: string | null;
      sub_approver_2_digital_signature?: string | null;
      sub_approver_2_signed_by?: string | null;
      sub_approver_2_user_name?: string | null;
      form_department?: { id: string; name: string } | null;
      returns: (typeof returnsWithDetails)[0][];
    }[] = [];

    const deptHeadSignedByIds = [
      ...new Set(
        pendingForms.map((f: any) => f.dept_head_signed_by).filter(Boolean)
      ),
    ] as string[];
    const deptHeadNames = new Map<string, string>();
    const deptHeadPositions = new Map<string, string>();
    if (deptHeadSignedByIds.length > 0) {
      const userRows3 = await getUserNamesByIds(deptHeadSignedByIds);
      for (const u of userRows3) {
        deptHeadNames.set(
          u.userID,
          `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'
        );
        if (u.position) deptHeadPositions.set(u.userID, String(u.position));
      }
    }

    const subApprover1SignedByIds = [
      ...new Set(
        pendingForms.map((f: any) => f.sub_approver_1_signed_by).filter(Boolean)
      ),
    ] as string[];
    const subApprover1Names = new Map<string, string>();
    const subApprover1Positions = new Map<string, string>();
    if (subApprover1SignedByIds.length > 0) {
      const userRows4 = await getUserNamesByIds(subApprover1SignedByIds);
      for (const u of userRows4) {
        subApprover1Names.set(
          u.userID,
          `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'
        );
        if (u.position) subApprover1Positions.set(u.userID, String(u.position));
      }
    }

    for (const form of pendingForms) {
      const returns = returnsByFormId.get(form.formID) ?? [];
      if (returns.length === 0) continue;
      const deptHeadSignedBy = form.dept_head_signed_by ?? null;
      const subApprover1SignedBy = form.sub_approver_1_signed_by ?? null;
      const processorFields = await resolveReturnProcessorFieldsForBatch(
        {
          formID: form.formID,
          user_id: form.user_id,
          created_by: form.created_by,
          process_signed_at: form.process_signed_at,
          process_digital_signature: form.process_digital_signature,
          process_signed_by: (form as { process_signed_by?: string | null })
            .process_signed_by,
        },
        { processorNames }
      );
      assetReturnForms.push({
        formID: form.formID,
        form_number: form.form_number,
        return_batch_id: null,
        created_at: form.created_at,
        user_id: form.user_id,
        processed_by: processorFields.processed_by,
        signed_at: form.signed_at ?? null,
        signed_by: form.signed_by ?? null,
        signed_digital_signature: form.signed_digital_signature ?? null,
        process_signed_at: processorFields.process_signed_at,
        process_digital_signature: processorFields.process_digital_signature,
        processor_pending_signed_at: processorFields.processor_pending_signed_at,
        processor_pending_signature: processorFields.processor_pending_signature,
        return_type: form.return_type ?? null,
        received_by: form.received_by ?? null,
        dept_head_signed_at: formatDeptHeadSignedAtForApi(
          form.dept_head_signed_at
        ),
        dept_head_digital_signature: form.dept_head_digital_signature ?? null,
        dept_head_signed_by: deptHeadSignedBy,
        dept_head_user_name: deptHeadSignedBy
          ? (deptHeadNames.get(deptHeadSignedBy) ?? null)
          : null,
        dept_head_position: deptHeadSignedBy
          ? (deptHeadPositions.get(deptHeadSignedBy) ?? null)
          : null,
        it_manager_signed_at: null,
        it_manager_digital_signature: null,
        it_manager_signed_by: null,
        it_manager_user_name: null,
        sub_approver_1_signed_at: formatItManagerSignedAtForApi(
          form.sub_approver_1_signed_at
        ),
        sub_approver_1_digital_signature:
          form.sub_approver_1_digital_signature ?? null,
        sub_approver_1_signed_by: subApprover1SignedBy,
        sub_approver_1_user_name: subApprover1SignedBy
          ? (subApprover1Names.get(subApprover1SignedBy) ?? null)
          : null,
        sub_approver_1_position: subApprover1SignedBy
          ? (subApprover1Positions.get(subApprover1SignedBy) ?? null)
          : null,
        sub_approver_2_signed_at: null,
        sub_approver_2_digital_signature: null,
        sub_approver_2_signed_by: null,
        sub_approver_2_user_name: null,
        form_department:
          form.department_id && form.form_department_name
            ? { id: form.department_id, name: form.form_department_name }
            : null,
        returns,
      });
    }

    return res.json({ assetReturnForms });
  } catch (error: any) {
    logger.error('Get receive-pending approvals failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch receive-pending approvals' });
  }
}

/** POST receive (IT Manager / IT Department Head signature) on a return form. Requires manager_approver_2. */
export async function receiveReturnFormHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const userId = req.user!.userID;
    const { digitalSignature } = req.body as { digitalSignature?: string };

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const managerApprover2 = await isUserManagerApprover2(userId);
    const subApprover2 = await isUserSubApprover2(userId);
    const { isSuperAdmin: scopeIsSuperAdmin, isAdmin: scopeIsAdmin } =
      await getAssetScope(pool, userId);
    const isAdminRole = scopeIsSuperAdmin || scopeIsAdmin;
    if (!isAdminRole && !managerApprover2 && !subApprover2) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to receive this form' });
    }

    const formRow = await getReturnFormById(formId);
    if (!formRow) {
      return res.status(404).json({ error: 'Asset return form not found' });
    }
    const form = formRow;

    const receiveOwnerAbsent = Number((form as { owner_absent?: number }).owner_absent) === 1;
    if (!form.signed_at && !receiveOwnerAbsent) {
      return res
        .status(400)
        .json({ error: 'Return form must be signed by the returner first' });
    }
    if (!form.dept_head_signed_at && !form.sub_approver_1_signed_at) {
      return res.status(400).json({
        error: 'Return form must be approved by Department Head first',
      });
    }
    if (!form.process_signed_at) {
      return res.status(400).json({
        error:
          'Return form must be signed by IT Staff / IT Inventory Manager first',
      });
    }
    if (form.it_manager_signed_at || form.sub_approver_2_signed_at) {
      return res.status(400).json({
        error:
          'This return form is already received (IT Manager / IT Department Head signature present)',
      });
    }

    const itManagerDigitalSignature =
      (typeof digitalSignature === 'string' && digitalSignature.trim()) ||
      (await fetchUserDigitalSignature(userId));

    const isSubApprover2Receiving = subApprover2 && !managerApprover2;
    if (isSubApprover2Receiving) {
      await executeRawWrite(
        `UPDATE asset_return_forms
         SET sub_approver_2_signed_at = NOW(), sub_approver_2_digital_signature = ?, sub_approver_2_signed_by = ?, updated_at = NOW()
         WHERE formID = ?`,
        [itManagerDigitalSignature, userId, formId]
      );
    } else {
      await executeRawWrite(
        `UPDATE asset_return_forms
         SET it_manager_signed_at = NOW(), it_manager_digital_signature = ?, it_manager_signed_by = ?, updated_at = NOW()
         WHERE formID = ?`,
        [itManagerDigitalSignature, userId, formId]
      );
    }

    await createAuditLog({
      userId,
      action: isSubApprover2Receiving
        ? 'Received Asset Return Form (Sub Approver 2)'
        : 'Received Asset Return Form (IT Manager / IT Department Head)',
      resourceType: 'asset_return_form',
      resourceId: formId,
      details: isSubApprover2Receiving
        ? `User received asset return form ${form.form_number} as Sub Approver 2 (stand-in for IT/Admin dept head)`
        : `User received asset return form ${form.form_number} as IT Manager / IT Department Head`,
      newValues: isSubApprover2Receiving
        ? {
            sub_approver_2_signed_at: new Date().toISOString(),
            sub_approver_2_signed_by: userId,
          }
        : {
            it_manager_signed_at: new Date().toISOString(),
            it_manager_signed_by: userId,
          },
    });

    // Auto-receive linked offboarding checklists as IT Manager
    try {
      const assignmentIds = await getAssignmentIdsByReturnFormId(formId);
      if (assignmentIds.length > 0) {
        const checklists = await checklistRepo.getChecklistsByAssignmentIds(assignmentIds);
        const unreceivedChecklists = checklists.filter(
          (c: any) => c.dept_head_signed_at && !c.it_manager_signed_at && !c.sub_approver_2_signed_at
        );
        if (unreceivedChecklists.length > 0) {
          const formCompanyId = (form as any).form_company_id || (form as any).company_id || null;
          if (formCompanyId) {
            await checklistRepo.receiveChecklistsAsItManager({
              checklistIds: unreceivedChecklists.map((c: any) => c.id),
              approverUserId: userId,
              companyId: formCompanyId,
              digitalSignature: itManagerDigitalSignature,
              isSubApprover: isSubApprover2Receiving,
            });
          }
        }
      }
    } catch (checklistErr) {
      logger.error('Failed to auto-receive offboarding checklists:', checklistErr);
    }

    const rawSignedAt = new Date().toISOString();
    return res.json({
      message: 'Return form received successfully',
      formID: formId,
      it_manager_signed_at: rawSignedAt,
    });
  } catch (error: any) {
    const message = error?.message ?? '';
    logger.error('Receive return form failed:', error);
    if (
      typeof message === 'string' &&
      (message.includes('Unknown column') || message.includes('it_manager'))
    ) {
      return res.status(503).json({
        error:
          'Return form receive is not available: database schema may be outdated. Please run migration_add_it_manager_signature_asset_return_forms.sql',
      });
    }
    return res.status(500).json({ error: 'Failed to receive return form' });
  }
}

/** POST process (IT/Admin Staff signature) on an existing return form. Form must be dept-head-approved and not yet process-signed. Updates asset_returns with processor conditions, marks assignments returned, updates assets. */
export async function processReturnFormHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const {
      processSignature,
      assetReturns: assetReturnsBody,
      returnType,
      assignToProcessor = false,
      receivedBy,
      intangibleAssetReturnItems,
      adminCopySignerId,
      adminCopyCopyType,
    } = req.body as {
      processSignature?: { signed_at?: string; digital_signature?: string };
      assetReturns?: {
        assignmentId: string;
        condition: string;
        notes?: string;
        imageUrls?: string[];
        returnDepartmentId?: string;
        returnLocationId?: string;
        returnAreaId?: string;
      }[];
      returnType?: string;
      assignToProcessor?: boolean;
      receivedBy?: string | null;
      intangibleAssetReturnItems?: { id: string; notes?: string }[];
      adminCopySignerId?: string | null;
      adminCopyCopyType?: 'IT' | 'Admin' | null;
    };
    const userId = req.user!.userID;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const [formRows] = (await pool.execute(
      `SELECT arf.*, d.company_id AS form_company_id
       FROM asset_return_forms arf
       LEFT JOIN asset_mngmnt_departments d ON arf.department_id = d.departmentID
       WHERE arf.formID = ? AND arf.deleted_at IS NULL`,
      [formId]
    )) as any[];
    if (formRows.length === 0) {
      return res.status(404).json({ error: 'Asset return form not found' });
    }
    const form = formRows[0];
    if (!form.dept_head_signed_at) {
      return res
        .status(400)
        .json({ error: 'Form must be approved by Department Head first' });
    }
    if (form.process_signed_at) {
      return res.status(400).json({ error: 'Form is already process-signed' });
    }
    if (form.declined_at) {
      return res.status(400).json({
        error: 'This return form was declined by Department Head',
      });
    }
    if (form.processor_declined_at) {
      return res.status(400).json({
        error: 'This return form was declined by processor',
      });
    }

    const inScope = await isReturnFormInPendingStaffScope(
      {
        department_id: form.department_id,
        form_company_id: form.form_company_id,
      },
      userId
    );
    if (!inScope) {
      return res.status(403).json({
        error: 'You do not have permission to process this return form',
      });
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
        : (() => {
            const d = new Date();
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const h = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            const s = String(d.getSeconds()).padStart(2, '0');
            return `${y}-${m}-${day} ${h}:${min}:${s}`;
          })();

    const processorPosition = await fetchUserPosition(userId);
    const processDigitalSignature =
      processSignature?.digital_signature?.trim() ||
      (await fetchUserDigitalSignature(userId));
    const returnTypeForDb =
      normalizeReturnTypeString(returnType) ?? form.return_type ?? null;

    // Persist who processed/received the returned asset(s) when assigning to processor.
    // This is also used later by approval-time execution paths to decide whether processor custody should occur.
    const receivedByForDb =
      assignToProcessor === true
        ? (receivedBy && String(receivedBy).trim()
            ? String(receivedBy).trim()
            : userId)
        : null;

    await executeRawWrite(
      `UPDATE asset_return_forms
       SET process_signed_at = ?, process_digital_signature = ?, process_signed_by = ?, received_by = ?, return_type = ?, process_user_position = ?, updated_at = NOW()
       WHERE formID = ?`,
      [
        processSignedAtForDb,
        processDigitalSignature,
        userId,
        receivedByForDb,
        returnTypeForDb,
        processorPosition,
        formId,
      ]
    );

    const returnsList = await AssetReturnModel.findByFormId(formId);
    const validConditions = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];
    const getCondition = (assignmentId: string): string => {
      const arr = Array.isArray(assetReturnsBody) ? assetReturnsBody : [];
      const item = arr.find(
        (x: { assignmentId: string }) => x.assignmentId === assignmentId
      );
      const c = item?.condition ?? 'Good';
      return validConditions.includes(c) ? c : 'Good';
    };
    const getNotes = (assignmentId: string): string => {
      const arr = Array.isArray(assetReturnsBody) ? assetReturnsBody : [];
      const item = arr.find(
        (x: { assignmentId: string }) => x.assignmentId === assignmentId
      );
      return item?.notes ?? '';
    };
    const getImageUrls = (assignmentId: string): string[] | null => {
      const arr = Array.isArray(assetReturnsBody) ? assetReturnsBody : [];
      const item = arr.find(
        (x: { assignmentId: string; imageUrls?: string[] }) =>
          x.assignmentId === assignmentId
      );
      if (!Array.isArray(item?.imageUrls)) return null;
      const imageUrls = item.imageUrls
        .filter((url): url is string => typeof url === 'string' && !!url.trim())
        .slice(0, 5);
      return imageUrls.length > 0 ? imageUrls : null;
    };
    const getReturnDepartmentId = (assignmentId: string): string | null => {
      const arr = Array.isArray(assetReturnsBody) ? assetReturnsBody : [];
      const item = arr.find(
        (x: { assignmentId: string; returnDepartmentId?: string }) =>
          x.assignmentId === assignmentId
      );
      return item?.returnDepartmentId?.trim() || null;
    };
    const getReturnLocationId = (assignmentId: string): string | null => {
      const arr = Array.isArray(assetReturnsBody) ? assetReturnsBody : [];
      const item = arr.find(
        (x: { assignmentId: string; returnLocationId?: string }) =>
          x.assignmentId === assignmentId
      );
      return item?.returnLocationId?.trim() || null;
    };
    const getReturnAreaId = (assignmentId: string): string | null => {
      const arr = Array.isArray(assetReturnsBody) ? assetReturnsBody : [];
      const item = arr.find(
        (x: { assignmentId: string; returnAreaId?: string }) =>
          x.assignmentId === assignmentId
      );
      return item?.returnAreaId?.trim() || null;
    };
    const processorTarget = assignToProcessor
      ? await resolveProcessorReturnTarget(userId)
      : null;

    for (const ret of returnsList) {
      const condition = getCondition(ret.assignment_id);
      const notes = getNotes(ret.assignment_id);
      const imageUrls = getImageUrls(ret.assignment_id);
      const conditionImagesJson =
        imageUrls && imageUrls.length > 0 ? JSON.stringify(imageUrls) : null;
      const selectedReturnDepartmentId = getReturnDepartmentId(ret.assignment_id);
      const selectedReturnLocationId = getReturnLocationId(ret.assignment_id);
      const selectedReturnAreaId = getReturnAreaId(ret.assignment_id);
      const returnDeptId = assignToProcessor
        ? selectedReturnDepartmentId ??
          processorTarget?.departmentId ??
          ret.return_department_id ??
          null
        : selectedReturnDepartmentId ?? ret.return_department_id ?? null;
      const returnLocId = assignToProcessor
        ? selectedReturnLocationId ??
          processorTarget?.locationId ??
          ret.return_location_id ??
          null
        : selectedReturnLocationId ?? ret.return_location_id ?? null;
      const returnRoomId = assignToProcessor
        ? selectedReturnAreaId ??
          processorTarget?.locationRoomId ??
          ret.return_location_room_id ??
          null
        : selectedReturnAreaId ?? ret.return_location_room_id ?? null;
      await executeRawWrite(
        `UPDATE asset_returns
         SET return_condition = ?,
             return_notes = ?,
             condition_images = ?,
             return_department_id = ?,
             return_location_id = ?,
             return_location_room_id = ?,
             updated_at = NOW()
         WHERE return_id = ? AND deleted_at IS NULL`,
        [
          condition,
          notes,
          conditionImagesJson,
          returnDeptId,
          returnLocId,
          returnRoomId,
          ret.return_id,
        ]
      );
    }

    const assignmentIds = returnsList.map(r => r.assignment_id);
    const placeholders = assignmentIds.map(() => '?').join(',');
    const [assignmentRows] = (await pool.execute(
      `SELECT * FROM asset_assignments WHERE assignmentID IN (${placeholders}) AND deleted_at IS NULL`,
      assignmentIds
    )) as any[];

    // Precompute data for audit logs (same as executeReturnFormAfterApproval / createAssetReturnHandler)
    let returnerFullName = 'Unknown';
    let processorFullName = 'Unknown';
    const assetCodeByAssetId = new Map<string, string>();
    if (assignmentRows.length > 0) {
      const returnerNames = await getUserNamesById(form.user_id);
      if (returnerNames) {
        returnerFullName =
          `${returnerNames.first_name || ''} ${returnerNames.last_name || ''}`.trim() || 'Unknown';
      }
      const processorNamesRow = await getUserNamesById(userId);
      if (processorNamesRow) {
        processorFullName =
          `${processorNamesRow.first_name || ''} ${processorNamesRow.last_name || ''}`.trim() || 'Unknown';
      }
      const assetIds = (assignmentRows as any[]).map((a: any) => a.asset_id);
      const placeholdersAsset = assetIds.map(() => '?').join(',');
      const [assetCodeRows] = (await pool.execute(
        `SELECT assetID, asset_code FROM assets WHERE assetID IN (${placeholdersAsset}) AND deleted_at IS NULL`,
        assetIds
      )) as any[];
      for (const row of (assetCodeRows || []) as any[]) {
        if (row.assetID && row.asset_code) {
          assetCodeByAssetId.set(row.assetID, row.asset_code);
        }
      }
    }

    const returnedAssetIds = new Set(
      (assignmentRows as any[]).map((r: any) => r.asset_id)
    );
    const fullyReturnedBuilderIds = new Set<string>();
    if (returnedAssetIds.size > 0) {
      const assetPlaceholders = [...returnedAssetIds].map(() => '?').join(',');
      const [builderAssetRows] = (await pool.execute(
        `SELECT abi.builder_id, abi.asset_id
         FROM asset_builder_items abi
         JOIN asset_builders ab ON abi.builder_id = ab.builderID
         WHERE abi.asset_id IN (${assetPlaceholders}) AND ab.deleted_at IS NULL`,
        [...returnedAssetIds]
      )) as any[];
      const builderReturnedCount = new Map<string, number>();
      for (const row of builderAssetRows as any[]) {
        const bid = row.builder_id;
        builderReturnedCount.set(bid, (builderReturnedCount.get(bid) || 0) + 1);
      }
      for (const bid of builderReturnedCount.keys()) {
        const total = await getBuilderItemCount(bid);
        const returned = builderReturnedCount.get(bid) ?? 0;
        if (total > 0 && total === returned) {
          fullyReturnedBuilderIds.add(bid);
        }
      }
    }

    const processorId = userId;
    const processReturnBuilderTransitions: Array<{
      builderID: string;
      builderName: string;
      returnedAssetCode: string;
    }> = [];
    const processReturnBuildersAssignedToProcessorMap = new Map<
      string,
      string
    >();
    for (const assignment of assignmentRows as any[]) {
      const ret = returnsList.find(
        r => r.assignment_id === assignment.assignmentID
      );
      const returnCondition = ret ? getCondition(ret.assignment_id) : 'Good';
      const returnNotes = ret ? getNotes(ret.assignment_id) : '';
      const selectedReturnDepartmentId = ret
        ? getReturnDepartmentId(ret.assignment_id)
        : null;
      const selectedReturnLocationId = ret
        ? getReturnLocationId(ret.assignment_id)
        : null;
      const selectedReturnAreaId = ret
        ? getReturnAreaId(ret.assignment_id)
        : null;

      await pool.execute('CALL sp_mark_assignment_returned(?, ?, ?)', [
        assignment.assignmentID,
        returnNotes,
        returnCondition,
      ]);

      const returnDeptId = assignToProcessor
        ? selectedReturnDepartmentId ??
          processorTarget?.departmentId ??
          assignment.department_id
        : selectedReturnDepartmentId ?? assignment.department_id;
      const returnLocId = assignToProcessor
        ? selectedReturnLocationId ??
          processorTarget?.locationId ??
          assignment.location_id
        : selectedReturnLocationId ?? assignment.location_id;
      const returnRoomId = assignToProcessor
        ? selectedReturnAreaId ??
          processorTarget?.locationRoomId ??
          assignment.location_room_id
        : selectedReturnAreaId ?? assignment.location_room_id;

      let newAssignmentId: string | null = null;
      if (assignToProcessor) {
        newAssignmentId = crypto.randomUUID();
        await pool.execute(
          'CALL sp_create_assignment(?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            newAssignmentId,
            assignment.asset_id,
            processorId,
            returnDeptId || null,
            returnLocId || null,
            returnRoomId || null,
            null,
            'Assigned via asset return (assign to processor)',
            processorId,
          ]
        );
        await executeRawWrite(
          'UPDATE assets SET status = "Assigned", location_id = ?, location_room_id = ?, department_id = ?, `condition` = ?, updated_by = ?, updated_at = NOW() WHERE assetID = ?',
          [
            returnLocId,
            returnRoomId,
            returnDeptId,
            returnCondition || 'Good',
            processorId,
            assignment.asset_id,
          ]
        );
      } else {
        await executeRawWrite(
          'UPDATE assets SET status = "Available", location_id = ?, location_room_id = ?, department_id = ?, `condition` = ?, updated_by = ?, updated_at = NOW() WHERE assetID = ?',
          [
            returnLocId,
            returnRoomId,
            returnDeptId,
            returnCondition || 'Good',
            processorId,
            assignment.asset_id,
          ]
        );
      }

      const assetCode =
        assetCodeByAssetId.get(assignment.asset_id) ||
        String(assignment.asset_id);

      // Builder logic and audit (mirror createAssetReturnHandler)
      const [builderRows] = (await pool.execute(
        `SELECT ab.builderID, ab.name, ab.status as builder_status
         FROM asset_builder_items abi
         JOIN asset_builders ab ON abi.builder_id = ab.builderID
         WHERE abi.asset_id = ? AND ab.deleted_at IS NULL`,
        [assignment.asset_id]
      )) as any[];
      if (builderRows.length > 0) {
        const builder = builderRows[0];
        const assignedCount = await getBuilderItemCount(builder.builderID);
        if (assignedCount === 0 && builder.builder_status === 'Assigned') {
          await executeRawWrite(
            'UPDATE asset_builders SET status = "Available", updated_by = ?, updated_at = NOW() WHERE builderID = ?',
            [userId, builder.builderID]
          );
          processReturnBuilderTransitions.push({
            builderID: builder.builderID,
            builderName: builder.name,
            returnedAssetCode: assetCode,
          });
        }
        const isFullReturnForAllBuilders = (builderRows as any[]).every(
          (b: any) => fullyReturnedBuilderIds.has(b.builderID)
        );
        if (!isFullReturnForAllBuilders) {
          await executeRawWrite(
            'DELETE FROM asset_builder_items WHERE asset_id = ?',
            [assignment.asset_id]
          );
          await createAuditLog({
            userId,
            action: 'Removed from Asset Builder',
            resourceType: 'asset',
            resourceId: assetCode,
            resourceName: assetCode,
            details: `Asset "${assetCode}" removed from asset builder due to partial return`,
            oldValues: {
              builder_ids: builderRows.map((b: any) => b.builderID),
            },
            ipAddress: req.ip,
            userAgent: req.get ? req.get('User-Agent') : 'Unknown',
          });
          for (const b of builderRows) {
            await createAuditLog({
              userId,
              action: 'Removed from Asset Builder',
              resourceType: 'asset_builder',
              resourceId: b.builderID,
              resourceName: b.name,
              details: `Asset "${assetCode}" removed from asset builder due to partial return`,
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

      // "Returned Asset" audit log (asset timeline)
      await createAuditLog({
        userId: req.user!.userID,
        action: 'Returned Asset',
        resourceType: 'asset_assignment',
        resourceId: assignment.assignmentID,
        resourceName: `Asset ${assetCode}`,
        details: `Asset ${assetCode} returned by ${returnerFullName} processed by ${processorFullName} via return form processing with condition: ${returnCondition}${returnNotes ? ` - Return notes: ${returnNotes}` : ''}`,
        oldValues: {
          status: 'Active',
          assigned_to: assignment.user_id,
          department: assignment.department_id,
          location: assignment.location_id,
        },
        newValues: {
          status: 'Returned',
          actual_return_date: new Date(),
          return_condition: returnCondition,
          return_notes: returnNotes,
          return_location: returnLocId,
          return_location_room: returnRoomId,
          returned_by: req.user!.userID,
        },
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });

      if (assignToProcessor && newAssignmentId) {
        await createAuditLog({
          userId: processorId,
          action: 'Assign to Processor on Return',
          resourceType: 'asset_assignment',
          resourceId: newAssignmentId,
          resourceName: `Asset ${assetCode}`,
          details: `Asset "${assetCode}" assigned to ${processorFullName} custody temporarily because of asset return.`,
          newValues: {
            asset_id: assignment.asset_id,
            user_id: processorId,
            department_id: returnDeptId,
            location_id: returnLocId,
          },
          ipAddress: req.ip,
          userAgent: req.get ? req.get('User-Agent') : 'Unknown',
        });
        const [builderRowsForProcessor] = (await pool.execute(
          `SELECT ab.builderID, ab.name
           FROM asset_builder_items abi
           JOIN asset_builders ab ON abi.builder_id = ab.builderID
           WHERE abi.asset_id = ? AND ab.deleted_at IS NULL`,
          [assignment.asset_id]
        )) as any[];
        for (const b of builderRowsForProcessor ?? []) {
          if (
            b.builderID &&
            !processReturnBuildersAssignedToProcessorMap.has(b.builderID) &&
            fullyReturnedBuilderIds.has(b.builderID)
          ) {
            processReturnBuildersAssignedToProcessorMap.set(
              b.builderID,
              b.name ?? 'Unnamed Builder'
            );
          }
        }
      }
    }

    // Builder status transition audit logs (one per builder that became Available)
    const processReturnBuilderTransitionsMap = new Map<
      string,
      { builderName: string; assetCodes: string[] }
    >();
    for (const bt of processReturnBuilderTransitions) {
      const existing = processReturnBuilderTransitionsMap.get(bt.builderID);
      if (existing) {
        existing.assetCodes.push(bt.returnedAssetCode);
      } else {
        processReturnBuilderTransitionsMap.set(bt.builderID, {
          builderName: bt.builderName,
          assetCodes: [bt.returnedAssetCode],
        });
      }
    }
    for (const [
      builderID,
      { builderName, assetCodes },
    ] of processReturnBuilderTransitionsMap) {
      const assetListBullet =
        assetCodes.length > 0 ? '\n• ' + assetCodes.join('\n• ') : '';
      await createAuditLog({
        userId: req.user!.userID,
        action: 'Updated Asset Builder Status',
        resourceType: 'asset_builder',
        resourceId: builderID,
        resourceName: builderName,
        details: `Asset builder "${builderName}" status updated to "Available" due to asset return. Assets returned:${assetListBullet}`,
        oldValues: { status: 'Assigned' },
        newValues: { status: 'Available', returned_asset_codes: assetCodes },
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });
      await createAuditLog({
        userId: req.user!.userID,
        action: 'Asset Builder Returned',
        resourceType: 'asset_builder',
        resourceId: builderID,
        resourceName: builderName,
        details: `Asset builder "${builderName}" returned. Assets returned:${assetListBullet}`,
        newValues: { returned_asset_codes: assetCodes },
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });
    }

    for (const [
      builderID,
      builderName,
    ] of processReturnBuildersAssignedToProcessorMap) {
      await createAuditLog({
        userId: req.user!.userID,
        action: 'Assigned to Processor on Return',
        resourceType: 'asset_builder',
        resourceId: builderID,
        resourceName: builderName,
        details: `Assigned to ${processorFullName} temporarily because of asset return.`,
        newValues: { processor_name: processorFullName },
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : 'Unknown',
      });
    }

    await createAuditLog({
      userId: req.user!.userID,
      action: 'Processed Asset Return Form (Processor)',
      resourceType: 'asset_return_form',
      resourceId: formId,
      resourceName: form.form_number || formId,
      details: `Processor processed asset return form ${form.form_number || formId}`,
      newValues: {
        process_signed_at: processSignedAtForDb || new Date().toISOString(),
        received_by: receivedByForDb,
      },
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });

    const linkedTransferFormIds = await getTransferFormIdsByReturnFormId(formId);
    const isTransferLinkedReturn = linkedTransferFormIds.length > 0;

    await runAfterReturnAccountabilityAndProcessorAssign(
      assignmentRows as Array<{
        user_id: string;
        asset_id: string;
        department_id: string | null;
        location_id: string | null;
        location_room_id: string | null;
      }>,
      {
        processorId: req.user!.userID,
        req,
        processSignature: processSignature ?? null,
        assignToProcessor: !!assignToProcessor,
        // During a transfer the processor only performs condition checking and
        // holds the asset temporarily; accountability belongs to the recipient.
        skipProcessorAccountability: isTransferLinkedReturn,
        adminCopySignerId: adminCopySignerId ?? null,
        adminCopyCopyType: adminCopyCopyType ?? null,
      }
    );

    const [remainingAssignmentsRows] = (await pool.execute(
      `SELECT COUNT(*) as cnt
         FROM asset_assignments
        WHERE user_id = ?
          AND status = 'Active'
          AND deleted_at IS NULL`,
      [form.user_id]
    )) as any[];
    const returnerHasRemainingAssets =
      Number(remainingAssignmentsRows?.[0]?.cnt ?? 0) > 0;

    // Notify Manager Approver 2 users in the asset scope department that the return was processed, checked and verified
    await notifyManagerApprover2OfProcessedReturn({
      formId,
      formNumber: form.form_number,
      companyId: form.form_company_id ?? null,
      departmentId: form.department_id ?? null,
      returnRequestorUserId: form.user_id,
      processorUserId: req.user!.userID,
    });

    // Send notification to return requestor
    await createNotificationForApi({
      user_id: form.user_id,
      title: 'Asset return processed',
      message: returnerHasRemainingAssets
        ? 'Your asset return request has been processed. A new accountability form has been issued.'
        : 'Your asset return request has been processed.',
      type: 'system',
      data: {
        form_id: formId,
        form_number: form.form_number,
        route: '/profile?tab=documents&docTab=returns',
        actionTarget: 'my_return_requests',
      },
    });

    // Process intangible asset returns (unassign from user)
    if (intangibleAssetReturnItems && intangibleAssetReturnItems.length > 0) {
      const companyId = form.form_company_id;
      for (const item of intangibleAssetReturnItems) {
        try {
          await intangibleAssetsService.unassignIntangibleAsset(
            item.id,
            form.user_id,
            companyId
          );
          await createAuditLog({
            userId: req.user!.userID,
            action: 'Returned Intangible Asset',
            resourceType: 'intangible_asset',
            resourceId: item.id,
            resourceName: item.id,
            details: `Intangible asset returned via return form ${form.form_number || formId}`,
            newValues: { notes: item.notes || null },
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            companyId,
          });
        } catch (err) {
          logger.error('Failed to unassign intangible asset on return', { id: item.id, err });
        }
      }
    }

    return res.json({
      message: 'Return form processed successfully',
      formID: formId,
      process_signed_at: processSignedAtForDb || new Date().toISOString(),
      returnerHasRemainingAssets,
    });
  } catch (error: any) {
    logger.error('Process return form failed:', error);
    return res.status(500).json({ error: 'Failed to process return form' });
  }
}

/** POST approve (Dept Head signature) on a return form. Requires Approvals create+edit OR designated approver. */
export async function approveReturnFormHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const userId = req.user!.userID;
    const { digitalSignature, adminCopySignerId, adminCopyCopyType } = req.body as {
      digitalSignature?: string;
      adminCopySignerId?: string | null;
      adminCopyCopyType?: 'IT' | 'Admin' | null;
    };

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const formRow = await getReturnFormById(formId);
    if (!formRow) {
      return res.status(404).json({ error: 'Asset return form not found' });
    }
    const form = formRow;

    // Processor-initiated (hold) flow: the processor pre-signed the form and has
    // custody (received_by), so after dept-head approval the return is executed
    // and considered processed. Notification behaviour differs from owner-initiated returns.
    const isHoldFlow = Boolean(form.process_signed_at && form.received_by);

    // Get company_id from form or user if not available
    let companyId = form.company_id;
    if (!companyId) {
      const formUser = await getUserById(form.user_id);
      companyId = formUser?.company_id || null;
    }
    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    const approveOwnerAbsent = Number((form as { owner_absent?: number }).owner_absent) === 1;
    if (!form.signed_at && !approveOwnerAbsent) {
      return res
        .status(400)
        .json({ error: 'Return form must be signed by the returner first' });
    }
    if (form.dept_head_signed_at || form.sub_approver_1_signed_at) {
      return res.status(400).json({
        error: 'This return form is already approved by the department head or sub approver',
      });
    }

    const [permRows] = (await pool.execute(
      'SELECT module_name, permission_type, granted FROM user_permissions WHERE user_id = ?',
      [userId]
    )) as any[];
    const hasApprovalsCreate = permRows.some(
      (r: any) =>
        r.module_name === 'Approvals' &&
        r.permission_type === 'create' &&
        r.granted === 1
    );
    const hasApprovalsEdit = permRows.some(
      (r: any) =>
        r.module_name === 'Approvals' &&
        r.permission_type === 'edit' &&
        r.granted === 1
    );
    const canApproveByPermission = hasApprovalsCreate && hasApprovalsEdit;

    // Check if user is the designated approver or sub approver for the form's requester
    const isApprover = form.user_id
      ? await isDesignatedApprover(userId, form.user_id)
      : false;
    const isSubApprover = form.user_id
      ? await isDesignatedSubApprover(userId, form.user_id)
      : false;

    const { isSuperAdmin: scopeIsSuperAdmin, isAdmin: scopeIsAdmin } =
      await getAssetScope(pool, userId);
    const isAdminRole = scopeIsSuperAdmin || scopeIsAdmin;

    if (!canApproveByPermission && !isApprover && !isSubApprover && !isAdminRole) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to approve this form' });
    }

    const deptHeadDigitalSignature =
      (typeof digitalSignature === 'string' && digitalSignature.trim()) ||
      (await fetchUserDigitalSignature(userId));

    const isSubApprover1Approver = isSubApprover && !isApprover;
    if (isSubApprover1Approver) {
      await executeRawWrite(
        `UPDATE asset_return_forms
         SET sub_approver_1_signed_at = NOW(), sub_approver_1_digital_signature = ?, sub_approver_1_signed_by = ?, updated_at = NOW()
         WHERE formID = ?`,
        [deptHeadDigitalSignature, userId, formId]
      );
    } else {
      await executeRawWrite(
        `UPDATE asset_return_forms
         SET dept_head_signed_at = NOW(), dept_head_digital_signature = ?, dept_head_signed_by = ?, updated_at = NOW()
         WHERE formID = ?`,
        [deptHeadDigitalSignature, userId, formId]
      );
    }

    await createAuditLog({
      userId,
      action: isSubApprover1Approver
        ? 'Approved Asset Return Form (Sub Approver 1)'
        : 'Approved Asset Return Form (Dept Head)',
      resourceType: 'asset_return_form',
      resourceId: formId,
      details: isSubApprover1Approver
        ? `User approved asset return form ${form.form_number} as Sub Approver 1 (stand-in for the requestor's department head)`
        : `User approved asset return form ${form.form_number} as Department Head`,
      newValues: isSubApprover1Approver
        ? {
            sub_approver_1_signed_at: new Date().toISOString(),
            sub_approver_1_signed_by: userId,
          }
        : {
            dept_head_signed_at: new Date().toISOString(),
            dept_head_signed_by: userId,
          },
    });

    // Linked transfer forms are now approved independently — do not auto-approve/execute the paired transfer form here.
    // Processor-initiated hold: form had process signature and received_by before manager approved; execute return now.
    if (form.process_signed_at && form.received_by) {
      try {
        await executeReturnFormAfterApproval(formId, form as { user_id: string; form_number: string; process_signed_at?: string | null; process_digital_signature?: string | null; received_by?: string | null }, req, { adminCopySignerId, adminCopyCopyType });
      } catch (execErr) {
        logger.error('Execute return after manager approve failed', execErr);
        return res.status(500).json({
          error:
            'Return form approved but execution failed. Please contact support.',
        });
      }
    }

    // Notify Manager Approver 2 users in the asset scope department that the return
    // was approved and is ready to be received (processor-initiated hold flow).
    if (form.process_signed_at && form.received_by) {
      try {
        await notifyManagerApprover2OfProcessedReturn({
          formId,
          formNumber: form.form_number,
          companyId: companyId || null,
          departmentId: form.department_id ?? null,
          returnRequestorUserId: form.user_id,
          processorUserId: String(form.received_by).trim() || req.user!.userID,
        });
      } catch (notifError) {
        logger.error(
          'Failed to notify Manager Approver 2 after approving processed return:',
          notifError
        );
      }
    }

    // Processor-initiated hold flow: notify the processor who initiated the return
    // that it is now approved and processed (they do not receive the generic
    // "new return request received" broadcast below).
    if (isHoldFlow && form.received_by && String(form.received_by).trim() !== form.user_id) {
      try {
        await createNotificationForApi({
          user_id: String(form.received_by).trim(),
          title: 'Asset return processed',
          message: 'The asset return you initiated has been approved and is now processed.',
          type: 'system',
          data: {
            form_id: formId,
            form_number: form.form_number,
            route: '/assets/return',
            actionTarget: 'asset_return_requests',
          },
        });
      } catch (notifError) {
        logger.error('Failed to notify processor of processed hold return:', notifError);
      }
    }

    // Send notification to requester. Skipped for owner-absent flows: the asset
    // owner is no longer in office and should not receive return notifications.
    if (!approveOwnerAbsent) {
      try {
        const requesterRow = await getUserNamesById(form.user_id);
        const requesterName = requesterRow ? `${requesterRow.first_name} ${requesterRow.last_name}` : 'A user';

        const approverRow = await getUserNamesById(userId);
        const approverName = approverRow ? `${approverRow.first_name} ${approverRow.last_name}` : 'A user';
        
        await createNotificationForApi({
          user_id: form.user_id,
          title: 'Asset Return Request Approved',
          message: isSubApprover1Approver
            ? `Your asset return request has been approved by your department's sub approver ${approverName}`
            : `Your asset return request has been approved by your department head ${approverName}`,
          type: 'system',
          data: {
            form_id: formId,
            form_number: form.form_number,
            approver_id: userId,
            approver_name: approverName,
            route: '/profile?tab=documents&docTab=returns',
            actionTarget: 'return_request_approved',
          },
        });
      } catch (notifError) {
        logger.error('Failed to send approval notification to requester:', notifError);
      }
    }

    // Notify the requestor to bring the asset to the department that owns its
    // asset scope. Hold returns already have custody and are already processed.
    if (!isHoldFlow && !approveOwnerAbsent) {
      try {
        const department = await getDepartmentById(form.department_id);
        await notifyRequesterToReturnAsset({
          formId,
          formNumber: form.form_number,
          requesterUserId: form.user_id,
          departmentName: department?.name,
        });
      } catch (notifError) {
        logger.error('Failed to notify requestor to return asset:', notifError);
      }
    }

    // Linked transfer must be approved separately — no cross-notification here.

    // Processor-initiated hold flow: the returner is also notified that the return
    // is now processed, since there is no separate processing step later on.
    // Skipped for owner-absent flows (the owner is not in office).
    if (isHoldFlow && !approveOwnerAbsent) {
      try {
        await createNotificationForApi({
          user_id: form.user_id,
          title: 'Asset return processed',
          message: 'Your asset return has been processed.',
          type: 'system',
          data: {
            form_id: formId,
            form_number: form.form_number,
            route: '/profile?tab=documents&docTab=returns',
            actionTarget: 'my_return_requests',
          },
        });
      } catch (notifError) {
        logger.error('Failed to notify returner of processed hold return:', notifError);
      }
    }

    // Send notification to IT/Admin asset role users based on asset scope.
    // Skipped for processor-initiated (hold) returns — the initiating processor
    // already has custody and is notified separately that the return is processed.
    if (!isHoldFlow) {
      try {
        const assignmentIds = await getAssignmentIdsByReturnFormId(formId);
        const deptRow = await getDepartmentById(form.department_id);
        const assetRoleUsers = await getAssetRoleUsersForAssignmentsAndCompany(
          companyId,
          assignmentIds,
          deptRow?.name || ''
        );

        // Staged transfer flow: when this return backs an approved transfer,
        // tell IT/Admin processors about BOTH forms and to process return first.
        let linkedTransferFormId: string | null = null;
        let linkedTransferFormNumber: string | null = null;
        try {
          const linkedIds = await getTransferFormIdsByReturnFormId(formId);
          linkedTransferFormId = linkedIds[0] ?? null;
          if (linkedTransferFormId) {
            const [tfRows] = (await pool.execute(
              `SELECT form_number FROM asset_transfer_forms WHERE formID = ? AND deleted_at IS NULL LIMIT 1`,
              [linkedTransferFormId]
            )) as any[];
            linkedTransferFormNumber = (tfRows as any[])[0]?.form_number ?? null;
          }
        } catch {
          linkedTransferFormId = null;
        }

        let notificationsSent = 0;
        for (const assetUser of assetRoleUsers) {
          if (assetUser.userID !== userId && assetUser.userID !== form.user_id) {
            const isLinkedTransfer = linkedTransferFormId != null;
            await createNotificationForApi({
              user_id: assetUser.userID,
              title: isLinkedTransfer
                ? 'New Return + Transfer Request Received — Process Return First'
                : 'New Asset Return Request Received',
              message: isLinkedTransfer
                ? `A return form (${form.form_number}) and transfer request (${linkedTransferFormNumber ?? linkedTransferFormId}) have been received. Please process the RETURN first, then process the transfer.`
                : 'A new Asset return Request has been received',
              type: 'system',
              data: {
                form_id: formId,
                form_number: form.form_number,
                requester_id: form.user_id,
                transfer_form_id: linkedTransferFormId,
                transfer_form_number: linkedTransferFormNumber,
                processReturnFirst: isLinkedTransfer,
                route: '/assets/return-requests',
                actionTarget: 'asset_return_requests',
              },
            });
            notificationsSent++;
          }
        }

        logger.info('Return approval - notification summary', {
          formId,
          formNumber: form.form_number,
          totalUsersFound: assetRoleUsers.length,
          notificationsSent,
        });
      } catch (notifError) {
        logger.error('Failed to send notification to asset role users:', notifError);
      }
    }

    // Auto-approve linked offboarding checklists as dept head
    try {
      const assignmentIds = await getAssignmentIdsByReturnFormId(formId);
      if (assignmentIds.length > 0) {
        const checklists = await checklistRepo.getChecklistsByAssignmentIds(assignmentIds);
        const unapprovedChecklists = checklists.filter(
          (c: any) => c.employee_signed_at && !c.dept_head_signed_at
        );
        if (unapprovedChecklists.length > 0) {
          const dHeadDeptId = await getUserDepartmentId(userId);
          const effectiveCompanyId = companyId || form.company_id || null;
          if (dHeadDeptId && effectiveCompanyId) {
            await checklistRepo.approveChecklistsAsDeptHead({
              checklistIds: unapprovedChecklists.map((c: any) => c.id),
              approverUserId: userId,
              approverDepartmentId: dHeadDeptId,
              companyId: effectiveCompanyId,
              digitalSignature: deptHeadDigitalSignature,
            });
          }
        }
      }
    } catch (checklistErr) {
      logger.error('Failed to auto-approve offboarding checklists:', checklistErr);
    }

    const rawSignedAt = new Date().toISOString();
    return res.json({
      message: 'Return form approved successfully',
      formID: formId,
      dept_head_signed_at: rawSignedAt,
    });
  } catch (error: any) {
    const message = error?.message ?? '';
    logger.error('Approve return form failed:', error);
    if (
      typeof message === 'string' &&
      (message.includes('Unknown column') || message.includes('dept_head'))
    ) {
      return res.status(503).json({
        error:
          'Return form approval is not available: database schema may be outdated. Please run migration_add_dept_head_signature_asset_return_forms.sql',
      });
    }
    return res.status(500).json({ error: 'Failed to approve return form' });
  }
}

/** POST decline return form (IT/Admin staff after DH approval). Requires same scope as pending-staff. */
export async function declineReturnFormByProcessorHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const parsed = processorDeclineReturnFormBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const first =
        parsed.error.flatten().fieldErrors.reason?.[0] ??
        parsed.error.issues[0]?.message ??
        'Invalid request';
      return res.status(400).json({ error: first });
    }
    const reason = parsed.data.reason;
    const userId = req.user!.userID;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const [formRows] = (await pool.execute(
      `SELECT arf.*, d.company_id AS form_company_id
       FROM asset_return_forms arf
       LEFT JOIN asset_mngmnt_departments d ON arf.department_id = d.departmentID
       WHERE arf.formID = ? AND arf.deleted_at IS NULL`,
      [formId]
    )) as any[];
    if (formRows.length === 0) {
      return res.status(404).json({ error: 'Asset return form not found' });
    }
    const form = formRows[0];

    if (!form.dept_head_signed_at) {
      return res.status(400).json({
        error:
          'Form must be approved by Department Head before processor can decline',
      });
    }
    if (form.process_signed_at) {
      return res.status(400).json({ error: 'Form is already processed' });
    }
    if (form.declined_at) {
      return res.status(400).json({
        error: 'This return form was declined by Department Head',
      });
    }
    if (form.processor_declined_at) {
      return res.status(400).json({
        error: 'This return form is already declined by processor',
      });
    }

    const inScope = await isReturnFormInPendingStaffScope(
      {
        department_id: form.department_id,
        form_company_id: form.form_company_id,
      },
      userId
    );
    if (!inScope) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to decline this form' });
    }

    await executeRawWrite(
      `UPDATE asset_return_forms SET processor_declined_at = NOW(), processor_declined_by = ?, processor_decline_reason = ?, updated_at = NOW() WHERE formID = ?`,
      [userId, reason, formId]
    );

    await createAuditLog({
      userId,
      action: 'Declined Asset Return Form (processor)',
      resourceType: 'asset_return_form',
      resourceId: formId,
      details: `Processor declined asset return form ${form.form_number}. Reason: ${reason}`,
      newValues: {
        processor_declined_at: new Date().toISOString(),
        processor_declined_by: userId,
      },
    });

    return res.json({
      message: 'Return form declined by processor',
      formID: formId,
    });
  } catch (error: any) {
    const message = error?.message ?? '';
    logger.error('Processor decline return form failed:', error);
    if (
      typeof message === 'string' &&
      (message.includes('Unknown column') ||
        message.includes('processor_declined'))
    ) {
      return res.status(503).json({
        error:
          'Processor decline is not available: run migration_add_processor_decline_and_position_asset_return_forms.sql',
      });
    }
    return res
      .status(500)
      .json({ error: 'Failed to decline return form by processor' });
  }
}

/** POST decline return form (Dept Head). Declines only the targeted return form — linked transfer must be declined separately. */
export async function declineReturnFormHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;
    const userId = req.user!.userID;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const formRow = await getReturnFormById(formId);
    if (!formRow) {
      return res.status(404).json({ error: 'Asset return form not found' });
    }
    const form = formRow;

    if (form.declined_at) {
      return res.status(400).json({
        error: 'This return form is already declined',
      });
    }

    // Get company_id from form or user if not available
    let companyId = form.company_id;
    if (!companyId) {
      const formUser = await getUserById(form.user_id);
      companyId = formUser?.company_id || null;
    }
    if (!companyId) {
      return res.status(400).json({ error: 'Company context required' });
    }

    const [permRows] = (await pool.execute(
      'SELECT module_name, permission_type, granted FROM user_permissions WHERE user_id = ?',
      [userId]
    )) as any[];
    const hasApprovalsCreate = permRows.some(
      (r: any) =>
        r.module_name === 'Approvals' &&
        r.permission_type === 'create' &&
        r.granted === 1
    );
    const hasApprovalsEdit = permRows.some(
      (r: any) =>
        r.module_name === 'Approvals' &&
        r.permission_type === 'edit' &&
        r.granted === 1
    );
    const canDeclineByPermission = hasApprovalsCreate && hasApprovalsEdit;

    // Check if user is the designated approver or sub approver for the form's requester
    const isApprover = form.user_id
      ? await isDesignatedApprover(userId, form.user_id)
      : false;
    const isSubApprover = form.user_id
      ? await isDesignatedSubApprover(userId, form.user_id)
      : false;

    const { isSuperAdmin: scopeIsSuperAdmin, isAdmin: scopeIsAdmin } =
      await getAssetScope(pool, userId);
    const isAdminRole = scopeIsSuperAdmin || scopeIsAdmin;

    if (!canDeclineByPermission && !isApprover && !isSubApprover && !isAdminRole) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to decline this form' });
    }

    await executeRawWrite(
      `UPDATE asset_return_forms SET declined_at = NOW(), declined_by = ?, updated_at = NOW() WHERE formID = ?`,
      [userId, formId]
    );

    // Declines are now independent — do not auto-decline the linked transfer form. Approver must decline each form separately.

    await createAuditLog({
      userId,
      action: 'Declined Asset Return Form',
      resourceType: 'asset_return_form',
      resourceId: formId,
      details: `User declined asset return form ${form.form_number}`,
      newValues: { declined_at: new Date().toISOString(), declined_by: userId },
    });

    return res.json({
      message: 'Return form declined',
      formID: formId,
    });
  } catch (error: any) {
    const message = error?.message ?? '';
    logger.error('Decline return form failed:', error);
    if (
      typeof message === 'string' &&
      (message.includes('Unknown column') || message.includes('declined_at'))
    ) {
      return res.status(503).json({
        error:
          'Return form decline is not available: database schema may be outdated. Please run migration_transfer_hold_and_decline.sql',
      });
    }
    return res.status(500).json({ error: 'Failed to decline return form' });
  }
}

export async function uploadConditionPhotoHandler(
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
      `[CONDITION PHOTO UPLOAD] Success → User ${req.user!.userID} | URL: ${url}`
    );
    return res.json({ url });
  } catch (err: any) {
    logger.error('Condition photo upload failed', { err });
    return res
      .status(500)
      .json({ error: 'Upload failed', details: err.message });
  }
}

async function getAssignmentIdsByReturnFormId(formId: string): Promise<string[]> {
  try {
    const [rows] = (await pool.execute(
      'SELECT assignment_id FROM asset_returns WHERE form_id = ?',
      [formId]
    )) as any[];
    return (rows || []).map((r: any) => r.assignment_id).filter(Boolean);
  } catch {
    return [];
  }
}

export async function createReturnChecklistHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      assignmentId,
      employeeId,
      employeeName,
      employeeDesignation,
      employeeDepartment,
      employeeCompany,
      typeOnboarding,
      typeOffboarding,
      receivedBy,
      checklistData,
      remarks,
      digitalSignature,
    } = req.body;
    const createdBy = req.user!.userID;

    if (!assignmentId || !employeeId || !employeeName || !checklistData) {
      return res.status(400).json({
        error: 'assignmentId, employeeId, employeeName, and checklistData are required',
      });
    }

    const checklistId = crypto.randomUUID();
    let formNumber = await generateChecklistFormNumberFallback();
    try {
      const [assignmentRows] = (await pool.execute(
        'SELECT asset_id FROM asset_assignments WHERE assignmentID = ?',
        [assignmentId]
      )) as any[];
      const assetId = assignmentRows[0]?.asset_id;
      if (assetId) {
        const deptId = await getCategoryDepartmentForAssetIds([assetId]);
        if (deptId) {
          const companyId = await getCompanyIdByDepartment(deptId);
          if (companyId) {
            formNumber = await generateChecklistFormNumber(companyId, deptId);
          }
        }
      }
    } catch (numErr) {
      logger.warn('Failed to generate proper checklist form number, using fallback:', numErr);
    }

    await checklistRepo.createAssetChecklist({
      id: checklistId,
      formNumber,
      assignmentId,
      employeeId,
      employeeName,
      employeeDesignation: employeeDesignation || null,
      employeeDepartment: employeeDepartment || null,
      employeeCompany: employeeCompany || null,
      typeOnboarding: typeOnboarding ?? false,
      typeOffboarding: typeOffboarding ?? false,
      receivedBy: receivedBy || null,
      checklistData,
      remarks: remarks || null,
      createdBy,
    });

    await createAuditLog({
      userId: createdBy,
      action: 'Created Return Offboarding Checklist',
      resourceType: 'asset_checklist',
      resourceId: checklistId,
      resourceName: `Offboarding checklist for assignment ${assignmentId}`,
      details: `Return offboarding checklist created for employee ${employeeName}`,
    });

    // Auto-sign as employee if digital signature provided
    if (digitalSignature && typeof digitalSignature === 'string' && digitalSignature.trim()) {
      try {
        await checklistRepo.signChecklistsAsEmployee({
          checklistIds: [checklistId],
          employeeId,
          digitalSignature: digitalSignature.trim(),
        });
        await checklistRepo.backfillEmployeeChecklistSignatures({
          checklistIds: [checklistId],
          employeeId,
          digitalSignature: digitalSignature.trim(),
        });
      } catch (signErr) {
        logger.warn('Failed to auto-sign offboarding checklist:', signErr);
      }
    }

    return res.status(201).json({
      message: 'Return offboarding checklist created successfully',
      checklistId,
      formNumber,
    });
  } catch (error) {
    logger.error('Create return offboarding checklist failed:', error);
    return res.status(500).json({ error: 'Failed to create return offboarding checklist' });
  }
}

export async function getReturnChecklistByAssignmentIdHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { assignmentId } = req.params;

    if (!assignmentId) {
      return res.status(400).json({ error: 'assignmentId is required' });
    }

    const checklist = await checklistRepo.getChecklistByAssignmentId(assignmentId);

    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    return res.status(200).json(checklist);
  } catch (error) {
    logger.error('Get return checklist by assignment ID failed:', error);
    return res.status(500).json({ error: 'Failed to get checklist' });
  }
}

/**
 * POST /asset-returns/from-transfer/:transferFormId
 * Staged transfer flow: the requestor generates the linked return form AFTER
 * their transfer form was approved by their dept head / sub approver.
 * The OTP-gated client dialog acts as the requestor's signature.
 */
export async function createReturnFromTransferHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const transferFormId =
      (req.params as { transferFormId?: string }).transferFormId ??
      (req.params as { formId?: string }).formId;
    if (!transferFormId) {
      return res.status(400).json({ error: 'Transfer form ID is required' });
    }
    const currentUserId = req.user!.userID;
    const body = req.body as { digitalSignature?: string | null };
    const requesterSignature =
      (typeof body.digitalSignature === 'string' &&
        body.digitalSignature.trim()) ||
      (await fetchUserDigitalSignature(currentUserId));

    const [transferRows] = (await pool.execute(
      `SELECT formID, form_number, user_id, department_id, location_id, location_room_id,
              signed_at, dept_head_signed_at, sub_approver_1_signed_at,
              return_form_id, declined_at, executed_at
       FROM asset_transfer_forms WHERE formID = ? AND deleted_at IS NULL LIMIT 1`,
      [transferFormId]
    )) as any[];
    const transfer = (transferRows as any[])[0];
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer form not found' });
    }
    if (transfer.declined_at) {
      return res.status(400).json({ error: 'This transfer request was declined' });
    }
    if (transfer.executed_at) {
      return res.status(400).json({ error: 'This transfer has already been executed' });
    }
    if (transfer.user_id !== currentUserId) {
      return res.status(403).json({
        error: 'Only the transfer requestor can generate the return form',
      });
    }
    if (!transfer.signed_at) {
      return res.status(400).json({
        error: 'Transfer form must be signed by the transferrer first',
      });
    }
    if (!transfer.dept_head_signed_at && !transfer.sub_approver_1_signed_at) {
      return res.status(400).json({
        error: 'Transfer must be approved by your department head first',
      });
    }
    if (transfer.return_form_id) {
      return res.status(400).json({
        error: 'A return form has already been generated for this transfer',
      });
    }

    const linkedAssignments = await getTransferFormAssignments(transferFormId);
    if (linkedAssignments.length === 0) {
      return res.status(400).json({ error: 'No assignments linked to this transfer' });
    }
    const assignmentIds = linkedAssignments.map((a: any) => a.assignment_id);
    const assignmentRows = await getActiveAssignmentsByIds(assignmentIds);
    if (assignmentRows.length !== assignmentIds.length) {
      return res.status(400).json({
        error: 'One or more assets are no longer actively assigned to you',
      });
    }
    for (const row of assignmentRows as any[]) {
      if (row.user_id !== currentUserId) {
        return res.status(403).json({
          error: 'You can only generate a return for your own assignments',
        });
      }
    }

    const firstRow = (assignmentRows as any[])[0];
    const transferDeptId = transfer.department_id ?? firstRow.department_id ?? null;
    let companyId: string | null = null;
    if (transferDeptId) {
      const dept = await getDepartmentById(transferDeptId);
      companyId = dept?.company_id ?? null;
    }
    if (!companyId) {
      const user = await getUserById(currentUserId);
      companyId = user?.company_id ?? null;
    }
    const returnFormNumber =
      companyId != null
        ? await generateReturnFormNumber(companyId, transferDeptId)
        : await generateReturnFormNumberFallback();

    const connection = await pool.getConnection();
    let returnFormId: string;
    try {
      await connection.beginTransaction();

      // Serialize generation for this transfer. Without the row lock, two fast
      // requests could both observe return_form_id = NULL and create duplicates.
      const [lockedRows] = (await connection.execute(
        `SELECT return_form_id
         FROM asset_transfer_forms
         WHERE formID = ? AND deleted_at IS NULL
         FOR UPDATE`,
        [transferFormId]
      )) as any[];
      const lockedTransfer = (lockedRows as any[])[0];
      if (!lockedTransfer) {
        await connection.rollback();
        return res.status(404).json({ error: 'Transfer form not found' });
      }
      if (lockedTransfer.return_form_id) {
        await connection.rollback();
        return res.status(400).json({
          error: 'A return form has already been generated for this transfer',
        });
      }

      const returnForm = await AssetReturnFormModel.createWithReturnerSignature(
        {
          form_number: returnFormNumber,
          user_id: currentUserId,
          department_id: transferDeptId,
          location_id: firstRow.location_id ?? null,
          location_room_id: firstRow.location_room_id ?? null,
          created_by: currentUserId,
          signed_by: currentUserId,
          signed_digital_signature: requesterSignature || null,
        },
        connection
      );
      if (!returnForm) {
        throw new Error('Failed to create linked return form');
      }
      returnFormId = returnForm.formID;

      for (const row of assignmentRows as any[]) {
        await AssetReturnModel.create(
          {
            assignment_id: row.assignmentID,
            user_id: row.user_id,
            return_condition: 'Good',
            return_notes: `Return for transfer ${transfer.form_number ?? transferFormId}`,
            return_location_id: row.location_id ?? undefined,
            return_location_room_id: row.location_room_id ?? undefined,
            return_department_id: row.department_id ?? undefined,
            form_id: returnFormId,
          },
          connection
        );
      }

      await connection.execute(
        `UPDATE asset_transfer_forms SET return_form_id = ?, updated_at = NOW() WHERE formID = ?`,
        [returnFormId, transferFormId]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await createAuditLog({
      userId: currentUserId,
      action: 'Created Asset Return Form (from transfer)',
      resourceType: 'asset_return_form',
      resourceId: returnFormId,
      resourceName: returnFormNumber,
      details: `Requestor generated return form ${returnFormNumber} for approved transfer ${transfer.form_number ?? transferFormId} (OTP verified signature)`,
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });

    // Notify the requestor's approver / sub approver that the return needs approval.
    try {
      const approverUserId = await getDesignatedApproverUserIdForRequester(currentUserId);
      const subApproverUserId = await getDesignatedSubApproverUserIdForRequester(currentUserId);
      const requesterRow = await getUserNamesById(currentUserId);
      const requesterName = requesterRow
        ? `${requesterRow.first_name} ${requesterRow.last_name}`.trim()
        : 'A user';
      const notifyUsers = [approverUserId, subApproverUserId].filter(
        (id): id is string => id !== null && id !== currentUserId
      );
      const io = getIoInstance();
      for (const notifyUserId of notifyUsers) {
        const message =
          `${requesterName} generated a return form (${returnFormNumber}) for earlier transfer request ` +
          `${transfer.form_number ?? ''}. A return approval is needed before the transfer can be processed.`;
        await createNotificationForApi({
          user_id: notifyUserId,
          title: 'Return Form Approval Needed for Transfer Request',
          message,
          type: 'system',
          data: {
            form_id: returnFormId,
            form_number: returnFormNumber,
            transfer_form_id: transferFormId,
            transfer_form_number: transfer.form_number ?? null,
            requester_id: currentUserId,
            requester_name: requesterName,
            route: '/approvals',
            actionTarget: 'return_request_approval',
          },
        });
        if (io) {
          emitNotification(io, notifyUserId, 'notification', {
            id: returnFormId,
            title: 'Return Form Approval Needed for Transfer Request',
            message,
            type: 'system',
            data: {
              form_id: returnFormId,
              form_number: returnFormNumber,
              transfer_form_id: transferFormId,
              transfer_form_number: transfer.form_number ?? null,
              requester_id: currentUserId,
              requester_name: requesterName,
              route: '/approvals',
              actionTarget: 'return_request_approval',
            },
            time: new Date().toISOString(),
          });
        }
      }
    } catch (notifError) {
      logger.error('Failed to send from-transfer return notifications:', notifError);
    }

    return res.status(201).json({
      message: 'Return form generated and linked to the transfer request',
      formID: returnFormId,
      form_number: returnFormNumber,
      transferFormID: transferFormId,
    });
  } catch (error: any) {
    logger.error('Create return from transfer failed:', error);
    return res.status(500).json({ error: 'Failed to generate return form' });
  }
}

export async function getReturnFormChecklistsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { formId } = req.params;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    const assignmentIds = await getAssignmentIdsByReturnFormId(formId);
    if (assignmentIds.length === 0) {
      return res.status(200).json({ checklists: [] });
    }

    const checklists = await checklistRepo.getChecklistsByAssignmentIds(assignmentIds);

    return res.status(200).json({ checklists });
  } catch (error) {
    logger.error('Get return form checklists failed:', error);
    return res.status(500).json({ error: 'Failed to fetch return form checklists' });
  }
}
