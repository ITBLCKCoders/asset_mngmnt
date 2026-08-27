import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Request } from 'express';
import { BCRYPT_COST } from './passwordPolicy.js';
import { pool } from '../db.js';
import logger from '../logger.js';
import { generateTokens } from './tokens.js';
import { validatePassword, checkPasswordExpiration } from './password.js';
import { SettingModel } from '../models/setting.model.js';
import { NotificationService } from '../services/notification.service.js';
import { getIoInstance } from '../utils/socketManager.js';
import { emitNotification } from '../sockets/socketHandlers.js';
import { config } from '../config/validation.js';

async function getAdminAndSuperAdminUsers() {
  try {
    const [rows] = await pool.execute(
      `SELECT u.userID, u.email, u.username 
       FROM users u
       JOIN asset_mngmnt_roles r ON u.role_id = r.roleID
       WHERE r.name IN ('Admin', 'Global Admin')
       AND u.is_active = 1`
    );
    return rows as any[];
  } catch (error) {
    logger.error('Error fetching admin users:', error);
    return [];
  }
}

async function sendLockoutNotification(
  lockedUserId: string,
  lockedUsername: string,
  lockoutMinutes: number
) {
  try {
    const adminUsers = await getAdminAndSuperAdminUsers();
    const io = getIoInstance();
    
    logger.info(`[LOCKOUT NOTIFICATION] Found ${adminUsers.length} admin users to notify`);
    
    for (const admin of adminUsers) {
      logger.info(`[LOCKOUT NOTIFICATION] Creating notification for admin: ${admin.username} (${admin.userID})`);
      
      // Create notification in database
      const notification = await NotificationService.createNotification(
        {
          user_id: admin.userID,
          title: 'User Account Locked',
          message: `User ${lockedUsername} has been locked due to too many failed login attempts. Try again in ${lockoutMinutes} minutes.`,
          type: 'system',
          status: 'unread',
          data: JSON.stringify({
            userId: lockedUserId,
            username: lockedUsername,
            lockoutMinutes
          })
        },
        admin.userID // Using admin's userID as the creator for audit purposes
      );
      
      if (notification) {
        logger.info(`[LOCKOUT NOTIFICATION] Notification created in DB with ID: ${notification.notificationID}`);
      } else {
        logger.error(`[LOCKOUT NOTIFICATION] Failed to create notification in DB for admin: ${admin.userID}`);
      }

      // Emit notification via Socket.IO if available
      if (io) {
        emitNotification(io, admin.userID, 'notification', {
          title: 'User Account Locked',
          description: `User ${lockedUsername} has been locked due to too many failed login attempts. Try again in ${lockoutMinutes} minutes.`,
          type: 'system',
          userId: lockedUserId,
          username: lockedUsername,
          lockoutMinutes: lockoutMinutes,
          timestamp: new Date().toISOString(),
        });
        logger.info(`[LOCKOUT NOTIFICATION] Notification emitted via Socket.IO to user: ${admin.userID}`);
      } else {
        logger.warn('[LOCKOUT NOTIFICATION] Socket.IO instance not available');
      }
    }
    
    logger.info(`[LOCKOUT NOTIFICATION] Successfully sent to ${adminUsers.length} admin users for locked user: ${lockedUsername}`);
  } catch (error) {
    logger.error('Error sending lockout notification:', error);
  }
}

/**
 * Default role assigned to self-registered users. Must match the canonical
 * "User" row in `asset_mngmnt_roles`. Hard-coded to prevent privilege
 * escalation via caller-supplied role_id (see audit roadmap M1).
 */
const DEFAULT_USER_ROLE_ID = '5ef9ba35-0232-11f1-a629-b8cb29c59adf';

function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

