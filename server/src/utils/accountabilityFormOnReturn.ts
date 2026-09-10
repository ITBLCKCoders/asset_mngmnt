import type { Request } from 'express';
import { pool } from '../db.js';
import { createAuditLog } from './audit.js';
import {
  createAccountabilityFormHandler,
  kickoffApprovalFlowNotifications,
  type ClearanceScope,
  type ClearanceReason,
} from '../controllers/accountabilityForms.controller.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import type { Response } from 'express';
import logger from '../logger.js';
import { classifyDepartmentScopeByName } from './assetScope.js';
import { notifyIfNoAssetsRemainInCustody } from './noAssetCustodyNotification.js';

/**
 * When assets are returned:
 * 1. Disable any existing accountability forms for this user that contain any of the returned assets (do not update their content).
 * 2. Create a new accountability form with the user's currently assigned assets only.
 */
export type ProcessSignature = {
  signed_at?: string;
  digital_signature?: string;
} | null;

export async function createReturnAccountabilityFormAndNotify(
  formReq: AuthRequest,
  ownerUserId: string,
  assignerUserId: string,
  request: Request,
  custodyNote: string | null
): Promise<void> {
  let responseBody: any = null;
  const formRes = {
    status: () => ({
      json: (body: any) => {
        responseBody = body;
        return body;
      },
    }),
  } as unknown as Response;

  await createAccountabilityFormHandler(
    {
      ...formReq,
      body: {
        ...formReq.body,
        // Return processing creates forms internally. Defer the notification so
        // the persisted form is always passed through the shared kickoff path.
        skipNotification: true,
      },
    } as AuthRequest,
    formRes
  );

  const createdForm = responseBody?.form;
  if (!createdForm?.formID || !createdForm?.form_number) return;

  let ownerName = ownerUserId;
  let assignerName = assignerUserId;
  try {
    const [userRows] = (await pool.execute(
      `SELECT userID, first_name, last_name
         FROM users
        WHERE userID IN (?, ?)`,
      [ownerUserId, assignerUserId]
    )) as any[];
    for (const row of userRows as any[]) {
      const name = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim();
      if (!name) continue;
      if (String(row.userID) === String(ownerUserId)) ownerName = name;
      if (String(row.userID) === String(assignerUserId)) assignerName = name;
    }
  } catch (error) {
    logger.warn('Could not resolve return accountability notification names:', error);
  }

  await kickoffApprovalFlowNotifications({
    formId: String(createdForm.formID),
    formNumber: String(createdForm.form_number),
    ownerUserId,
    ownerName,
    assignerName,
    custodyNote,
    req: request as AuthRequest,
  });
}

export interface ClearanceEligibility {
  eligibleScopes: ClearanceScope[];
  disabledFormNumbersByScope: Record<ClearanceScope, string[]>;
  detailsByScope: Record<
    ClearanceScope,
    {
      remainingTangible: number;
      remainingIntangible: number;
      hasOtherActiveForm: boolean;
      hasRecentClearance: boolean;
    }
  >;
}

