import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { pool } from '../db.js';
import logger from '../logger.js';

export interface MFASecretResult {
  secret: string;
  qrCode: string;
  manualEntryKey: string;
}

export interface MFAVerifyResult {
  success?: boolean;
  error?: string;
  method?: 'totp' | 'backup';
}

export interface MFASetupResult {
  success?: boolean;
  error?: string;
  backupCodes?: string[];
}

// Generate TOTP secret and QR code
export async function generateTOTPSecret(
  userId: string,
  email: string
): Promise<MFASecretResult> {
  const secret = speakeasy.generateSecret({
    name: `AssetManagement (${email})`,
    length: 32,
  });

  // Store unverified secret temporarily
  await pool.execute(
    'UPDATE users SET mfa_secret = ?, mfa_enabled = 0 WHERE userID = ?',
    [secret.base32, userId]
  );

  const otpauthUrl = speakeasy.otpauthURL({
    secret: secret.ascii,
    label: email,
    issuer: 'AssetManagement',
    encoding: 'ascii',
  });

  const qrCode = await QRCode.toDataURL(otpauthUrl);

  logger.info(`[MFA] Setup initiated for user: ${userId}`);

  return {
    secret: secret.base32,
    qrCode,
    manualEntryKey: secret.base32,
  };
}

// Verify TOTP token during setup
export async function verifyTOTPSetup(
  userId: string,
  token: string
): Promise<MFASetupResult> {
  const [rows] = await pool.execute(
    'SELECT mfa_secret FROM users WHERE userID = ?',
    [userId]
  );
  const user = (rows as any[])[0];

  if (!user?.mfa_secret) {
    return { error: 'MFA not set up' };
  }

  const verified = speakeasy.totp.verify({
    secret: user.mfa_secret,
    encoding: 'base32',
    token,
    window: 2, // Allow 1 minute time drift
  });

  if (!verified) {
    return { error: 'Invalid TOTP code' };
  }

  // Generate backup codes
  const backupCodes = generateBackupCodes();
  const backupCodesHash = backupCodes.map((code) =>
    crypto.createHash('sha256').update(code).digest('hex')
  );

  await pool.execute(
    'UPDATE users SET mfa_enabled = 1, mfa_verified_at = NOW(), backup_codes = ? WHERE userID = ?',
    [JSON.stringify(backupCodesHash), userId]
  );

  logger.info(`[MFA] Enabled for user: ${userId}`);

  return {
    success: true,
    backupCodes, // Show once to user
  };
}

// Verify TOTP during login
export async function verifyTOTP(
  userId: string,
  token: string
): Promise<MFAVerifyResult> {
  const [rows] = await pool.execute(
    'SELECT mfa_secret, mfa_enabled FROM users WHERE userID = ?',
    [userId]
  );
  const user = (rows as any[])[0];

  if (!user?.mfa_enabled) {
    return { error: 'MFA not enabled' };
  }

  // Check if it's a TOTP code (6 digits)
  if (/^\d{6}$/.test(token)) {
    const totpValid = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (totpValid) {
      return { success: true, method: 'totp' };
    }
  }

  // Check if it's a backup code (8 hex chars)
  if (/^[A-F0-9]{8}$/.test(token.toUpperCase())) {
    const backupResult = await verifyBackupCode(userId, token.toUpperCase());
    if (backupResult.success) {
      return { success: true, method: 'backup' };
    }
  }

  return { error: 'Invalid code' };
}

// Generate backup codes
function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

// Verify backup code
async function verifyBackupCode(
  userId: string,
  code: string
): Promise<{ success?: boolean; error?: string }> {
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');

  // Check if already used
  const [usedRows] = await pool.execute(
    'SELECT id FROM mfa_backup_code_usage WHERE user_id = ? AND code_hash = ?',
    [userId, codeHash]
  );

  if ((usedRows as any[]).length > 0) {
    return { error: 'Backup code already used' };
  }

  // Get user's backup codes
  const [rows] = await pool.execute(
    'SELECT backup_codes FROM users WHERE userID = ?',
    [userId]
  );
  const user = (rows as any[])[0];

  if (!user?.backup_codes) {
    return { error: 'No backup codes available' };
  }

  const validCodes = JSON.parse(user.backup_codes);

  if (!validCodes.includes(codeHash)) {
    return { error: 'Invalid backup code' };
  }

  // Mark as used
  await pool.execute(
    'INSERT INTO mfa_backup_code_usage (user_id, code_hash, used_at) VALUES (?, ?, NOW())',
    [userId, codeHash]
  );

  logger.info(`[MFA] Backup code used for user: ${userId}`);

  return { success: true };
}

