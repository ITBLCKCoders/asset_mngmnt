// server/src/db.ts
import mysql from 'mysql2/promise';
import logger from './logger.js';
import { databaseConfig } from './config/database.js';

export const pool = mysql.createPool(databaseConfig);

// Surface lower-level connection errors. mysql2 connections dropped by the
// server (e.g. idle-timeout / "gone away") emit 'error' on the connection;
// these are easy to miss because the pooled promises reject with an opaque
// empty-message Error. Log the code/sqlMessage here so the root cause is visible.
pool.on('connection', (conn) => {
  conn.on('error', (err) => {
    logger.error('[DB] MySQL connection error', {
      message: err?.message,
      code: (err as { code?: string })?.code,
      errno: (err as { errno?: number })?.errno,
      sqlState: (err as { sqlState?: string })?.sqlState,
      sqlMessage: (err as { sqlMessage?: string })?.sqlMessage,
      stack: err?.stack,
    });
  });
});

// Test connection
(async () => {
  try {
    const conn = await pool.getConnection();
    logger.info('[DB] Connected to MySQL');
    conn.release();
  } catch (err) {
    logger.error('[DB] MySQL connection failed', {
      message: err instanceof Error ? err.message : String(err),
      code: (err as { code?: string })?.code,
      errno: (err as { errno?: number })?.errno,
      sqlState: (err as { sqlState?: string })?.sqlState,
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
})();
