import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type { Request } from 'express';
import { BCRYPT_COST } from './passwordPolicy.js';
import { pool } from '../db.js';
import { sendEmail } from '../email.js';
import { buildEmailHtml } from '../email-templates.js';
import logger from '../logger.js';
import { generateTokens } from './tokens.js';
import { config } from '../config/validation.js';
import { SettingModel } from '../models/setting.model.js';
// SMS OTP replaced by email OTP — kept for reference
// import { checkSmsVerification, sendSmsVerification } from './sms.js';
import { buildPhoneLookupVariants, normalizePhoneToE164PH } from '../utils/phone.js';
import { redactEmail, redactPhone } from '../utils/redact.js';

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

export interface PasswordExpirationResult {
  expired: boolean;
  expiringSoon: boolean;
  daysRemaining?: number;
  error?: string;
}

export async function checkPasswordExpiration(
  passwordLastChanged: Date | string | null
): Promise<PasswordExpirationResult> {
  const expirationDays = (await SettingModel.getValue('password_expiration_days')) ?? 90;

  // If expiration is set to 0, passwords never expire
  if (expirationDays === 0) {
    return { expired: false, expiringSoon: false };
  }

  // If no password_last_changed date, consider it expired
  if (!passwordLastChanged) {
    return { expired: true, expiringSoon: false };
  }

  const lastChanged = new Date(passwordLastChanged);
  const now = new Date();
  const daysSinceChange = Math.floor(
    (now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysRemaining = expirationDays - daysSinceChange;

  // Password is expired
  if (daysRemaining <= 0) {
    return { expired: true, expiringSoon: false, daysRemaining: 0 };
  }

  // Password is expiring soon (within 7 days)
  if (daysRemaining <= 7) {
    return { expired: false, expiringSoon: true, daysRemaining };
  }

  return { expired: false, expiringSoon: false, daysRemaining };
}

export async function validatePassword(
  password: string
): Promise<PasswordValidationResult> {
  // Get password policy settings
  const minLength = (await SettingModel.getValue('password_min_length')) ?? 8;
  const requireUppercase = (await SettingModel.getValue('password_require_uppercase')) ?? true;
  const requireLowercase = (await SettingModel.getValue('password_require_lowercase')) ?? true;
  const requireNumbers = (await SettingModel.getValue('password_require_numbers')) ?? true;
  const requireSpecial = (await SettingModel.getValue('password_require_special')) ?? false;

  // Check minimum length
  if (password.length < minLength) {
    return {
      valid: false,
      error: `Password must be at least ${minLength} characters long`,
    };
  }

  // Check uppercase
  if (requireUppercase && !/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one uppercase letter',
    };
  }

  // Check lowercase
  if (requireLowercase && !/[a-z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one lowercase letter',
    };
  }

  // Check numbers
  if (requireNumbers && !/\d/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one number',
    };
  }

  // Check special characters
  if (requireSpecial && !/[!@#$%^&*]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one special character (!@#$%^&*)',
    };
  }

  return { valid: true };
}

