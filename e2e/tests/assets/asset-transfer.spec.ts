import { test, expect } from '@playwright/test';

test.describe('Asset transfer flow', () => {
  test.use({ storageState: 'storage/admin.json' });

  test('transfer page loads', async ({ page }) => {
    await page.goto('/assets/transfer');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/transfer/);
  });

  test('transfer requests page loads', async ({ page }) => {
    await page.goto('/assets/transfer-requests');
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('transfer');
  });

  test('transfer form page in forms section loads', async ({ page }) => {
    await page.goto('/forms/transfer');
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('transfer');
  });
});

test.describe('Transfer form for manager', () => {
  test.use({ storageState: 'storage/manager.json' });

  test('manager can view transfer forms', async ({ page }) => {
    await page.goto('/forms/transfer');
    await page.waitForLoadState('networkidle');
  });
});
