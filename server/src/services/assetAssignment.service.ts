import type { RowDataPacket } from 'mysql2';
import {
  AssetAssignment,
  AssetAssignmentModel,
} from '../models/assetAssignment.model';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';
import * as repo from '../repositories/assetAssignment.repository.js';

export class AssetAssignmentService {
  static async getAssetAssignments(): Promise<AssetAssignment[]> {
    try {
      logger.info('Fetching all asset assignments from database');
      const assignments = await AssetAssignmentModel.findAll();
      logger.info(`Found ${assignments.length} asset assignments`);
      return assignments;
    } catch (error) {
      logger.error('Error fetching asset assignments:', error);
      throw new Error('Failed to fetch asset assignments');
    }
  }

  static async getAssetAssignmentById(
    assetAssignmentID: string
  ): Promise<AssetAssignment | null> {
    try {
      logger.info(`Fetching asset assignment by ID: ${assetAssignmentID}`);
      const assignment = await AssetAssignmentModel.findById(assetAssignmentID);

      if (assignment) {
        logger.info(
          `Found asset assignment for asset ID: ${assignment.asset_id}`
        );
        return assignment;
      }

      logger.warn(`Asset assignment not found: ${assetAssignmentID}`);
      return null;
    } catch (error) {
      logger.error(
        `Error fetching asset assignment ${assetAssignmentID}:`,
        error
      );
      throw new Error('Failed to fetch asset assignment');
    }
  }

  static async getAssetAssignmentsByAssetId(
    asset_id: string
  ): Promise<AssetAssignment[]> {
    try {
      logger.info(`Fetching asset assignments by asset ID: ${asset_id}`);
      const assignments = await AssetAssignmentModel.findByAssetId(asset_id);
      logger.info(
        `Found ${assignments.length} asset assignments for asset ${asset_id}`
      );
      return assignments;
    } catch (error) {
      logger.error(
        `Error fetching asset assignments by asset ${asset_id}:`,
        error
      );
      throw new Error('Failed to fetch asset assignments');
    }
  }

  static async getAssetAssignmentsByUserId(
    user_id: string
  ): Promise<AssetAssignment[]> {
    try {
      logger.info(`Fetching asset assignments by user ID: ${user_id}`);
      const assignments = await AssetAssignmentModel.findByUserId(user_id);
      logger.info(
        `Found ${assignments.length} asset assignments for user ${user_id}`
      );
      return assignments;
    } catch (error) {
      logger.error(
        `Error fetching asset assignments by user ${user_id}:`,
        error
      );
      throw new Error('Failed to fetch asset assignments');
    }
  }

