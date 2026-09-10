import crypto from 'crypto';
import { pool } from '../db.js';
import { sendEmail } from '../email.js';
import { buildEmailHtml } from '../email-templates.js';
import logger from '../logger.js';
import { generateTokens } from './tokens.js';
import type { Request } from 'express';
import { config } from '../config/validation.js';
import { redactEmail } from '../utils/redact.js';

export type SigningOtpPurpose =
  | 'profile_initials'
  | 'assignment'
  | 'issuance'
  | 'transfer'
  | 'return'
  | 'borrowing'
  | 'approval'
  | 'clearance';

export const SIGNING_OTP_PURPOSES: readonly SigningOtpPurpose[] = [
  'profile_initials',
  'assignment',
  'issuance',
  'transfer',
  'return',
  'borrowing',
  'approval',
  'clearance',
];

export function normalizeSigningOtpPurpose(value: unknown): SigningOtpPurpose | null {
  return typeof value === 'string' &&
    (SIGNING_OTP_PURPOSES as readonly string[]).includes(value)
    ? (value as SigningOtpPurpose)
    : null;
}

interface SigningOtpTemplate {
  subject: string;
  title: string;
  intro: string;
  footerNote: string;
  linkText: string;
}

const SIGNING_OTP_TEMPLATES: Record<SigningOtpPurpose, SigningOtpTemplate> = {
  profile_initials: {
    subject: 'Verify your initials – Asset Management',
    title: 'Verify your initials',
    intro:
      'Please use the code below to verify your initials for your profile signature setup. Your initials will only be saved after this verification.',
    footerNote: "Didn't request this? Please ignore this email.",
    linkText: 'Verify initials',
  },
  assignment: {
    subject: 'Asset assignment signing code – Asset Management',
    title: 'Asset assignment signing code',
    intro:
      'Please use the code below to confirm your signature for the asset assignment / accountability form.',
    footerNote:
      'Didn\u2019t request this signing code? Please ignore this email and do not share this code.',
    linkText: 'Sign assignment',
  },
  issuance: {
    subject: 'Asset issuance signing code – Asset Management',
    title: 'Asset issuance signing code',
    intro:
      'Please use the code below to confirm your signature for the asset issuance.',
    footerNote:
      'Didn\u2019t request this signing code? Please ignore this email and do not share this code.',
    linkText: 'Sign issuance',
  },
  transfer: {
    subject: 'Asset transfer signing code – Asset Management',
    title: 'Asset transfer signing code',
    intro:
      'Please use the code below to confirm your signature for the asset transfer.',
    footerNote:
      'Didn\u2019t request this signing code? Please ignore this email and do not share this code.',
    linkText: 'Sign transfer',
  },
  return: {
    subject: 'Asset return signing code – Asset Management',
    title: 'Asset return signing code',
    intro:
      'Please use the code below to confirm your signature for the asset return.',
    footerNote:
      'Didn\u2019t request this signing code? Please ignore this email and do not share this code.',
    linkText: 'Sign return',
  },
  borrowing: {
    subject: 'Asset borrowing signing code – Asset Management',
    title: 'Asset borrowing signing code',
    intro:
      'Please use the code below to confirm your signature for the asset borrowing request.',
    footerNote:
      'Didn\u2019t request this signing code? Please ignore this email and do not share this code.',
    linkText: 'Sign borrowing request',
  },
  approval: {
    subject: 'Approval signing code – Asset Management',
    title: 'Approval signing code',
    intro:
      'Please use the code below to confirm your signature for the approval.',
    footerNote:
      'Didn\u2019t request this signing code? Please ignore this email and do not share this code.',
    linkText: 'Sign approval',
  },
  clearance: {
    subject: 'Clearance signing code – Asset Management',
    title: 'Clearance signing code',
    intro:
      'Please use the code below to confirm your signature for the clearance form generation. Your signature, date and time will appear under Employee Undergoing Clearance once verified.',
    footerNote: "Didn't request this? Please ignore this email.",
    linkText: 'Sign clearance',
  },
};

export function getSigningOtpTemplate(purpose: SigningOtpPurpose): SigningOtpTemplate {
  return SIGNING_OTP_TEMPLATES[purpose];
}

export async function sendSigningOTP(
  userId: string,
  email: string,
  purpose: SigningOtpPurpose
) {
  const otp = crypto.randomInt(100000, 1000000).toString();
  await pool.execute('DELETE FROM verification_tokens WHERE userID = ?', [
    userId,
  ]);
  await pool.execute(
    `INSERT INTO verification_tokens (token, userID, expires) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE))`,
    [otp, userId]
  );

  const template = getSigningOtpTemplate(purpose);
  const link = `${config.FRONTEND_URL}/verify-otp`;
  await sendEmail(
    email,
    template.subject,
    buildEmailHtml({
      title: template.title,
      body: `
        <p style="margin: 0 0 16px 0;">${template.intro}</p>
        <div style="background: #f4f6f9; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 20px; letter-spacing: 10px; font-size: 32px; font-weight: 700; color: #1a2933;">${otp}</div>
        <p style="margin: 0; font-size: 13px; color: #8899a8;">This code expires in <strong>10 minutes</strong>.</p>
      `,
      footerNote: template.footerNote,
      link,
      linkText: template.linkText,
      siteUrl: config.FRONTEND_URL,
    }),
    link
  );
  logger.info(`[OTP:${purpose}] Sent → ${redactEmail(email)}`);
}

export async function verifySigningOTP(otp: string) {
  const [rows] = await pool.execute(
    `SELECT * FROM verification_tokens WHERE token = ? AND expires > UTC_TIMESTAMP()`,
    [otp]
  );
  const vt = (rows as any[])[0];
  if (!vt) return { error: 'Invalid or expired OTP' };

  // Signing verification must NOT flip users.verified — it only proves
  // possession of the email inbox at signing time.
  await pool.execute('DELETE FROM verification_tokens WHERE userID = ?', [
    vt.userID,
  ]);

  return { success: true as const, userId: vt.userID };
}

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
