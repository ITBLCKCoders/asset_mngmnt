import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import { getScopedActiveCompany } from '../utils/activeCompany.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

interface SupplierFields {
  name: string;
  categoryId: string;
  contact?: string;
  email?: string;
}

const validateSupplierFields = (body: any): SupplierFields => {
  const name = body.name?.trim();
  const categoryId = body.categoryId?.trim();
  const contact = body.contact?.trim();
  const email = body.email?.trim();

  if (!name || !categoryId) {
    throw new Error('Name and category ID are required');
  }

  return { name, categoryId, contact, email };
};

// GET all suppliers
export const getAllSuppliers = async (req: AuthRequest, res: Response) => {
  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const [rows] = await pool.query<any[][]>('CALL sp_GetAllSuppliers(?)', [
      activeCompany.id,
    ]);
    res.json(rows[0] ?? []);
  } catch (err) {
    logger.error('Get all suppliers error', { err });
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
};

// CREATE supplier
export const createSupplier = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userID;

  try {
    const validatedFields = validateSupplierFields(req.body);

    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const params = [
      validatedFields.name,
      validatedFields.categoryId,
      validatedFields.contact || null,
      validatedFields.email || null,
      activeCompany.id,
      userId,
    ];

    await pool.query(
      `CALL sp_CreateSupplier(${params.map(() => '?').join(', ')})`,
      params
    );

    await createAuditLog({
      userId,
      action: 'Created Supplier',
      resourceType: 'supplier',
      resourceName: validatedFields.name,
      details: `Created supplier "${validatedFields.name}"`,
      newValues: validatedFields,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: activeCompany.id,
    });

    res.status(201).json({ success: true });
  } catch (err: any) {
    logger.error('Create supplier error', { err });
    if (err.message.includes('required')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to create supplier' });
  }
};

// UPDATE supplier
export const updateSupplier = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userID;

  try {
    const validatedFields = validateSupplierFields(req.body);

    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const params = [
      id,
      validatedFields.name,
      validatedFields.categoryId,
      validatedFields.contact || null,
      validatedFields.email || null,
      activeCompany.id,
      userId,
    ];

    await pool.query(
      `CALL sp_UpdateSupplier(${params.map(() => '?').join(', ')})`,
      params
    );

    await createAuditLog({
      userId,
      action: 'Updated Supplier',
      resourceType: 'supplier',
      ...(id && { resourceId: id }),
      resourceName: validatedFields.name,
      details: `Updated supplier "${id}"`,
      newValues: validatedFields,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: activeCompany.id,
    });

    res.json({ success: true });
  } catch (err: any) {
    logger.error('Update supplier error', { err });
    if (err.message.includes('required')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update supplier' });
  }
};

// DELETE supplier
export const deleteSupplier = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userID;

  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    await pool.query('CALL sp_DeleteSupplier(?, ?, ?)', [
      id,
      activeCompany.id,
      userId,
    ]);

    await createAuditLog({
      userId,
      action: 'Deleted Supplier',
      resourceType: 'supplier',
      ...(id && { resourceId: id }),
      details: `Deleted supplier "${id}"`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: activeCompany.id,
    });

    res.json({ message: 'Supplier deleted successfully' });
  } catch (err: any) {
    logger.error('Delete supplier error', { err });
    if (err.message?.includes('Cannot delete supplier')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
};
