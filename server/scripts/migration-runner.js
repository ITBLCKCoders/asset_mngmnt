/**
 * Shared migration runner for standalone migration scripts.
 * Creates a MySQL pool from env vars and runs the given migration function.
 * Usage: Run from server directory (npm run migrate:xxx or node scripts/run-xxx.js)
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

function createPool() {
  return mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB || 'asset_mngmnt',
  });
}

export async function runMigration(migrateFn) {
  const pool = createPool();
  try {
    await migrateFn(pool);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
