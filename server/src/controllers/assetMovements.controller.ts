import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import { AssetTransferFormModel } from '../models/assetTransferForm.model.js';
import { AssetReturnFormModel } from '../models/assetReturnForm.model.js';
import { AssetReturnModel } from '../models/assetReturn.model.js';
import {
  getReturnFormsByAssignmentIds,
  getTransferFormsForMovement,
  getActiveAccountabilityFormsForAssetIds,
  findFormsByAssetId,
  getAssignmentAssetMapping,
} from '../repositories/accountabilityForm.repository.js';
import { getUserNamesByIds } from '../repositories/assetTransferForm.repository.js';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../utils/responseWrapper.js';

interface MovementRow {
  assetCode: string;
  assetName: string;
  oldOwner: string;
  newOwner: string;
  oldAccountabilityFormNo: string | null;
  newAccountabilityFormNo: string | null;
  date: string;
  movementType: 'Transfer' | 'Return';
  transferFormNumber?: string | null;
  returnFormNumber?: string | null;
}

async function getUserFullNames(userIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (userIds.length === 0) return names;
  const rows = await getUserNamesByIds(userIds);
  for (const r of rows) {
    const full = `${r.first_name || ''} ${r.last_name || ''}`.trim();
    if (full) names.set(r.userID, full);
  }
  return names;
}

