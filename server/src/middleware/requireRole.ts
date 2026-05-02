import type { Response, NextFunction } from 'express';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../db.js';
import logger from '../logger.js';
import type { AuthRequest } from './authenticate.js';
import type { RoleName } from '../constants/roles.js';

interface RoleRow extends RowDataPacket {
  role_name: string | null;
}

/**
 * Resolve the role name for a user via a single LEFT JOIN against the
 * roles table. Returns `null` if the user has no role or the role was
 * soft-deleted.
 */
export async function getUserRoleName(userId: string): Promise<string | null> {
  const [rows] = await pool.execute<RoleRow[]>(
    `SELECT r.name AS role_name
       FROM users u
       LEFT JOIN asset_mngmnt_roles r
         ON u.role_id = r.roleID AND r.deleted_at IS NULL
      WHERE u.userID = ?`,
    [userId]
  );
  return rows[0]?.role_name ?? null;
}

/**
 * Declarative role-gate middleware. Mount AFTER `authenticate` so
 * `req.user` is populated.
 *
 * @example
 *   router.post('/run', authenticate, requireRole(ROLES.SUPER_ADMIN), runMigrations);
 */
export const requireRole =
  (...allowed: RoleName[]) =>
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
      const roleName = await getUserRoleName(userId);
      if (!roleName || !allowed.includes(roleName as RoleName)) {
        logger.warn(
          `[AUTHZ] Forbidden: user ${userId} role=${roleName ?? 'none'} required one of ${allowed.join(', ')}`
        );
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch (err) {
      logger.error('[AUTHZ] requireRole lookup failed', { err });
      return res
        .status(500)
        .json({ error: 'Authorization check failed' });
    }
  };
