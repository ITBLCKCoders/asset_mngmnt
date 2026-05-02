import { pool } from '../db.js';
import logger from '../logger.js';

async function cleanupDatabase() {
  logger.info('Starting database cleanup...');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    logger.info('Disabling foreign key checks...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    const tablesToTruncate = [
      'asset_assignments',
      'accountability_forms',
      'asset_accountability_forms',
      'asset_returns',
      'asset_return_forms',
    ];

    for (const table of tablesToTruncate) {
      logger.info(`Truncating table: ${table}`);
      await connection.execute(`TRUNCATE TABLE ${table}`);
    }

    logger.info('Resetting asset statuses to Available...');
    await connection.execute(`
      UPDATE assets 
      SET status = 'Available',
          location_id = NULL,
          location_room_id = NULL,
          department_id = NULL,
          updated_at = NOW(),
          updated_by = 'SYSTEM_CLEANUP'
      WHERE deleted_at IS NULL
    `);

    logger.info('Enabling foreign key checks...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    await connection.commit();
    logger.info('Database cleanup completed successfully.');
  } catch (error) {
    await connection.rollback();
    logger.error('Database cleanup failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run the script
cleanupDatabase()
  .then(() => {
    console.log('Cleanup script executed successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Cleanup script failed:', err);
    process.exit(1);
  });
