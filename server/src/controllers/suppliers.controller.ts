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
    const queryCompanyId = req.query.company_id as string | undefined;

    if (queryCompanyId) {
      const [rows] = await pool.query<any[][]>('CALL sp_GetAllSuppliers(?)', [
        queryCompanyId,
      ]);
      return res.json(rows[0] ?? []);
    }

    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (activeCompany) {
      const [rows] = await pool.query<any[][]>('CALL sp_GetAllSuppliers(?)', [
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
        `SELECT s.supplierID, s.name, s.category_id, s.contact, s.email, s.company_id,
                s.created_at, s.created_by, s.updated_at, s.updated_by,
                s.deleted_at, s.deleted_by
         FROM asset_suppliers s
         WHERE s.deleted_at IS NULL
         ORDER BY s.created_at DESC`
      );
      return res.json(rows[0] ?? []);
    }

    return res.status(400).json({ error: 'No active company found' });
  } catch (err) {
    logger.error('Get all suppliers error', { err });
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
};

// CREATE supplier
export const createSupplier = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userID;

  try {
    const rawName = (req.body.name || '').toString().trim();
    const isUnknown = ['unknown', 'unkown'].includes(rawName.toLowerCase());

    // Handle global "Unknown" supplier -- one per company, no category_id
    if (isUnknown) {
      const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
      if (!activeCompany) {
        return res.status(400).json({ error: 'No active company found' });
      }

      const [existing] = await pool.query<any[][]>(
        `SELECT supplierID FROM suppliers WHERE LOWER(name) IN ('unknown','unkown') AND company_id = ? AND deleted_at IS NULL LIMIT 1`,
        [activeCompany.id]
      );
      if ((existing[0] as any[]).length > 0) {
        return res.status(409).json({ error: 'Unknown supplier already exists for this company' });
      }

      const params = ['Unknown', null, null, null, activeCompany.id, userId];
      await pool.query(
        `CALL sp_CreateSupplier(${params.map(() => '?').join(', ')})`,
        params
      );

      await createAuditLog({
        userId,
        action: 'Created Supplier',
        resourceType: 'supplier',
        resourceName: 'Unknown',
        details: 'Created global Unknown supplier',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        companyId: activeCompany.id,
      });

      return res.status(201).json({ success: true, message: 'Unknown supplier created' });
    }

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
