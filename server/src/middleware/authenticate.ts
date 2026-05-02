import type { Request, Response, NextFunction } from 'express';
import {
  verifyAccessToken,
  checkInactivity,
  updateActivity,
} from '../auth/index.js';
import { ASSET_ACCESS_COOKIE_NAME } from '../auth/cookieNames.js';
import type { User } from '../auth/types.js';
import { pool } from '../db.js';
import logger from '../logger.js';

export interface AuthRequest extends Request {
  user?: User & { sessionId: string };
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  // Auth is cookie-based: a signed httpOnly access-token cookie. The
  // Authorization: Bearer header is also supported for server-to-server calls.
  const token =
    req.signedCookies &&
    typeof req.signedCookies[ASSET_ACCESS_COOKIE_NAME] === 'string'
      ? (req.signedCookies[ASSET_ACCESS_COOKIE_NAME] as string)
      : req.header('authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  const payload = verifyAccessToken(token);
  if (!payload || !payload.sessionId) {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }

  const { userID: userId, sessionId } = payload;

  const [rows] = await pool.execute(
    'SELECT 1 FROM sessions WHERE sessionID = ? AND userID = ?',
    [sessionId, userId]
  );

  if ((rows as any[]).length === 0) {
    logger.warn(
      `[SECURITY] Session revoked → User ${userId} tried to use old session ${sessionId}`
    );
    return res.status(401).json({
      error:
        'You have been logged out because your account was used on another device.',
    });
  }

  const isInactive = await checkInactivity(userId);
  if (isInactive) {
    return res.status(401).json({ error: 'Session expired due to inactivity' });
  }

  await updateActivity(userId);
  (req as AuthRequest).user = payload;
  next();
};
