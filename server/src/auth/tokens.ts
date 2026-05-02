// src/auth/tokens.ts
import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import type { Request } from 'express';
import { pool } from '../db.js';
import logger from '../logger.js';
import type { Session, User } from './types.js';
import { config } from '../config/validation.js';

// JWT_SECRET is validated by config (min 64 chars in production); using the
// validated config value rather than raw process.env keeps secret loading
// in one place and lets us drop the redundant runtime guard.
const JWT_SECRET = config.JWT_SECRET;

// Preserve the original raw-env fallback semantics: if ACCESS_TOKEN_EXPIRES is
// not in process.env, use 900s. (config has its own "1500m" default that we
// intentionally don't pick up here to avoid silently changing access-token
// lifetime in deployments that relied on the 900 fallback.)
const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES
  ? parseInt(process.env.ACCESS_TOKEN_EXPIRES)
  : 900;

export function generateAccessToken(
  userId: string,
  email: string,
  sessionId: string
): string {
  const options: SignOptions = { expiresIn: ACCESS_TOKEN_EXPIRES };
  return jwt.sign({ userId, email, sessionId }, JWT_SECRET, options);
}

export async function generateRefreshToken(userId: string, req: Request) {
  const refreshToken = crypto.randomBytes(32).toString('hex');
  const sessionId = crypto.randomBytes(16).toString('hex');

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  const [result] = (await pool.execute('CALL sp_delete_sessions_by_user(?)', [
    userId,
  ])) as any[];
  const deleted =
    (Array.isArray(result[0]) ? result[0][0] : result[0])?.deleted_count ?? 0;

  if (deleted > 0) {
    logger.warn(
      `[SECURITY] Kicked out ${deleted} previous session(s) → User ${userId} logged in from new device (IP: ${ip})`
    );
  }

  await pool.execute('CALL sp_insert_session(?, ?, ?, ?, ?)', [
    sessionId,
    userId,
    refreshToken,
    ip,
    userAgent,
  ]);

  logger.info(
    `[SESSION] New session → ID: ${sessionId} | User: ${userId} | IP: ${ip}`
  );
  return { refreshToken, sessionId };
}

export async function generateTokens(
  userId: string,
  email: string,
  req: Request
) {
  const { refreshToken, sessionId } = await generateRefreshToken(userId, req);
  const accessToken = generateAccessToken(userId, email, sessionId);
  return { accessToken, refreshToken };
}

export async function refreshSessionTokens(
  sessionId: string,
  userId: string,
  email: string,
  req: Request
) {
  const refreshToken = crypto.randomBytes(32).toString('hex');

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  await pool.execute(
    'UPDATE sessions SET refresh_token = ?, ip = ?, user_agent = ?, last_activity = NOW() WHERE sessionID = ? AND userID = ?',
    [refreshToken, ip, userAgent, sessionId, userId]
  );

  const accessToken = generateAccessToken(userId, email, sessionId);

  logger.debug(`[REFRESH] Updated session ${sessionId} for user ${userId}`);
  return { accessToken, refreshToken };
}

export function verifyAccessToken(
  token: string
): (User & { sessionId: string }) | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as any;
    return {
      userID: decoded.userId,
      email: decoded.email,
      name: '',
      verified: true,
      sessionId: decoded.sessionId,
    };
  } catch (err) {
    logger.debug(`[JWT] Invalid access token: ${(err as Error).message}`);
    return null;
  }
}
