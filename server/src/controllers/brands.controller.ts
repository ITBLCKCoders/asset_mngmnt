import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import { getScopedActiveCompany } from '../utils/activeCompany.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

interface BrandFields {
  name: string;
  typeId: string;
  prefix?: string;
}

const validateBrandFields = (body: any): BrandFields => {
  const name = body.name?.trim();
  const typeId = body.typeId?.trim();
  const prefix = body.prefix?.trim()?.toUpperCase();

  if (!name || !typeId) {
    throw new Error('Name and type ID are required');
  }

  return { name, typeId, prefix };
};

// GET all brands
export const getAllBrands = async (req: AuthRequest, res: Response) => {
  try {
    const queryCompanyId = req.query.company_id as string | undefined;

    if (queryCompanyId) {
      const [rows] = await pool.query<any[][]>('CALL sp_GetAllBrands(?)', [
        queryCompanyId,
      ]);
      return res.json(rows[0] ?? []);
    }

    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (activeCompany) {
      const [rows] = await pool.query<any[][]>('CALL sp_GetAllBrands(?)', [
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
    if (roleName === 'super admin' || roleName === 'admin') {
      const [rows] = await pool.query<any[][]>(
        `SELECT ab.brandID, ab.name, ab.type_id, ab.prefix, ab.company_id,
                ab.created_at, ab.created_by, ab.updated_at, ab.updated_by,
                ab.deleted_at, ab.deleted_by
         FROM asset_brands ab
         WHERE ab.deleted_at IS NULL
         ORDER BY ab.created_at DESC`
      );
      return res.json(rows[0] ?? []);
    }

    return res.status(400).json({ error: 'No active company found' });
  } catch (err) {
    logger.error('Get all brands error', { err });
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
};

// CREATE brand
export const createBrand = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userID;

  try {
    const rawName = (req.body.name || '').toString().trim();
    const isUnknown = ['unknown', 'unkown'].includes(rawName.toLowerCase());

    // Handle global "Unknown" brand -- one per company, no type_id
    if (isUnknown) {
      const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
      if (!activeCompany) {
        return res.status(400).json({ error: 'No active company found' });
      }

      const [existing] = await pool.query<any[][]>(
        `SELECT brandID FROM asset_brands WHERE LOWER(name) IN ('unknown','unkown') AND company_id = ? AND deleted_at IS NULL LIMIT 1`,
        [activeCompany.id]
      );
      if ((existing[0] as any[]).length > 0) {
        return res.status(409).json({ error: 'Unknown brand already exists for this company' });
      }

      const params = ['Unknown', null, null, activeCompany.id, userId];
      await pool.query(
        `CALL sp_CreateBrand(${params.map(() => '?').join(', ')})`,
        params
      );

      await createAuditLog({
        userId,
        action: 'Created Brand',
        resourceType: 'brand',
        resourceName: 'Unknown',
        details: 'Created global Unknown brand',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        companyId: activeCompany.id,
      });

      return res.status(201).json({ success: true, message: 'Unknown brand created' });
    }

    const validatedFields = validateBrandFields(req.body);

    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const params = [
      validatedFields.name,
      validatedFields.typeId,
      validatedFields.prefix || null,
      activeCompany.id,
      userId,
    ];

    await pool.query(
      `CALL sp_CreateBrand(${params.map(() => '?').join(', ')})`,
      params
    );

    await createAuditLog({
      userId,
      action: 'Created Brand',
      resourceType: 'brand',
      resourceName: validatedFields.name,
      details: `Created brand "${validatedFields.name}"`,
      newValues: validatedFields,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: activeCompany.id,
    });

    res.status(201).json({ success: true });
  } catch (err: any) {
    logger.error('Create brand error', { err });
    if (err.message.includes('required')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to create brand' });
  }
};

// UPDATE brand
export const updateBrand = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userID;

  try {
    const validatedFields = validateBrandFields(req.body);

    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const params = [
      id,
      validatedFields.name,
      validatedFields.typeId,
      validatedFields.prefix || null,
      activeCompany.id,
      userId,
    ];

    await pool.query(
      `CALL sp_UpdateBrand(${params.map(() => '?').join(', ')})`,
      params
    );

    await createAuditLog({
      userId,
      action: 'Updated Brand',
      resourceType: 'brand',
      ...(id && { resourceId: id }),
      resourceName: validatedFields.name,
      details: `Updated brand "${id}"`,
      newValues: validatedFields,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: activeCompany.id,
    });

    res.json({ success: true });
  } catch (err: any) {
    logger.error('Update brand error', { err });
    if (err.message.includes('required')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update brand' });
  }
};

// DELETE brand
export const deleteBrand = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userID;

  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    await pool.query('CALL sp_DeleteBrand(?, ?, ?)', [
      id,
      activeCompany.id,
      userId,
    ]);

    await createAuditLog({
      userId,
      action: 'Deleted Brand',
      resourceType: 'brand',
      ...(id && { resourceId: id }),
      details: `Deleted brand "${id}"`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: activeCompany.id,
    });

    res.json({ message: 'Brand deleted successfully' });
  } catch (err: any) {
    logger.error('Delete brand error', { err });
    if (err.message?.includes('Cannot delete brand')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to delete brand' });
  }
};
