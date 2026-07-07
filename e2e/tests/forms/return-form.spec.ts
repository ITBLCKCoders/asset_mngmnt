import { test, expect } from '@playwright/test';

test.describe('Asset return forms', () => {
  test.use({ storageState: 'storage/admin.json' });

  test('return forms page loads', async ({ page }) => {
    await page.goto('/forms/return');
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('return');
  });

  test('return history page loads', async ({ page }) => {
    await page.goto('/assets-history/return');
    await page.waitForLoadState('networkidle');
  });
});
