import { FullConfig } from '@playwright/test';
import mysql from 'mysql2/promise';
import * as path from 'path';
import * as fs from 'fs';

const DB_CONFIG = {
  host: process.env.CI ? '127.0.0.1' : (process.env.MYSQL_HOST || 'localhost'),
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'P@ssw0rd',
};

const TEST_DB = process.env.E2E_DB || 'asset_mngmnt_e2e';
const BASE_URL = `http://localhost:${process.env.E2E_CLIENT_PORT || '9669'}`;

async function globalSetup(_config: FullConfig) {
  const rootDir = path.resolve(__dirname, '..');

  // 1. Create test database
  const conn = await mysql.createConnection({ ...DB_CONFIG, multipleStatements: true });
  await conn.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
  await conn.query(`CREATE DATABASE \`${TEST_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${TEST_DB}\``);

  // 2. Run all migrations (combined file)
  const migrationsPath = path.join(rootDir, 'db', 'all_migrations.sql');
  if (fs.existsSync(migrationsPath)) {
    const migrations = fs.readFileSync(migrationsPath, 'utf8');
    const statements = migrations
      .split('\n')
      .filter(line => line.trim() && !line.trim().startsWith('--'))
      .join('\n');
    await conn.query(statements);
  }

  // 3. Run seed data
  const seedPath = path.join(__dirname, 'fixtures', 'seed.sql');
  const seedSql = fs.readFileSync(seedPath, 'utf8');
  await conn.query(seedSql);

  await conn.end();

  // 4. Login as each user and save storage state
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();

  const users = [
    { email: 'e2e-admin@test.com', password: 'E2eAdmin123!', storageFile: 'storage/admin.json' },
    { email: 'e2e-manager@test.com', password: 'E2eManager123!', storageFile: 'storage/manager.json' },
    { email: 'e2e-user@test.com', password: 'E2eUser123!', storageFile: 'storage/user.json' },
  ];

  const storageDir = path.join(__dirname, 'storage');
  fs.mkdirSync(storageDir, { recursive: true });

  for (const user of users) {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15_000 }).catch(() => {
      console.warn(`[global-setup] Login redirect check failed for ${user.email}, continuing anyway`);
    });

    await context.storageState({ path: path.join(storageDir, path.basename(user.storageFile)) });
    await context.close();
  }

  await browser.close();
}

export default globalSetup;
