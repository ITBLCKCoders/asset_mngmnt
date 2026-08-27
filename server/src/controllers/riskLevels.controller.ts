import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import { getScopedActiveCompany } from '../utils/activeCompany.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

interface RiskLevelFields {
  name: string;
  color: string;
}

const validateRiskLevelFields = (body: any): RiskLevelFields => {
  const name = body.name?.trim();
  const color = body.color?.trim() || '';

  if (!name) {
    throw new Error('Name is required');
  }

  return { name, color };
};

// GET all risk levels
export const getAllRiskLevels = async (req: AuthRequest, res: Response) => {
  try {
    const queryCompanyId = req.query.company_id as string | undefined;

    if (queryCompanyId) {
      const [rows] = await pool.query<any[][]>('CALL sp_GetAllRiskLevels(?)', [
        queryCompanyId,
      ]);
      return res.json(rows[0] ?? []);
    }

    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (activeCompany) {
      const [rows] = await pool.query<any[][]>('CALL sp_GetAllRiskLevels(?)', [
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
    const roleName = String(userRows[0]?.[0]?.role_name ?? '')
      .trim()
      .toLowerCase();
    if (roleName === 'global admin' || roleName === 'admin') {
      const [rows] = await pool.query<any[][]>(
        `SELECT id, company_id, name, color,
                created_at, created_by, updated_at, updated_by,
                deleted_at, deleted_by
         FROM risk_levels
         WHERE deleted_at IS NULL
         ORDER BY created_at DESC`
      );
      return res.json(rows[0] ?? []);
    }

    return res.status(400).json({ error: 'No active company found' });
  } catch (err) {
    logger.error('Get all risk levels error', { err });
    res.status(500).json({ error: 'Failed to fetch risk levels' });
  }
};

// CREATE risk level
export const createRiskLevel = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userID;

  try {
    const validatedFields = validateRiskLevelFields(req.body);
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const params = [
      validatedFields.name,
      validatedFields.color,
      activeCompany.id,
      userId,
    ];

    await pool.query(
      `CALL sp_CreateRiskLevel(${params.map(() => '?').join(', ')})`,
      params
    );

    await createAuditLog({
      userId,
      action: 'Created Risk Level',
      resourceType: 'risk_level',
      resourceName: validatedFields.name,
      details: `Created risk level "${validatedFields.name}"`,
      newValues: validatedFields,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: activeCompany.id,
    });

    res.status(201).json({ success: true });
  } catch (err: any) {
    logger.error('Create risk level error', { err });
    if (err.message.includes('required')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to create risk level' });
  }
};

// UPDATE risk level
export const updateRiskLevel = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userID;

  try {
    const validatedFields = validateRiskLevelFields(req.body);

    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const params = [
      id,
      validatedFields.name,
      validatedFields.color,
      activeCompany.id,
      userId,
    ];

    await pool.query(
      `CALL sp_UpdateRiskLevel(${params.map(() => '?').join(', ')})`,
      params
    );

    await createAuditLog({
      userId,
      action: 'Updated Risk Level',
      resourceType: 'risk_level',
      ...(id && { resourceId: id }),
      resourceName: validatedFields.name,
      details: `Updated risk level "${id}"`,
      newValues: validatedFields,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: activeCompany.id,
    });

    res.json({ success: true });
  } catch (err: any) {
    logger.error('Update risk level error', { err });
    if (err.message.includes('required')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update risk level' });
  }
};

// DELETE risk level
export const deleteRiskLevel = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userID;

  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    await pool.query('CALL sp_DeleteRiskLevel(?, ?, ?)', [
      id,
      activeCompany.id,
      userId,
    ]);

    await createAuditLog({
      userId,
      action: 'Deleted Risk Level',
      resourceType: 'risk_level',
      ...(id && { resourceId: id }),
      details: `Deleted risk level "${id}"`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: activeCompany.id,
    });

    res.json({ message: 'Risk level deleted successfully' });
  } catch (err: any) {
    logger.error('Delete risk level error', { err });
    res.status(500).json({ error: 'Failed to delete risk level' });
  }
};
