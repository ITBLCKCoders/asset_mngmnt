/**
 * Permissions controller.
 *
 * NOTE: this file does NOT have a matching `permissions.routes.ts` because
 * the handlers are scoped to a parent resource (users or roles) and are
 * mounted by those parent route files:
 *
 *   - `getUserPermissionsHandler`        →  routes/users.routes.ts
 *   - `updateUserPermissionsHandler`     →  routes/users.routes.ts
 *   - `applyRolePermissionsHandler`      →  routes/users.routes.ts
 *   - `getRolePermissionsHandler`        →  routes/roles.routes.ts
 *   - `updateRolePermissionsHandler`     →  routes/roles.routes.ts
 *
 * If you add a new permissions endpoint that is *not* scoped to a user or a
 * role (e.g. listing global permission modules), add it to a new
 * `routes/permissions.routes.ts` and mount it under `/api/permissions`.
 */
import type { Response } from 'express';
import { pool } from '../db.js';
import { ensureRolePermissionsTable } from '../db/ensureRolePermissionsTable.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import { ALL_MODULE_NAMES } from '../constants/modulePermissions.js';
import { createAuditLog } from '../utils/audit.js';

function buildEmptyPermissionsMatrix(): Record<
  string,
  { view: boolean; create: boolean; edit: boolean; delete: boolean }
> {
  const permissions: Record<
    string,
    { view: boolean; create: boolean; edit: boolean; delete: boolean }
  > = {};
  ALL_MODULE_NAMES.forEach(module => {
    permissions[module] = {
      view: false,
      create: false,
      edit: false,
      delete: false,
    };
  });
  return permissions;
}

export async function getUserPermissionsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { userId } = req.params;
    const [rows] = (await pool.execute(
      'SELECT module_name, permission_type, granted FROM user_permissions WHERE user_id = ?',
      [userId]
    )) as any[];

    const permissions = buildEmptyPermissionsMatrix();

    // Override with database values
    rows.forEach((row: any) => {
      const modulePerms = permissions[row.module_name];
      if (modulePerms && row.permission_type in modulePerms) {
        modulePerms[row.permission_type as keyof typeof modulePerms] =
          row.granted === 1;
      }
    });

    // Auto-grant view permission for general-access modules (profile, mfa, etc.)
    for (const module of ['Profile', 'MFA', 'UserManual', 'FlowDiagrams']) {
      if (permissions[module]) {
        permissions[module].view = true;
      }
    }

    // Load custodian info: asset_type/manager_role from role; approver flags from user_custodian_settings (per-user)
    let roleCustodian: {
      assetType: string | null;
      managerRole: string;
      managerApprover1: boolean;
      managerApprover2: boolean;
      managerApprover3: boolean;
      financeApprover: boolean;
      subApprover2: boolean;
    } | null = null;
    const [userRows] = (await pool.execute(
      'SELECT role_id FROM users WHERE userID = ?',
      [userId]
    )) as any[];
    const roleId = userRows[0]?.role_id;
    const [custodianResultSets] = (await pool.execute(
      'CALL sp_get_user_custodian_settings(?)',
      [userId]
    )) as any[];
    const custodianRows = Array.isArray(custodianResultSets[0])
      ? custodianResultSets[0]
      : [];
    const custodian = custodianRows[0];
    const custodianManagerApprover1 = custodian
      ? Boolean(custodian.manager_approver_1)
      : false;
    const custodianManagerApprover2 = custodian
      ? Boolean(custodian.manager_approver_2)
      : false;
    const custodianManagerApprover3 = custodian
      ? Boolean(custodian.manager_approver_3)
      : false;
    const custodianFinanceApprover = custodian
      ? Boolean(custodian.finance_approver)
      : false;
    const custodianSubApprover2 = custodian
      ? Boolean(custodian.sub_approver_2)
      : false;
    if (roleId) {
      const [roleRows] = (await pool.execute(
        'SELECT asset_type, manager_role, manager_approver_1, manager_approver_2, manager_approver_3, finance_approver, sub_approver_2 FROM asset_mngmnt_roles WHERE roleID = ? AND deleted_at IS NULL',
        [roleId]
      )) as any[];
      const role = roleRows[0];
      if (role) {
        const managerApprover1 =
          Boolean(role.manager_approver_1) || custodianManagerApprover1;
        const managerApprover2 =
          Boolean(role.manager_approver_2) || custodianManagerApprover2;
        const managerApprover3 =
          Boolean(role.manager_approver_3) || custodianManagerApprover3;
        const financeApprover =
          Boolean(role.finance_approver) || custodianFinanceApprover;
        const subApprover2 =
          Boolean(role.sub_approver_2) || custodianSubApprover2;
        roleCustodian = {
          assetType: role.asset_type ?? null,
          managerRole: role.manager_role ?? 'none',
          managerApprover1,
          managerApprover2,
          managerApprover3,
          financeApprover,
          subApprover2,
        };
      }
    } else if (custodian && (custodianManagerApprover1 || custodianManagerApprover2 || custodianManagerApprover3 || custodianFinanceApprover || custodianSubApprover2)) {
      // User has approver flags but no role; still return for UI
      roleCustodian = {
        assetType: null,
        managerRole: 'none',
        managerApprover1: custodianManagerApprover1,
        managerApprover2: custodianManagerApprover2,
        managerApprover3: custodianManagerApprover3,
        financeApprover: custodianFinanceApprover,
        subApprover2: custodianSubApprover2,
      };
    }

    return res.json({ permissions, roleCustodian });
  } catch (error: any) {
    logger.error('Get user permissions failed:', error);
    return res.status(500).json({ error: 'Failed to fetch permissions' });
  }
}

