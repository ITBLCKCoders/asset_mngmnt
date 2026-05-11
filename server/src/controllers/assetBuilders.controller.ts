import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';
import { getAssetScope, getDepartmentIdsForScope } from '../utils/assetScope.js';

export async function createAssetBuilderHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { name, description, assetIds, parentAssetId } = req.body;
    const userId = req.user!.userID;

    if (
      !name ||
      !assetIds ||
      !Array.isArray(assetIds) ||
      assetIds.length === 0
    ) {
      return res.status(400).json({
        error: 'Name and at least one asset ID are required',
      });
    }

    // Validate that all asset codes exist and are available
    const placeholders = assetIds.map(() => '?').join(',');
    const [assetRows] = (await pool.execute(
      `SELECT assetID, asset_code, name FROM assets
       WHERE asset_code IN (${placeholders}) AND status = 'Available' AND deleted_at IS NULL`,
      assetIds
    )) as any[];

    if (assetRows.length !== assetIds.length) {
      logger.warn(
        `Asset validation failed. Expected ${assetIds.length} assets, found ${assetRows.length}`
      );
      logger.warn(`Requested asset codes: ${assetIds.join(', ')}`);
      logger.warn(
        `Found assets:`,
        assetRows.map((a: any) => `${a.asset_code} (${a.assetID})`)
      );
      return res.status(400).json({
        error: 'Some assets are not available or do not exist',
      });
    }

    // Validate parentAssetId if provided
    if (parentAssetId) {
      const parentExists = assetRows.some((a: any) => a.asset_code === parentAssetId);
      if (!parentExists) {
        return res.status(400).json({
          error: 'Parent asset must be one of the selected assets',
        });
      }
    }

    // Get active company for the user
    const [companyRows] = (await pool.execute(
      'SELECT company_id FROM users WHERE userID = ?',
      [userId]
    )) as any[];

    const companyId = companyRows[0]?.company_id;

    // Create asset builder using stored procedure
    const [builderRows] = (await pool.execute(
      'CALL sp_create_asset_builder(?, ?, ?, ?, ?)',
      [name.trim(), description?.trim() || null, companyId, userId, userId]
    )) as any[];

    const builder = builderRows[0][0];

    // Create asset builder items using the actual assetIDs
    // First item or parentAssetId becomes the parent
    const defaultParentId = parentAssetId || assetIds[0];
    const itemValues = assetRows.map((asset: any) => [
      builder.builderID,
      asset.assetID,
      asset.asset_code === defaultParentId ? 1 : 0,
      userId,
    ]);
    if (itemValues.length > 0) {
      const placeholders = itemValues.map(() => '(?, ?, ?, ?)').join(',');
      const flatValues = itemValues.flat();
      await pool.execute(
        `INSERT INTO asset_builder_items (builder_id, asset_id, is_parent, created_by) VALUES ${placeholders}`,
        flatValues
      );
    }

    // Create audit logs for added assets (asset-scoped for asset timeline)
    for (const asset of assetRows) {
      await createAuditLog({
        userId,
        action: 'Added to Asset Builder',
        resourceType: 'asset',
        resourceId: asset.asset_code,
        resourceName: asset.name,
        details: `Asset "${asset.name} (${asset.asset_code})" added to asset builder "${builder.name}"`,
        newValues: {
          builder_id: builder.builderID,
          builder_name: builder.name,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        companyId,
      });
      // Builder-scoped log for builder timeline
      await createAuditLog({
        userId,
        action: 'Added to Asset Builder',
        resourceType: 'asset_builder',
        resourceId: builder.builderID,
        resourceName: builder.name,
        details: `Asset "${asset.name} (${asset.asset_code})" added to asset builder`,
        newValues: {
          asset_code: asset.asset_code,
          asset_name: asset.name,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        companyId,
      });
    }

    // Create audit log for builder creation
    await createAuditLog({
      userId,
      action: 'Created Asset Builder',
      resourceType: 'asset_builder',
      resourceId: builder.builderID,
      resourceName: builder.name,
      details: `Created asset builder "${builder.name}" with ${assetIds.length} assets`,
      newValues: {
        name: builder.name,
        description: builder.description,
        asset_count: assetIds.length,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId,
    });

    return res.status(201).json({
      message: 'Asset builder created successfully',
      builder: {
        builderID: builder.builderID,
        name: builder.name,
        description: builder.description,
        company_id: builder.company_id,
        created_at: builder.created_at,
        created_by: builder.created_by,
      },
    });
  } catch (error: any) {
    logger.error('Create asset builder failed:', error);
    return res.status(500).json({ error: 'Failed to create asset builder' });
  }
}

export async function getAssetBuildersHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userID;
    logger.info(`Getting asset builders for user: ${userId}`);

    // Accept optional scope query param for IT/Admin tab switching
    const scopeParam = req.query.scope as string | undefined;
    const scopeOverride =
      scopeParam === 'it' || scopeParam === 'admin' ? scopeParam : undefined;

    // Get asset scope (company + optional department-based filtering)
    const { companyId, departmentIds: scopeDeptIds, isSuperAdmin } = await getAssetScope(pool, userId);

    logger.info(`User company ID from asset scope: ${companyId}`, {
      departmentIdsCount: scopeDeptIds?.length ?? 0,
    });

    if (!companyId) {
      logger.warn(`User ${userId} has no company_id in scope`);
      return res.json({ builders: [] });
    }

    let departmentIds = scopeDeptIds;

    // For Super Admin, Admin, and overallManager: apply scope override if provided
    if (scopeOverride) {
      const [userRows] = (await pool.execute(
        `SELECT r.manager_role FROM users u
         LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
         WHERE u.userID = ?`,
        [userId]
      )) as any[];
      const managerRole = String(userRows?.[0]?.manager_role ?? '').trim();
      const isAdmin = String(userRows?.[0]?.role_name ?? '').trim().toLowerCase() === 'admin';
      if (isSuperAdmin || isAdmin || managerRole === 'overallManager') {
        departmentIds = await getDepartmentIdsForScope(pool, scopeOverride, companyId);
      }
    }

    // Get asset builders for the company using stored procedure
    const [builderResult] = (await pool.execute(
      'CALL sp_get_asset_builders(?)',
      [companyId]
    )) as any[][];

    let builderRows =
      (Array.isArray(builderResult?.[0]) ? builderResult[0] : builderResult) ??
      [];

    logger.info(
      `Found ${builderRows.length} asset builders for company ${companyId} before loading items`
    );

    // Get items for each builder using stored procedure
    for (const builder of builderRows) {
      const [itemResult] = (await pool.execute(
        'CALL sp_get_asset_builder_items(?)',
        [builder.builderID]
      )) as any[][];

      const itemRows =
        (Array.isArray(itemResult?.[0]) ? itemResult[0] : itemResult) ?? [];

      builder.items = itemRows.map((item: any) => ({
        itemID: item.itemID,
        asset_id: item.asset_id,
        asset_code: item.asset_code,
        asset_name: item.asset_name,
        category_name: item.category_name,
        type_name: item.type_name,
        is_parent: item.is_parent === 1,
      }));

      // When builder is Assigned, resolve assigned user (owner of assets in this builder)
      if (builder.status === 'Assigned' && itemRows.length > 0) {
        const firstAssetId = itemRows[0]?.asset_id;
        if (firstAssetId) {
          const [assignRows] = (await pool.execute(
            `SELECT u.userID, u.first_name, u.last_name
             FROM asset_assignments aa
             JOIN users u ON aa.user_id = u.userID
             WHERE aa.asset_id = ? AND aa.status = 'Active' AND aa.deleted_at IS NULL
             LIMIT 1`,
            [firstAssetId]
          )) as any[];
          if (assignRows?.length > 0) {
            const u = assignRows[0];
            builder.assigned_to = {
              id: u.userID,
              first_name: u.first_name ?? '',
              last_name: u.last_name ?? '',
            };
          }
        }
      }

      logger.info(
        `Builder ${builder.builderID} has ${itemRows?.length ?? 0} items`
      );
    }

    // Scoped roles (IT / Admin asset managers): keep only builders whose component
    // assets all belong to allowed departments. Must run after items are loaded —
    // sp_get_asset_builders does not include items, so filtering earlier always
    // saw empty items and dropped every builder for non–Super Admin users.
    if (departmentIds && departmentIds.length > 0 && builderRows.length > 0) {
      const allItemAssetIds: string[] = [];
      for (const builder of builderRows) {
        if (Array.isArray(builder.items)) {
          for (const item of builder.items) {
            if (item.asset_id) {
              allItemAssetIds.push(String(item.asset_id));
            }
          }
        }
      }

      if (allItemAssetIds.length > 0) {
        const placeholders = allItemAssetIds.map(() => '?').join(',');
        const [assetDeptRows] = (await pool.execute(
          `SELECT a.assetID, ac.department_id
           FROM assets a
           LEFT JOIN asset_categories ac ON a.category_id = ac.categoryID
           WHERE a.assetID IN (${placeholders}) AND a.deleted_at IS NULL`,
          allItemAssetIds
        )) as any[];

        const deptByAssetId = new Map<string, string | null>();
        for (const row of assetDeptRows as any[]) {
          deptByAssetId.set(String(row.assetID), row.department_id ?? null);
        }

        const allowedDeptSet = new Set(departmentIds.map(String));

        builderRows = builderRows.filter(builder => {
          if (!Array.isArray(builder.items) || builder.items.length === 0) {
            return false;
          }

          return builder.items.every((item: any) => {
            const deptId = deptByAssetId.get(String(item.asset_id)) ?? null;
            return deptId !== null && allowedDeptSet.has(String(deptId));
          });
        });

        logger.info(
          `After department scope filtering, ${builderRows.length} asset builders remain for user ${userId}`
        );
      } else {
        builderRows = [];
      }
    }

    logger.info(`Returning ${builderRows?.length ?? 0} asset builders`);
    return res.json({ builders: builderRows });
  } catch (error: any) {
    logger.error('Get asset builders failed:', error);
    return res.status(500).json({ error: 'Failed to fetch asset builders' });
  }
}

