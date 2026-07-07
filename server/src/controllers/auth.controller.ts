import type { Response, Request } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { config } from '../config/validation.js';
import { cookieOptions, accessTokenCookieOptions, clearCookieOptions } from '../cookieConfig.js';
import {
  login,
  register,
  forgotPassword,
  verifyPasswordResetOTP,
  // verifyPasswordResetOTPSms,
  resetPassword,
  verifyRefreshToken,
  revokeRefreshToken,
  generateTokens,
  refreshSessionTokens,
  logout,
  updateActivity,
  generateTOTPSecret,
  verifyTOTPSetup,
  verifyTOTP,
  disableMFA,
  regenerateBackupCodes,
  verifyOTP,
  sendVerificationOTP,
} from '../auth/index.js';
// SMS OTP replaced by email OTP — kept for reference
// import { checkSmsVerification, sendSmsVerification } from '../auth/sms.js';
import type { AuthRequest } from '../middleware/authenticate.js';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '../auth/passwordPolicy.js';
import logger from '../logger.js';
import { uploadToCloudinary, uploadInitialsToCloudinary } from '../utils/cloudinary.js';
import { createAuditLog } from '../utils/audit.js';
import { SettingModel } from '../models/setting.model.js';
import { buildPhoneLookupVariants, normalizePhoneToE164PH } from '../utils/phone.js';
import {
  ASSET_ACCESS_COOKIE_NAME,
  ASSET_REFRESH_COOKIE_NAME,
} from '../auth/cookieNames.js';

export async function registerHandler(req: AuthRequest, res: Response) {
  const {
    email,
    password,
    firstName,
    lastName,
    username,
    contactNumber,
    company_id,
    department_id,
    employeeNumber,
    position,
    otpChannel = 'email',
  } = req.body as any;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({
      error: 'Email, password, first name, and last name are required',
    });
  }

  // SECURITY (M1): caller-supplied role_id is intentionally ignored.
  // Self-registered users always receive the default "User" role at the DB layer.
  const result = await register(email, password, {
    firstName,
    lastName,
    username,
    contactNumber,
    company_id,
    department_id,
    employeeNumber,
    position,
  });

  if ('error' in result) {
    return res.status(400).json({ error: result.error });
  }

  // SMS OTP replaced by email OTP — kept for reference
  // if (otpChannel === 'sms') {
  //   const normalizedPhone = normalizePhoneToE164PH(contactNumber);
  //   if (!normalizedPhone) {
  //     return res
  //       .status(400)
  //       .json({ error: 'Invalid contact number for SMS OTP' });
  //   }

  //   const smsResult = await sendSmsVerification(normalizedPhone);
  //   if ('error' in smsResult) {
  //     return res.status(400).json({ error: smsResult.error });
  //   }
  // } else {
  //   await sendVerificationOTP(result.userId, email);
  // }
  await sendVerificationOTP(result.userId, email);

  // Create audit log for user registration
  try {
    await createAuditLog({
      userId: result.userId,
      action: 'User Registration',
      resourceType: 'user',
      resourceName: `${firstName} ${lastName}`,
      details: `New user account created and pending ${otpChannel} verification`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      companyId: company_id || null,
    });
  } catch (auditError) {
    logger.warn('Failed to create registration audit log:', auditError);
  }

  return res.status(201).json({
    message: result.message,
    userId: result.userId,
  });
}

export async function verifyOTPHandler(req: AuthRequest, res: Response) {
  const { channel = 'email', otp, contactNumber } = req.body as any;
  if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
    return res.status(400).json({ error: 'Invalid OTP format' });
  }

  // SMS OTP replaced by email OTP — kept for reference
  // if (channel === 'sms') {
  //   const normalizedPhone = normalizePhoneToE164PH(contactNumber || '');
  //   if (!normalizedPhone) {
  //     return res.status(400).json({ error: 'Invalid contact number format' });
  //   }

  //   const phoneVariants = buildPhoneLookupVariants(normalizedPhone);
  //   const placeholders = phoneVariants.map(() => '?').join(', ');

  //   const verificationResult = await checkSmsVerification(normalizedPhone, otp);
  //   if ('error' in verificationResult) {
  //     return res.status(400).json({ error: verificationResult.error });
  //   }

  //   await pool.execute(
  //     `UPDATE users SET verified = TRUE WHERE contact_number IN (${placeholders}) AND verified = FALSE`,
  //     phoneVariants
  //   );

  //   return res.json({ message: 'SMS verified successfully. You can now log in.' });
  // }

  const result = await verifyOTP(otp);
  if ('error' in result) {
    return res.status(400).json({ error: result.error });
  }

  return res.json({
    message:
      result.message || 'Email verified successfully. You can now log in.',
  });
}

