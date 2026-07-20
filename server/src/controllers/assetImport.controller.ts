import type { Response } from 'express';
import { pool } from '../db.js';
import * as assetRepo from '../repositories/asset.repository.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';
import { ImportAssetsRequestSchema } from '../dtos/assets/ImportAssetDto.js';
import { createErrorResponse } from '../utils/responseWrapper.js';

const STORED_PROC_CONDITIONS = new Set(['Excellent', 'Good', 'Fair', 'Poor', 'Damaged']);

function normalizeCondition(incoming: string | undefined | null): string | null {
  const raw = incoming != null ? String(incoming).trim() : '';
  if (raw && STORED_PROC_CONDITIONS.has(raw)) return raw;
  const map: Record<string, string> = {
    New: 'Excellent',
    Bad: 'Poor',
    'Needs Repair': 'Fair',
    Obsolete: 'Poor',
  };
  return (raw && map[raw]) || null;
}

const STORED_PROC_STATUSES = new Set([
  'Available', 'In Use', 'Under Maintenance', 'Retired', 'Disposed', 'Lost',
]);

function normalizeStatus(incoming: string | undefined | null): string {
  const raw = incoming != null ? String(incoming).trim() : '';
  if (raw === 'Assigned') return 'In Use';
  if (raw && STORED_PROC_STATUSES.has(raw)) return raw;
  const map: Record<string, string> = {
    'For Investigation': 'In Use',
    'For Disposal': 'Retired',
    Borrowed: 'In Use',
    'Service Unit': 'In Use',
    'For Isolation': 'Under Maintenance',
    Repairing: 'Under Maintenance',
  };
  return (raw && map[raw]) || 'Available';
}

