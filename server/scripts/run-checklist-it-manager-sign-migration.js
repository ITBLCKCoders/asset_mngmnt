/**
 * Add it_manager_signed_* columns to asset_checklists.
 * Usage: cd server && node scripts/run-checklist-it-manager-sign-migration.js
 */
import { runMigration } from './migration-runner.js';

runMigration(async pool => {
  const db = process.env.MYSQL_DB || 'asset_mngmnt';

  const [rows] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'asset_checklists'
     AND COLUMN_NAME = 'it_manager_signed_at'`,
    [db]
  );

  if (rows.length > 0) {
    console.log('it_manager_signed_at columns already exist on asset_checklists.');
    return;
  }

  await pool.query(`
    ALTER TABLE asset_checklists
      ADD COLUMN it_manager_signed_at TIMESTAMP NULL DEFAULT NULL AFTER dept_head_digital_signature,
      ADD COLUMN it_manager_signed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER it_manager_signed_at,
      ADD COLUMN it_manager_digital_signature TEXT NULL DEFAULT NULL AFTER it_manager_signed_by
  `);

  try {
    await pool.query(`
      ALTER TABLE asset_checklists
        ADD CONSTRAINT fk_asset_checklists_it_manager_signed_by
        FOREIGN KEY (it_manager_signed_by) REFERENCES users (userID) ON DELETE SET NULL
    `);
  } catch (e) {
    const msg = String(e?.message ?? e);
    if (!msg.includes('Duplicate') && !msg.includes('already exists')) {
      throw e;
    }
  }

  console.log(
    'Migration successful: added it_manager_signed_at, it_manager_signed_by, it_manager_digital_signature.'
  );
});
