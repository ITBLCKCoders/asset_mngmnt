/**
 * Add processor_wet_return_pdf_url column to asset_return_forms.
 * Usage: cd server && node scripts/run-processor-wet-return-pdf-url-migration.js
 */
import { runMigration } from './migration-runner.js';

runMigration(async pool => {
  const db = process.env.MYSQL_DB || 'asset_mngmnt';

  const [rows] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'asset_return_forms' 
     AND COLUMN_NAME = 'processor_wet_return_pdf_url'`,
    [db]
  );

  if (rows.length > 0) {
    console.log('Column processor_wet_return_pdf_url already exists.');
    return;
  }

  await pool.query(`
    ALTER TABLE asset_return_forms
    ADD COLUMN processor_wet_return_pdf_url VARCHAR(1024) DEFAULT NULL
  `);
  console.log('Migration successful: added processor_wet_return_pdf_url.');
});
