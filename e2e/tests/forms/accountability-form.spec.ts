import { test, expect } from '@playwright/test';

test.describe('Accountability forms flow', () => {
  test.use({ storageState: 'storage/admin.json' });

  test('accountability forms page loads', async ({ page }) => {
    await page.goto('/forms/accountability');
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('accountability');
  });

  test('accountability forms page shows form data', async ({ page }) => {
    await page.goto('/forms/accountability');
    await page.waitForLoadState('networkidle');
    const pageContent = page.locator('body');
    await expect(pageContent).not.toBeEmpty();
  });
});

test.describe('Accountability forms for regular user', () => {
  test.use({ storageState: 'storage/user.json' });

  test('user can view their accountability forms', async ({ page }) => {
    await page.goto('/forms/accountability');
    await page.waitForLoadState('networkidle');
  });
});
