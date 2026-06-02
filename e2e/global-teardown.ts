import { FullConfig } from '@playwright/test';
import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: process.env.CI ? '127.0.0.1' : (process.env.MYSQL_HOST || 'localhost'),
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'P@ssw0rd',
};

const TEST_DB = process.env.E2E_DB || 'asset_mngmnt_e2e';

async function globalTeardown(_config: FullConfig) {
  const conn = await mysql.createConnection(DB_CONFIG);
  await conn.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
  await conn.end();
}

export default globalTeardown;
