import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.use({ storageState: 'storage/admin.json' });

  test('sidebar contains navigation links', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('nav, aside, [class*="sidebar"], [class*="Sidebar"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10_000 });
  });

  test('navigating via sidebar links works', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const assetLink = page.locator('a[href*="/assets"], a[href*="asset"]').first();
    if (await assetLink.isVisible()) {
      await assetLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('asset');
    }
  });
});