export async function forgotPassword(
  // channel: 'email' | 'sms',
  channel: 'email',
  identifier: { email?: string; contactNumber?: string }
) {
  if (channel === 'email') {
    const email = identifier.email || '';
    logger.info(`[FORGOT] Request for email: ${redactEmail(email)}`);

    const [userRows] = (await pool.execute('CALL sp_get_user_by_email(?)', [
      email,
    ])) as any[];
    const userResult = Array.isArray(userRows[0]) ? userRows[0] : userRows;
    const user = userResult[0] ? { userID: userResult[0].userID } : null;
    if (!user) {
      logger.info(`[FORGOT] No user found (silent)`);
      return { message: 'If account exists, OTP sent' };
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    await pool.execute('CALL sp_delete_password_reset_tokens_by_user(?)', [
      user.userID,
    ]);
    await pool.execute('CALL sp_insert_password_reset_token(?, ?)', [
      otp,
      user.userID,
    ]);

    const link = `${config.FRONTEND_URL}/verify-reset-otp`;
    await sendEmail(
      email,
      'Reset your password – Asset Management',
      buildEmailHtml({
        title: 'Reset your password',
        body: `
          <p style="margin: 0 0 16px 0;">We received a request to reset the password for your account. Use the code below to proceed.</p>
          <div style="background: #f4f6f9; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 20px; letter-spacing: 10px; font-size: 32px; font-weight: 700; color: #1a2933;">${otp}</div>
          <p style="margin: 0; font-size: 13px; color: #8899a8;">This code expires in <strong>10 minutes</strong>.</p>
        `,
        footerNote: 'If you didn\'t request a password reset, you can safely ignore this email.',
        link,
        linkText: 'Reset password',
      }),
      link
    );

    logger.info(`[FORGOT] Reset OTP sent to: ${redactEmail(email)}`);
    return { message: 'If account exists, OTP sent' };
  }

  // Fallback — should never reach here since channel is always 'email'
  return { message: 'If account exists, OTP sent' };

  // SMS OTP replaced by email OTP — kept for reference
  // let normalizedPhone = normalizePhoneToE164PH(identifier.contactNumber || '');
  // if (!normalizedPhone && identifier.email) {
  //   const [userRows] = (await pool.execute('CALL sp_get_user_by_email(?)', [
  //     identifier.email,
  //   ])) as any[];
  //   const userResult = Array.isArray(userRows[0]) ? userRows[0] : userRows;
  //   const user = userResult[0];
  //   const contactFromEmail = user?.contact_number || user?.contactNumber || '';
  //   normalizedPhone = normalizePhoneToE164PH(contactFromEmail);
  // }

  // if (!normalizedPhone) {
  //   return { message: 'If account exists, OTP sent' };
  // }

  // const phoneVariants = buildPhoneLookupVariants(normalizedPhone);
  // const placeholders = phoneVariants.map(() => '?').join(', ');

  // const [rows] = (await pool.execute(
  //   `SELECT userID FROM users WHERE contact_number IN (${placeholders}) LIMIT 1`,
  //   phoneVariants
  // )) as any[];
  // const user = (rows as any[])[0];

  // if (!user) {
  //   logger.info('[FORGOT] No user found for contact number (silent)');
  //   return { message: 'If account exists, OTP sent' };
  // }

  // const sendResult = await sendSmsVerification(normalizedPhone);
  // if ('error' in sendResult) {
  //   logger.warn('[FORGOT] SMS failed, returning error');
  //   return { error: sendResult.error };
  // }

  // logger.info(
  //   `[FORGOT] Reset OTP sent via SMS to: ${redactPhone(normalizedPhone)}`
  // );
  // return { message: 'If account exists, OTP sent', contactNumber: normalizedPhone, effectiveChannel: 'sms' };
}

export async function verifyPasswordResetOTP(otp: string) {
  logger.info(`[RESET-OTP] Verify attempt: ${otp}`);

  const [rowsResult] = (await pool.execute(
    'CALL sp_get_password_reset_token(?)',
    [otp]
  )) as any[];
  const rows = Array.isArray(rowsResult[0]) ? rowsResult[0] : rowsResult;
  const prt = rows[0];
  if (!prt) {
    logger.warn(`[RESET-OTP] Failed: Invalid or expired OTP`);
    return { error: 'Invalid or expired OTP' };
  }

  const [userRows] = (await pool.execute('CALL sp_get_user_by_id(?)', [
    prt.userID,
  ])) as any[];
  const userResult = Array.isArray(userRows[0]) ? userRows[0] : userRows;
  const user = Array.isArray(userResult) ? userResult[0] : userResult;
  if (!user) {
    logger.error(`[RESET-OTP] User not found: ${prt.userID}`);
    return { error: 'User not found' };
  }

  // Extend the token expiry for password reset
  await pool.execute('CALL sp_extend_password_reset_token(?)', [otp]);

  logger.info(
    `[RESET-OTP] Success: OTP verified for user ${user.userID}, token expiry extended`
  );
  return { success: true, userId: user.userID, email: user.email };
}

// SMS OTP replaced by email OTP — kept for reference
// export async function verifyPasswordResetOTPSms(
//   contactNumber: string,
//   otp: string,
//   email?: string
// ) {
//   let normalizedPhone = normalizePhoneToE164PH(contactNumber);
//   if (!normalizedPhone && email) {
//     const [userRows] = (await pool.execute('CALL sp_get_user_by_email(?)', [
//       email,
//     ])) as any[];
//     const userResult = Array.isArray(userRows[0]) ? userRows[0] : userRows;
//     const user = userResult[0];
//     const contactFromEmail = user?.contact_number || user?.contactNumber || '';
//     normalizedPhone = normalizePhoneToE164PH(contactFromEmail);
//   }

//   if (!normalizedPhone) {
//     return { error: 'Invalid contact number format' };
//   }

//   const phoneVariants = buildPhoneLookupVariants(normalizedPhone);
//   const placeholders = phoneVariants.map(() => '?').join(', ');

//   const verificationResult = await checkSmsVerification(normalizedPhone, otp);
//   if ('error' in verificationResult) {
//     return { error: verificationResult.error };
//   }

//   const [rows] = (await pool.execute(
//     `SELECT userID, email FROM users WHERE contact_number IN (${placeholders}) LIMIT 1`,
//     phoneVariants
//   )) as any[];
//   const user = (rows as any[])[0];
//   if (!user) {
//     return { error: 'User not found' };
//   }

//   const resetToken = crypto.randomInt(100000, 1000000).toString();
//   await pool.execute('CALL sp_delete_password_reset_tokens_by_user(?)', [
//     user.userID,
//   ]);
//   await pool.execute('CALL sp_insert_password_reset_token(?, ?)', [
//     resetToken,
//     user.userID,
//   ]);

//   return { success: true, userId: user.userID, email: user.email };
// }

export async function resetPassword(
  userId: string,
  newPassword: string,
  req: Request
) {
  logger.info(`[RESET] Attempt for user: ${userId}...`);

  // Check if user has a valid reset token (by userID - need raw query as no SP for this)
  const [rows] = (await pool.execute(
    'SELECT * FROM password_reset_tokens WHERE userID = ? AND expires > NOW()',
    [userId]
  )) as any[];
  const prt = rows[0];

  if (!prt) {
    logger.warn(`[RESET] Failed: Invalid or expired token/OTP`);
    return { error: 'Invalid or expired token' };
  }

  // Validate password against policy
  const validation = await validatePassword(newPassword);
  if (!validation.valid) {
    logger.warn(`[RESET] Failed: ${validation.error}`);
    return { error: validation.error };
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_COST);
  await pool.execute(
    'UPDATE users SET password = ?, password_last_changed = NOW() WHERE userID = ?',
    [hashedPassword, prt.userID]
  );
  await pool.execute('CALL sp_delete_password_reset_tokens_by_user(?)', [
    userId,
  ]);

  const [userRows] = (await pool.execute('CALL sp_get_user_by_id(?)', [
    prt.userID,
  ])) as any[];
  const userResult = Array.isArray(userRows[0]) ? userRows[0] : userRows;
  const user = Array.isArray(userResult) ? userResult[0] : userResult;
  if (!user) {
    logger.error(`[RESET] User not found: ${prt.userID}`);
    return { error: 'User not found' };
  }

  const tokens = await generateTokens(user.userID, user.email, req);
  logger.info(`[RESET] Success: Password reset for user ${user.userID}`);
  return tokens;
}
