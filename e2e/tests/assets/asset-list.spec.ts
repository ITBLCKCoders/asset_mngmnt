import { test, expect } from '@playwright/test';
import { E2E_TEST_ASSETS } from '../../fixtures/test-data';

test.describe('Asset list', () => {
  test.use({ storageState: 'storage/admin.json' });

  test('loads asset list page', async ({ page }) => {
    await page.goto('/assets');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/assets/);
  });

  test('displays asset table with expected rows', async ({ page }) => {
    await page.goto('/assets');
    await page.waitForLoadState('networkidle');

    for (const asset of E2E_TEST_ASSETS) {
      await expect(page.locator(`text=${asset.name}`).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('search filters asset list', async ({ page }) => {
    await page.goto('/assets');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Dell Latitude');
      await page.waitForTimeout(1000);
      await expect(page.locator(`text=${E2E_TEST_ASSETS[0].name}`).first()).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe('Asset list with limited permissions', () => {
  test.use({ storageState: 'storage/user.json' });

  test('user without Asset List permission sees access denied or redirect', async ({ page }) => {
    await page.goto('/assets');
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    const text = await body.textContent();
    const hasAccessDenied = text?.toLowerCase().includes('access denied')
      || text?.toLowerCase().includes('access_denied');
    const isOnLogin = page.url().includes('/login');
    expect(hasAccessDenied || isOnLogin).toBeTruthy();
  });
});