export async function updateUserPermissionsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { userId } = req.params;
    const { permissions } = req.body; // Record<string, Record<string, boolean>>

    // Fetch old permissions for audit logging
    const [oldRows] = (await pool.execute(
      'SELECT module_name, permission_type, granted FROM user_permissions WHERE user_id = ?',
      [userId]
    )) as any[];
    const oldPermissions: Record<string, Record<string, boolean>> = {};
    oldRows.forEach((row: any) => {
      if (!oldPermissions[row.module_name]) {
        oldPermissions[row.module_name] = {
          view: false,
          create: false,
          edit: false,
          delete: false,
        };
      }
      if (
        row.permission_type === 'view' ||
        row.permission_type === 'create' ||
        row.permission_type === 'edit' ||
        row.permission_type === 'delete'
      ) {
        (oldPermissions[row.module_name] as any)[row.permission_type] =
          row.granted === 1;
      }
    });

    // First, delete existing permissions for the user
    await pool.execute('DELETE FROM user_permissions WHERE user_id = ?', [
      userId,
    ]);

    // Then, insert new permissions
    const values = [];
    for (const [module, perms] of Object.entries(permissions)) {
      for (const [type, granted] of Object.entries(
        perms as Record<string, boolean>
      )) {
        values.push([userId, module, type, granted ? 1 : 0]);
      }
    }

    if (values.length > 0) {
      const placeholders = values.map(() => '(?, ?, ?, ?)').join(', ');
      await pool.execute(
        `INSERT INTO user_permissions (user_id, module_name, permission_type, granted) VALUES ${placeholders}`,
        values.flat()
      );
    }

    // Log changes to audit trail
    const changes: string[] = [];
    const allModules = Object.keys({ ...oldPermissions, ...permissions });

    for (const module of allModules) {
      const oldPerms = oldPermissions[module] || {
        view: false,
        create: false,
        edit: false,
        delete: false,
      };
      const newPerms = permissions[module] || {
        view: false,
        create: false,
        edit: false,
        delete: false,
      };

      for (const permType of ['view', 'create', 'edit', 'delete']) {
        const oldValue = oldPerms[permType];
        const newValue = newPerms[permType];

        if (oldValue !== newValue) {
          changes.push(
            `${module} ${permType}: ${oldValue ? 'granted' : 'denied'} → ${newValue ? 'granted' : 'denied'}`
          );
        }
      }
    }

    if (changes.length > 0) {
      try {
        // Get username for the target user
        const [userRows] = (await pool.execute(
          'SELECT CONCAT(first_name, " ", last_name) as username FROM users WHERE userID = ?',
          [userId]
        )) as any[];
        const username = userRows[0]?.username || `User ${userId}`;

        await createAuditLog({
          ...(req.user?.userID && { userId: req.user?.userID }),
          action: 'Updated User Permissions',
          resourceType: 'user_permissions',
          ...(userId && { resourceId: userId }),
          resourceName: `${username} permissions`,
          details: `Updated permissions: ${changes.join(', ')}`,
          oldValues: oldPermissions,
          newValues: permissions,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });
      } catch (auditError: any) {
        logger.warn(
          'Failed to log permission changes to audit:',
          auditError.message
        );
        // Don't fail the request if audit logging fails
      }
    }

    return res.json({ message: 'Permissions updated successfully' });
  } catch (error: any) {
    logger.error('Update user permissions failed:', error);
    return res.status(500).json({ error: 'Failed to update permissions' });
  }
}

