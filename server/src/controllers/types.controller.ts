import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import { getScopedActiveCompany } from '../utils/activeCompany.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

interface TypeFields {
  name: string;
  category_id: string;
  prefix: string;
}

const validateTypeFields = (body: any): TypeFields => {
  const name = body.name?.trim();
  const category_id = body.categoryId || body.category_id;
  const prefix = body.prefix?.trim().toUpperCase() || '';

  if (!name || !category_id) {
    throw new Error('Name and category are required');
  }

  return { name, category_id, prefix };
};

// GET all types
export const getAllTypes = async (req: AuthRequest, res: Response) => {
  try {
    const queryCompanyId = req.query.company_id as string | undefined;

    if (queryCompanyId) {
      const [rows] = await pool.query<any[][]>('CALL sp_GetAllTypes(?)', [
        queryCompanyId,
      ]);
      return res.json(rows[0] ?? []);
    }

    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (activeCompany) {
      const [rows] = await pool.query<any[][]>('CALL sp_GetAllTypes(?)', [
        activeCompany.id,
      ]);
      return res.json(rows[0] ?? []);
    }

    const [userRows] = await pool.query<any[][]>(
      `SELECT r.name as role_name FROM users u
       LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
       WHERE u.userID = ? LIMIT 1`,
      [req.user?.userID]
    );
    const roleName = String(userRows[0]?.[0]?.role_name ?? '').trim().toLowerCase();
    if (roleName === 'global admin' || roleName === 'admin') {
      const [rows] = await pool.query<any[][]>(
        `SELECT at.typeID, at.name, at.category_id, at.prefix, at.company_id,
                at.created_at, at.created_by, at.updated_at, at.updated_by,
                at.deleted_at, at.deleted_by
         FROM asset_types at
         WHERE at.deleted_at IS NULL
         ORDER BY at.created_at DESC`
      );
      return res.json(rows[0] ?? []);
    }

    return res.status(400).json({ error: 'No active company found' });
  } catch (err) {
    logger.error('Get all types error', { err });
    res.status(500).json({ error: 'Failed to fetch types' });
  }
};

// CREATE type
export const createType = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userID;

  try {
    const rawName = (req.body.name || '').toString().trim();
    const isUnknown = ['unknown', 'unkown'].includes(rawName.toLowerCase());

    // Handle global "Unknown" type -- one per company, no category_id
    if (isUnknown) {
      const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
      if (!activeCompany) {
        return res.status(400).json({ error: 'No active company found' });
      }

      const [existing] = await pool.query<any[][]>(
        `SELECT typeID FROM asset_types WHERE LOWER(name) IN ('unknown','unkown') AND company_id = ? AND deleted_at IS NULL LIMIT 1`,
        [activeCompany.id]
      );
      if ((existing[0] as any[]).length > 0) {
        return res.status(409).json({ error: 'Unknown type already exists for this company' });
      }

      const params = ['Unknown', null, '', activeCompany.id, userId];
      await pool.query(
        `CALL sp_CreateType(${params.map(() => '?').join(', ')})`,
        params
      );

      await createAuditLog({
        userId,
        action: 'Created Type',
        resourceType: 'type',
        resourceName: 'Unknown',
        details: 'Created global Unknown type',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        companyId: activeCompany.id,
      });

      return res.status(201).json({ success: true, message: 'Unknown type created' });
    }

    const validatedFields = validateTypeFields(req.body);

    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const params = [
      validatedFields.name,
      validatedFields.category_id,
      validatedFields.prefix,
      activeCompany.id,
      userId,
    ];

    await pool.query(
      `CALL sp_CreateType(${params.map(() => '?').join(', ')})`,
      params
    );

    await createAuditLog({
      userId,
      action: 'Created Type',
      resourceType: 'type',
      resourceName: validatedFields.name,
      details: `Created type "${validatedFields.name}"`,
      newValues: validatedFields,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: activeCompany.id,
    });

    res.status(201).json({ success: true });
  } catch (err: any) {
    logger.error('Create type error', { err });
    if (err.message.includes('required')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to create type' });
  }
};

// UPDATE type
export const updateType = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userID;

  try {
    const validatedFields = validateTypeFields(req.body);

    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const params = [
      id,
      validatedFields.name,
      validatedFields.category_id,
      validatedFields.prefix,
      activeCompany.id,
      userId,
    ];

    await pool.query(
      `CALL sp_UpdateType(${params.map(() => '?').join(', ')})`,
      params
    );

    await createAuditLog({
      userId,
      action: 'Updated Type',
      resourceType: 'type',
      ...(id && { resourceId: id }),
      resourceName: validatedFields.name,
      details: `Updated type "${id}"`,
      newValues: validatedFields,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: activeCompany.id,
    });

    res.json({ success: true });
  } catch (err: any) {
    logger.error('Update type error', { err });
    if (err.message.includes('required')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update type' });
  }
};

// DELETE type
export const deleteType = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userID;

  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    await pool.query('CALL sp_DeleteType(?, ?, ?)', [
      id,
      activeCompany.id,
      userId,
    ]);

    await createAuditLog({
      userId,
      action: 'Deleted Type',
      resourceType: 'type',
      ...(id && { resourceId: id }),
      details: `Deleted type "${id}"`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: activeCompany.id,
    });

    res.json({ message: 'Type deleted successfully' });
  } catch (err: any) {
    logger.error('Delete type error', { err });
    if (err.message?.includes('Cannot delete type')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to delete type' });
  }
};
