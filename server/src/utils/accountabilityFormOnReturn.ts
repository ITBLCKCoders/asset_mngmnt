import type { Request } from 'express';
import { pool } from '../db.js';
import { createAuditLog } from './audit.js';
import { createAccountabilityFormHandler } from '../controllers/accountabilityForms.controller.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import type { Response } from 'express';
import logger from '../logger.js';

/**
 * When assets are returned:
 * 1. Disable any existing accountability forms for this user that contain any of the returned assets (do not update their content).
 * 2. Create a new accountability form with the user's currently assigned assets only.
 */
export type ProcessSignature = {
  signed_at?: string;
  digital_signature?: string;
} | null;

export async function handleAccountabilityFormOnAssetReturn(
  userId: string,
  returnedAssetIds: string[],
  departmentId: string | null,
  locationId: string | null,
  locationRoomId: string | null,
  createdBy: string,
  req: Request,
  _processSignature?: ProcessSignature
): Promise<void> {
  if (returnedAssetIds.length === 0) return;

  const idSet = new Set(returnedAssetIds.map(id => String(id)));

  // Fetch processor's digital initials from profile
  let processorDigitalSignature: string | null = null;
  try {
    const [processorRows] = (await pool.execute(
      'SELECT digital_signature FROM users WHERE userID = ?',
      [createdBy]
    )) as any[];
    processorDigitalSignature = processorRows[0]?.digital_signature || null;
  } catch (err) {
    logger.error('Failed to fetch processor digital initials:', err);
  }

  // 1. Find and disable any accountability forms for this user that contain any returned asset (do not update form content)
  const [formRows] = (await pool.execute(
    `SELECT formID, form_number, asset_id, assets_data, status, issuer_signature, it_copy_signature FROM accountability_forms
     WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  )) as any[];

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
  }

  // 2. Create new accountability form(s) with user's currently assigned assets only
  const [activeAssignments] = (await pool.execute(
    `SELECT aa.asset_id, aa.department_id, aa.location_id, aa.location_room_id
     FROM asset_assignments aa
     WHERE aa.user_id = ? AND aa.status = 'Active' AND aa.deleted_at IS NULL`,
    [userId]
  )) as any[];

  if (activeAssignments.length === 0) {
    return;
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
      return;
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
        },
      } as AuthRequest;

      const fallbackRes = {
        status: () => ({ json: () => ({}) }),
      } as unknown as Response;

      try {
        await createAccountabilityFormHandler(fallbackReq, fallbackRes);
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
}
