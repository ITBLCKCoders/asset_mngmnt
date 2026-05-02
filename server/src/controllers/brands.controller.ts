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
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const [rows] = await pool.query<any[][]>('CALL sp_GetAllBrands(?)', [
      activeCompany.id,
    ]);
    res.json(rows[0] ?? []);
  } catch (err) {
    logger.error('Get all brands error', { err });
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
};

// CREATE brand
export const createBrand = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userID;

  try {
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