// Disable MFA
export async function disableMFA(
  userId: string,
  password: string,
  email: string
): Promise<{ success?: boolean; error?: string }> {
  // Verify password first
  const bcrypt = await import('bcryptjs');
  const [rows] = await pool.execute(
    'SELECT password FROM users WHERE userID = ?',
    [userId]
  );
  const user = (rows as any[])[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return { error: 'Invalid password' };
  }

  await pool.execute(
    'UPDATE users SET mfa_enabled = 0, mfa_secret = NULL, mfa_verified_at = NULL, backup_codes = NULL WHERE userID = ?',
    [userId]
  );

  // Clear backup code usage
  await pool.execute('DELETE FROM mfa_backup_code_usage WHERE user_id = ?', [
    userId,
  ]);

  logger.info(`[MFA] Disabled for user: ${userId}`);

  return { success: true };
}

// Check if MFA is enabled for user
export async function isMFAEnabled(userId: string): Promise<boolean> {
  const [rows] = await pool.execute(
    'SELECT mfa_enabled FROM users WHERE userID = ?',
    [userId]
  );
  const user = (rows as any[])[0];
  return user?.mfa_enabled === 1;
}

// Regenerate backup codes
export async function regenerateBackupCodes(
  userId: string,
  password: string
): Promise<{ success?: boolean; error?: string; backupCodes?: string[] }> {
  // Verify password
  const bcrypt = await import('bcryptjs');
  const [rows] = await pool.execute(
    'SELECT password, mfa_enabled FROM users WHERE userID = ?',
    [userId]
  );
  const user = (rows as any[])[0];

  if (!user?.mfa_enabled) {
    return { error: 'MFA not enabled' };
  }

  if (!(await bcrypt.compare(password, user.password))) {
    return { error: 'Invalid password' };
  }

  const backupCodes = generateBackupCodes();
  const backupCodesHash = backupCodes.map((code) =>
    crypto.createHash('sha256').update(code).digest('hex')
  );

  await pool.execute(
    'UPDATE users SET backup_codes = ? WHERE userID = ?',
    [JSON.stringify(backupCodesHash), userId]
  );

  // Clear old usage records
  await pool.execute('DELETE FROM mfa_backup_code_usage WHERE user_id = ?', [
    userId,
  ]);

  logger.info(`[MFA] Backup codes regenerated for user: ${userId}`);

  return { success: true, backupCodes };
}

// Send email OTP for MFA recovery
export async function sendMFARecoveryOTP(
  userId: string,
  email: string
): Promise<{ success?: boolean; error?: string }> {
  const otp = crypto.randomInt(100000, 1000000).toString();
  const id = crypto.randomUUID();

  // Store OTP in a separate table for MFA recovery
  await pool.execute(
    `INSERT INTO mfa_recovery_tokens (id, user_id, token, expires, created_at)
     VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE), NOW())
     ON DUPLICATE KEY UPDATE id = ?, token = ?, expires = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE), created_at = NOW()`,
    [id, userId, otp, id, otp]
  );

  const { sendEmail } = await import('../email.js');
  await sendEmail(
    email,
    'MFA Recovery Code – Asset Management',
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; text-align: center;">
      <h2 style="color: #c00;">MFA Recovery Code</h2>
      <p>You requested to recover access to your account using email verification.</p>
      <p>Your 6-digit recovery code is:</p>
      <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #c00; margin: 20px 0;">${otp}</div>
      <p style="font-size: 12px; color: #666;">Expires in <strong>10 minutes</strong>.</p>
      <p style="font-size: 12px; color: #999; margin-top: 20px;">If you didn't request this code, please secure your account immediately.</p>
    </div>
    `
  );

  logger.info(`[MFA Recovery] OTP sent to user: ${userId}`);
  return { success: true };
}

// Verify email OTP for MFA recovery
export async function verifyMFARecoveryOTP(
  userId: string,
  token: string
): Promise<{ success?: boolean; error?: string }> {
  logger.info(`[MFA Recovery] Verifying OTP for user: ${userId}, token: ${token}`);
  const [rows] = await pool.execute(
    `SELECT * FROM mfa_recovery_tokens WHERE user_id = ? AND token = ? AND expires > UTC_TIMESTAMP()`,
    [userId, token]
  );
  const record = (rows as any[])[0];

  if (!record) {
    logger.warn(`[MFA Recovery] No matching token found for user: ${userId}`);
    return { error: 'Invalid or expired recovery code' };
  }

  // Delete the used token
  await pool.execute('DELETE FROM mfa_recovery_tokens WHERE user_id = ?', [userId]);

  logger.info(`[MFA Recovery] OTP verified for user: ${userId}`);
  return { success: true };
}
