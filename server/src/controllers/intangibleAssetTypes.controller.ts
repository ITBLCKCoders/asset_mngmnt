import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import { getScopedActiveCompany } from '../utils/activeCompany.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

interface IntangibleAssetTypeFields {
  name: string;
  prefix: string;
  departmentId: string;
}

const validateIntangibleAssetTypeFields = (
  body: any
): IntangibleAssetTypeFields => {
  const name = body.name?.trim();
  const prefix = body.prefix?.trim().toUpperCase() || '';
  const departmentId = body.departmentId?.trim();

  if (!name) {
    throw new Error('Name is required');
  }

  if (!departmentId) {
    throw new Error('Department is required');
  }

  return { name, prefix, departmentId };
};

// GET all intangible asset types
export const getAllIntangibleAssetTypes = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const queryCompanyId = req.query.company_id as string | undefined;

    if (queryCompanyId) {
      const [rows] = await pool.query<any[][]>(
        'CALL sp_GetAllIntangibleAssetTypes(?)',
        [queryCompanyId]
      );
      return res.json(rows[0] ?? []);
    }

    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (activeCompany) {
      const [rows] = await pool.query<any[][]>(
        'CALL sp_GetAllIntangibleAssetTypes(?)',
        [activeCompany.id]
      );
      return res.json(rows[0] ?? []);
    }

    const [userRows] = await pool.query<any[][]>(
      `SELECT r.name as role_name FROM users u
       LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
       WHERE u.userID = ? LIMIT 1`,
      [req.user?.userID]
    );
    const roleName = String(userRows[0]?.[0]?.role_name ?? '')
      .trim()
      .toLowerCase();
    if (roleName === 'global admin' || roleName === 'admin') {
      const [rows] = await pool.query<any[][]>(
        `SELECT iat.id, iat.company_id, iat.name, iat.prefix, iat.department_id,
                iat.created_at, iat.created_by, iat.updated_at, iat.updated_by,
                iat.deleted_at, iat.deleted_by,
                CASE WHEN d.departmentID IS NOT NULL THEN
                  JSON_OBJECT('id', d.departmentID, 'name', d.name, 'code', d.code)
                ELSE NULL END as department
         FROM intangible_asset_types iat
         LEFT JOIN asset_mngmnt_departments d ON iat.department_id = d.departmentID AND d.deleted_at IS NULL
         WHERE iat.deleted_at IS NULL
         ORDER BY iat.created_at DESC`
      );
      return res.json(rows[0] ?? []);
    }

    return res.status(400).json({ error: 'No active company found' });
  } catch (err) {
    logger.error('Get all intangible asset types error', { err });
    res.status(500).json({ error: 'Failed to fetch intangible asset types' });
  }
};

// CREATE intangible asset type
export const createIntangibleAssetType = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user!.userID;

  try {
    const validatedFields = validateIntangibleAssetTypeFields(req.body);
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const params = [
      validatedFields.name,
      validatedFields.prefix,
      validatedFields.departmentId,
      activeCompany.id,
      userId,
    ];

    await pool.query(
      `CALL sp_CreateIntangibleAssetType(${params.map(() => '?').join(', ')})`,
      params
    );

    await createAuditLog({
      userId,
      action: 'Created Intangible Asset Type',
      resourceType: 'intangible_asset_type',
      resourceName: validatedFields.name,
      details: `Created intangible asset type "${validatedFields.name}"`,
      newValues: validatedFields,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: activeCompany.id,
    });

    res.status(201).json({ success: true });
  } catch (err: any) {
    logger.error('Create intangible asset type error', { err });
    if (err.message.includes('required')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to create intangible asset type' });
  }
};

// UPDATE intangible asset type
export const updateIntangibleAssetType = async (
  req: AuthRequest,
  res: Response
) => {
  const { id } = req.params;
  const userId = req.user!.userID;

  try {
    const validatedFields = validateIntangibleAssetTypeFields(req.body);

    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const params = [
      id,
      validatedFields.name,
      validatedFields.prefix,
      validatedFields.departmentId,
      activeCompany.id,
      userId,
    ];

    await pool.query(
      `CALL sp_UpdateIntangibleAssetType(${params.map(() => '?').join(', ')})`,
      params
    );

    await createAuditLog({
      userId,
      action: 'Updated Intangible Asset Type',
      resourceType: 'intangible_asset_type',
      ...(id && { resourceId: id }),
      resourceName: validatedFields.name,
      details: `Updated intangible asset type "${id}"`,
      newValues: validatedFields,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: activeCompany.id,
    });

    res.json({ success: true });
  } catch (err: any) {
    logger.error('Update intangible asset type error', { err });
    if (err.message.includes('required')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update intangible asset type' });
  }
};

// DELETE intangible asset type
export const deleteIntangibleAssetType = async (
  req: AuthRequest,
  res: Response
) => {
  const { id } = req.params;
  const userId = req.user!.userID;

  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    await pool.query('CALL sp_DeleteIntangibleAssetType(?, ?, ?)', [
      id,
      activeCompany.id,
      userId,
    ]);

    await createAuditLog({
      userId,
      action: 'Deleted Intangible Asset Type',
      resourceType: 'intangible_asset_type',
      ...(id && { resourceId: id }),
      details: `Deleted intangible asset type "${id}"`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: activeCompany.id,
    });

    res.json({ message: 'Intangible asset type deleted successfully' });
  } catch (err: any) {
    logger.error('Delete intangible asset type error', { err });
    res.status(500).json({ error: 'Failed to delete intangible asset type' });
  }
};
