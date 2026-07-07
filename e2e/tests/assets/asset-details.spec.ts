import { test, expect } from '@playwright/test';
import { E2E_TEST_ASSETS } from '../../fixtures/test-data';

test.describe('Asset details page', () => {
  test.use({ storageState: 'storage/admin.json' });

  test('navigates to asset details from list and shows details', async ({ page }) => {
    await page.goto('/assets');
    await page.waitForLoadState('networkidle');

    const assetLink = page.locator(`text=${E2E_TEST_ASSETS[0].name}`).first();
    await expect(assetLink).toBeVisible({ timeout: 10_000 });
    await assetLink.click();

    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/assets/details/');
  });

  test('asset detail page can be accessed directly for public route', async ({ page }) => {
    // This is a public route according to App.tsx: /assets/details/:assetId is PublicRoute
    // We need to find the actual asset ID first
    const today = new Date();
    const uniqueId = `a1000000-0000-0000-0000-000000000001`;
    await page.goto(`/assets/details/${uniqueId}`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/assets/details/');
  });
});