export async function updateAssetBuilderHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { builderId } = req.params;
    const { name, description, assetIds, status, parentAssetId } = req.body;
    const userId = req.user!.userID;

    if (!name) {
      return res.status(400).json({
        error: 'Name is required',
      });
    }

    // Check if builder exists and belongs to user's company
    const [builderRows] = (await pool.execute(
      `SELECT ab.*, u.company_id
       FROM asset_builders ab
       JOIN users u ON ab.created_by = u.userID
       WHERE ab.builderID = ? AND ab.deleted_at IS NULL`,
      [builderId]
    )) as any[];

    if (builderRows.length === 0) {
      return res.status(404).json({ error: 'Asset builder not found' });
    }

    const builder = builderRows[0];

    // Check if user belongs to the same company
    const [userRows] = (await pool.execute(
      'SELECT company_id FROM users WHERE userID = ?',
      [userId]
    )) as any[];

    if (userRows[0]?.company_id !== builder.company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get current builder items first (needed for validation and for added/removed)
    const [currentItems] = (await pool.execute(
      `SELECT abi.asset_id, a.asset_code, a.name as asset_name
       FROM asset_builder_items abi
       JOIN assets a ON abi.asset_id = a.assetID
       WHERE abi.builder_id = ?`,
      [builderId]
    )) as any[];

    const currentAssetIdsSet = new Set(
      currentItems.map((item: any) => item.asset_id)
    );

    // If no assetIds provided, keep existing assets (for status-only updates)
    let assetRows: any[] = [];
    if (assetIds && Array.isArray(assetIds) && assetIds.length > 0) {
      // Validate: all asset codes must exist. Only NEW assets (not already in builder) must be Available.
      const placeholders = assetIds.map(() => '?').join(',');
      const [rows] = (await pool.execute(
        `SELECT assetID, asset_code, name, status FROM assets
         WHERE asset_code IN (${placeholders}) AND deleted_at IS NULL`,
        assetIds
      )) as any[];

      if (rows.length !== assetIds.length) {
        logger.warn(
          `Asset validation failed. Expected ${assetIds.length} assets, found ${rows.length}`
        );
        return res.status(400).json({
          error: 'One or more assets do not exist',
        });
      }

      // New assets (not currently in this builder) must be Available
      for (const row of rows as any[]) {
        if (
          !currentAssetIdsSet.has(row.assetID) &&
          row.status !== 'Available'
        ) {
          return res.status(400).json({
            error: `Asset ${row.asset_code} is not available (status: ${row.status}). Only available assets can be added to a builder.`,
          });
        }
      }

      // Validate parentAssetId if provided
      if (parentAssetId) {
        const parentExists = rows.some((a: any) => a.asset_code === parentAssetId);
        if (!parentExists) {
          return res.status(400).json({
            error: 'Parent asset must be one of the selected assets',
          });
        }
      }

      assetRows = rows;
    } else {
      assetRows = currentItems.map((item: any) => ({
        assetID: item.asset_id,
        asset_code: item.asset_code,
        name: item.asset_name,
      }));
    }

    const currentItemsRef = currentItems;

    const currentAssetIds = currentItemsRef.map((item: any) => item.asset_id);
    const newAssetIds = assetRows.map((asset: any) => asset.assetID);

    // Determine added and removed assets
    const addedAssets = assetRows.filter(
      (asset: any) => !currentAssetIds.includes(asset.assetID)
    );
    const removedAssets = currentItemsRef.filter(
      (item: any) => !newAssetIds.includes(item.asset_id)
    );

    // Update asset builder using stored procedure
    const [updateResult] = (await pool.execute(
      'CALL sp_update_asset_builder(?, ?, ?, ?, ?)',
      [
        builderId,
        name.trim(),
        description?.trim() || null,
        status || 'Available',
        userId,
      ]
    )) as any[];

    const result = updateResult[0][0];
    if (!result.success) {
      return res.status(404).json({ error: 'Asset builder not found' });
    }

    // Only update items if assetIds were provided (not a status-only update)
    if (assetIds && Array.isArray(assetIds) && assetIds.length > 0) {
      // Delete existing items
      await pool.execute(
        'DELETE FROM asset_builder_items WHERE builder_id = ?',
        [builderId]
      );

      // Create new asset builder items with parent designation
      // First item or parentAssetId becomes the parent
      const defaultParentId = parentAssetId || assetIds[0];
      const itemValues = assetRows.map((asset: any) => [
        builderId,
        asset.assetID,
        asset.asset_code === defaultParentId ? 1 : 0,
        userId,
      ]);
      if (itemValues.length > 0) {
        const placeholders = itemValues.map(() => '(?, ?, ?, ?)').join(',');
        const flatValues = itemValues.flat();
        await pool.execute(
          `INSERT INTO asset_builder_items (builder_id, asset_id, is_parent, created_by) VALUES ${placeholders}`,
          flatValues
        );
      }
    }

    // Create audit logs for removed assets (asset-scoped and builder-scoped)
    for (const removedAsset of removedAssets) {
      await createAuditLog({
        userId,
        action: 'Removed from Asset Builder',
        resourceType: 'asset',
        resourceId: removedAsset.asset_code,
        resourceName: removedAsset.asset_name,
        details: `Asset "${removedAsset.asset_name} (${removedAsset.asset_code})" removed from asset builder "${name}"`,
        oldValues: {
          builder_id: builderId,
          builder_name: builder.name,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        companyId: builder.company_id,
      });
      // Builder-scoped log for builder timeline
      await createAuditLog({
        userId,
        action: 'Removed from Asset Builder',
        resourceType: 'asset_builder',
        resourceId: builderId ?? '',
        resourceName: name.trim(),
        details: `Asset "${removedAsset.asset_name} (${removedAsset.asset_code})" removed from asset builder`,
        oldValues: {
          asset_code: removedAsset.asset_code,
          asset_name: removedAsset.asset_name,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        companyId: builder.company_id,
      });
    }

    // Create audit logs for added assets (asset-scoped and builder-scoped)
    for (const addedAsset of addedAssets) {
      await createAuditLog({
        userId,
        action: 'Added to Asset Builder',
        resourceType: 'asset',
        resourceId: addedAsset.asset_code,
        resourceName: addedAsset.name,
        details: `Asset "${addedAsset.name} (${addedAsset.asset_code})" added to asset builder "${name}"`,
        newValues: {
          builder_id: builderId,
          builder_name: name.trim(),
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        companyId: builder.company_id,
      });
      // Builder-scoped log for builder timeline
      await createAuditLog({
        userId,
        action: 'Added to Asset Builder',
        resourceType: 'asset_builder',
        resourceId: builderId ?? '',
        resourceName: name.trim(),
        details: `Asset "${addedAsset.name} (${addedAsset.asset_code})" added to asset builder`,
        newValues: {
          asset_code: addedAsset.asset_code,
          asset_name: addedAsset.name,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        companyId: builder.company_id,
      });
    }

    // Create audit log for builder update
    const changes = [];
    if (builder.name !== name.trim())
      changes.push(`name: "${builder.name}" → "${name.trim()}"`);
    if (builder.description !== (description?.trim() || null))
      changes.push(`description updated`);
    if (addedAssets.length > 0)
      changes.push(`added ${addedAssets.length} asset(s)`);
    if (removedAssets.length > 0)
      changes.push(`removed ${removedAssets.length} asset(s)`);
    if (status && builder.status !== status)
      changes.push(`status: "${builder.status}" → "${status}"`);

    await createAuditLog({
      userId,
      action: 'Updated Asset Builder',
      resourceType: 'asset_builder',
      resourceId: builder.builderID ?? '',
      resourceName: name,
      details: `Updated asset builder "${name}": ${changes.join(', ')}`,
      oldValues: {
        name: builder.name,
        description: builder.description,
        asset_count: currentAssetIds.length,
        status: builder.status,
      },
      newValues: {
        name: name.trim(),
        description: description?.trim() || null,
        asset_count: assetIds?.length || currentAssetIds.length,
        status: status || builder.status,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: builder.company_id,
    });

    return res.json({
      message: 'Asset builder updated successfully',
      builder: {
        builderID: builderId,
        name: name.trim(),
        description: description?.trim() || null,
        company_id: builder.company_id,
        updated_at: new Date(),
        updated_by: userId,
      },
    });
  } catch (error: any) {
    logger.error('Update asset builder failed:', error);
    return res.status(500).json({ error: 'Failed to update asset builder' });
  }
}

export async function getAssetBuilderFormsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { builderId } = req.params;
    const userId = req.user!.userID;

    if (!builderId) {
      return res.status(400).json({ error: 'Builder ID is required' });
    }

    // Check if builder exists and belongs to user's company
    const [builderRows] = (await pool.execute(
      `SELECT ab.*, u.company_id
       FROM asset_builders ab
       JOIN users u ON ab.created_by = u.userID
       WHERE ab.builderID = ? AND ab.deleted_at IS NULL`,
      [builderId]
    )) as any[];

    if (builderRows.length === 0) {
      return res.status(404).json({ error: 'Asset builder not found' });
    }

    const builder = builderRows[0];

    // Check if user belongs to the same company
    const [userRows] = (await pool.execute(
      'SELECT company_id FROM users WHERE userID = ?',
      [userId]
    )) as any[];

    if (userRows[0]?.company_id !== builder.company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all asset codes in this builder
    const [builderItems] = (await pool.execute(
      `SELECT abi.asset_id, a.asset_code
       FROM asset_builder_items abi
       JOIN assets a ON abi.asset_id = a.assetID
       WHERE abi.builder_id = ?`,
      [builderId]
    )) as any[];

    if (builderItems.length === 0) {
      return res.json({
        accountabilityForms: [],
        returnForms: [],
        transferForms: [],
        borrowForms: [],
      });
    }

    // Import repository functions
    const accountabilityFormsRepo = await import('../repositories/accountabilityForm.repository.js');
    const returnFormsRepo = await import('../repositories/assetReturn.repository.js');
    const transferFormsRepo = await import('../repositories/assetTransferForm.repository.js');
    const borrowFormsRepo = await import('../repositories/assetBorrowRequests.repository.js');

    // Aggregate forms from all assets in the builder
    const accountabilityFormsMap = new Map();
    const returnFormsMap = new Map();
    const transferFormsMap = new Map();
    const borrowFormsMap = new Map();

    for (const item of builderItems) {
      const assetCode = item.asset_code;

      // Fetch accountability forms
      const accountabilityRows = await accountabilityFormsRepo.findFormsByAssetId(assetCode);
      for (const row of accountabilityRows) {
        if (!accountabilityFormsMap.has(row.formID)) {
          accountabilityFormsMap.set(row.formID, {
            id: row.formID,
            formNumber: row.form_number,
            status: row.status,
            created_at: row.created_at,
            signed_at: row.signed_at,
            assets_data: row.assets_data,
            user: {
              id: row.user_id,
              first_name: row.first_name || '',
              last_name: row.last_name || '',
              email: row.email || '',
            },
            department: row.user_department_name ? {
              id: row.user_department_id,
              name: row.user_department_name,
            } : null,
            location: row.location_name ? {
              id: row.location_id,
              name: row.location_name,
            } : null,
            received_copy_wet_pdf_url: row.received_copy_wet_pdf_url || null,
            asset_code: assetCode,
          });
        }
      }

      // Fetch return forms
      const returnForms = await returnFormsRepo.getReturnFormsByAssetId(assetCode);
      for (const form of returnForms) {
        if (!returnFormsMap.has(form.id)) {
          returnFormsMap.set(form.id, {
            ...form,
            asset_code: assetCode,
          });
        }
      }

      // Fetch transfer forms
      const transferForms = await transferFormsRepo.getTransferFormsByAssetId(assetCode);
      for (const form of transferForms) {
        if (!transferFormsMap.has(form.id)) {
          transferFormsMap.set(form.id, {
            ...form,
            asset_code: assetCode,
          });
        }
      }

      // Fetch borrow forms
      const borrowForms = await borrowFormsRepo.getBorrowFormsByAssetId(pool, assetCode);
      for (const form of borrowForms) {
        if (!borrowFormsMap.has(form.id)) {
          borrowFormsMap.set(form.id, {
            ...form,
            asset_code: assetCode,
          });
        }
      }
    }

    return res.json({
      accountabilityForms: Array.from(accountabilityFormsMap.values()),
      returnForms: Array.from(returnFormsMap.values()),
      transferForms: Array.from(transferFormsMap.values()),
      borrowForms: Array.from(borrowFormsMap.values()),
    });
  } catch (error: any) {
    logger.error('Get asset builder forms failed:', error);
    return res.status(500).json({ error: 'Failed to fetch asset builder forms' });
  }
}

export async function deleteAssetBuilderHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { builderId } = req.params;
    const userId = req.user!.userID;

    // Check if builder exists and belongs to user's company
    const [builderRows] = (await pool.execute(
      `SELECT ab.*, u.company_id
       FROM asset_builders ab
       JOIN users u ON ab.created_by = u.userID
       WHERE ab.builderID = ? AND ab.deleted_at IS NULL`,
      [builderId]
    )) as any[];

    if (builderRows.length === 0) {
      return res.status(404).json({ error: 'Asset builder not found' });
    }

    const builder = builderRows[0];

    // Check if user belongs to the same company
    const [userRows] = (await pool.execute(
      'SELECT company_id FROM users WHERE userID = ?',
      [userId]
    )) as any[];

    if (userRows[0]?.company_id !== builder.company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get current items before deleting
    const [currentItems] = (await pool.execute(
      `SELECT abi.asset_id, a.asset_code, a.name as asset_name
       FROM asset_builder_items abi
       JOIN assets a ON abi.asset_id = a.assetID
       WHERE abi.builder_id = ?`,
      [builderId]
    )) as any[];

    // Soft delete the builder using stored procedure
    const [deleteResult] = (await pool.execute(
      'CALL sp_delete_asset_builder(?, ?)',
      [builderId, userId]
    )) as any[];

    const result = deleteResult[0][0];
    if (!result.success) {
      return res.status(404).json({ error: 'Asset builder not found' });
    }

    // Create audit logs for removed assets (when builder is deleted) - asset-scoped and builder-scoped
    for (const removedAsset of currentItems) {
      await createAuditLog({
        userId,
        action: 'Removed from Asset Builder',
        resourceType: 'asset',
        resourceId: removedAsset.asset_code,
        resourceName: removedAsset.asset_name,
        details: `Asset "${removedAsset.asset_name} (${removedAsset.asset_code})" removed from asset builder "${builder.name}" (builder deleted)`,
        oldValues: {
          builder_id: builderId,
          builder_name: builder.name,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        companyId: builder.company_id,
      });
      // Builder-scoped log for builder timeline (before deletion, for history)
      await createAuditLog({
        userId,
        action: 'Removed from Asset Builder',
        resourceType: 'asset_builder',
        resourceId: builderId ?? '',
        resourceName: builder.name,
        details: `Asset "${removedAsset.asset_name} (${removedAsset.asset_code})" removed from asset builder (builder deleted)`,
        oldValues: {
          asset_code: removedAsset.asset_code,
          asset_name: removedAsset.asset_name,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        companyId: builder.company_id,
      });
    }

    // Create audit log for builder deletion
    await createAuditLog({
      userId,
      action: 'Deleted Asset Builder',
      resourceType: 'asset_builder',
      resourceId: builder.builderID ?? '',
      resourceName: builder.name,
      details: 'Asset builder soft deleted',
      oldValues: {
        name: builder.name,
        description: builder.description,
        asset_count: currentItems.length,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: builder.company_id,
    });

    return res.json({ message: 'Asset builder deleted successfully' });
  } catch (error: any) {
    logger.error('Delete asset builder failed:', error);
    return res.status(500).json({ error: 'Failed to delete asset builder' });
  }
}
