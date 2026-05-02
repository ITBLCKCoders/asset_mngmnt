/**
 * Run migration to add received_copy_201_file_signed_at and received_copy_201_file_signed_by columns.
 * Usage: cd server && node scripts/run-received-copy-signed-by-migration.js
 */
import { runMigration } from './migration-runner.js';

runMigration(async pool => {
  const db = process.env.MYSQL_DB || 'asset_mngmnt';

  const [rows] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'accountability_forms' 
     AND COLUMN_NAME = 'received_copy_201_file_signed_at'`,
    [db]
  );

  if (rows.length > 0) {
    console.log(
      'Columns received_copy_201_file_signed_at and _signed_by already exist.'
    );
    return;
  }

  await pool.query(`
    ALTER TABLE accountability_forms
    ADD COLUMN received_copy_201_file_signed_at DATETIME DEFAULT NULL,
    ADD COLUMN received_copy_201_file_signed_by CHAR(36) DEFAULT NULL
  `);
  console.log(
    'Migration successful: added received_copy_201_file_signed_at and received_copy_201_file_signed_by columns.'
  );
});