export async function register(
  email: string,
  password: string,
  data: {
    firstName: string;
    lastName: string;
    username: string;
    contactNumber: string;
    company_id: string;
    department_id: string;
    employeeNumber?: string;
    position?: string;
  }
) {
  logger.info(`[REGISTER] Attempt → ${email}`);

  const [existing] = await pool.execute(
    'SELECT email, username, employee_number FROM users WHERE email = ? OR username = ? OR employee_number = ?',
    [email, data.username, data.employeeNumber || '']
  );

  const rows = existing as any[];
  if (rows.length > 0) {
    const conflicts: string[] = [];
    if (rows.some(r => r.email === email)) conflicts.push('Email');
    if (rows.some(r => r.username === data.username))
      conflicts.push('Username');
    if (
      data.employeeNumber &&
      rows.some(r => r.employee_number === data.employeeNumber)
    )
      conflicts.push('Employee Number');
    return { error: `${conflicts.join(', ')} already in use` };
  }

  // Validate password against policy
  const validation = await validatePassword(password);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);
  const userId = uuidv4();
  const name = `${data.firstName} ${data.lastName}`;

  await pool.execute(
    `INSERT INTO users (
      userID, email, password, name, first_name, last_name, username,
      contact_number, company_id, department_id, role_id, employee_number, position, password_last_changed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      userId,
      email,
      hashedPassword,
      name,
      data.firstName,
      data.lastName,
      data.username,
      data.contactNumber,
      data.company_id,
      data.department_id,
      DEFAULT_USER_ROLE_ID,
      data.employeeNumber || null,
      data.position || null,
    ]
  );

  logger.info(`[REGISTER] User created → ${userId}`);

  return {
    userId,
    message: 'Registration successful. Please verify your account using OTP.',
  };
}

export async function login(email: string, password: string, req: Request) {
  logger.info(`[LOGIN] Attempt for email: ${email}`);

  const [rowsResult] = (await pool.execute('CALL sp_get_user_by_email(?)', [
    email,
  ])) as any[];
  const rows = Array.isArray(rowsResult[0]) ? rowsResult[0] : rowsResult;
  const user = rows[0];
  if (!user) {
    logger.warn(`[LOGIN] Failed: User not found for ${email}`);
    return null;
  }

  // Check if account is inactive
  if (!user.is_active) {
    logger.warn(`[LOGIN] Failed: Account inactive for ${email}`);
    return { error: 'Account is inactive. Contact admin for concerns.' };
  }

  // Check if account is locked
  const clientIp = getClientIp(req);
  if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
    // IP-aware lockout: only the IP that triggered the lockout is blocked.
    // Legacy lockouts without a recorded IP (NULL) block everyone.
    const blocksThisRequest = !user.lockout_ip || user.lockout_ip === clientIp;
    if (blocksThisRequest) {
      const remainingTime = Math.ceil(
        (new Date(user.lockout_until).getTime() - Date.now()) / 60000
      );
      logger.warn(
        `[LOGIN] Failed: Account locked for ${email}, ${remainingTime} minutes remaining`
      );
      return {
        error: `Account is temporarily locked due to too many failed login attempts. Try again in ${remainingTime} minutes.`,
      };
    }
  }

  if (!(await bcrypt.compare(password, user.password))) {
    logger.warn(`[LOGIN] Failed: Invalid credentials for ${email}`);

    // Get configurable settings
    const maxAttempts = (await SettingModel.getValue('max_login_attempts')) ?? 5;
    const baseLockoutMinutes = (await SettingModel.getValue('lockout_duration_minutes')) ?? 30;
    const failedAttemptResetMinutes = (await SettingModel.getValue('failed_attempt_reset_minutes')) ?? 15;

    // Time-based reset: if the last failed attempt happened longer ago than
    // the reset window, restart the counter so stale attempts no longer lock
    // a legitimate user on their first real login. Setting of 0 disables reset.
    const resetWindowMs =
      failedAttemptResetMinutes > 0
        ? failedAttemptResetMinutes * 60 * 1000
        : Number.POSITIVE_INFINITY;
    const lastFailedAt = user.last_failed_attempt_at
      ? new Date(user.last_failed_attempt_at).getTime()
      : 0;
    let attemptsSoFar = user.failed_login_attempts || 0;
    if (Date.now() - lastFailedAt >= resetWindowMs) {
      attemptsSoFar = 0;
    }

    // Increment failed attempts
    const newAttempts = attemptsSoFar + 1;
    let lockoutUntil = null;

    if (newAttempts >= maxAttempts) {
      // Progressive lockout: base + (lockout_count * 10 minutes)
      const lockoutCount = (user.lockout_count || 0) + 1;
      const progressiveMinutes = baseLockoutMinutes + (lockoutCount * 10);
      lockoutUntil = new Date(Date.now() + progressiveMinutes * 60 * 1000);

      await pool.execute(
        'UPDATE users SET failed_login_attempts = ?, lockout_until = ?, lockout_count = ?, lockout_ip = ?, last_failed_attempt_at = NOW() WHERE email = ?',
        [newAttempts, lockoutUntil, lockoutCount, clientIp, email]
      );

      logger.warn(
        `[LOGIN] Account locked for ${email}, ${progressiveMinutes} minutes (lockout #${lockoutCount})`
      );

      // Send notification to Admin and Global Admin users
      await sendLockoutNotification(user.userID, user.username || email, progressiveMinutes);

      return {
        error: `Account locked due to too many failed attempts. Try again in ${progressiveMinutes} minutes.`,
      };
    }

    await pool.execute(
      'UPDATE users SET failed_login_attempts = ?, last_failed_attempt_at = NOW() WHERE email = ?',
      [newAttempts, email]
    );

    return null;
  }

  if (!user.verified) {
    logger.warn(`[LOGIN] Failed: Email not verified for ${email}`);
    return { error: 'Email not verified' };
  }

  // Successful login: reset failed attempts and lockout count
  await pool.execute(
    'UPDATE users SET failed_login_attempts = 0, lockout_until = NULL, lockout_count = 0, lockout_ip = NULL, last_failed_attempt_at = NULL WHERE email = ?',
    [email]
  );

  // Check if admin forced password change (must_change_password flag)
  if (user.must_change_password) {
    logger.warn(`[LOGIN] Must change password for user: ${user.userID} (admin-forced)`);
    return {
      mustChangePassword: true,
      tempToken: generatePasswordChangeToken(user.userID, user.email),
      mfaEnabled: !!user.mfa_enabled,
      message: 'You must change your password before continuing. Your administrator has reset your password.',
    };
  }

  // Check password expiration
  const expirationCheck = await checkPasswordExpiration(user.password_last_changed);
  if (expirationCheck.expired) {
    logger.warn(`[LOGIN] Password expired for user: ${user.userID}`);
    return {
      passwordExpired: true,
      tempToken: generatePasswordChangeToken(user.userID, user.email),
      mfaEnabled: !!user.mfa_enabled,
      message: 'Your password has expired. Please change your password to continue.',
    };
  }

  // If password is expiring soon, include warning in response
  if (expirationCheck.expiringSoon) {
    logger.info(`[LOGIN] Password expiring soon for user: ${user.userID}, ${expirationCheck.daysRemaining} days remaining`);
  }

  // Check if MFA is enabled
  if (user.mfa_enabled) {
    logger.info(`[LOGIN] MFA required for user: ${user.userID}`);
    return {
      mfaRequired: true,
      tempToken: generateTempMFAToken(user.userID, user.email),
      message: 'MFA verification required'
    };
  }

  const tokens = await generateTokens(user.userID, user.email, req);
  logger.info(`[LOGIN] Success: User ${user.userID} logged in`);

  // Include expiration warning in response if applicable
  if (expirationCheck.expiringSoon) {
    return {
      ...tokens,
      passwordExpiringSoon: true,
      daysRemaining: expirationCheck.daysRemaining,
    };
  }

  return tokens;
}

// Generate temporary token for MFA verification step (15 minute expiry)
function generateTempMFAToken(userId: string, email: string): string {
  const tempToken = jwt.sign(
    { userId, email, type: 'mfa_temp' },
    config.JWT_SECRET,
    { expiresIn: '15m' } as SignOptions
  );
  return tempToken;
}

// Generate temporary token for password change flow (10 minute expiry)
export function generatePasswordChangeToken(userId: string, email: string): string {
  const tempToken = jwt.sign(
    { userId, email, type: 'password_change_temp' },
    config.JWT_SECRET,
    { expiresIn: '10m' } as SignOptions
  );
  return tempToken;
}
