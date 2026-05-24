/**
 * Reset all assets and asset builders to Available, remove assignments/returns/transfers,
 * and clear asset timelines so only "Created" audit entries remain.
 *
 * Schema reference: dbtest1.1-052426
 *
 * WARNING: Destructive. Back up the database before running.
 *
 * Usage:
 *   npm run db:reset-asset-state --workspace=server
 */
import { pool } from '../db.js';
import logger from '../logger.js';

const SYSTEM_USER = 'SYSTEM_RESET';

/** Tables cleared by this reset (matches dbtest1.1-052426 schema). */
const TABLES_TO_TRUNCATE = [
  'asset_checklists',
  'transfer_form_assignments',
  'asset_transfer',
  'asset_mngmnt_gate_passes',
  'asset_returns',
  'accountability_forms',
  'asset_transfer_forms',
  'asset_return_forms',
  'asset_assignments',
  'asset_borrow_requests',
] as const;

async function tableExists(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  table: string
): Promise<boolean> {
  const [rows] = await connection.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?
     LIMIT 1`,
    [table]
  );
  return (rows as unknown[]).length > 0;
}

async function countRows(connection: Awaited<ReturnType<typeof pool.getConnection>>, table: string): Promise<number> {
  const [rows] = await connection.query(`SELECT COUNT(*) AS cnt FROM \`${table}\``);
  return Number((rows as { cnt: number }[])[0]?.cnt ?? 0);
}

async function truncateIfExists(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  table: string
): Promise<void> {
  if (!(await tableExists(connection, table))) {
    logger.warn(`Skipping ${table}: table does not exist in this database.`);
    return;
  }
  const before = await countRows(connection, table);
  logger.info(`Truncating ${table} (${before} rows)...`);
  await connection.execute(`TRUNCATE TABLE \`${table}\``);
}

async function resetAssetState() {
  logger.info('Starting asset state reset...');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await connection.execute('SET SQL_SAFE_UPDATES = 0');

    for (const table of TABLES_TO_TRUNCATE) {
      await truncateIfExists(connection, table);
    }

    logger.info('Resetting asset statuses to Available...');
    const [assetResult] = await connection.execute(`
      UPDATE assets
      SET status = 'Available',
          location_id = NULL,
          location_room_id = NULL,
          updated_at = NOW(),
          updated_by = ?
      WHERE deleted_at IS NULL
    `, [SYSTEM_USER]);
    const assetsUpdated = (assetResult as { affectedRows?: number }).affectedRows ?? 0;
    logger.info(`Updated ${assetsUpdated} assets to Available.`);

    logger.info('Resetting asset builder statuses to Available...');
    const [builderResult] = await connection.execute(`
      UPDATE asset_builders
      SET status = 'Available',
          updated_at = NOW()
      WHERE deleted_at IS NULL
    `);
    const buildersUpdated = (builderResult as { affectedRows?: number }).affectedRows ?? 0;
    logger.info(`Updated ${buildersUpdated} asset builders to Available.`);

    logger.info('Clearing asset timelines (keeping Created entries only)...');
    const [auditResult] = await connection.execute(`
      DELETE al
      FROM audit_logs al
      WHERE al.deleted_at IS NULL
        AND (
          (al.resource_type = 'asset' AND al.action <> 'Created Asset')
          OR (al.resource_type = 'asset_builder' AND al.action <> 'Created Asset Builder')
          OR al.resource_type = 'asset_assignment'
        )
    `);
    const auditDeleted = (auditResult as { affectedRows?: number }).affectedRows ?? 0;
    logger.info(`Removed ${auditDeleted} non-created asset timeline audit entries.`);

    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    await connection.execute('SET SQL_SAFE_UPDATES = 1');

    await connection.commit();

    const [verification] = await connection.query(`
      SELECT 'asset_assignments' AS tbl, COUNT(*) AS row_count FROM asset_assignments
      UNION ALL SELECT 'asset_return_forms', COUNT(*) FROM asset_return_forms
      UNION ALL SELECT 'asset_transfer_forms', COUNT(*) FROM asset_transfer_forms
      UNION ALL SELECT 'accountability_forms', COUNT(*) FROM accountability_forms
      UNION ALL SELECT 'non_created_asset_audit_logs', COUNT(*) FROM audit_logs
        WHERE deleted_at IS NULL
          AND (
            (resource_type = 'asset' AND action <> 'Created Asset')
            OR (resource_type = 'asset_builder' AND action <> 'Created Asset Builder')
            OR resource_type = 'asset_assignment'
          )
      UNION ALL SELECT 'assets_not_available', COUNT(*) FROM assets
        WHERE deleted_at IS NULL AND status <> 'Available'
      UNION ALL SELECT 'builders_not_available', COUNT(*) FROM asset_builders
        WHERE deleted_at IS NULL AND status <> 'Available'
    `);

    logger.info('Verification:', verification);
    logger.info('Asset state reset completed successfully.');
  } catch (error) {
    await connection.rollback();
    logger.error('Asset state reset failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

resetAssetState()
  .then(() => {
    console.log('Reset script executed successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Reset script failed:', err);
    process.exit(1);
  });
