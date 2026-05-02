import { pool } from '../db.js';
import logger from '../logger.js';
import type { Request } from 'express';
import type { Session } from './types.js';
import { createAuditLog } from '../utils/audit.js';
import { SettingModel } from '../models/setting.model.js';
import { config } from '../config/validation.js';

async function getInactivityTimeout(): Promise<number> {
  const timeoutMinutes = (await SettingModel.getValue('session_timeout_minutes')) ?? 60;
  return timeoutMinutes * 60 * 1000; // Convert to milliseconds
}

export async function checkInactivity(userId: string): Promise<boolean> {
  const [rowsResult] = (await pool.execute(
    'CALL sp_get_session_last_activity(?)',
    [userId]
  )) as any[];
  const rows = Array.isArray(rowsResult[0]) ? rowsResult[0] : rowsResult;
  const session = rows[0] as Session | undefined;

  if (!session) return true;

  const lastActivity = new Date(session.last_activity).getTime();
  const now = Date.now();
  const INACTIVITY_TIMEOUT = await getInactivityTimeout();
  const inactive = now - lastActivity > INACTIVITY_TIMEOUT;

  if (inactive) {
    logger.info(`[AUTO-LOGOUT] User ${userId} inactive for 5+ minutes`);

    // Create audit log for auto-logout due to inactivity
    try {
      await createAuditLog({
        userId,
        action: 'Auto Logout',
        resourceType: 'auth',
        resourceName: 'System',
        details: 'Automatic logout due to 5+ minutes of inactivity',
      });
    } catch (auditError) {
      logger.warn('Failed to create auto-logout audit log:', auditError);
    }

    await pool.execute('CALL sp_delete_sessions_by_user(?)', [userId]);
  }

  return inactive;
}

/**
 * Per-user "last DB write" timestamp used to throttle `updateActivity`. The
 * activity write hits the sessions table on every authenticated request — for
 * an active user that could be tens of writes per second. Throttling to once
 * per minute drops 99% of those writes while keeping the inactivity-timeout
 * accurate to within ~1 minute.
 */
const lastActivityWriteAt = new Map<string, number>();
const ACTIVITY_WRITE_THROTTLE_MS = 60_000; // 1 minute

export async function updateActivity(userId: string): Promise<void> {
  const now = Date.now();
  const last = lastActivityWriteAt.get(userId) ?? 0;
  if (now - last < ACTIVITY_WRITE_THROTTLE_MS) {
    return; // skip — DB row is already fresh enough
  }
  lastActivityWriteAt.set(userId, now);
  // Cap the map size — pathological worst case is one entry per ever-seen user.
  if (lastActivityWriteAt.size > 10_000) {
    const cutoff = now - 30 * 60_000; // forget anyone idle 30 min
    for (const [uid, ts] of lastActivityWriteAt) {
      if (ts < cutoff) lastActivityWriteAt.delete(uid);
    }
  }
  await pool.execute('CALL sp_update_session_activity(?)', [userId]);
  logger.debug(`[ACTIVITY] Updated for user: ${userId}`);
}

export async function verifyRefreshToken(token: string, req: Request) {
  logger.debug(`[REFRESH] Verifying token: ${token.substring(0, 8)}...`);

  const [rowsResult] = (await pool.execute(
    'CALL sp_get_session_by_refresh_token(?)',
    [token]
  )) as any[];
  const rows = Array.isArray(rowsResult[0]) ? rowsResult[0] : rowsResult;
  const session = rows[0] as Session | undefined;
  if (!session) {
    logger.warn(`[REFRESH] Failed: No valid session`);
    return null;
  }

  // NOTE: We don't check inactivity here to allow refresh tokens to work
  // even after the inactivity timeout. Inactivity check is done on access tokens
  // via the authenticate middleware. This prevents auto-logout when the user
  // is still active but the access token has expired.

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (session.ip !== ip || session.user_agent !== userAgent) {
    logger.warn(
      `[REFRESH] IP/UA mismatch for session ${session.sessionID} (user ${session.userID}); ` +
        `stored ip=${session.ip} ua="${session.user_agent}" got ip=${ip} ua="${userAgent}"`
    );
    if (config.NODE_ENV === 'production') {
      await pool.execute('CALL sp_delete_session_by_refresh_token(?)', [token]);
      try {
        await createAuditLog({
          userId: session.userID,
          action: 'Session Revoked',
          resourceType: 'auth',
          resourceName: 'System',
          details: 'Refresh token revoked due to IP or User-Agent mismatch',
          ipAddress: ip,
          userAgent,
        });
      } catch (auditError) {
        logger.warn('[REFRESH] Failed to write audit log for revoked session', auditError);
      }
      return null;
    }
  }

  const [userResult] = (await pool.execute('CALL sp_get_user_by_id(?)', [
    session.userID,
  ])) as any[];
  const userRows = Array.isArray(userResult[0]) ? userResult[0] : userResult;
  const user = userRows[0];
  if (!user) {
    logger.error(`[REFRESH] User not found: ${session.userID}`);
    return null;
  }

  await updateActivity(user.userID);
  logger.debug(`[REFRESH] Valid session for user: ${user.userID}`);
  return {
    userId: user.userID,
    email: user.email,
    sessionId: session.sessionID,
  };
}

export async function revokeRefreshToken(token: string) {
  // Token contents are sensitive even when truncated; keep at debug level only.
  logger.debug(`[REVOKE] Revoking refresh token: ${token.substring(0, 4)}…`);
  await pool.execute('CALL sp_delete_session_by_refresh_token(?)', [token]);
}

export async function logout(userId: string) {
  logger.info(`[LOGOUT] User: ${userId}`);
  await pool.execute('CALL sp_delete_sessions_by_user(?)', [userId]);
}
