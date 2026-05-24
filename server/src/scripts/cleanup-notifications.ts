/**
 * Delete notifications created before 2026-05-24 17:00:00 (5:00 PM).
 * Retains notifications where created_at >= cutoff.
 *
 * Schema reference: dblive3v10-11-5-24-26
 *
 * WARNING: Destructive. Back up the database before running.
 *
 * Usage:
 *   npm run db:cleanup-notifications --workspace=server
 *   npm run db:cleanup-notifications --workspace=server -- --dry-run
 *
 * Override cutoff (optional):
 *   NOTIFICATION_RETENTION_FROM="2026-05-24 17:00:00" npm run db:cleanup-notifications --workspace=server
 */
import { pool } from '../db.js';
import logger from '../logger.js';

const DEFAULT_CUTOFF = '2026-05-24 17:00:00';

const cutoff =
  process.env.NOTIFICATION_RETENTION_FROM?.trim() || DEFAULT_CUTOFF;

const dryRun = process.argv.includes('--dry-run');

type CountRow = { count: number };

async function countNotifications(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  predicate: 'before' | 'from'
): Promise<number> {
  const operator = predicate === 'before' ? '<' : '>=';
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count FROM notifications WHERE created_at ${operator} ?`,
    [cutoff]
  );
  return Number((rows as CountRow[])[0]?.count ?? 0);
}

async function cleanupNotifications(): Promise<void> {
  logger.info(
    `Notification cleanup (cutoff: ${cutoff}, dry-run: ${dryRun})...`
  );

  const connection = await pool.getConnection();
  try {
    const toDelete = await countNotifications(connection, 'before');
    const toKeep = await countNotifications(connection, 'from');

    logger.info(`Notifications before cutoff (will delete): ${toDelete}`);
    logger.info(`Notifications from cutoff onwards (will keep): ${toKeep}`);

    if (dryRun) {
      logger.info('Dry run — no rows deleted.');
      return;
    }

    if (toDelete === 0) {
      logger.info('Nothing to delete.');
      return;
    }

    await connection.beginTransaction();

    const [result] = await connection.execute(
      'DELETE FROM notifications WHERE created_at < ?',
      [cutoff]
    );

    const deleted = (result as { affectedRows?: number }).affectedRows ?? 0;
    const remaining = await countNotifications(connection, 'from');

    await connection.commit();

    logger.info(`Deleted ${deleted} notification(s).`);
    logger.info(`Remaining (from cutoff onwards): ${remaining}`);
  } catch (error) {
    await connection.rollback();
    logger.error('Notification cleanup failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

cleanupNotifications()
  .then(() => {
    console.log(
      dryRun
        ? 'Dry run completed. Re-run without --dry-run to delete.'
        : 'Notification cleanup completed successfully.'
    );
    process.exit(0);
  })
  .catch(err => {
    console.error('Notification cleanup failed:', err);
    process.exit(1);
  });
