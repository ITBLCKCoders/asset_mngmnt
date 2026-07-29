import type { Response } from 'express';
import { pool } from '../db.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import logger from '../logger.js';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '../auth/passwordPolicy.js';
import { validatePassword } from '../auth/password.js';
import { createAuditLog, buildAuditContext } from '../utils/audit.js';

export async function getUsersHandler(req: AuthRequest, res: Response) {
  try {
    const includeInactive = (req as any).query?.includeInactive === 'true';
    const [rows] = (await pool.execute('CALL sp_get_users(?)', [
      includeInactive ? 1 : 0,
    ])) as any[];
    const rawUsers: any[] = Array.isArray(rows?.[0]) ? rows[0] : [];

    // Ensure digital signatures are available even when sp_get_users doesn't include that column.
    const userIds = rawUsers
      .map((u: any) => String(u?.id ?? '').trim())
      .filter((id: string) => id.length > 0);
    const signaturesById = new Map<string, string | null>();
    const lockoutDataById = new Map<string, { lockout_until: string | null; failed_login_attempts: number }>();
    
    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(', ');
      
      // Fetch digital signatures
      const [signatureRows] = (await pool.query(
        `SELECT userID, digital_signature FROM users WHERE userID IN (${placeholders})`,
        userIds
      )) as any[];
      for (const row of signatureRows as any[]) {
        const id = String(row?.userID ?? '').trim();
        if (!id) continue;
        const sig =
          row?.digital_signature != null
            ? String(row.digital_signature)
            : null;
        signaturesById.set(id, sig && sig.trim() ? sig.trim() : null);
      }
      
      // Fetch lockout data
      const [lockoutRows] = (await pool.query(
        `SELECT userID, lockout_until, failed_login_attempts FROM users WHERE userID IN (${placeholders})`,
        userIds
      )) as any[];
      for (const row of lockoutRows as any[]) {
        const id = String(row?.userID ?? '').trim();
        if (!id) continue;
        lockoutDataById.set(id, {
          lockout_until: row.lockout_until || null,
          failed_login_attempts: row.failed_login_attempts || 0
        });
      }
    }

    // Transform to match the expected User interface (includes approver flags from user_custodian_settings via sp_get_users LEFT JOIN)
    const users = rawUsers.map((user: any) => {
      const lockoutData = lockoutDataById.get(String(user.id)) || { lockout_until: null, failed_login_attempts: 0 };
      return {
        userID: user.id, // This is actually userID from the stored procedure
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
        position: user.position || '',
        employee_number: user.employee_number || '',
        role_id: user.role_id || null,
        role: user.role && user.role !== null ? JSON.parse(user.role) : undefined,
        department_id: user.department_id,
        department: user.department
          ? user.department.startsWith('{')
            ? JSON.parse(user.department)
            : { name: user.department }
          : undefined,
        company_id: user.company_id,
        company: user.company ? JSON.parse(user.company) : undefined,
        avatar_url: user.avatar_url || '',
        // Expose digital signature so downstream systems (e.g. policy PDFs) can render signatures.
        digital_signature:
          signaturesById.get(String(user.id)) ??
          (user.digital_signature ? String(user.digital_signature) : null),
        is_active: user.is_active === 1,
        created_at: user.created_at,
        updated_at: user.updated_at,
        hr_accountability_receiver: Boolean(user.hr_accountability_receiver),
        manager_approver_1: Boolean(user.manager_approver_1),
        manager_approver_2: Boolean(user.manager_approver_2),
        manager_approver_3: Boolean(user.manager_approver_3),
        lockout_until: lockoutData.lockout_until,
        failed_login_attempts: lockoutData.failed_login_attempts,
      };
    });

    const departmentId = (req as any).query?.departmentId;
    const companyId = (req as any).query?.companyId;
    let filtered = users;
    if (departmentId) {
      filtered = filtered.filter((u: any) => u.department_id === departmentId);
    }
    if (companyId) {
      filtered = filtered.filter((u: any) => u.company_id === companyId);
    }

    return res.json({ users: filtered });
  } catch (error: any) {
    logger.error('Get users failed:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

export async function createUserHandler(req: AuthRequest, res: Response) {
  const {
    email,
    first_name,
    last_name,
    employee_number,
    role_id,
    department_id,
    is_active,
  } = req.body;
  const userId = req.user!.userID;

  if (!email || !first_name || !last_name) {
    return res
      .status(400)
      .json({ error: 'Email, first name, and last name are required' });
  }

  try {
    const [rows] = (await pool.execute(
      'CALL sp_create_user(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        email,
        first_name,
        last_name,
        department_id || null,
        null, // company
        null, // position
        employee_number || null,
        is_active ? 1 : 0,
        userId,
      ]
    )) as any[];

    const newUserId = rows[0][0].id;

    await createAuditLog({
      userId,
      action: 'create_user',
      resourceType: 'user',
      resourceId: String(newUserId),
      resourceName: `${first_name} ${last_name} (${email})`,
      details: `Created user with email: ${email}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.status(201).json({
      message: 'User created successfully',
      user: {
        userID: newUserId,
        email,
        first_name,
        last_name,
        employee_number,
        role_id: role_id || null,
        department_id,
        is_active: !!is_active,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  } catch (error: any) {
    logger.error('Create user failed:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    return res.status(500).json({ error: 'Failed to create user' });
  }
}

export async function updateUserHandler(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const {
    email,
    first_name,
    last_name,
    employee_number,
    role_id,
    department_id,
    company_id,
    is_active,
    hr_accountability_receiver,
    manager_approver_1,
    manager_approver_2,
    manager_approver_3,
  } = req.body;
  const userId = req.user!.userID;

  if (!email || !first_name || !last_name) {
    return res
      .status(400)
      .json({ error: 'Email, first name, and last name are required' });
  }

  try {
    const [rows] = (await pool.execute(
      'CALL sp_update_user(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        email,
        first_name,
        last_name,
        null, // username
        null, // contact_number
        null, // position
        department_id || null,
        company_id || null,
        role_id || null,
        employee_number || null,
        is_active ? 1 : 0,
        userId,
      ]
    )) as any[];

    if (rows[0][0].affected_rows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Upsert per-user approver settings when provided (legacy access_* columns written as 0)
    const hasCustodianPayload =
      hr_accountability_receiver !== undefined ||
      manager_approver_1 !== undefined ||
      manager_approver_2 !== undefined ||
      manager_approver_3 !== undefined;
    if (hasCustodianPayload) {
      await pool.execute(
        'CALL sp_upsert_user_custodian_settings(?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          0,
          0,
          0,
          hr_accountability_receiver ? 1 : 0,
          manager_approver_1 ? 1 : 0,
          manager_approver_2 ? 1 : 0,
          manager_approver_3 ? 1 : 0,
        ]
      );
    }

    await createAuditLog({
      userId,
      action: 'update_user',
      resourceType: 'user',
      resourceId: String(id),
      resourceName: `${first_name} ${last_name} (${email})`,
      details: `Updated user with email: ${email}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({
      message: 'User updated successfully',
      user: {
        userID: id,
        email,
        first_name,
        last_name,
        employee_number,
        role_id: role_id || null,
        department_id,
        company_id,
        is_active: !!is_active,
        updated_at: new Date(),
      },
    });
  } catch (error: any) {
    logger.error('Update user failed:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    return res.status(500).json({ error: 'Failed to update user' });
  }
}

export async function deleteUserHandler(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user!.userID;

  try {
    const [rows] = (await pool.execute('CALL sp_delete_user(?)', [
      id,
    ])) as any[];

    if (rows[0][0].affected_rows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await createAuditLog({
      userId,
      action: 'delete_user',
      resourceType: 'user',
      resourceId: String(id),
      details: `Deleted user with ID: ${id}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    logger.error('Delete user failed:', error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
}

export async function removeUserLockoutHandler(
  req: AuthRequest,
  res: Response
) {
  const { id } = req.params;
  const userId = req.user!.userID;

  try {
    const [rows] = (await pool.execute(
      'UPDATE users SET failed_login_attempts = 0, lockout_until = NULL, lockout_count = 0 WHERE userID = ?',
      [id]
    )) as any[];

    if (rows.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`[USER] Lockout removed for user ${id} by ${userId}`);

    await createAuditLog({
      userId,
      action: 'remove_user_lockout',
      resourceType: 'user',
      resourceId: String(id),
      details: `Removed lockout for user with ID: ${id}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({ message: 'User lockout removed successfully' });
  } catch (error: any) {
    logger.error('Remove user lockout failed:', error);
    return res.status(500).json({ error: 'Failed to remove user lockout' });
  }
}

export async function changeUserPasswordHandler(
  req: AuthRequest,
  res: Response
) {
  const { id } = req.params;
  const { newPassword } = req.body;
  const userId = req.user!.userID;

  if (!newPassword) {
    return res.status(400).json({ error: 'New password is required' });
  }

  // Validate password against policy
  const validation = await validatePassword(newPassword);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    // Check if user exists
    const [userRows] = (await pool.execute(
      'SELECT email FROM users WHERE userID = ?',
      [id]
    )) as any[];
    const user = userRows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash and update password, set must_change_password flag so user is forced to change it on next login
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_COST);
    await pool.execute(
      'UPDATE users SET password = ?, password_last_changed = NOW(), must_change_password = 1 WHERE userID = ?',
      [hashedPassword, id]
    );

    logger.info(`[USER] Password changed for user ${id} by ${userId} (user will be forced to change on next login)`);

    await createAuditLog({
      userId,
      action: 'change_user_password',
      resourceType: 'user',
      resourceId: String(id),
      details: `Changed password for user with ID: ${id}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.json({
      message: 'User password changed successfully. User will be required to change password on next login.',
    });
  } catch (error: any) {
    logger.error('Change user password failed:', error);
    return res.status(500).json({ error: 'Failed to change user password' });
  }
}
