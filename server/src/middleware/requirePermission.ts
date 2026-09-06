import type { Response, NextFunction } from 'express';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../db.js';
import logger from '../logger.js';
import type { AuthRequest } from './authenticate.js';

interface PermissionRow extends RowDataPacket {
  granted: number;
}

export type PermissionType = 'view' | 'create' | 'edit' | 'delete' | 'assign';

/**
 * Resolve whether the given user has a granted permission for a module +
 * permission_type. Reads from `user_permissions`. Returns `false` when no
 * row exists or when `granted = 0`.
 */
export async function userHasPermission(
  userId: string,
  moduleName: string,
  permissionType: PermissionType
): Promise<boolean> {
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

interface ActorRoleCompany extends RowDataPacket {
  role_name: string | null;
  company_id: string | null;
}

/**
 * Fetch the actor's role name + company for Users-management decisions.
 * Local Admin (`Admin`) is scoped to its own company; Global Admin is global.
 */
export async function getActorRoleAndCompany(
  userId: string
): Promise<{ roleName: string; companyId: string | null }> {
  const [rows] = await pool.execute<ActorRoleCompany[]>(
    `SELECT r.name as role_name, u.company_id
       FROM users u
       LEFT JOIN asset_mngmnt_roles r ON u.role_id = r.roleID AND r.deleted_at IS NULL
      WHERE u.userID = ?
      LIMIT 1`,
    [userId]
  );
  return {
    roleName: String(rows[0]?.role_name ?? ''),
    companyId: (rows[0]?.company_id as string | null) ?? null,
  };
}

async function getTargetUserCompanyId(
  targetUserId: string
): Promise<string | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT company_id FROM users WHERE userID = ? LIMIT 1',
    [targetUserId]
  );
  return ((rows[0] as { company_id?: string | null })?.company_id ?? null);
}

/**
 * Users-management gate for the `/user` page (role assignment, permissions,
 * approver/sub-approver assignment).
 *
 * Allows when EITHER:
 *  - the actor has an explicit `Users:edit` row (`user_permissions`), OR
 *  - the actor is `Global Admin` (all companies), OR
 *  - the actor is Local Admin (`Admin`) AND the target belongs to the
 *    actor's own company.
 *
 * Target company is resolved from `req.params.companyId` (company approver
 * routes) or `req.params.userId | req.params.id` (user approver / user
 * routes) via a users-table lookup. When no target can be resolved (e.g.
 * list reads), Local Admin is allowed through and scoping is enforced by
 * query filtering / client company selection.
 */
export const requireUsersManage =
  () =>
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
      if (await userHasPermission(userId, 'Users', 'edit')) {
        return next();
      }

      const actor = await getActorRoleAndCompany(userId);
      const normalized = actor.roleName.trim().toLowerCase();

      if (normalized === 'global admin') {
        return next();
      }

      if (normalized === 'admin') {
        const params = req.params as Record<string, string | undefined>;
        const targetUserId = params.userId ?? params.id;
        const targetCompanyId =
          params.companyId ??
          (targetUserId
            ? await getTargetUserCompanyId(targetUserId)
            : null) ??
          (typeof req.body?.company_id === 'string'
            ? (req.body.company_id as string)
            : null);

        // No concrete target (e.g. GET /users list): allow; the handler /
        // client restricts rows to the actor's own company.
        if (!targetCompanyId) {
          return next();
        }
        if (actor.companyId && actor.companyId === targetCompanyId) {
          return next();
        }
        logger.warn(
          `[AUTHZ] Forbidden: local admin ${userId} outside own company (target ${targetCompanyId})`
        );
        return res
          .status(403)
          .json({ error: 'Forbidden: outside your company scope' });
      }

      logger.warn(`[AUTHZ] Forbidden: user ${userId} missing Users:edit`);
      return res.status(403).json({ error: 'Forbidden' });
    } catch (err) {
      logger.error('[AUTHZ] requireUsersManage lookup failed', { err });
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
