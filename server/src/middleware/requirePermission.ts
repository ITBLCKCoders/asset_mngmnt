import type { Response, NextFunction } from 'express';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../db.js';
import logger from '../logger.js';
import type { AuthRequest } from './authenticate.js';

interface PermissionRow extends RowDataPacket {
  granted: number;
}

interface RoleNameRow extends RowDataPacket {
  name: string | null;
}

export type PermissionType = 'view' | 'create' | 'edit' | 'delete' | 'assign';

/**
 * Returns true when the user holds an `admin` or `super admin` role. Mirrors
 * the client-side bypass in `useUserPermissions.hasPermission` so that
 * privileged roles are not locked out by the per-module matrix.
 */
async function userIsAdmin(userId: string): Promise<boolean> {
  const [rows] = await pool.execute<RoleNameRow[]>(
    `SELECT r.name
       FROM users u
       LEFT JOIN asset_mngmnt_roles r ON r.roleID = u.role_id
      WHERE u.userID = ?
      LIMIT 1`,
    [userId]
  );
  const name = (rows[0]?.name ?? '').trim().toLowerCase();
  return name === 'admin' || name === 'super admin';
}

/**
 * Resolve whether the given user has a granted permission for a module +
 * permission_type. Reads from `user_permissions`. Returns `false` when no
 * row exists or when `granted = 0`. Admin / super-admin roles are granted
 * automatically.
 */
export async function userHasPermission(
  userId: string,
  moduleName: string,
  permissionType: PermissionType
): Promise<boolean> {
  if (await userIsAdmin(userId)) return true;
  const [rows] = await pool.execute<PermissionRow[]>(
    `SELECT granted
       FROM user_permissions
      WHERE user_id = ?
        AND module_name = ?
        AND permission_type = ?
      LIMIT 1`,
    [userId, moduleName, permissionType]
  );
  return (rows[0]?.granted ?? 0) === 1;
}

/**
 * Declarative permission-gate middleware. Mount AFTER `authenticate` so
 * `req.user` is populated.
 *
 * @example
 *   router.post(
 *     '/decline',
 *     authenticate,
 *     requirePermission('Approvals', 'edit'),
 *     declineHandler
 *   );
 */
export const requirePermission =
  (moduleName: string, permissionType: PermissionType) =>
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    const userId = req.user?.userID;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const ok = await userHasPermission(userId, moduleName, permissionType);
      if (!ok) {
        logger.warn(
          `[AUTHZ] Forbidden: user ${userId} missing ${moduleName}:${permissionType}`
        );
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch (err) {
      logger.error('[AUTHZ] requirePermission lookup failed', { err });
      return res
        .status(500)
        .json({ error: 'Authorization check failed' });
    }
  };