// RESEND OTP
export async function resendOTPHandler(req: AuthRequest, res: Response) {
  const { channel = 'email', email, contactNumber } = req.body as any;

  // SMS OTP replaced by email OTP — kept for reference
  // if (channel === 'sms') {
  //   const normalizedPhone = normalizePhoneToE164PH(contactNumber || '');
  //   if (!normalizedPhone) {
  //     return res.status(400).json({ error: 'Invalid contact number format' });
  //   }

  //   const phoneVariants = buildPhoneLookupVariants(normalizedPhone);
  //   const placeholders = phoneVariants.map(() => '?').join(', ');

  //   try {
  //     const [rows] = (await pool.execute(
  //       `SELECT userID FROM users WHERE contact_number IN (${placeholders}) AND verified = FALSE LIMIT 1`,
  //       phoneVariants
  //     )) as any[];

  //     const user = (rows as any[])[0];
  //     if (!user) {
  //       return res
  //         .status(400)
  //         .json({ error: 'No pending verification for this contact number' });
  //     }

  //     const smsResult = await sendSmsVerification(normalizedPhone);
  //     if ('error' in smsResult) {
  //       return res.status(400).json({ error: smsResult.error });
  //     }

  //     return res.json({ message: 'New OTP sent' });
  //   } catch (err: any) {
  //     logger.error('Resend SMS OTP failed:', err);
  //     return res.status(500).json({ error: 'Failed to resend OTP' });
  //   }
  // }

  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    await pool.execute(
      'CALL sp_get_unverified_user_by_email(?, @user_id, @exists)',
      [email]
    );
    const [rows] = (await pool.query(
      'SELECT @user_id AS user_id, @exists AS `exists`'
    )) as any[];
    const { user_id, exists } = rows[0];

    if (!exists) {
      return res
        .status(400)
        .json({ error: 'No pending verification for this email' });
    }

    await sendVerificationOTP(user_id, email);
    return res.json({ message: 'New OTP sent' });
  } catch (err: any) {
    logger.error('Resend OTP failed:', err);
    return res.status(500).json({ error: 'Failed to resend OTP' });
  }
}

// LOGIN
export const loginHandler = async (req: Request, res: Response) => {
  const { email, password } = req.body as any;
  const result = await login(email, password, req);

  if (!result || 'error' in result) {
    // Create audit log for failed login
    try {
      const [userRows] = (await pool.execute(
        'SELECT userID, company_id FROM users WHERE email = ?',
        [email]
      )) as any[];
      const userId = userRows[0]?.userID;
      const companyId = userRows[0]?.company_id || null;
      
      if (userId) {
        await createAuditLog({
          userId,
          action: 'auth.login.failure',
          resourceType: 'auth_session',
          resourceName: 'System',
          details: result?.error || 'Invalid credentials',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          status: 'failure',
          severity: 'warning',
          companyId,
        });
      }
    } catch (auditError) {
      logger.warn('Failed to create failed login audit log:', auditError);
    }
    
    return res
      .status(401)
      .json({ error: result?.error || 'Invalid credentials' });
  }

  // Check if password change is required (admin-forced)
  if ('mustChangePassword' in result && result.mustChangePassword) {
    return res.json({
      mustChangePassword: true,
      tempToken: result.tempToken,
      mfaEnabled: result.mfaEnabled,
      message: result.message,
    });
  }

  // Check if password is expired
  if ('passwordExpired' in result && result.passwordExpired) {
    return res.json({
      passwordExpired: true,
      tempToken: result.tempToken,
      mfaEnabled: result.mfaEnabled,
      message: result.message,
    });
  }

  // Check if MFA is required
  if ('mfaRequired' in result && result.mfaRequired) {
    return res.json({
      mfaRequired: true,
      tempToken: result.tempToken,
      message: result.message,
    });
  }

  // At this point, result has accessToken and refreshToken
  const tokenResult = result as { accessToken: string; refreshToken: string };

  // Get user ID for audit logging
  const [userRows] = (await pool.execute(
    'SELECT userID FROM users WHERE email = ?',
    [email]
  )) as any[];
  const userId = userRows[0]?.userID;

  // Create audit log for successful login
  if (userId) {
    try {
      const [userRows] = (await pool.execute(
        'SELECT company_id FROM users WHERE userID = ?',
        [userId]
      )) as any[];
      const companyId = userRows[0]?.company_id || null;

      await createAuditLog({
        userId,
        action: 'auth.login.success',
        resourceType: 'auth_session',
        resourceName: 'System',
        details: 'Successful login from web application',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        companyId,
        status: 'success',
      });
    } catch (auditError) {
      logger.warn('Failed to create login audit log:', auditError);
    }
  }

  res.cookie(
    ASSET_ACCESS_COOKIE_NAME,
    tokenResult.accessToken,
    accessTokenCookieOptions
  );
  res.cookie(
    ASSET_REFRESH_COOKIE_NAME,
    tokenResult.refreshToken,
    cookieOptions
  );

  res.json({
    message: 'Login successful',
    authenticated: true,
  });
};
// FORGOT & RESET PASSWORD
export async function forgotPasswordHandler(req: AuthRequest, res: Response) {
  // const { channel = 'email', email, contactNumber } = req.body as any;
  const { email, contactNumber } = req.body as any;

  // All OTP now uses email — SMS channel disabled
  const result = await forgotPassword('email' as const, {
    email,
    contactNumber,
  });

  if ('error' in result) {
    return res.status(400).json({ error: result.error });
  }

  createAuditLog({
    action: 'Password Reset Requested',
    resourceType: 'auth',
    resourceName: email || contactNumber || 'unknown',
    details: `Password reset requested via email for ${email ? email : 'unknown'}`,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    status: 'success',
    severity: 'warning',
  }).catch((err) => logger.warn('Failed to create forgot password audit log:', err));

  res.json(result);
}

