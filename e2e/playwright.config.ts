import { defineConfig } from '@playwright/test';

const TEST_DB = process.env.E2E_DB || 'asset_mngmnt_e2e';
const SERVER_PORT = parseInt(process.env.E2E_SERVER_PORT || '6996', 10);
const CLIENT_PORT = parseInt(process.env.E2E_CLIENT_PORT || '9669', 10);

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  timeout: 45_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: `http://localhost:${CLIENT_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'admin',
      use: { storageState: 'storage/admin.json' },
      dependencies: ['setup'],
    },
    {
      name: 'manager',
      use: { storageState: 'storage/manager.json' },
      dependencies: ['setup'],
    },
    {
      name: 'user',
      use: { storageState: 'storage/user.json' },
      dependencies: ['setup'],
    },
    {
      name: 'noauth',
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: `cross-env NODE_ENV=test MYSQL_DB=${TEST_DB} HTTP_PORT=${SERVER_PORT} npm run dev --workspace=server`,
      port: SERVER_PORT,
      timeout: 45_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        MYSQL_DB: TEST_DB,
        HTTP_PORT: String(SERVER_PORT),
        ...(process.env.CI ? { MYSQL_HOST: '127.0.0.1' } : {}),
      },
    },
    {
      command: `cross-env NODE_ENV=test npm run dev --workspace=client`,
      port: CLIENT_PORT,
      timeout: 45_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        VITE_API_PROXY_TARGET: `http://localhost:${SERVER_PORT}`,
      },
    },
  ],
});
