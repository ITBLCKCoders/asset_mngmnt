import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import { getScopedActiveCompany } from '../utils/activeCompany.js';

export async function getDepartmentsHandler(req: AuthRequest, res: Response) {
  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const [rows] = (await pool.execute('CALL sp_get_departments(?)', [
      activeCompany.id,
    ])) as any[];

    const departments = rows[0].map((dept: any) => ({
      departmentID: dept.departmentID,
      name: dept.name,
      code: dept.code,
      prefix: dept.prefix,
      company_id: dept.company_id,
      description: dept.description,
      created_at: dept.created_at,
      created_by: dept.created_by,
      updated_at: dept.updated_at,
      updated_by: dept.updated_by,
      deleted_at: dept.deleted_at,
      deleted_by: dept.deleted_by,
    }));

    return res.json({ departments });
  } catch (error: any) {
    logger.error('Get departments failed:', error);
    return res.status(500).json({ error: 'Failed to fetch departments' });
  }
}

export async function createDepartmentHandler(req: AuthRequest, res: Response) {
  const { name, code, prefix, description } = req.body;
  const userId = req.user!.userID;

  if (!name || !code) {
    return res.status(400).json({ error: 'Name and code are required' });
  }

  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const [rows] = (await pool.execute(
      'CALL sp_create_department(?, ?, ?, ?, ?, ?)',
      [
        name.trim(),
        code.trim(),
        prefix?.trim() || null,
        description?.trim() || null,
        activeCompany.id,
        userId,
      ]
    )) as any[];

    const departmentId = rows[0][0].departmentID;

    return res.status(201).json({
      message: 'Department created successfully',
      department: {
        departmentID: departmentId,
        name: name.trim(),
        code: code.trim(),
        prefix: prefix?.trim() || null,
        description: description?.trim() || null,
        created_at: new Date(),
        created_by: userId,
        updated_at: new Date(),
        updated_by: userId,
      },
    });
  } catch (error: any) {
    logger.error('Create department failed:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Department code already exists' });
    }
    return res.status(500).json({ error: 'Failed to create department' });
  }
}

export async function updateDepartmentHandler(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { name, code, prefix, description } = req.body;
  const userId = req.user!.userID;

  if (!name || !code) {
    return res.status(400).json({ error: 'Name and code are required' });
  }

  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const [rows] = (await pool.execute(
      'CALL sp_update_department(?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        name.trim(),
        code.trim(),
        prefix?.trim() || null,
        description?.trim() || null,
        activeCompany.companyID,
        userId,
      ]
    )) as any[];

    if (rows[0][0].affected_rows === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    return res.json({
      message: 'Department updated successfully',
      department: {
        departmentID: id,
        name: name.trim(),
        code: code.trim(),
        prefix: prefix?.trim() || null,
        description: description?.trim() || null,
        updated_at: new Date(),
        updated_by: userId,
      },
    });
  } catch (error: any) {
    logger.error('Update department failed:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Department code already exists' });
    }
    return res.status(500).json({ error: 'Failed to update department' });
  }
}

export async function deleteDepartmentHandler(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user!.userID;

  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const [rows] = (await pool.execute('CALL sp_delete_department(?, ?, ?)', [
      id,
      activeCompany.companyID,
      userId,
    ])) as any[];

    if (rows[0][0].affected_rows === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    return res.json({ message: 'Department deleted successfully' });
  } catch (error: any) {
    logger.error('Delete department failed:', error);
    return res.status(500).json({ error: 'Failed to delete department' });
  }
}
