/**
 * Add received_copy_wet_pdf_url column.
 * Usage: cd server && node scripts/run-received-copy-wet-pdf-url-migration.js
 */
import { runMigration } from './migration-runner.js';

runMigration(async pool => {
  const db = process.env.MYSQL_DB || 'asset_mngmnt';

  const [rows] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'accountability_forms' 
     AND COLUMN_NAME = 'received_copy_wet_pdf_url'`,
    [db]
  );

  if (rows.length > 0) {
    console.log('Column received_copy_wet_pdf_url already exists.');
    return;
  }

  await pool.query(`
    ALTER TABLE accountability_forms
    ADD COLUMN received_copy_wet_pdf_url VARCHAR(1024) DEFAULT NULL
    AFTER received_copy_201_file_signed_by_name
  `);
  console.log('Migration successful: added received_copy_wet_pdf_url.');
});
