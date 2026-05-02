/**
 * Backfill received_copy_201_file_signed_by_name for forms signed before the column existed.
 * Usage: cd server && node scripts/backfill-received-copy-signer-names.js
 */
import { runMigration } from './migration-runner.js';

runMigration(async pool => {
  const [rows] = await pool.query(`
    SELECT af.formID, af.received_copy_201_file_signed_by, u.first_name, u.last_name
    FROM accountability_forms af
    LEFT JOIN users u ON af.received_copy_201_file_signed_by = u.userID
    WHERE af.received_copy_201_file_signature IS NOT NULL
      AND af.received_copy_201_file_signed_by IS NOT NULL
      AND (af.received_copy_201_file_signed_by_name IS NULL OR af.received_copy_201_file_signed_by_name = '')
  `);

  if (rows.length === 0) {
    console.log('No forms need backfilling.');
    return;
  }

  let updated = 0;
  for (const row of rows) {
    const name = `${row.first_name || ''} ${row.last_name || ''}`.trim();
    if (!name) continue;
    await pool.execute(
      'UPDATE accountability_forms SET received_copy_201_file_signed_by_name = ? WHERE formID = ?',
      [name, row.formID]
    );
    updated++;
  }
  console.log(`Backfilled ${updated} form(s) with signer names.`);
});
