// server/src/db.ts
import mysql from 'mysql2/promise';
import { databaseConfig } from './config/database.js';

export const pool = mysql.createPool(databaseConfig);

// Test connection
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('[DB] Connected to MySQL');
    conn.release();
  } catch (err) {
    console.error('[DB] MySQL connection failed:', err);
  }
})();