export async function verifyPasswordResetOTPHandler(
  req: AuthRequest,
  res: Response
) {
  // const { channel = 'email', otp, contactNumber, email } = req.body as any;
  const { otp, email } = req.body as any;
  if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
    return res.status(400).json({ error: 'Invalid OTP format' });
  }

  // All OTP now uses email — SMS channel disabled
  const result = await verifyPasswordResetOTP(otp);

  if ('error' in result) {
    return res.status(400).json({ error: result.error });
  }

  return res.json({
    success: true,
    userId: result.userId,
    message: 'OTP verified successfully',
  });
}

export async function resetPasswordHandler(req: AuthRequest, res: Response) {
  const { userId, password } = req.body as any;
  if (!userId || !password)
    return res.status(400).json({ error: 'User ID and password required' });

  const result = await resetPassword(userId, password, req);
  if ('error' in result) return res.status(400).json({ error: result.error });

  createAuditLog({
    userId,
    action: 'Password Reset',
    resourceType: 'auth',
    resourceId: userId,
    details: 'Password was reset via forgot-password flow',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    status: 'success',
    severity: 'warning',
  }).catch((err) => logger.warn('Failed to create password reset audit log:', err));

  return res.json({ message: 'Password reset successful' });
}

// REFRESH TOKEN
export async function refreshTokenHandler(req: AuthRequest, res: Response) {
  const refreshToken =
    req.signedCookies?.[ASSET_REFRESH_COOKIE_NAME] ||
    (req.body as any).refreshToken;
  if (!refreshToken)
    return res.status(400).json({ error: 'Refresh token required' });

  const payload = await verifyRefreshToken(refreshToken, req);
  if (!payload || !payload.sessionId)
    return res.status(401).json({ error: 'Session expired or invalid' });

  const { accessToken, refreshToken: newRefreshToken } =
    await refreshSessionTokens(
      payload.sessionId,
      payload.userId,
      payload.email,
      req
    );

  res.cookie(ASSET_ACCESS_COOKIE_NAME, accessToken, accessTokenCookieOptions);
  res.cookie(ASSET_REFRESH_COOKIE_NAME, newRefreshToken, cookieOptions);

  await revokeRefreshToken(refreshToken);

  res.json({
    message: 'Token refreshed',
  });
}

// LOGOUT
export async function logoutHandler(req: Request, res: Response) {
  const { isAutoLogout } = req.body as { isAutoLogout?: boolean };

  res.clearCookie(ASSET_ACCESS_COOKIE_NAME, clearCookieOptions);
  res.clearCookie(ASSET_REFRESH_COOKIE_NAME, clearCookieOptions);

  // Try to authenticate manually for audit logging
  let userId: string | null = null;
  let userEmail: string | null = null;

  try {
    const authHeader = req.headers.authorization ?? '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const { verifyAccessToken } = await import('../auth/index.js');
        const payload = verifyAccessToken(token);
        if (payload && payload.sessionId) {
          userId = payload.userID;
          userEmail = payload.email;

          // For auto-logout, don't check inactivity
          if (!isAutoLogout) {
            const { checkInactivity } = await import('../auth/index.js');
            const isInactive = await checkInactivity(userId);
            if (isInactive) {
              return res
                .status(401)
                .json({ error: 'Session expired due to inactivity' });
            }
          }
        }
      }
    }
  } catch (authError) {
    // Continue anyway for auto-logout
  }

  // Create audit log if we have user info
  if (userId) {
    try {
      const [userRows] = (await pool.execute(
        'SELECT company_id FROM users WHERE userID = ?',
        [userId]
      )) as any[];
      const companyId = userRows[0]?.company_id || null;

      await createAuditLog({
        userId,
        action: 'auth.logout',
        resourceType: 'auth_session',
        resourceName: 'System',
        details: isAutoLogout
          ? 'Automatic logout due to inactivity'
          : 'Manual logout from web application',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        companyId,
      });
    } catch (auditError) {
      logger.warn('Failed to create logout audit log:', auditError);
    }

    try {
      const { logout } = await import('../auth/index.js');
      await logout(userId);
      logger.info(`[LOGOUT] Success → User: ${userId} | Email: ${userEmail}`);
    } catch (err) {
      logger.warn(`[LOGOUT] Failed for user: ${userId}`, err);
    }
  }

  return res.json({ message: 'Logged out successfully' });
}