export async function importAssetsHandler(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.userID;
    if (!userId) {
      createErrorResponse(res, 'Unauthorized');
      return;
    }

    const parsed = ImportAssetsRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: parsed.error.issues.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    const { assets, builders } = parsed.data;
    const created: { row: number; assetCode: string; name: string }[] = [];
    const errors: { row: number; message: string }[] = [];
    let importCompanyId: string | null = null;

    for (let i = 0; i < assets.length; i++) {
      const row = assets[i]!;
      const rowNum = i + 1;

      try {
        const categoryId = await assetRepo.getCategoryIdByIdOrName(row.category);
        if (!categoryId) {
          errors.push({ row: rowNum, message: `Category "${row.category}" not found` });
          continue;
        }

        let typeId: string | null = null;
        if (row.type) {
          typeId = await assetRepo.getTypeIdByIdOrName(row.type);
          if (!typeId) {
            errors.push({ row: rowNum, message: `Type "${row.type}" not found` });
            continue;
          }
        }

        let companyId: string | null = null;
        if (row.company) {
          companyId = await assetRepo.getCompanyIdByIdOrName(row.company);
          if (!companyId) {
            errors.push({ row: rowNum, message: `Company "${row.company}" not found` });
            continue;
          }
        }
        importCompanyId = companyId;

        const formatSettings = await assetRepo.getAssetIdFormatSettings(companyId!);
        if (!formatSettings) {
          errors.push({
            row: rowNum,
            message: `Smart Asset ID Format not configured for company "${row.company}"`,
          });
          continue;
        }

        let locationId: string | null = null;
        if (row.locationSite) {
          locationId = await assetRepo.getLocationIdByIdOrName(row.locationSite);
          if (!locationId) {
            errors.push({ row: rowNum, message: `Location "${row.locationSite}" not found` });
            continue;
          }
        }

        let locationRoomId: string | null = null;
        if (row.locationRoom) {
          locationRoomId = await assetRepo.getRoomIdByIdOrName(row.locationRoom);
        }

        let departmentId: string | null = null;
        if (row.department) {
          departmentId = await assetRepo.getDepartmentIdByIdOrName(row.department);
        }

        const purchaseDate = row.purchaseDate
          ? new Date(row.purchaseDate).toISOString().split('T')[0]
          : null;

        const depreciationStartDate = row.depreciationStartDate
          ? new Date(row.depreciationStartDate).toISOString().split('T')[0]
          : null;

        const isOldUnit = row.isOldUnit === true;
        const finalDepreciationMethod = isOldUnit ? null : (row.depreciationMethod || null);

        const [spRows] = (await pool.execute(
          'CALL sp_create_asset(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            row.name.trim(),
            row.description?.trim() || null,
            categoryId,
            row.supplier?.trim() || null,
            typeId,
            row.brand?.trim() || null,
            row.model?.trim() || null,
            row.serial?.trim() || null,
            null,
            purchaseDate,
            row.assetValue || null,
            row.salvageValue || 0,
            finalDepreciationMethod,
            row.usefulLifeYears || null,
            null,
            depreciationStartDate,
            companyId,
            locationId,
            locationRoomId,
            departmentId,
            row.locationNotes?.trim() || null,
            row.warrantyMonths || null,
            normalizeCondition(row.condition),
            row.maintenanceSchedule || 'None',
            normalizeStatus(row.status),
            isOldUnit ? 1 : 0,
            userId,
            userId,
            null,
          ]
        )) as any[];

        const asset = spRows[0][0];

        await pool.execute(
          'INSERT INTO asset_originating_company (asset_id, originating_company_id, created_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE originating_company_id = VALUES(originating_company_id)',
          [asset.assetID, companyId]
        );

        await createAuditLog({
          userId,
          action: 'Imported Asset',
          resourceType: 'asset',
          resourceId: asset.asset_code,
          resourceName: asset.name,
          details: `Imported asset ${asset.asset_code} via bulk import`,
          newValues: { name: asset.name, category_id: categoryId, company_id: companyId },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          companyId: companyId ?? undefined,
        });

        created.push({ row: rowNum, assetCode: asset.asset_code, name: asset.name });
      } catch (err: any) {
        logger.error(`Asset import row ${rowNum} failed:`, err);
        errors.push({ row: rowNum, message: err.message || 'Unexpected error' });
      }
    }

    const builderResults: { name: string; assetCodes: string[] }[] = [];
    if (builders && builders.length > 0) {
      const builderMap = new Map<string, { description?: string | null; assetCodes: string[]; parentCode?: string }>();

      for (const b of builders) {
        if (!builderMap.has(b.builderName)) {
          builderMap.set(b.builderName, { description: b.builderDescription, assetCodes: [] });
        }
        const entry = builderMap.get(b.builderName)!;
        entry.assetCodes.push(b.assetCode);
        if (b.isParent) {
          entry.parentCode = b.assetCode;
        }
      }

      for (const [name, entry] of builderMap) {
        try {
          const [builderRows] = (await pool.execute(
            'CALL sp_create_asset_builder(?, ?, ?, ?, ?)',
            [name, entry.description || null, importCompanyId, userId, userId]
          )) as any[];

          const builderRecord = builderRows[0]?.[0];
          if (!builderRecord?.builderID) {
            builderResults.push({ name, assetCodes: entry.assetCodes });
            continue;
          }

          for (const code of entry.assetCodes) {
            const codeTrimmed = code.trim();
            if (!codeTrimmed) continue;

            const assetRow = await assetRepo.getAssetByCodeForAssign(codeTrimmed);
            if (!assetRow) {
              logger.warn(`Builder "${name}": asset code "${codeTrimmed}" not found after import`);
              continue;
            }

            const isParent = codeTrimmed === entry.parentCode ? 1 : 0;
            await pool.execute(
              'INSERT INTO asset_builder_items (builder_id, asset_id, is_parent, created_by) VALUES (?, ?, ?, ?)',
              [builderRecord.builderID, assetRow.assetID, isParent, userId]
            );

            await createAuditLog({
              userId,
              action: 'Added to Builder',
              resourceType: 'asset_builder',
              resourceId: builderRecord.builderID,
              resourceName: name,
              details: `Added asset ${codeTrimmed} to builder "${name}" via bulk import`,
              newValues: { asset_code: codeTrimmed, is_parent: isParent },
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              companyId: importCompanyId ?? undefined,
            });
          }

          builderResults.push({ name, assetCodes: entry.assetCodes });
        } catch (err: any) {
          logger.error(`Builder import "${name}" failed:`, err);
          errors.push({ row: -1, message: `Builder "${name}" creation failed: ${err.message}` });
        }
      }
    }

    res.status(201).json({
      success: true,
      data: {
        created: created.length,
        failed: errors.length,
        assets: created,
        builders: builderResults,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (err: any) {
    logger.error('Asset import failed:', err);
    createErrorResponse(res, 'Import failed', undefined, 500);
  }
}