export async function handleAccountabilityFormOnAssetReturn(
  userId: string,
  returnedAssetIds: string[],
  departmentId: string | null,
  locationId: string | null,
  locationRoomId: string | null,
  createdBy: string,
  req: Request,
  _processSignature?: ProcessSignature,
  options?: {
    adminCopySignerId?: string | null;
    adminCopyCopyType?: 'IT' | 'Admin' | null;
    /** Origin word used in the remaining-custody note sent to the IT/Admin copy signer. */
    reason?: 'return' | 'transfer';
  }
): Promise<ClearanceEligibility> {
  const emptyEligibility: ClearanceEligibility = {
    eligibleScopes: [],
    disabledFormNumbersByScope: { IT: [], Admin: [], Unified: [] } as Record<ClearanceScope, string[]>,
    detailsByScope: {
      IT: {
        remainingTangible: 0,
        remainingIntangible: 0,
        hasOtherActiveForm: false,
        hasRecentClearance: false,
      },
      Admin: {
        remainingTangible: 0,
        remainingIntangible: 0,
        hasOtherActiveForm: false,
        hasRecentClearance: false,
      },
      Unified: {
        remainingTangible: 0,
        remainingIntangible: 0,
        hasOtherActiveForm: false,
        hasRecentClearance: false,
      },
    } as Record<ClearanceScope, { remainingTangible: number; remainingIntangible: number; hasOtherActiveForm: boolean; hasRecentClearance: boolean }>,
  };

  if (returnedAssetIds.length === 0) return emptyEligibility;

  const idSet = new Set(returnedAssetIds.map(id => String(id)));

  // Fetch processor's digital initials from profile — prefer the signature
  // that was actually used to sign the return/transfer form (so the
  // clearance `Issued by:` matches the processor's drawn signature).
  let processorDigitalSignature: string | null = null;
  const preferredSig = _processSignature?.digital_signature?.trim();
  if (preferredSig) {
    processorDigitalSignature = preferredSig;
  } else {
    try {
      const [processorRows] = (await pool.execute(
        'SELECT digital_signature FROM users WHERE userID = ?',
        [createdBy]
      )) as any[];
      processorDigitalSignature = processorRows[0]?.digital_signature || null;
    } catch (err) {
      logger.error('Failed to fetch processor digital initials:', err);
    }
  }

  // 1. Find and disable any accountability forms for this user that contain any returned asset (do not update form content)
  const [formRows] = (await pool.execute(
    `SELECT formID, form_number, asset_id, assets_data, status, issuer_signature, it_copy_signature FROM accountability_forms
     WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  )) as any[];

  const disabledFormNumbersByScope: Record<ClearanceScope, string[]> = {
    IT: [],
    Admin: [],
    Unified: [],
  };

  for (const form of formRows) {
    const isSingleAsset = form.asset_id && idSet.has(String(form.asset_id));
    const isMultiContaining =
      !isSingleAsset &&
      form.assets_data &&
      (() => {
        try {
          const data =
            typeof form.assets_data === 'string'
              ? JSON.parse(form.assets_data)
              : form.assets_data;
          const assets = data?.assets || [];
          return assets.some((a: any) => idSet.has(String(a.id)));
        } catch {
          return false;
        }
      })();
    if (!isSingleAsset && !isMultiContaining) continue;

    // Classify the disabled form's scope using its assets_data. Department
    // classifications follow `classifyDepartmentScopeByName` (same as the
    // accountability PDF). Fallback to single-asset department lookup if the
    // form was stored as a legacy single-asset row.
    const formScopes = new Set<ClearanceScope>();
    try {
      const data =
        typeof form.assets_data === 'string'
          ? JSON.parse(form.assets_data)
          : form.assets_data;
      const assets = Array.isArray(data?.assets) ? data.assets : [];
      for (const a of assets) {
        const scope = classifyDepartmentScopeByName(
          a?.department || a?.categoryDepartment || ''
        );
        if (scope === 'IT' || scope === 'Admin') {
          formScopes.add(scope);
        }
      }
      if (formScopes.size === 0 && form.asset_id) {
        const [singleRows] = (await pool.execute(
          `SELECT d.name as department_name
           FROM assets a
           LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
           LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
           WHERE a.assetID = ? AND a.deleted_at IS NULL`,
          [form.asset_id]
        )) as any[];
        const scope = classifyDepartmentScopeByName(
          singleRows[0]?.department_name || ''
        );
        if (scope === 'IT' || scope === 'Admin') {
          formScopes.add(scope);
        }
      }
    } catch (err) {
      logger.warn(
        `Failed to classify disabled form ${form.formID} scope:`,
        err as Record<string, unknown>
      );
    }

    await pool.execute(
      'UPDATE accountability_forms SET status = "Disabled", updated_at = NOW() WHERE formID = ?',
      [form.formID]
    );
    await createAuditLog({
      userId: createdBy,
      action: 'Disabled Accountability Form',
      resourceType: 'accountability_form',
      resourceId: form.formID,
      resourceName: form.form_number,
      details: `Accountability form disabled due to asset return; new form created with current assignments`,
      oldValues: { status: form.status },
      newValues: { status: 'Disabled' },
      ipAddress: req.ip,
      userAgent: req.get ? req.get('User-Agent') : 'Unknown',
    });

    for (const scope of formScopes) {
      disabledFormNumbersByScope[scope].push(String(form.form_number));
    }
  }

  // 2. Create new accountability form(s) with user's currently assigned assets only
  const [activeAssignments] = (await pool.execute(
    `SELECT aa.asset_id, aa.department_id, aa.location_id, aa.location_room_id
     FROM asset_assignments aa
     WHERE aa.user_id = ? AND aa.status = 'Active' AND aa.deleted_at IS NULL`,
    [userId]
  )) as any[];

  // 2a. Per-scope clearance eligibility — DO NOT auto-create. The
  // processor will see a modal `Issue an accountability clearance` with a
  // checkbox default checked and must explicitly confirm per scope.
  const clearanceEligibility = await getClearanceEligibility({
    userId,
    disabledFormNumbersByScope,
  });

  // Remaining-custody note for the IT/Admin copy signer: the replacement
  // form(s) below are issued because the user still holds assets.
  const originWord = options?.reason === 'transfer' ? 'transfer' : 'return';
  const tangibleCustodyNote =
    `Note: a new accountability form was issued since the user still has ` +
    `${activeAssignments.length} asset${activeAssignments.length === 1 ? '' : 's'} ` +
    `in custody following this ${originWord}.`;
  const intangibleCustodyNote =
    `Note: a new accountability form was issued since the user still has ` +
    `intangible asset(s) in custody following this ${originWord}.`;

  if (activeAssignments.length === 0) {
    // No tangible assets remain. Intangible assets are tracked in a separate
    // table, so the user may still hold intangibles even after returning all
    // of their physical assets. Those existing forms were already disabled in
    // step 1, so create a replacement form from the remaining intangibles.
     const [activeIntangibles] = (await pool.execute(
       `SELECT iaa.intangible_asset_id, ia.name, ia.description, ia.type,
               ia.risk_level_id,
               iaa.department_id, iaa.location_id, iaa.location_room_id,
               d.name AS department_name,
               td.departmentID AS type_department_id, td.name AS type_department_name, td.code AS type_department_code,
               rl.id AS risk_level_id_resolved, rl.name AS risk_level_name, rl.color AS risk_level_color
        FROM intangible_asset_assignments iaa
        INNER JOIN intangible_assets ia
          ON iaa.intangible_asset_id = ia.id
       LEFT JOIN asset_mngmnt_departments d
         ON iaa.department_id = d.departmentID AND d.deleted_at IS NULL
       LEFT JOIN intangible_asset_types iat
         ON ia.type = iat.name AND iat.company_id = ia.company_id AND iat.deleted_at IS NULL
       LEFT JOIN asset_mngmnt_departments td
         ON iat.department_id = td.departmentID AND td.deleted_at IS NULL
       LEFT JOIN risk_levels rl
         ON ia.risk_level_id = rl.id AND rl.deleted_at IS NULL
       WHERE iaa.user_id = ? AND iaa.status = 'Active' AND iaa.deleted_at IS NULL`,
      [userId]
    )) as any[];

    if (activeIntangibles.length === 0) {
      await notifyIfNoAssetsRemainInCustody({
        userId,
        sourceType: options?.reason === 'transfer' ? 'transfer' : 'return',
      });
      return clearanceEligibility;
    }

    // Group by department so each department gets its own form (mirrors the
    // tangible grouping above and the form's per-department flow).
    const intangByDept = new Map<string, any[]>();
    for (const row of activeIntangibles) {
      const key = String(row.department_id ?? 'None');
      const group = intangByDept.get(key) ?? [];
      group.push(row);
      intangByDept.set(key, group);
    }

    for (const [, rows] of intangByDept.entries()) {
      const first = rows[0];
      const departmentAssets = rows.map((row: any) => ({
        id: row.intangible_asset_id,
        code: row.name || row.intangible_asset_id,
        name: row.name || '',
        description: row.description || '',
        category: 'Intangible',
        type: row.type || 'Intangible',
        department: row.department_name,
        type_department:
          row.type_department_id || row.type_department_name
            ? {
                id: row.type_department_id ?? null,
                name: row.type_department_name ?? null,
                code: row.type_department_code ?? undefined,
              }
            : null,
        type_department_name: row.type_department_name ?? null,
        risk_level_id: row.risk_level_id ?? row.risk_level_id_resolved ?? null,
        risk_level:
          row.risk_level_id || row.risk_level_name
            ? {
                id: row.risk_level_id ?? row.risk_level_id_resolved ?? null,
                name: row.risk_level_name ?? null,
                color: row.risk_level_color ?? undefined,
              }
            : null,
        serialNo: '',
        modelNo: '',
        brand: '',
      }));

      const intangibleFormReq = {
        ...req,
        user: { userID: createdBy },
        body: {
          assets: departmentAssets,
          userId,
          departmentId: first.department_id ?? null,
          locationId: first.location_id ?? null,
          locationRoomId: first.location_room_id ?? null,
          issuerSignature: processorDigitalSignature,
          itCopySignature: processorDigitalSignature,
          adminCopySignerId: options?.adminCopySignerId ?? null,
          adminCopyCopyType: options?.adminCopyCopyType ?? null,
          custodyNote: intangibleCustodyNote,
          // Background regen: follow the new dual-signer process when the
          // creator has designated approvers; fall back to direct issue
          // (no interactive user to block) when they have none.
          adminCopySignerLenient: true,
        },
      } as AuthRequest;


      try {
        await createReturnAccountabilityFormAndNotify(
          intangibleFormReq,
          userId,
          createdBy,
          req,
          intangibleCustodyNote
        );
        logger.info(
          `Created intangible-only accountability form on return: user ${userId}, dept ${first.department_id ?? 'None'}, ${departmentAssets.length} assets`
        );
      } catch (err) {
        logger.error(
          'Failed to create intangible-only accountability form on return:',
          err
        );
      }
    }

    return clearanceEligibility;
  }

  // Get categories/departments for active assets
  const assetIds = activeAssignments.map((a: any) => a.asset_id);
  const placeholders = assetIds.map(() => '?').join(',');
  const [assetDetails] = (await pool.execute(
    `SELECT a.assetID, a.category_id, a.asset_code, a.name, a.serial, a.model, a.brand,
            ac.name as category_name, at.name as type_name, d.name as department_name
     FROM assets a
     LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
     LEFT JOIN asset_types at ON a.type_id = at.typeID
     LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
     WHERE a.assetID IN (${placeholders}) AND a.deleted_at IS NULL`,
    assetIds
  )) as any[];

  const departmentGroups: Record<
    string,
    { categories: { id: string }[]; deptName: string }
  > = {};
  const categoryMap = new Map<string, { department_name: string }>();
  for (const row of assetDetails as any[]) {
    const deptName = row.department_name || 'Other';
    if (!departmentGroups[deptName]) {
      departmentGroups[deptName] = { categories: [], deptName };
    }
    const group = departmentGroups[deptName];
    if (group && row.category_id && !categoryMap.has(row.category_id)) {
      categoryMap.set(row.category_id, { department_name: deptName });
      group.categories.push({ id: row.category_id });
    }
  }

  const assignmentDept = departmentId;
  const assignmentLoc = locationId;
  const assignmentRoom = locationRoomId;

  // Departments that had a returned asset—only recreate forms for these
  const returnedIdsPlaceholders = returnedAssetIds.map(() => '?').join(',');
  const [returnedDeptRows] = (await pool.execute(
    `SELECT d.name as department_name
     FROM assets a
     LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
     LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
     WHERE a.assetID IN (${returnedIdsPlaceholders}) AND d.departmentID IS NOT NULL`,
    returnedAssetIds
  )) as any[];
  const returnedAssetDeptNames = new Set(
    (returnedDeptRows as any[]).map((r: any) => r.department_name)
  );

  let formsCreated = 0;

  for (const [deptName, deptInfo] of Object.entries(departmentGroups)) {
    if (!returnedAssetDeptNames.has(deptName)) continue;

    const categoryIds = deptInfo.categories
      .map((c: any) => c.id)
      .filter(Boolean);
    if (categoryIds.length === 0) continue;

    const [deptAssetsRows] = (await pool.execute(
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
      [userId, ...categoryIds]
    )) as any[];

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

    const accountabilityFormReq = {
      ...req,
      user: { userID: createdBy },
      body: {
        assets: departmentAssets,
        userId,
        departmentId: deptAssetsRows[0]?.department_id ?? null,
        locationId: assignmentLoc,
        locationRoomId: assignmentRoom,
        issuerSignature: processorDigitalSignature,
        itCopySignature: processorDigitalSignature,
        adminCopySignerId: options?.adminCopySignerId ?? null,
        adminCopyCopyType: options?.adminCopyCopyType ?? null,
        custodyNote: tangibleCustodyNote,
        // Background regen: follow the new dual-signer process when the
        // creator has designated approvers; fall back to direct issue
        // (no interactive user to block) when they have none.
        adminCopySignerLenient: true,
      },
    } as AuthRequest;


    try {
      await createReturnAccountabilityFormAndNotify(
        accountabilityFormReq,
        userId,
        createdBy,
        req,
        tangibleCustodyNote
      );
      formsCreated++;
      logger.info(
        `Created accountability form on return: user ${userId}, dept ${deptName}, ${departmentAssets.length} assets`
      );
    } catch (err) {
      logger.error('Failed to create accountability form on return:', err);
    }
  }

  // Fallback: if no forms created (e.g. assets have no category), create one form with all remaining assets.
  // Do NOT disable all forms—we already disabled only forms containing returned assets in step 1.
  // Skip fallback when remaining assets are only from departments with no returned assets (e.g. Admin when only IT was returned),
  // to avoid creating duplicate forms and incorrectly touching forms for unaffected departments.
  if (formsCreated === 0 && activeAssignments.length > 0) {
    const assetIdsList = activeAssignments.map((a: any) => a.asset_id);
    const placeholders = assetIdsList.map(() => '?').join(',');
    const [allAssetsRows] = (await pool.execute(
      `SELECT a.assetID, a.asset_code, a.name, a.serial, a.model, a.brand,
              ac.name as category_name, at.name as type_name, d.name as department_name, d.departmentID as department_id
       FROM asset_assignments aa
       JOIN assets a ON aa.asset_id = a.assetID
       LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
       LEFT JOIN asset_types at ON a.type_id = at.typeID
       LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
       WHERE aa.user_id = ? AND aa.status = 'Active' AND aa.deleted_at IS NULL
       AND a.assetID IN (${placeholders})
       ORDER BY aa.assigned_date ASC`,
      [userId, ...assetIdsList]
    )) as any[];

    const remainingDeptNames = new Set(
      (allAssetsRows as any[]).map((r: any) => r.department_name || 'Other')
    );
    const hasOverlapWithReturned = [...remainingDeptNames].some(d =>
      returnedAssetDeptNames.has(d)
    );
    if (!hasOverlapWithReturned) {
      return clearanceEligibility;
    }

    if (allAssetsRows.length > 0) {
      const allAssets = (allAssetsRows as any[]).map((row: any) => ({
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

      const fallbackReq = {
        ...req,
        user: { userID: createdBy },
        body: {
          assets: allAssets,
          userId,
          departmentId: allAssetsRows[0]?.department_id ?? null,
          locationId: assignmentLoc,
          locationRoomId: assignmentRoom,
          issuerSignature: processorDigitalSignature,
          itCopySignature: processorDigitalSignature,
          adminCopySignerId: options?.adminCopySignerId ?? null,
          adminCopyCopyType: options?.adminCopyCopyType ?? null,
          custodyNote: tangibleCustodyNote,
          // Background regen: follow the new dual-signer process when the
          // creator has designated approvers; fall back to direct issue
          // (no interactive user to block) when they have none.
          adminCopySignerLenient: true,
        },
      } as AuthRequest;


      try {
        await createReturnAccountabilityFormAndNotify(
          fallbackReq,
          userId,
          createdBy,
          req,
          tangibleCustodyNote
        );
        logger.info(
          `Created fallback accountability form on return: user ${userId}, ${allAssets.length} assets`
        );
      } catch (err) {
        logger.error(
          'Failed to create fallback accountability form on return:',
          err
        );
      }
    }
  }

  await notifyIfNoAssetsRemainInCustody({
    userId,
    sourceType: options?.reason === 'transfer' ? 'transfer' : 'return',
  });

  return clearanceEligibility;
}

/**
 * Check eligibility for per-scope clearance without creating. Used by the
 * opt-in modal: the processor sees a checkbox default checked for each
 * eligible scope and must confirm to actually create the certificate.
 */
export async function getClearanceEligibility(params: {
  userId: string;
  disabledFormNumbersByScope: Record<ClearanceScope, string[]>;
}): Promise<ClearanceEligibility> {
  const { userId, disabledFormNumbersByScope } = params;

  const eligibility: ClearanceEligibility = {
    eligibleScopes: [],
    disabledFormNumbersByScope,
    detailsByScope: {
      IT: {
        remainingTangible: 0,
        remainingIntangible: 0,
        hasOtherActiveForm: false,
        hasRecentClearance: false,
      },
      Admin: {
        remainingTangible: 0,
        remainingIntangible: 0,
        hasOtherActiveForm: false,
        hasRecentClearance: false,
      },
      Unified: {
        remainingTangible: 0,
        remainingIntangible: 0,
        hasOtherActiveForm: false,
        hasRecentClearance: false,
      },
    } as Record<ClearanceScope, { remainingTangible: number; remainingIntangible: number; hasOtherActiveForm: boolean; hasRecentClearance: boolean }>,
  };

  const scopes: ClearanceScope[] = ['IT', 'Admin'];
  for (const scope of scopes) {
    if (disabledFormNumbersByScope[scope].length === 0) continue;

    let hasRecentClearance = false;
    let hasOtherActiveForm = false;
    let remainingTangible = 0;
    let remainingIntangible = 0;

    // Dedup: skip if a clearance for this scope already exists in the last
    // 90 days (Pending or Signed). A Disabled clearance is treated as
    // historical and a new one can be issued.
    const [existingClearance] = (await pool.execute(
      `SELECT formID, form_number FROM accountability_forms
       WHERE user_id = ? AND deleted_at IS NULL
         AND status IN ('Pending', 'Signed')
         AND JSON_UNQUOTE(JSON_EXTRACT(assets_data, '$.form_origin')) = 'clearance'
         AND JSON_UNQUOTE(JSON_EXTRACT(assets_data, '$.clearance_scope')) = ?
         AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
       ORDER BY created_at DESC LIMIT 1`,
      [userId, scope]
    )) as any[];
    if (existingClearance.length > 0) {
      hasRecentClearance = true;
      logger.info(
        `Skipping ${scope} clearance for user ${userId}: recent clearance ${existingClearance[0].form_number} already exists`
      );
    } else {
      // Count remaining tangibles for this scope
      const [remainingTangibleRows] = (await pool.execute(
        `SELECT a.assetID, d.name AS department_name
         FROM asset_assignments aa
         INNER JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
         LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
         LEFT JOIN asset_mngmnt_departments d ON ac.department_id = d.departmentID
         WHERE aa.user_id = ? AND aa.status = 'Active' AND aa.deleted_at IS NULL`,
        [userId]
      )) as any[];
      const remainingTangibleForScope = (remainingTangibleRows as any[]).filter(
        row =>
          classifyDepartmentScopeByName(row.department_name || '') === scope
      );
      remainingTangible = remainingTangibleForScope.length;

      // Count remaining intangibles for this scope (intangibles use
      // `type_department` for their scope, see
      // `getActiveIntangibleAssetsByUserAndDepartment` in
      // `accountabilityForm.repository.ts:422`).
       const [remainingIntangibleRows] = (await pool.execute(
         `SELECT ia.id, td.name AS type_department_name, d.name AS department_name
          FROM intangible_asset_assignments iaa
          INNER JOIN intangible_assets ia
            ON iaa.intangible_asset_id = ia.id
         LEFT JOIN intangible_asset_types iat
           ON ia.type = iat.name
          AND iat.company_id = ia.company_id
          AND iat.deleted_at IS NULL
         LEFT JOIN asset_mngmnt_departments td
           ON iat.department_id = td.departmentID
          AND td.deleted_at IS NULL
         LEFT JOIN asset_mngmnt_departments d
           ON iaa.department_id = d.departmentID
          AND d.deleted_at IS NULL
         WHERE iaa.user_id = ? AND iaa.status = 'Active' AND iaa.deleted_at IS NULL`,
        [userId]
      )) as any[];
      const remainingIntangibleForScope = (
        remainingIntangibleRows as any[]
      ).filter(row => {
        // Intangibles follow the same scope rule as the PDF: the scope is
        // determined by the Intangible Asset Type's department
        // (type_department) only. Fallback to assignment department when
        // type has no department.
        const scopeByType = classifyDepartmentScopeByName(
          row.type_department_name || ''
        );
        if (scopeByType === scope) return true;
        if (scopeByType === 'Other') {
          return (
            classifyDepartmentScopeByName(row.department_name || '') === scope
          );
        }
        return false;
      });
      remainingIntangible = remainingIntangibleForScope.length;

      // Check whether another active accountability form still covers this
      // scope (Pending or Signed). A Disabled form does not block clearance.
      const [otherActiveForms] = (await pool.execute(
        `SELECT formID, form_number, assets_data FROM accountability_forms
         WHERE user_id = ? AND deleted_at IS NULL
           AND status IN ('Pending', 'Signed')`,
        [userId]
      )) as any[];
      const otherActiveFormForScope = (otherActiveForms as any[]).find(
        form => {
          try {
            const data =
              typeof form.assets_data === 'string'
                ? JSON.parse(form.assets_data)
                : form.assets_data;
            const assets = Array.isArray(data?.assets) ? data.assets : [];
            return assets.some(
              (a: any) =>
                classifyDepartmentScopeByName(
                  a?.department || a?.categoryDepartment || ''
                ) === scope
            );
          } catch {
            return false;
          }
        }
      );
      hasOtherActiveForm = !!otherActiveFormForScope;

      if (otherActiveFormForScope) {
        logger.info(
          `Skipping ${scope} clearance for user ${userId}: active form ${otherActiveFormForScope.form_number} still covers this scope`
        );
      } else if (
        remainingTangibleForScope.length > 0 ||
        remainingIntangibleForScope.length > 0
      ) {
        logger.info(
          `Skipping ${scope} clearance for user ${userId}: still has ${remainingTangibleForScope.length} tangible and ${remainingIntangibleForScope.length} intangible assets in this scope`
        );
      } else {
        // Eligible — caller will show the opt-in modal (checkbox default checked)
        // instead of auto-creating.
        eligibility.eligibleScopes.push(scope);
      }
    }

    eligibility.detailsByScope[scope] = {
      remainingTangible,
      remainingIntangible,
      hasOtherActiveForm,
      hasRecentClearance,
    };
  }

  return eligibility;
}

/**
 * Explicitly create a clearance certificate for a single scope.
 * Called only when the IT/Admin processor confirms the opt-in modal
 * (checkbox default checked). The `Issued by:` block will show the
 * processor's name/signature/date/time.
 */
export async function createClearanceForScope(params: {
  userId: string;
  scope: ClearanceScope;
  createdBy: string;
  req: Request;
  processorDigitalSignature: string | null;
  referenceDisabledFormNumbers: string[];
  clearanceReason?: ClearanceReason;
}): Promise<void> {
  const {
    userId,
    scope,
    createdBy,
    req,
    processorDigitalSignature,
    referenceDisabledFormNumbers,
    clearanceReason: clearanceReasonParam,
  } = params;

  const [userRows] = (await pool.execute(
    `SELECT u.company_id, u.department_id, d.name as department_name
     FROM users u
     LEFT JOIN asset_mngmnt_departments d
       ON u.department_id = d.departmentID AND d.deleted_at IS NULL
     WHERE u.userID = ? LIMIT 1`,
    [userId]
  )) as any[];
  const userRow = (userRows as any[])[0] ?? null;
  const companyId = userRow?.company_id ?? null;
  if (!companyId) {
    logger.warn(
      `Cannot generate ${scope} clearance for user ${userId}: no company found`
    );
    return;
  }

  const [scopeDeptRows] = (await pool.execute(
    `SELECT departmentID FROM asset_mngmnt_departments
     WHERE company_id = ? AND deleted_at IS NULL
       AND (name LIKE ? OR name LIKE ?)
     ORDER BY (name LIKE '%Information Technology%') DESC, (name LIKE '%Administration%') DESC
     LIMIT 1`,
    [
      companyId,
      scope === 'IT' ? '%IT%' : '%Admin%',
      scope === 'IT' ? '%Information Technology%' : '%Administration%',
    ]
  )) as any[];
  const scopeDepartmentId = scopeDeptRows[0]?.departmentID ?? null;

  const clearanceReason: ClearanceReason =
    clearanceReasonParam ??
    ((req as { body?: { clearanceReason?: string } })?.body
      ?.clearanceReason === 'transfer'
      ? 'transfer'
      : 'return');

  const clearanceReq = {
    ...req,
    user: { userID: createdBy },
    body: {
      userId,
      departmentId: scopeDepartmentId,
      locationId: null,
      locationRoomId: null,
      assets: [],
      formOrigin: 'clearance',
      clearanceScope: scope,
      clearanceReason,
      referenceDisabledFormNumbers,
      clearedAt: new Date().toISOString(),
      issuerSignature: processorDigitalSignature,
      itCopySignature: processorDigitalSignature,
      skipNotification: false,
    },
  } as AuthRequest;

  const clearanceRes = {
    status: () => ({ json: () => ({}) }),
  } as unknown as Response;

  try {
    await createAccountabilityFormHandler(clearanceReq, clearanceRes);
    logger.info(
      `Created ${scope} clearance certificate for user ${userId} (disabled forms: ${referenceDisabledFormNumbers.join(', ')})`
    );
  } catch (err) {
    logger.error(
      `Failed to create ${scope} clearance certificate for user ${userId}:`,
      err as Record<string, unknown>
    );
    throw err;
  }
}