export async function applyRolePermissionsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { userId } = req.params;

    const [userRows] = (await pool.execute(
      'SELECT role_id FROM users WHERE userID = ?',
      [userId]
    )) as any[];
    const roleId = userRows[0]?.role_id;
    if (!roleId) {
      return res.json({
        message: 'No role assigned; no permissions to apply.',
      });
    }

    const [roleRows] = (await pool.execute(
      'SELECT hr_accountability_receiver FROM asset_mngmnt_roles WHERE roleID = ? AND deleted_at IS NULL',
      [roleId]
    )) as any[];
    const role = roleRows[0];
    if (!role) {
      return res.json({
        message: 'Role not found; no permissions to apply.',
      });
    }

    const hrReceiver = Boolean(role.hr_accountability_receiver);

    const permissions = buildEmptyPermissionsMatrix();
    try {
      const [rolePermRows] = (await pool.execute(
        'SELECT module_name, permission_type, granted FROM role_permissions WHERE role_id = ?',
        [roleId]
      )) as any[];
      (rolePermRows as any[]).forEach((row: any) => {
        const modulePerms = permissions[row.module_name];
        if (modulePerms && row.permission_type in modulePerms) {
          (modulePerms as any)[row.permission_type] = row.granted === 1;
        }
      });
    } catch (e: any) {
      if (e?.code !== 'ER_NO_SUCH_TABLE') {
        throw e;
      }
      logger.warn(
        'role_permissions table missing; apply-role uses HR accountability overlay only when applicable'
      );
    }

    if (hrReceiver) {
      if (!permissions['Accountability Form'])
        permissions['Accountability Form'] = {
          view: false,
          create: false,
          edit: false,
          delete: false,
        };
      permissions['Accountability Form'].view = true;
      permissions['Accountability Form'].create = true;
    }

    // Auto-grant view for general-access modules
    for (const module of ['Profile', 'MFA', 'UserManual', 'FlowDiagrams']) {
      if (permissions[module]) {
        permissions[module].view = true;
      }
    }

    await pool.execute('DELETE FROM user_permissions WHERE user_id = ?', [
      userId,
    ]);
    const values: any[] = [];
    for (const [module, perms] of Object.entries(permissions)) {
      for (const [type, granted] of Object.entries(
        perms as Record<string, boolean>
      )) {
        values.push([userId, module, type, granted ? 1 : 0]);
      }
    }
    if (values.length > 0) {
      const placeholders = values.map(() => '(?, ?, ?, ?)').join(', ');
      await pool.execute(
        `INSERT INTO user_permissions (user_id, module_name, permission_type, granted) VALUES ${placeholders}`,
        values.flat()
      );
    }

    await createAuditLog({
      ...(req.user?.userID && { userId: req.user?.userID }),
      action: 'Applied Role Permissions',
      resourceType: 'user_permissions',
      ...(userId && { resourceId: userId }),
      details: `Applied role permissions from role ${roleId} to user ${userId}`,
      newValues: permissions,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({
      message: 'Role permissions applied successfully',
    });
  } catch (error: any) {
    logger.error('Apply role permissions failed:', error);
    return res.status(500).json({ error: 'Failed to apply role permissions' });
  }
}

export async function getRolePermissionsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { roleID } = req.params;
    const permissions = buildEmptyPermissionsMatrix();
    try {
      const [rows] = (await pool.execute(
        'SELECT module_name, permission_type, granted FROM role_permissions WHERE role_id = ?',
        [roleID]
      )) as any[];
      (rows as any[]).forEach((row: any) => {
        const modulePerms = permissions[row.module_name];
        if (modulePerms && row.permission_type in modulePerms) {
          (modulePerms as any)[row.permission_type] = row.granted === 1;
        }
      });
    } catch (e: any) {
      if (e?.code !== 'ER_NO_SUCH_TABLE') {
        throw e;
      }
    }
    return res.json({ permissions });
  } catch (error: any) {
    logger.error('Get role permissions failed:', error);
    return res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
}

export async function updateRolePermissionsHandler(
  req: AuthRequest,
  res: Response
) {
  try {
    const { roleID } = req.params;
    const { permissions } = req.body as {
      permissions?: Record<string, Record<string, boolean>>;
    };
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ error: 'permissions object required' });
    }

    const [roleRows] = (await pool.execute(
      'SELECT roleID FROM asset_mngmnt_roles WHERE roleID = ? AND deleted_at IS NULL',
      [roleID]
    )) as any[];
    if (!roleRows[0]?.roleID) {
      return res.status(404).json({ error: 'Role not found' });
    }

    await ensureRolePermissionsTable(pool);

    await pool.execute('DELETE FROM role_permissions WHERE role_id = ?', [
      roleID,
    ]);

    const values: any[] = [];
    for (const [module, perms] of Object.entries(permissions)) {
      for (const [type, granted] of Object.entries(
        perms as Record<string, boolean>
      )) {
        if (
          type === 'view' ||
          type === 'create' ||
          type === 'edit' ||
          type === 'delete'
        ) {
          values.push([roleID, module, type, granted ? 1 : 0]);
        }
      }
    }
    if (values.length > 0) {
      const placeholders = values.map(() => '(?, ?, ?, ?)').join(', ');
      await pool.execute(
        `INSERT INTO role_permissions (role_id, module_name, permission_type, granted) VALUES ${placeholders}`,
        values.flat()
      );
    }

    await createAuditLog({
      ...(req.user?.userID && { userId: req.user?.userID }),
      action: 'Updated Role Permissions',
      resourceType: 'role_permissions',
      ...(roleID && { resourceId: roleID }),
      details: `Updated permissions for role ${roleID}`,
      newValues: permissions,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({ message: 'Role permissions updated successfully' });
  } catch (error: any) {
    logger.error('Update role permissions failed:', {
      err: error,
      code: error?.code,
      sqlMessage: error?.sqlMessage,
    });
    return res.status(500).json({ error: 'Failed to update role permissions' });
  }
}
