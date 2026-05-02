import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import { getScopedActiveCompany } from '../utils/activeCompany.js';

export async function getPositionsHandler(req: AuthRequest, res: Response) {
  try {
    const activeCompany = await getScopedActiveCompany(pool, req.user?.userID);
    if (!activeCompany) {
      return res.status(400).json({ error: 'No active company found' });
    }

    const [rows] = (await pool.execute('CALL sp_get_all_positions(?)', [
      activeCompany.id,
    ])) as any[];

    const positions = rows[0].map((position: any) => ({
      positionID: position.positionID,
      name: position.name,
      description: position.description,
      department_id: position.department_id,
      department_name: position.department_name,
      department_code: position.department_code,
      created_at: position.created_at,
      created_by: position.created_by,
      updated_at: position.updated_at,
      updated_by: position.updated_by,
      deleted_at: position.deleted_at,
      deleted_by: position.deleted_by,
    }));

    return res.json({ positions });
  } catch (error: any) {
    logger.error('Get positions failed:', error);
    return res.status(500).json({ error: 'Failed to fetch positions' });
  }
}

export async function getPositionsByDepartmentHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { departmentId } = req.params;

    const [rows] = (await pool.execute(
      'CALL sp_get_positions_by_department(?)',
      [departmentId]
    )) as any[];

    const positions = rows[0].map((position: any) => ({
      positionID: position.positionID,
      name: position.name,
      description: position.description,
      department_id: position.department_id,
      created_at: position.created_at,
      created_by: position.created_by,
      updated_at: position.updated_at,
      updated_by: position.updated_by,
      deleted_at: position.deleted_at,
      deleted_by: position.deleted_by,
    }));

    return res.json({ positions });
  } catch (error: any) {
    logger.error('Get positions by department failed:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch positions by department' });
  }
}

export async function createPositionHandler(req: AuthRequest, res: Response) {
  const { name, description, department_id } = req.body;
  const userId = req.user!.userID;

  if (!name || !department_id) {
    return res.status(400).json({ error: 'Name and department are required' });
  }

  try {
    const [rows] = (await pool.execute('CALL sp_create_position(?, ?, ?, ?)', [
      name.trim(),
      description?.trim() || null,
      department_id,
      userId,
    ])) as any[];

    const positionId = rows[0][0].positionID;

    return res.status(201).json({
      message: 'Position created successfully',
      position: {
        positionID: positionId,
        name: name.trim(),
        description: description?.trim() || null,
        department_id: department_id,
        created_at: new Date(),
        created_by: userId,
        updated_at: new Date(),
        updated_by: userId,
      },
    });
  } catch (error: any) {
    logger.error('Create position failed:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res
        .status(400)
        .json({ error: 'Position code already exists for this department' });
    }
    return res.status(500).json({ error: 'Failed to create position' });
  }
}

export async function updatePositionHandler(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { name, description, department_id } = req.body;
  const userId = req.user!.userID;

  if (!name || !department_id) {
    return res.status(400).json({ error: 'Name and department are required' });
  }

  try {
    const [rows] = (await pool.execute(
      'CALL sp_update_position(?, ?, ?, ?, ?)',
      [id, name.trim(), description?.trim() || null, department_id, userId]
    )) as any[];

    if (rows[0][0].affected_rows === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }

    return res.json({
      message: 'Position updated successfully',
      position: {
        positionID: id,
        name: name.trim(),
        description: description?.trim() || null,
        department_id: department_id,
        updated_at: new Date(),
        updated_by: userId,
      },
    });
  } catch (error: any) {
    logger.error('Update position failed:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res
        .status(400)
        .json({ error: 'Position code already exists for this department' });
    }
    return res.status(500).json({ error: 'Failed to update position' });
  }
}

export async function deletePositionHandler(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user!.userID;

  try {
    // First, get the department_id for this position
    const [positionRows] = (await pool.execute(
      'SELECT department_id FROM asset_mngmnt_positions WHERE positionID = ?',
      [id]
    )) as any[];
    const department_id = positionRows[0][0]?.department_id;

    if (!department_id) {
      return res.status(404).json({ error: 'Position not found' });
    }

    const [rows] = (await pool.execute('CALL sp_delete_position(?, ?, ?)', [
      id,
      department_id,
      userId,
    ])) as any[];

    if (rows[0][0].affected_rows === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }

    return res.json({ message: 'Position deleted successfully' });
  } catch (error: any) {
    logger.error('Delete position failed:', error);
    return res.status(500).json({ error: 'Failed to delete position' });
  }
}