// GET ME
export async function getMeHandler(req: AuthRequest, res: Response) {
  const userId = req.user!.userID;

  try {
    const [results] = (await pool.execute('CALL sp_get_user_profile(?)', [
      userId,
    ])) as any[];
    const userRows = results[0] as any[];
    const addressRows = results[1] as any[];

    const dbUser = userRows[0];
    const addr = addressRows[0] || {};

    if (!dbUser) return res.status(404).json({ error: 'User not found' });

    const avatarUrl = dbUser.avatar_url?.trim() || null;

    // Explicitly query mfa_enabled from users table
    const [mfaRows] = (await pool.execute(
      'SELECT mfa_enabled FROM users WHERE userID = ?',
      [userId]
    )) as any[];
    const mfaEnabled = mfaRows[0]?.mfa_enabled === 1;

    // Query hr_accountability_receiver from user_custodian_settings as fallback
    const [custodianRows] = (await pool.execute(
      'SELECT hr_accountability_receiver FROM user_custodian_settings WHERE user_id = ?',
      [userId]
    )) as any[];
    const hrAccountabilityReceiver = custodianRows[0]?.hr_accountability_receiver === 1 ||
      dbUser.user_hr_accountability_receiver === 1 ||
      dbUser.role_hr_accountability_receiver === 1;

    return res.json({
      user: {
        id: dbUser.userID,
        email: dbUser.email,
        username: dbUser.username || null,
        firstName: dbUser.first_name || null,
        middleName: dbUser.middle_name || null,
        lastName: dbUser.last_name || null,
        contactNumber: dbUser.contact_number || null,
        role_id: dbUser.role_id || null,
        department_id: dbUser.department_id || null,
        company_id: dbUser.company_id || null,
        department: dbUser.department_name || null,
        company: dbUser.company_name || null,
        employeeId: dbUser.employee_number || null,
        position: dbUser.position || null,
        verified: !!dbUser.verified,
        mfaEnabled: mfaEnabled,
        createdAt: dbUser.created_at,
        avatarUrl,
        digitalSignature: dbUser.digital_signature || null,
        hr_accountability_receiver: hrAccountabilityReceiver,
        address: {
          unitNo: addr.unit_no || '',
          buildingNo: addr.buildingNo || '',
          street: addr.street || '',
          subdivision: addr.subdivision || '',
          barangay: addr.barangay || '',
          city: addr.city || '',
          province: addr.province || '',
          region: addr.region || '',
        },
      },
    });
  } catch (error: any) {
    logger.error('getMeHandler error', { error });
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

// CHANGE PASSWORD
export async function changePasswordHandler(req: AuthRequest, res: Response) {
  const user = req.user!;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'New passwords do not match' });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'New password must be different' });
  }

  // Validate against password policy
  const { validatePassword } = await import('../auth/password.js');
  const validation = await validatePassword(newPassword);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const [[{ password }]] = (await pool.query(
    'SELECT password FROM users WHERE userID = ?',
    [user.userID]
  )) as any[];

  if (!password || !(await bcrypt.compare(currentPassword, password))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_COST);
  // Update password, timestamp, and clear must_change_password flag
  await pool.execute(
    'UPDATE users SET password = ?, password_last_changed = NOW(), must_change_password = 0 WHERE userID = ?',
    [hashedPassword, user.userID]
  );
  const [result] = (await pool.execute('CALL sp_revoke_all_sessions(?)', [
    user.userID,
  ])) as any[];
  const revokedCount = result.affectedRows || 0;

  logger.info(
    `[CHANGE PASSWORD] SUCCESS → User ID: ${user.userID} | Revoked Sessions: ${revokedCount}`
  );

  createAuditLog({
    userId: user.userID,
    action: 'Password Changed',
    resourceType: 'auth',
    resourceId: user.userID,
    details: 'User changed their own password',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    status: 'success',
    severity: 'warning',
  }).catch((err) => logger.warn('Failed to create change password audit log:', err));

  return res.json({
    message: 'Password changed successfully. Logged out from all devices.',
    revokedSessions: revokedCount,
  });
}

