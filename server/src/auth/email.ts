import crypto from 'crypto';
import { pool } from '../db.js';
import { sendEmail } from '../email.js';
import logger from '../logger.js';
import { generateTokens } from './tokens.js';
import type { Request } from 'express';
import { config } from '../config/validation.js';
import { redactEmail } from '../utils/redact.js';

export async function sendVerificationOTP(userId: string, email: string) {
  const otp = crypto.randomInt(100000, 1000000).toString();
  await pool.execute('DELETE FROM verification_tokens WHERE userID = ?', [
    userId,
  ]);
  await pool.execute(
    `INSERT INTO verification_tokens (token, userID, expires) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE))`,
    [otp, userId]
  );

  const link = `${config.FRONTEND_URL}/verify-otp`;
  await sendEmail(
    email,
    'Your OTP Code – Asset Management',
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; text-align: center;">
      <h2 style="color: #c00;">Verify Your Email</h2>
      <p>Your 6-digit verification code is:</p>
      <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #c00; margin: 20px 0;">${otp}</div>
      <p><a href="${link}" style="color: #c00; text-decoration: underline;">Enter it here</a></p>
      <p style="font-size: 12px; color: #666;">Expires in <strong>10 minutes</strong>.</p>
    </div>
  `,
    link
  );
  logger.info(`[OTP] Sent → ${redactEmail(email)}`);
}

export async function verifyOTP(otp: string) {
  const [rows] = await pool.execute(
    `SELECT * FROM verification_tokens WHERE token = ? AND expires > UTC_TIMESTAMP()`,
    [otp]
  );
  const vt = (rows as any[])[0];
  if (!vt) return { error: 'Invalid or expired OTP' };

  await pool.execute('UPDATE users SET verified = TRUE WHERE userID = ?', [
    vt.userID,
  ]);
  await pool.execute('DELETE FROM verification_tokens WHERE userID = ?', [
    vt.userID,
  ]);

  const [userRows] = await pool.execute(
    'SELECT userID, email, name FROM users WHERE userID = ?',
    [vt.userID]
  );
  const user = (userRows as any[])[0];
  if (!user) return { error: 'User not found' };

  return {
    success: true,
    message: 'Email verified successfully. You can now log in.',
    user: { email: user.email },
  };
}
