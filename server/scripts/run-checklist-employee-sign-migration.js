/**
 * Add employee_signed_at / employee_digital_signature to asset_checklists.
 * Usage: cd server && node scripts/run-checklist-employee-sign-migration.js
 */
import { runMigration } from './migration-runner.js';

runMigration(async pool => {
  const db = process.env.MYSQL_DB || 'asset_mngmnt';

  const [rows] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'asset_checklists'
     AND COLUMN_NAME = 'employee_signed_at'`,
    [db]
  );

  if (rows.length > 0) {
    console.log('Columns employee_signed_at / employee_digital_signature already exist.');
    return;
  }

  await pool.query(`
    ALTER TABLE asset_checklists
      ADD COLUMN employee_signed_at TIMESTAMP NULL DEFAULT NULL AFTER created_by,
      ADD COLUMN employee_digital_signature TEXT NULL DEFAULT NULL AFTER employee_signed_at
  `);
  console.log(
    'Migration successful: added employee_signed_at and employee_digital_signature to asset_checklists.'
  );
});