function parseDateParam(param?: string): Date | null {
  if (!param) return null;
  // Parse date as local date (YYYY-MM-DD) to avoid timezone issues
  const [year, month, day] = param.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function matchesFilter(value: string | null | undefined, filter: string): boolean {
  if (!filter) return true;
  if (!value) return false;
  return value.toLowerCase().includes(filter.toLowerCase());
}

export async function getMyAssetMovementsHandler(req: AuthRequest, res: Response) {
  try {
    const currentUserId = req.user!.userID;

    const fromDate = parseDateParam(req.query.from as string);
    let toDate = parseDateParam(req.query.to as string);
    // Adjust toDate to end of day (23:59:59.999) to include the entire day
    if (toDate) {
      toDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999);
    }
    const formNumberFilter = (req.query.formNumber as string) ?? '';
    const assetCodeFilter = (req.query.assetCode as string) ?? '';
    const typeFilter = (req.query.type as string) ?? 'all';

    const [transferForms, returnForms] = await Promise.all([
      AssetTransferFormModel.findByUserId(currentUserId),
      AssetReturnFormModel.findByUserId(currentUserId),
    ]);

    const allMovements: MovementRow[] = [];

    // ---- TRANSFER MOVEMENTS ----
    if (typeFilter !== 'return') {
      for (const form of transferForms) {
        const formCreatedAt = new Date(form.created_at);
        if (fromDate && formCreatedAt < fromDate) continue;
        if (toDate && formCreatedAt > toDate) continue;

        const [recordRows] = (await pool.execute(
          `SELECT atr.record_id, atr.assignment_id, atr.transfer_condition, atr.transfer_notes, atr.created_at,
                  aa.asset_id, aa.assigned_date, aa.assignment_notes,
                  a.asset_code, a.name as asset_name,
                  u.first_name, u.last_name, u.email, u.employee_number, u.position
           FROM asset_transfer atr
           JOIN asset_assignments aa ON atr.assignment_id = aa.assignmentID
           JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
           LEFT JOIN users u ON aa.user_id = u.userID
           WHERE atr.form_id = ? AND atr.deleted_at IS NULL
           ORDER BY atr.created_at ASC`,
          [form.formID]
        )) as any[];

        const oldOwnerNames = await getUserFullNames(
          (recordRows.map((r: any) => r.user_id) as (string | null)[]).filter((u): u is string => !!u)
        );

        const newAssignedUserName = form.new_assigned_user_id
          ? ((await getUserFullNames([form.new_assigned_user_id])).get(form.new_assigned_user_id) ?? '')
          : '';

        const assetIds = recordRows.map((r: any) => r.asset_id);
        const assignmentIds = recordRows.map((r: any) => r.assignment_id);

        // Resolve accountability forms
        const assignmentMapping = await getAssignmentAssetMapping(assignmentIds);
        const assignmentToAssetId = new Map<string, string>();
        for (const m of assignmentMapping) {
          assignmentToAssetId.set(m.assignment_id, m.asset_id);
        }

        const returnFormsByAssignment = await getReturnFormsByAssignmentIds(assignmentIds);
        const returnFormIds = [...new Set(returnFormsByAssignment.map(r => r.formID).filter((f): f is string => !!f))];

        const transferFormsByMovement = await getTransferFormsForMovement(assignmentIds, returnFormIds);

        for (const record of recordRows) {
          const assetId = record.asset_id;
          const assetCode = record.asset_code;
          const assetName = record.asset_name;

          if (!matchesFilter(assetCode, assetCodeFilter)) continue;

          const oldOwner = oldOwnerNames.get(record.user_id) ?? 'Unknown';

          // Old accountability form: find form that covered this asset for the old owner (now disabled/completed)
          const allAssetForms = await findFormsByAssetId(assetId);
          let oldFormNo: string | null = null;
          for (const af of allAssetForms) {
            const isOldOwnerForm = af.user_id === record.user_id;
            const isDisabledOrCompleted = ['Disabled', 'Completed', 'Revoked'].includes(af.status);
            if (isOldOwnerForm && isDisabledOrCompleted) {
              oldFormNo = af.form_number;
              break;
            }
          }

          // New accountability form: active form covering this asset for the new owner
          let newFormNo: string | null = null;
          if (form.new_assigned_user_id) {
            const activeForms = await getActiveAccountabilityFormsForAssetIds([assetId], '');
            for (const af of activeForms) {
              if (af.user_id === form.new_assigned_user_id) {
                newFormNo = af.form_number;
                break;
              }
            }
          }

          // Also allow filtering by transfer form number
          if (
            !matchesFilter(oldFormNo, formNumberFilter) &&
            !matchesFilter(newFormNo, formNumberFilter) &&
            !matchesFilter(form.form_number, formNumberFilter)
          ) continue;

          allMovements.push({
            assetCode,
            assetName,
            oldOwner,
            newOwner: newAssignedUserName || 'Unknown',
            oldAccountabilityFormNo: oldFormNo,
            newAccountabilityFormNo: newFormNo,
            date: form.created_at,
            movementType: 'Transfer',
            transferFormNumber: form.form_number,
          });
        }
      }
    }

    // ---- RETURN MOVEMENTS ----
    if (typeFilter !== 'transfer') {
      // Fetch return forms for this user
      const returnFormsForUser = await AssetReturnModel.findByUserId(currentUserId);

      // Group by form_id (return_batch_id)
      const formsByBatch = new Map<string, typeof returnFormsForUser>();
      for (const ret of returnFormsForUser) {
        const batchId = ret.return_batch_id ?? ret.form_id ?? ret.return_id;
        if (!formsByBatch.has(batchId)) formsByBatch.set(batchId, []);
        formsByBatch.get(batchId)!.push(ret);
      }

      // Get return form details (form_number, created_at, processed_by)
      const batchIds = Array.from(formsByBatch.keys());
      let returnFormDetails: Map<string, { form_number: string | null; created_at: string; processed_by: string | null }> = new Map();
      if (batchIds.length > 0) {
        const placeholders = batchIds.map(() => '?').join(',');
        const [rfRows] = (await pool.execute(
          `SELECT formID, form_number, created_at, process_signed_by
           FROM asset_return_forms
           WHERE formID IN (${placeholders}) AND deleted_at IS NULL`,
          batchIds
        )) as any[];
        for (const r of rfRows) {
          returnFormDetails.set(r.formID, {
            form_number: r.form_number,
            created_at: r.created_at,
            processed_by: r.process_signed_by,
          });
        }
      }

      // Resolve processor names
      const processorIds = [...new Set(Array.from(returnFormDetails.values()).map(v => v.processed_by).filter((p): p is string => !!p))];
      const processorNames = await getUserFullNames(processorIds);

      for (const [batchId, returns] of formsByBatch.entries()) {
        const formDetail = returnFormDetails.get(batchId) ?? { form_number: null, created_at: returns[0]?.created_at ?? new Date().toISOString(), processed_by: null };
        const formCreatedAt = new Date(formDetail.created_at);
        if (fromDate && formCreatedAt < fromDate) continue;
        if (toDate && formCreatedAt > toDate) continue;

        const processedBy = formDetail.processed_by ? (processorNames.get(formDetail.processed_by) ?? 'Processor') : 'Returned';

        for (const ret of returns) {
          const [assignmentRows] = (await pool.execute(
            `SELECT aa.assignmentID, aa.asset_id, aa.user_id,
                    a.asset_code, a.name as asset_name,
                    u.first_name, u.last_name
             FROM asset_assignments aa
             JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
             LEFT JOIN users u ON aa.user_id = u.userID
             WHERE aa.assignmentID = ?`,
            [ret.assignment_id]
          )) as any[];

          const assignment = assignmentRows[0];
          if (!assignment) continue;

          const assetId = assignment.asset_id;
          const assetCode = assignment.asset_code;
          const assetName = assignment.asset_name;

          if (!matchesFilter(assetCode, assetCodeFilter)) continue;

          const oldOwner = `${assignment.first_name || ''} ${assignment.last_name || ''}`.trim() || 'Unknown';

          // Old accountability form: form covering this asset for the returner (old owner)
          const allAssetForms = await findFormsByAssetId(assetId);
          let oldFormNo: string | null = null;
          for (const af of allAssetForms) {
            const isOldOwnerForm = af.user_id === assignment.user_id;
            const isDisabledOrCompleted = ['Disabled', 'Completed', 'Revoked'].includes(af.status);
            if (isOldOwnerForm && isDisabledOrCompleted) {
              oldFormNo = af.form_number;
              break;
            }
          }

          // New accountability form: active form for the processor (if hold) or for the returner's remaining assets
          let newFormNo: string | null = null;
          if (formDetail.processed_by) {
            const activeForms = await getActiveAccountabilityFormsForAssetIds([assetId], '');
            for (const af of activeForms) {
              if (af.user_id === formDetail.processed_by) {
                newFormNo = af.form_number;
                break;
              }
            }
          }
          // If no processor form, check if returner has a new active form
          if (!newFormNo) {
            const activeForms = await getActiveAccountabilityFormsForAssetIds([assetId], '');
            for (const af of activeForms) {
              if (af.user_id === assignment.user_id) {
                newFormNo = af.form_number;
                break;
              }
            }
          }

          // Also allow filtering by return form number
          if (
            !matchesFilter(oldFormNo, formNumberFilter) &&
            !matchesFilter(newFormNo, formNumberFilter) &&
            !matchesFilter(formDetail.form_number, formNumberFilter)
          ) continue;

          allMovements.push({
            assetCode,
            assetName,
            oldOwner,
            newOwner: processedBy,
            oldAccountabilityFormNo: oldFormNo,
            newAccountabilityFormNo: newFormNo,
            date: formDetail.created_at,
            movementType: 'Return',
            returnFormNumber: formDetail.form_number,
          });
        }
      }
    }

    // Sort by date desc
    allMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return createSuccessResponse(res, allMovements, 'Asset movements fetched successfully');
  } catch (error: any) {
    logger.error('Get my asset movements failed:', error);
    return createErrorResponse(res, 'FETCH_FAILED', [], 500, 'Failed to fetch asset movements');
  }
}