import { test, expect } from '@playwright/test';
import { E2E_ROUTES } from '../fixtures/test-data';

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

  test('can navigate to all main authenticated routes', async ({ page }) => {
    await page.goto(E2E_ROUTES.authenticated.dashboard);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/dashboard/);

    await page.goto(E2E_ROUTES.authenticated.myAssets);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/my-assets/);

    await page.goto(E2E_ROUTES.authenticated.profile);
    await page.waitForLoadState('networkidle');
  });

  test('can navigate to asset sub-routes', async ({ page }) => {
    const assetRoutes = [
      E2E_ROUTES.assetRoutes.assignment,
      E2E_ROUTES.assetRoutes.transfer,
      E2E_ROUTES.assetRoutes.maintenance,
      E2E_ROUTES.assetRoutes.repair,
      E2E_ROUTES.assetRoutes.gatePass,
      E2E_ROUTES.assetRoutes.borrowRequests,
      E2E_ROUTES.assetRoutes.returnRequests,
      E2E_ROUTES.assetRoutes.transferRequests,
    ];
    for (const route of assetRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      expect(page.url()).not.toContain('/login');
    }
  });

  test('can navigate to history routes', async ({ page }) => {
    const historyRoutes = [
      E2E_ROUTES.historyRoutes.issuance,
      E2E_ROUTES.historyRoutes.transfer,
      E2E_ROUTES.historyRoutes.return,
      E2E_ROUTES.historyRoutes.maintenance,
      E2E_ROUTES.historyRoutes.repair,
      E2E_ROUTES.historyRoutes.disposal,
    ];
    for (const route of historyRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      expect(page.url()).not.toContain('/login');
    }
  });
});