  static async createAssetAssignment(
    assignmentData: Partial<AssetAssignment>,
    userId: string
  ): Promise<AssetAssignment | null> {
    try {
      logger.info('Creating new asset assignment:', {
        asset_id: assignmentData.asset_id,
        user_id: assignmentData.user_id,
      });

      // Validate required fields
      if (
        !assignmentData.asset_id ||
        !assignmentData.user_id ||
        !assignmentData.assigned_date ||
        !assignmentData.due_date
      ) {
        throw new Error(
          'Asset ID, user ID, assigned date, and due date are required'
        );
      }

      // Create the asset assignment
      const newAssignment = await AssetAssignmentModel.create(
        assignmentData,
        userId
      );

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Created Asset Assignment',
        resourceType: 'asset-assignment',
        resourceId: newAssignment?.assetAssignmentID || '',
        resourceName: `Asset ${newAssignment?.asset_id} - User ${newAssignment?.user_id}`,
        details: `Created asset assignment for asset ${newAssignment?.asset_id} and user ${newAssignment?.user_id}`,
        newValues: {
          asset_id: newAssignment?.asset_id,
          user_id: newAssignment?.user_id,
          status: newAssignment?.status,
          assigned_date: newAssignment?.assigned_date,
          due_date: newAssignment?.due_date,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(
        `Asset assignment created successfully: ${newAssignment?.assetAssignmentID}`
      );
      return newAssignment;
    } catch (error) {
      logger.error('Error creating asset assignment:', error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to create asset assignment');
    }
  }

  static async updateAssetAssignment(
    assetAssignmentID: string,
    assignmentData: Partial<AssetAssignment>,
    userId: string
  ): Promise<AssetAssignment | null> {
    try {
      logger.info(`Updating asset assignment: ${assetAssignmentID}`);

      // Check if asset assignment exists
      const existingAssignment =
        await AssetAssignmentModel.findById(assetAssignmentID);

      if (!existingAssignment) {
        throw new Error('Asset assignment not found');
      }

      // Update the asset assignment
      const updatedAssignment = await AssetAssignmentModel.update(
        assetAssignmentID,
        assignmentData,
        userId
      );

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Updated Asset Assignment',
        resourceType: 'asset-assignment',
        resourceId: existingAssignment.assetAssignmentID,
        resourceName: `Asset ${existingAssignment.asset_id} - User ${existingAssignment.user_id}`,
        details: 'Updated asset assignment details',
        oldValues: {
          asset_id: existingAssignment.asset_id,
          user_id: existingAssignment.user_id,
          status: existingAssignment.status,
          assigned_date: existingAssignment.assigned_date,
          due_date: existingAssignment.due_date,
          returned_date: existingAssignment.returned_date,
          notes: existingAssignment.notes,
        },
        newValues: {
          asset_id: updatedAssignment?.asset_id,
          user_id: updatedAssignment?.user_id,
          status: updatedAssignment?.status,
          assigned_date: updatedAssignment?.assigned_date,
          due_date: updatedAssignment?.due_date,
          returned_date: updatedAssignment?.returned_date,
          notes: updatedAssignment?.notes,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(
        `Asset assignment updated successfully: ${assetAssignmentID}`
      );
      return updatedAssignment;
    } catch (error) {
      logger.error(
        `Error updating asset assignment ${assetAssignmentID}:`,
        error
      );

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to update asset assignment');
    }
  }

  static async deleteAssetAssignment(
    assetAssignmentID: string,
    userId: string
  ): Promise<void> {
    try {
      logger.info(`Deleting asset assignment: ${assetAssignmentID}`);

      // Check if asset assignment exists
      const existingAssignment =
        await AssetAssignmentModel.findById(assetAssignmentID);

      if (!existingAssignment) {
        throw new Error('Asset assignment not found');
      }

      await AssetAssignmentModel.delete(assetAssignmentID, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Deleted Asset Assignment',
        resourceType: 'asset-assignment',
        resourceId: existingAssignment.assetAssignmentID,
        resourceName: `Asset ${existingAssignment.asset_id} - User ${existingAssignment.user_id}`,
        details: `Deleted asset assignment for asset ${existingAssignment.asset_id} and user ${existingAssignment.user_id}`,
        oldValues: {
          asset_id: existingAssignment.asset_id,
          user_id: existingAssignment.user_id,
          status: existingAssignment.status,
          assigned_date: existingAssignment.assigned_date,
          due_date: existingAssignment.due_date,
          returned_date: existingAssignment.returned_date,
          notes: existingAssignment.notes,
        },
        newValues: null,
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(
        `Asset assignment deleted successfully: ${assetAssignmentID}`
      );
    } catch (error) {
      logger.error(
        `Error deleting asset assignment ${assetAssignmentID}:`,
        error
      );

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to delete asset assignment');
    }
  }

  static async markAssignmentAsReturned(
    assetAssignmentID: string,
    returnedDate: string,
    userId: string
  ): Promise<AssetAssignment | null> {
    try {
      logger.info(`Marking asset assignment as returned: ${assetAssignmentID}`);

      const updatedAssignment = await this.updateAssetAssignment(
        assetAssignmentID,
        {
          returned_date: returnedDate,
          status: 'returned',
        },
        userId
      );

      logger.info(`Asset assignment marked as returned: ${assetAssignmentID}`);
      return updatedAssignment;
    } catch (error) {
      logger.error(
        `Error marking asset assignment as returned ${assetAssignmentID}:`,
        error
      );
      throw new Error('Failed to mark asset assignment as returned');
    }
  }
}

// ===========================================================================
// Phase-3 orchestration helpers (consumed by the slimmed
// `controllers/assetAssignments.controller.ts`).
//
// These functions sit between the controller and the repository: they
// preserve the exact behaviour of the inline logic that previously lived
// in the controller, but without raw SQL or HTTP concerns.
// ===========================================================================

export type AccountabilityFormSummary = {
  id: string;
  formNumber: string;
  status: string;
  declineReason: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function formSummaryFromAssignmentRow(
  formRow: repo.AccountabilityFormByAssignmentRow
): AccountabilityFormSummary {
  return {
    id: String(formRow.formID),
    formNumber: formRow.form_number,
    status: formRow.status,
    declineReason: formRow.decline_reason ?? null,
    created_at: formRow.created_at ?? null,
    updated_at: formRow.updated_at ?? null,
  };
}

function formSummaryFromUserRow(
  formRow: repo.AccountabilityFormByUserRow
): AccountabilityFormSummary {
  return {
    id: String(formRow.formID),
    formNumber: formRow.form_number,
    status: formRow.status,
    declineReason: formRow.decline_reason ?? null,
    created_at: formRow.created_at ?? null,
    updated_at: formRow.updated_at ?? null,
  };
}

function collectLinkedAssetIds(
  formRow: repo.AccountabilityFormByUserRow
): Set<string> {
  const assetIds = new Set<string>();
  if (formRow.asset_id) {
    assetIds.add(String(formRow.asset_id));
  }
  if (formRow.assets_data) {
    try {
      const data =
        typeof formRow.assets_data === 'string'
          ? JSON.parse(formRow.assets_data)
          : formRow.assets_data;
      const assets = Array.isArray(data?.assets) ? data.assets : [];
      for (const asset of assets) {
        if (asset?.id) {
          assetIds.add(String(asset.id));
        }
      }
    } catch {
      // ignore malformed JSON
    }
  }
  return assetIds;
}

/** Prefer newer created_at; tie-break with higher formID. */
function rowBeatsSummary(
  formRow: repo.AccountabilityFormByAssignmentRow,
  current: AccountabilityFormSummary | undefined
): boolean {
  if (!current) return true;
  const newT = Date.parse(String(formRow.created_at || '')) || 0;
  const curT = Date.parse(String(current.created_at || '')) || 0;
  if (newT !== curT) return newT > curT;
  return Number(formRow.formID) > Number(current.id);
}

/**
 * For a list of `sp_get_assignments` rows, build the
 * `Map<assignmentID, AccountabilityFormSummary>` that the listing handler
 * uses to decorate each assignment with its most relevant accountability
 * form. Mirrors the original 200-line block from
 * `getAssetAssignmentsHandler` exactly.
 */
export async function buildAccountabilityFormMap(
  rows: RowDataPacket[]
): Promise<Map<string, AccountabilityFormSummary>> {
  const out = new Map<string, AccountabilityFormSummary>();

  // 1) Direct assignment_id -> form linkage.
  const assignmentIds = [
    ...new Set(
      rows
        .map(r => (r as { assignmentID?: unknown }).assignmentID)
        .filter(
          (id): id is string | number => id != null && String(id).trim() !== ''
        )
        .map(id => String(id))
    ),
  ];

  if (assignmentIds.length > 0) {
    const formsByAssignment =
      await repo.getAccountabilityFormsByAssignmentIds(assignmentIds);
    for (const formRow of formsByAssignment) {
      const aid = String(formRow.assignment_id);
      if (rowBeatsSummary(formRow, out.get(aid))) {
        out.set(aid, formSummaryFromAssignmentRow(formRow));
      }
    }
  }

  // 2) Bulk forms with assignment_id NULL: pair by user+asset zip.
  const userIds = [
    ...new Set(
      rows
        .map(r => (r as { user_id?: unknown }).user_id)
        .filter((v): v is string => Boolean(v))
    ),
  ];
  if (userIds.length === 0) return out;

  const formRows = await repo.getAccountabilityFormsByUserIds(userIds);

  type Group = { userId: string; assetId: string; rows: RowDataPacket[] };
  const groupKey = (row: RowDataPacket): string =>
    `${(row as { user_id?: string }).user_id}:${(row as { asset_id?: string }).asset_id}`;
  const byGroup = new Map<string, Group>();
  for (const row of rows) {
    const k = groupKey(row);
    let g = byGroup.get(k);
    if (!g) {
      g = {
        userId: String((row as { user_id?: string }).user_id ?? ''),
        assetId: String((row as { asset_id?: string }).asset_id ?? ''),
        rows: [],
      };
      byGroup.set(k, g);
    }
    g.rows.push(row);
  }

  for (const { userId, assetId, rows: groupRows } of byGroup.values()) {
    const formsForAsset: repo.AccountabilityFormByUserRow[] = [];
    const seenForm = new Set<string>();
    for (const fr of formRows) {
      if (String(fr.user_id) !== userId) continue;
      const idStr = String(fr.formID);
      if (seenForm.has(idStr)) continue;
      if (!collectLinkedAssetIds(fr).has(assetId)) continue;
      seenForm.add(idStr);
      formsForAsset.push(fr);
    }

    formsForAsset.sort((a, b) => {
      const ta = Date.parse(String(a.created_at || '')) || 0;
      const tb = Date.parse(String(b.created_at || '')) || 0;
      if (ta !== tb) return ta - tb;
      return Number(a.formID) - Number(b.formID);
    });

    const usedFormIds = new Set<string>();
    for (const row of groupRows) {
      const aid = String((row as { assignmentID?: string }).assignmentID);
      const hit = out.get(aid);
      if (hit) usedFormIds.add(hit.id);
    }

    const formsFree = formsForAsset.filter(
      fr => !usedFormIds.has(String(fr.formID))
    );

    const rowsNeedingZip = groupRows
      .filter(
        row =>
          !out.has(String((row as { assignmentID?: string }).assignmentID))
      )
      .sort((a, b) => {
        const ta =
          Date.parse(
            String((a as { assigned_date?: string }).assigned_date || '')
          ) || 0;
        const tb =
          Date.parse(
            String((b as { assigned_date?: string }).assigned_date || '')
          ) || 0;
        if (ta !== tb) return ta - tb;
        return String(
          (a as { assignmentID?: string }).assignmentID
        ).localeCompare(String((b as { assignmentID?: string }).assignmentID));
      });

    const n = rowsNeedingZip.length;
    const m = formsFree.length;
    if (n === 0 || m === 0) continue;

    const kPair = Math.min(n, m);
    const rowsK = rowsNeedingZip.slice(-kPair);
    const formsK = formsFree.slice(-kPair);
    for (let i = 0; i < kPair; i++) {
      out.set(
        String((rowsK[i] as { assignmentID?: string }).assignmentID),
        formSummaryFromUserRow(formsK[i] as repo.AccountabilityFormByUserRow)
      );
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Permission helper — consumed by getFilteredAssetAssignmentsHandler
// ---------------------------------------------------------------------------

export type ModulePermissions = Record<
  string,
  { view: boolean; create: boolean; edit: boolean; delete: boolean }
>;

export async function loadUserModulePermissions(
  userId: string
): Promise<ModulePermissions> {
  const rows = await repo.getUserModulePermissions(userId);
  const out: ModulePermissions = {};
  for (const r of rows) {
    if (!out[r.module_name]) {
      out[r.module_name] = {
        view: false,
        create: false,
        edit: false,
        delete: false,
      };
    }
    const ptype = r.permission_type as keyof ModulePermissions[string];
    if (ptype in out[r.module_name]!) {
      out[r.module_name]![ptype] = r.granted === 1;
    }
  }
  return out;
}