// UPDATE PROFILE
export async function updateProfileHandler(req: AuthRequest, res: Response) {
  const userId = req.user!.userID;
  const {
    firstName,
    middleName,
    lastName,
    username,
    contactNumber,
    role_id,
    position,
    unitNo,
    buildingNo,
    street,
    subdivision,
    barangay,
    city,
    province,
    region,
    digitalSignature,
  } = req.body;

  try {
    await pool.execute('CALL sp_update_user_profile(?, ?, ?, ?, ?, ?, ?, ?)', [
      userId,
      firstName?.trim() || null,
      middleName?.trim() || null,
      lastName?.trim() || null,
      username?.trim() || null,
      contactNumber?.trim() || null,
      role_id?.trim() || null,
      position?.trim() || null,
    ]);

    if (digitalSignature !== undefined) {
      let signatureToStore: string | null = digitalSignature || null;
      logger.info('Processing digitalSignature', { hasSignature: !!digitalSignature, signatureLength: digitalSignature?.length });

      if (
        signatureToStore &&
        signatureToStore.startsWith('data:image')
      ) {
        const matches = signatureToStore.match(/^data:image\/\w+;base64,(.+)$/);
        if (matches && matches[1]) {
          const buffer = Buffer.from(matches[1], 'base64');
          signatureToStore = await uploadInitialsToCloudinary(buffer);
          logger.info('Uploaded to Cloudinary', { cloudinaryUrl: signatureToStore });
        }
      }

      // Check if initials are already in use by another active user
      if (signatureToStore) {
        try {
          const [rows] = (await pool.execute(
            `SELECT userID, username, first_name, last_name
             FROM users
             WHERE digital_signature = ?
             AND userID != ?
             LIMIT 1`,
            [signatureToStore, userId]
          )) as any[];

          if (rows && rows.length > 0) {
            const conflictingUser = rows[0];
            return res.status(409).json({
              error: 'These initials are already in use by another user please use a different one',
              conflictingUser: {
                username: conflictingUser.username,
                firstName: conflictingUser.first_name,
                lastName: conflictingUser.last_name,
              },
            });
          }
        } catch (checkError: any) {
          logger.error('Error checking initials availability', { 
            error: checkError, 
            message: checkError.message,
            code: checkError.code,
            sqlMessage: checkError.sqlMessage,
            stack: checkError.stack 
          });
          // If the check fails, log it but continue with the save to avoid blocking
        }
      }

      await pool.execute(
        'UPDATE users SET digital_signature = ? WHERE userID = ?',
        [signatureToStore, userId]
      );
      logger.info('Updated digital_signature in database', { userId, hasSignatureToStore: !!signatureToStore });
    }

    await pool.execute(
      'CALL sp_upsert_permanent_address(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        userId,
        unitNo || null,
        buildingNo || null,
        street || null,
        subdivision || null,
        barangay || null,
        city || null,
        province || null,
        region || null,
      ]
    );

    createAuditLog({
      userId,
      action: 'Profile Updated',
      resourceType: 'user',
      resourceId: userId,
      details: 'User updated their profile',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    }).catch((err) => logger.warn('Failed to create profile update audit log:', err));

    res.json({ message: 'Profile updated successfully' });
  } catch (error: any) {
    logger.error('Update profile error', { error, stack: error.stack });
    if (error.code === 'ER_DUP_ENTRY') {
      const field = error.sqlMessage.includes('username')
        ? 'Username'
        : 'Field';
      return res.status(400).json({ error: `${field} already taken` });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

// CHECK INITIALS AVAILABILITY
export async function checkInitialsAvailabilityHandler(
  req: AuthRequest,
  res: Response
) {
  const { digitalSignature } = req.body;
  const currentUserId = req.user!.userID;

  if (!digitalSignature) {
    return res.status(400).json({ error: 'Digital signature is required' });
  }

  try {
    // Check if any active user (excluding current user) has the same initials
    const [rows] = (await pool.execute(
      `SELECT userID, username, first_name, last_name, digital_signature
       FROM users
       WHERE digital_signature = ?
       AND userID != ?
       AND deleted_at IS NULL
       LIMIT 1`,
      [digitalSignature, currentUserId]
    )) as any[];

    if (rows && rows.length > 0) {
      const conflictingUser = rows[0];
      return res.status(409).json({
        error: 'These initials are already in use by another active account',
        conflictingUser: {
          username: conflictingUser.username,
          firstName: conflictingUser.first_name,
          lastName: conflictingUser.last_name,
        },
      });
    }

    res.json({ available: true });
  } catch (error: any) {
    logger.error('Check initials availability error', { error });
    res.status(500).json({ error: 'Failed to check initials availability' });
  }
}

// SEND OTP FOR INITIALS VERIFICATION (uses email instead of SMS)
export async function sendInitialsOtpHandler(req: AuthRequest, res: Response) {
  const userId = req.user!.userID;
  const email = req.user!.email;

  try {
    // SMS OTP replaced by email OTP — kept for reference
    // const [rows] = (await pool.execute(
    //   'SELECT contact_number FROM users WHERE userID = ?',
    //   [userId]
    // )) as any[];

    // if (!rows || rows.length === 0) {
    //   return res.status(404).json({ error: 'User not found' });
    // }

    // const contactNumber = rows[0].contact_number;
    // if (!contactNumber) {
    //   return res.status(400).json({ error: 'No contact number on file' });
    // }

    // const normalizedPhone = normalizePhoneToE164PH(contactNumber);
    // if (!normalizedPhone) {
    //   return res
    //     .status(400)
    //     .json({ error: 'Invalid contact number for SMS OTP' });
    // }

    // const smsResult = await sendSmsVerification(normalizedPhone);
    // if ('error' in smsResult) {
    //   return res.status(400).json({ error: smsResult.error });
    // }

    await sendVerificationOTP(userId, email);

    res.json({ message: 'OTP sent successfully' });
  } catch (error: any) {
    logger.error('Send initials OTP error', { error });
    res.status(500).json({ error: 'Failed to send OTP' });
  }
}

// VERIFY OTP FOR INITIALS VERIFICATION (uses email instead of SMS)
export async function verifyInitialsOtpHandler(req: AuthRequest, res: Response) {
  const { otp } = req.body;

  if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
    return res.status(400).json({ error: 'Invalid OTP format' });
  }

  try {
    // SMS OTP replaced by email OTP — kept for reference
    // const [rows] = (await pool.execute(
    //   'SELECT contact_number FROM users WHERE userID = ?',
    //   [userId]
    // )) as any[];

    // if (!rows || rows.length === 0) {
    //   return res.status(404).json({ error: 'User not found' });
    // }

    // const contactNumber = rows[0].contact_number;
    // if (!contactNumber) {
    //   return res.status(400).json({ error: 'No contact number on file' });
    // }

    // const normalizedPhone = normalizePhoneToE164PH(contactNumber);
    // if (!normalizedPhone) {
    //   return res
    //     .status(400)
    //     .json({ error: 'Invalid contact number format' });
    // }

    // const verificationResult = await checkSmsVerification(normalizedPhone, otp);
    // if ('error' in verificationResult) {
    //   return res.status(400).json({ error: verificationResult.error });
    // }

    const result = await verifyOTP(otp);
    if ('error' in result) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: 'OTP verified successfully' });
  } catch (error: any) {
    logger.error('Verify initials OTP error', { error });
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
}

