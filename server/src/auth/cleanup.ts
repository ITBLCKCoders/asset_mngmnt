import { pool } from '../db.js';
import logger from '../logger.js';

export async function cleanupExpiredSessions() {
  logger.info('[CLEANUP] Running expired cleanup');

  try {
    await pool.execute('CALL sp_cleanup_expired_auth_data()');
  } catch (error) {
    const err = error as { code?: string; errno?: number; message?: string };
    const isMissingProcedure =
      err.code === 'ER_SP_DOES_NOT_EXIST' ||
      err.errno === 1305 ||
      err.message?.includes('sp_cleanup_expired_auth_data does not exist') ===
        true;

    if (!isMissingProcedure) {
      throw error;
    }

    logger.warn(
      '[CLEANUP] Stored procedure sp_cleanup_expired_auth_data missing, skipping cleanup for this environment'
    );
  }

  logger.info('[CLEANUP] Completed');
}
