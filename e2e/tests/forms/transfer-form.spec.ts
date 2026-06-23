import { test, expect } from '@playwright/test';

test.describe('Asset transfer forms', () => {
  test.use({ storageState: 'storage/admin.json' });

  test('transfer forms page loads', async ({ page }) => {
    await page.goto('/forms/transfer');
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('transfer');
  });

  test('transfer history page loads', async ({ page }) => {
    await page.goto('/assets-history/transfer');
    await page.waitForLoadState('networkidle');
  });

  test('audit trail page loads', async ({ page }) => {
    await page.goto('/audit');
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('audit');
  });
});