// UPLOAD AVATAR
export async function uploadAvatarHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const url = await uploadToCloudinary(req.file.buffer);
    await pool.execute('CALL sp_update_avatar_url(?, ?)', [
      req.user!.userID,
      url,
    ]);

    logger.info(
      `[AVATAR UPLOAD] Success → User ${req.user!.userID} | URL: ${url}`
    );

    createAuditLog({
      userId: req.user!.userID,
      action: 'Avatar Updated',
      resourceType: 'user',
      resourceId: req.user!.userID,
      details: 'User uploaded a new avatar',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    }).catch((err) => logger.warn('Failed to create avatar upload audit log:', err));

    return res.json({ url });
  } catch (err: any) {
    logger.error('Avatar upload failed', { err });
    return res
      .status(500)
      .json({ error: 'Upload failed', details: err.message });
  }
}

// MFA CONTROLLERS

export async function setupMFAHandler(req: AuthRequest, res: Response) {
  const userId = req.user!.userID;
  const email = req.user!.email;

  try {
    const result = await generateTOTPSecret(userId, email);
    res.json(result);
  } catch (err: any) {
    logger.error('MFA setup failed', { err, userId });
    res.status(500).json({ error: 'Failed to setup MFA' });
  }
}

export async function verifyMFASetupHandler(req: AuthRequest, res: Response) {
  const userId = req.user!.userID;
  const { token } = req.body;

  if (!token || token.length !== 6 || !/^\d+$/.test(token)) {
    return res.status(400).json({ error: 'Invalid TOTP format' });
  }

  const result = await verifyTOTPSetup(userId, token);
  if ('error' in result) {
    return res.status(400).json(result);
  }

  // Create audit log
  try {
    await createAuditLog({
      userId,
      action: 'MFA Enabled',
      resourceType: 'auth',
      resourceName: 'System',
      details: 'Two-factor authentication enabled',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } catch (auditError) {
    logger.warn('Failed to create MFA enable audit log:', auditError);
  }

  res.json(result);
}

export async function verifyMFAHandler(req: Request, res: Response) {
  const { tempToken, totp } = req.body;

  if (!tempToken || !totp) {
    return res.status(400).json({ error: 'Token and TOTP required' });
  }

  // Verify temp token
  let decoded;
  try {
    decoded = jwt.verify(tempToken, config.JWT_SECRET) as {
      userId: string;
      email: string;
      type: string;
    };
    if (decoded.type !== 'mfa_temp') {
      throw new Error('Invalid token type');
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  // Verify TOTP
  const mfaResult = await verifyTOTP(decoded.userId, totp);
  if ('error' in mfaResult) {
    return res.status(401).json(mfaResult);
  }

  // Issue real tokens
  const tokens = await generateTokens(decoded.userId, decoded.email, req);

  // Create audit log
  try {
    await createAuditLog({
      userId: decoded.userId,
      action: 'auth.login.success',
      resourceType: 'auth_session',
      resourceName: 'System',
      details: `Successful login with ${mfaResult.method} verification`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } catch (auditError) {
    logger.warn('Failed to create MFA login audit log:', auditError);
  }

  res.cookie(
    ASSET_ACCESS_COOKIE_NAME,
    tokens.accessToken,
    accessTokenCookieOptions
  );
  res.cookie(ASSET_REFRESH_COOKIE_NAME, tokens.refreshToken, cookieOptions);

  res.json({
    message: 'Login successful',
    authenticated: true,
  });
}

export async function disableMFAHandler(req: AuthRequest, res: Response) {
  const userId = req.user!.userID;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  const result = await disableMFA(userId, password, req.user!.email);
  if ('error' in result) {
    return res.status(400).json(result);
  }

  // Create audit log
  try {
    await createAuditLog({
      userId,
      action: 'MFA Disabled',
      resourceType: 'auth',
      resourceName: 'System',
      details: 'Two-factor authentication disabled',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } catch (auditError) {
    logger.warn('Failed to create MFA disable audit log:', auditError);
  }

  res.json(result);
}

export async function regenerateBackupCodesHandler(
  req: AuthRequest,
  res: Response
) {
  const userId = req.user!.userID;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  const result = await regenerateBackupCodes(userId, password);
  if ('error' in result) {
    return res.status(400).json(result);
  }

  // Create audit log
  try {
    await createAuditLog({
      userId,
      action: 'MFA Backup Codes Regenerated',
      resourceType: 'auth',
      resourceName: 'System',
      details: 'New backup codes generated',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } catch (auditError) {
    logger.warn('Failed to create backup codes audit log:', auditError);
  }

  res.json(result);
}

// MFA Recovery OTP - Send email OTP for users who lost access to authenticator
export async function sendMFARecoveryOTPHandler(req: Request, res: Response) {
  const { tempToken } = req.body;

  if (!tempToken) {
    return res.status(400).json({ error: 'Session token required' });
  }

  // Verify temp token to get user info
  let decoded;
  try {
    const jwt = (await import('jsonwebtoken')).default;
    decoded = jwt.verify(tempToken, config.JWT_SECRET) as {
      userId: string;
      email: string;
      type: string;
    };
    if (decoded.type !== 'mfa_temp') {
      throw new Error('Invalid token type');
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const { userId, email } = decoded;

  try {
    const { sendMFARecoveryOTP } = await import('../auth/mfa.js');
    const result = await sendMFARecoveryOTP(userId, email);

    if ('error' in result) {
      return res.status(400).json(result);
    }

    res.json({ message: 'Recovery code sent to your email' });
  } catch (error: any) {
    logger.error('Send MFA recovery OTP failed:', error);
    return res.status(500).json({ error: 'Failed to send recovery code' });
  }
}

// MFA Recovery OTP - Verify email OTP and complete login
export async function verifyMFARecoveryOTPHandler(req: Request, res: Response) {
  const { tempToken, otp } = req.body;

  if (!tempToken || !otp) {
    return res.status(400).json({ error: 'Token and OTP required' });
  }

  // Verify temp token to get user info
  let decoded;
  try {
    const jwt = (await import('jsonwebtoken')).default;
    decoded = jwt.verify(tempToken, config.JWT_SECRET) as {
      userId: string;
      email: string;
      type: string;
    };
    if (decoded.type !== 'mfa_temp') {
      throw new Error('Invalid token type');
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const { userId, email } = decoded;

  try {
    const { verifyMFARecoveryOTP, generateTokens } = await import('../auth/index.js');
    const result = await verifyMFARecoveryOTP(userId, otp);

    if ('error' in result) {
      return res.status(400).json(result);
    }

    // Issue real tokens
    const tokens = await generateTokens(userId, email, req);

    // Create audit log
    try {
      await createAuditLog({
        userId,
        action: 'auth.login.success',
        resourceType: 'auth_session',
        resourceName: 'System',
        details: 'Successful login with email OTP recovery',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
    } catch (auditError) {
      logger.warn('Failed to create MFA recovery login audit log:', auditError);
    }

    res.cookie(
      ASSET_ACCESS_COOKIE_NAME,
      tokens.accessToken,
      accessTokenCookieOptions
    );
    res.cookie(ASSET_REFRESH_COOKIE_NAME, tokens.refreshToken, cookieOptions);

    res.json({
      message: 'Login successful',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error: any) {
    logger.error('Verify MFA recovery OTP failed:', error);
    return res.status(500).json({ error: 'Failed to verify recovery code' });
  }
}

// MFA Status - returns both user MFA status and global MFA setting
export async function getMFAStatusHandler(req: Request, res: Response) {
  try {
    // Get global MFA setting (public endpoint - no auth required)
    const globalMFAEnabled = await SettingModel.getValue('mfa_enabled');

    // Check if user is authenticated to get their MFA status
    let userMFAEnabled = false;
    let userId = null;

    // Try to get user from auth header if present
    const authHeader = req.headers.authorization ?? '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (!token) {
        // Return response without user info
        return res.json({
          globalMFAEnabled: globalMFAEnabled !== null ? globalMFAEnabled : true,
          userMFAEnabled: false,
          userId: null,
        });
      }
      try {
        const { verifyAccessToken } = await import('../auth/index.js');
        const payload = verifyAccessToken(token);
        if (payload && payload.userID) {
          const [userRows] = (await pool.execute(
            'SELECT mfa_enabled FROM users WHERE userID = ?',
            [payload.userID]
          )) as any[];
          if (userRows && userRows.length > 0) {
            userMFAEnabled = !!userRows[0].mfa_enabled;
            userId = payload.userID;
          }
        }
      } catch {
        // Token invalid, just skip user MFA check
      }
    }

    return res.json({
      globalMFAEnabled: globalMFAEnabled !== null ? globalMFAEnabled : true,
      userMFAEnabled,
      userId,
    });
  } catch (error: any) {
    logger.error('Get MFA status failed:', error);
    return res.status(500).json({ error: 'Failed to fetch MFA status' });
  }
}

// GET PASSWORD EXPIRATION STATUS - for dashboard warning dialog
export async function getPasswordStatusHandler(
  req: AuthRequest,
  res: Response
) {
  const userId = req.user!.userID;

  try {
    const [rows] = (await pool.execute(
      'SELECT password_last_changed FROM users WHERE userID = ?',
      [userId]
    )) as any[];

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { checkPasswordExpiration } = await import('../auth/password.js');
    const result = await checkPasswordExpiration(user.password_last_changed);

    return res.json({
      expired: result.expired,
      expiringSoon: result.expiringSoon,
      daysRemaining: result.daysRemaining ?? null,
    });
  } catch (error: any) {
    logger.error('Get password status failed:', error);
    return res.status(500).json({ error: 'Failed to fetch password status' });
  }
}

// FORCE CHANGE PASSWORD - Verify temp token and password-change token type
async function verifyPasswordChangeToken(
  tempToken: string
): Promise<{ userId: string; email: string } | null> {
  try {
    const decoded = jwt.verify(tempToken, config.JWT_SECRET) as {
      userId: string;
      email: string;
      type: string;
    };
    if (decoded.type !== 'password_change_temp') {
      return null;
    }
    return { userId: decoded.userId, email: decoded.email };
  } catch {
    return null;
  }
}

// Send email OTP for password change verification (used when MFA is not enabled)
export async function sendPasswordChangeOTPHandler(req: Request, res: Response) {
  const { tempToken } = req.body;

  if (!tempToken) {
    return res.status(400).json({ error: 'Session token required' });
  }

  const decoded = await verifyPasswordChangeToken(tempToken);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  try {
    const { sendMFARecoveryOTP } = await import('../auth/mfa.js');
    const result = await sendMFARecoveryOTP(decoded.userId, decoded.email);

    if ('error' in result) {
      return res.status(400).json(result);
    }

    return res.json({ message: 'Verification code sent to your email' });
  } catch (error: any) {
    logger.error('Send password change OTP failed:', error);
    return res.status(500).json({ error: 'Failed to send verification code' });
  }
}

// Force change password - requires 2FA verification (TOTP or email OTP)
export async function forceChangePasswordHandler(req: Request, res: Response) {
  const { tempToken, newPassword, confirmPassword, totp, emailOtp } = req.body;

  if (!tempToken || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (!totp && !emailOtp) {
    return res
      .status(400)
      .json({ error: 'Verification code (TOTP or email OTP) is required' });
  }

  const decoded = await verifyPasswordChangeToken(tempToken);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const { userId, email } = decoded;

  // Validate password against policy
  const { validatePassword } = await import('../auth/password.js');
  const validation = await validatePassword(newPassword);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  // Verify 2FA - either TOTP or email OTP
  try {
    if (totp) {
      const { verifyTOTP } = await import('../auth/mfa.js');
      const mfaResult = await verifyTOTP(userId, totp);
      if ('error' in mfaResult) {
        return res.status(401).json({ error: mfaResult.error });
      }
    } else if (emailOtp) {
      const { verifyMFARecoveryOTP } = await import('../auth/mfa.js');
      const otpResult = await verifyMFARecoveryOTP(userId, emailOtp);
      if ('error' in otpResult) {
        return res.status(401).json({ error: otpResult.error });
      }
    }
  } catch (error: any) {
    logger.error('2FA verification failed during force password change:', error);
    return res.status(500).json({ error: 'Verification failed' });
  }

  // Check password is not same as current
  const [[currentUser]] = (await pool.query(
    'SELECT password FROM users WHERE userID = ?',
    [userId]
  )) as any[];

  if (currentUser?.password && (await bcrypt.compare(newPassword, currentUser.password))) {
    return res
      .status(400)
      .json({ error: 'New password must be different from current password' });
  }

  try {
    // Hash and update password, clear must_change_password flag
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_COST);
    await pool.execute(
      'UPDATE users SET password = ?, password_last_changed = NOW(), must_change_password = 0 WHERE userID = ?',
      [hashedPassword, userId]
    );

    // Revoke all existing sessions for security
    await pool.execute('CALL sp_revoke_all_sessions(?)', [userId]);

    // Issue new tokens (login the user)
    const tokens = await generateTokens(userId, email, req);

    // Create audit log
    try {
      await createAuditLog({
        userId,
        action: 'Password Changed (Forced)',
        resourceType: 'auth',
        resourceName: 'System',
        details: totp
          ? 'Forced password change verified with TOTP'
          : 'Forced password change verified with email OTP',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
    } catch (auditError) {
      logger.warn('Failed to create force password change audit log:', auditError);
    }

    res.cookie(
      ASSET_ACCESS_COOKIE_NAME,
      tokens.accessToken,
      accessTokenCookieOptions
    );
    res.cookie(ASSET_REFRESH_COOKIE_NAME, tokens.refreshToken, cookieOptions);

    logger.info(`[FORCE CHANGE PASSWORD] SUCCESS → User ID: ${userId}`);

    return res.json({
      message: 'Password changed successfully',
      authenticated: true,
    });
  } catch (error: any) {
    logger.error('Force change password failed:', error);
    return res.status(500).json({ error: 'Failed to change password' });
  }
}
