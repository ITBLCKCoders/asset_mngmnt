import crypto from 'crypto';
import { pool } from '../db.js';
import { sendEmail } from '../email.js';
import { buildEmailHtml } from '../email-templates.js';
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
    'Verify your email – Asset Management',
    buildEmailHtml({
      title: 'Verify your email',
      body: `
        <p style="margin: 0 0 16px 0;">Please use the code below to verify your email address and activate your account.</p>
        <div style="background: #f4f6f9; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 20px; letter-spacing: 10px; font-size: 32px; font-weight: 700; color: #1a2933;">${otp}</div>
        <p style="margin: 0; font-size: 13px; color: #8899a8;">This code expires in <strong>10 minutes</strong>.</p>
      `,
      footerNote: 'Didn\'t request this? Please ignore this email.',
      link,
      linkText: 'Enter verification code',
      siteUrl: config.FRONTEND_URL,
    }),
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
