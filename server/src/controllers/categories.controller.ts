import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import { getScopedActiveCompany } from '../utils/activeCompany.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

interface CategoryFields {
  name: string;
  prefix: string;
  gl_code: string;
  departmentId?: string;
}

const validateCategoryFields = (body: any): CategoryFields => {
  const name = body.name?.trim();
  const prefix = body.prefix?.trim()?.toUpperCase();
  const gl_code = body.gl_code?.trim();
  const departmentId = body.departmentId?.trim();

  if (!name || !prefix || !gl_code || !departmentId) {
    throw new Error('Name, prefix, GL code, and department are required');
  }

  if (prefix.length < 2 || prefix.length > 10) {
    throw new Error('Prefix must be between 2 and 10 characters');
  }

  return { name, prefix, gl_code, departmentId };
};

// GET all categories
export const getAllCategories = async (req: AuthRequest, res: Response) => {
  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const [rows] = await pool.query<any[][]>('CALL sp_GetAllCategories(?)', [
      activeCompany.id,
    ]);
    res.json(rows[0] ?? []);
  } catch (err) {
    logger.error('Get all categories error', { err });
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// CREATE category
export const createCategory = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userID;

  try {
    const validatedFields = validateCategoryFields(req.body);
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const params = [
      validatedFields.name,
      validatedFields.prefix,
      validatedFields.gl_code,
      validatedFields.departmentId,
      activeCompany.id,
      userId,
    ];

    await pool.query(
      `CALL sp_CreateCategory(${params.map(() => '?').join(', ')})`,
      params
    );

    await createAuditLog({
      userId,
      action: 'Created Category',
      resourceType: 'category',
      resourceName: validatedFields.name,
      details: `Created category "${validatedFields.name}"`,
      newValues: validatedFields,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: activeCompany.id,
    });

    res.status(201).json({ success: true });
  } catch (err: any) {
    logger.error('Create category error', { err });
    if (err.message.includes('required')) {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Category prefix already exists' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
};

// UPDATE category
export const updateCategory = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userID;

  try {
    const validatedFields = validateCategoryFields(req.body);
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const params = [
      id,
      validatedFields.name,
      validatedFields.prefix,
      validatedFields.gl_code,
      validatedFields.departmentId,
      activeCompany.id,
      userId,
    ];

    await pool.query(
      `CALL sp_UpdateCategory(${params.map(() => '?').join(', ')})`,
      params
    );

    await createAuditLog({
      userId,
      action: 'Updated Category',
      resourceType: 'category',
      ...(id && { resourceId: id }),
      resourceName: validatedFields.name,
      details: `Updated category "${id}"`,
      newValues: validatedFields,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: activeCompany.id,
    });

    res.json({ success: true });
  } catch (err: any) {
    logger.error('Update category error', { err });
    if (err.message.includes('required')) {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Category prefix already exists' });
    }
    res.status(500).json({ error: 'Failed to update category' });
  }
};

// DELETE category
export const deleteCategory = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userID;

  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    await pool.query('CALL sp_DeleteCategory(?, ?, ?)', [
      id,
      activeCompany.id,
      userId,
    ]);

    await createAuditLog({
      userId,
      action: 'Deleted Category',
      resourceType: 'category',
      ...(id && { resourceId: id }),
      details: `Deleted category "${id}"`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: activeCompany.id,
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (err: any) {
    logger.error('Delete category error', { err });
    if (err.message?.includes('Cannot delete category')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to delete category' });
  }
};
