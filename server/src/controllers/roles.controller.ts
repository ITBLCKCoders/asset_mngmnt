import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';

const ROLE_COLUMNS =
  'roleID, name, description, created_at, created_by, updated_at, updated_by, deleted_at, deleted_by, asset_type, manager_role, hr_accountability_receiver, manager_approver_1, manager_approver_2, manager_approver_3';

function mapRoleRow(row: any) {
  return {
    roleID: row.roleID,
    name: row.name,
    description: row.description,
    created_at: row.created_at,
    created_by: row.created_by,
    updated_at: row.updated_at,
    updated_by: row.updated_by,
    deleted_at: row.deleted_at,
    deleted_by: row.deleted_by,
    asset_type: row.asset_type ?? null,
    manager_role: row.manager_role ?? null,
    hr_accountability_receiver: Boolean(row.hr_accountability_receiver),
    manager_approver_1: Boolean(row.manager_approver_1),
    manager_approver_2: Boolean(row.manager_approver_2),
    manager_approver_3: Boolean(row.manager_approver_3),
  };
}

export async function getRolesHandler(req: AuthRequest, res: Response) {
  try {
    let rows: any[];
    try {
      const [result] = (await pool.execute(
        `SELECT ${ROLE_COLUMNS} FROM asset_mngmnt_roles WHERE deleted_at IS NULL ORDER BY name`
      )) as any[];
      rows = result;
    } catch (colError: any) {
      if (colError?.code === 'ER_BAD_FIELD_ERROR' || colError?.errno === 1054) {
        const [legacyRows] = (await pool.execute(
          'CALL sp_get_roles()'
        )) as any[];
        rows = (legacyRows[0] || []).map((r: any) => ({
          ...r,
          asset_type: null,
          manager_role: null,
          hr_accountability_receiver: 0,
          manager_approver_1: 0,
          manager_approver_2: 0,
          manager_approver_3: 0,
        }));
      } else {
        throw colError;
      }
    }
    const roles = rows.map(mapRoleRow);
    return res.json({ roles });
  } catch (error: any) {
    logger.error('Get roles failed:', error);
    return res.status(500).json({ error: 'Failed to fetch roles' });
  }
}

export async function createRoleHandler(req: AuthRequest, res: Response) {
  const {
    name,
    description,
    asset_type,
    manager_role,
    hr_accountability_receiver,
    manager_approver_1,
    manager_approver_2,
    manager_approver_3,
  } = req.body;
  const userId = req.user!.userID;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const [createResult] = (await pool.execute(
      'CALL sp_create_role(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name.trim(),
        description?.trim() || null,
        userId,
        asset_type ?? null,
        manager_role ?? null,
        0,
        0,
        0,
        hr_accountability_receiver ? 1 : 0,
        manager_approver_1 ? 1 : 0,
        manager_approver_2 ? 1 : 0,
        manager_approver_3 ? 1 : 0,
      ]
    )) as any[];

    const roleID = (
      Array.isArray(createResult[0]) ? createResult[0][0] : createResult[0]
    )?.roleID;

    const [rows] = roleID
      ? ((await pool.execute(
          `SELECT ${ROLE_COLUMNS} FROM asset_mngmnt_roles WHERE roleID = ?`,
          [roleID]
        )) as any[])
      : [[null]];

    const role = rows[0] ? mapRoleRow(rows[0]) : null;

    return res.status(201).json({
      message: 'Role created successfully',
      role: role ?? {
        roleID,
        name: name.trim(),
        description: description?.trim() || null,
        created_at: new Date(),
        created_by: userId,
        updated_at: new Date(),
        updated_by: userId,
        asset_type: asset_type ?? null,
        manager_role: manager_role ?? null,
        hr_accountability_receiver: Boolean(hr_accountability_receiver),
        manager_approver_1: Boolean(manager_approver_1),
        manager_approver_2: Boolean(manager_approver_2),
        manager_approver_3: Boolean(manager_approver_3),
      },
    });
  } catch (error: any) {
    logger.error('Create role failed:', error);
    return res.status(500).json({ error: 'Failed to create role' });
  }
}

export async function updateRoleHandler(req: AuthRequest, res: Response) {
  const { roleID } = req.params;
  const {
    name,
    description,
    asset_type,
    manager_role,
    hr_accountability_receiver,
    manager_approver_1,
    manager_approver_2,
    manager_approver_3,
  } = req.body;
  const userId = req.user!.userID;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const [updateResult] = (await pool.execute(
      'CALL sp_update_role(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        roleID,
        name.trim(),
        description?.trim() || null,
        userId,
        asset_type ?? null,
        manager_role ?? null,
        0,
        0,
        0,
        hr_accountability_receiver ? 1 : 0,
        manager_approver_1 ? 1 : 0,
        manager_approver_2 ? 1 : 0,
        manager_approver_3 ? 1 : 0,
      ]
    )) as any[];

    const affectedRows =
      (Array.isArray(updateResult[0]) ? updateResult[0][0] : updateResult[0])
        ?.affected_rows ?? 0;
    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const [rows] = (await pool.execute(
      `SELECT ${ROLE_COLUMNS} FROM asset_mngmnt_roles WHERE roleID = ?`,
      [roleID]
    )) as any[];
    const role = rows[0] ? mapRoleRow(rows[0]) : null;

    return res.json({
      message: 'Role updated successfully',
      role: role ?? {
        roleID,
        name: name.trim(),
        description: description?.trim() || null,
        updated_at: new Date(),
        updated_by: userId,
        asset_type: asset_type ?? null,
        manager_role: manager_role ?? null,
        hr_accountability_receiver: Boolean(hr_accountability_receiver),
        manager_approver_1: Boolean(manager_approver_1),
        manager_approver_2: Boolean(manager_approver_2),
        manager_approver_3: Boolean(manager_approver_3),
      },
    });
  } catch (error: any) {
    logger.error('Update role failed:', error);
    return res.status(500).json({ error: 'Failed to update role' });
  }
}

export async function deleteRoleHandler(req: AuthRequest, res: Response) {
  const { roleID } = req.params;
  const userId = req.user!.userID;

  try {
    const [rows] = (await pool.execute('CALL sp_delete_role(?, ?)', [
      roleID,
      userId,
    ])) as any[];

    if (rows[0][0].affected_rows === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    return res.json({ message: 'Role deleted successfully' });
  } catch (error: any) {
    logger.error('Delete role failed:', error);
    return res.status(500).json({ error: 'Failed to delete role' });
  }
}
