import { test, expect } from '@playwright/test';
import { E2E_ROUTES } from '../../fixtures/test-data';

test.describe('Route protection', () => {
  test('redirects unauthenticated user to login for all protected routes', async ({ page }) => {
    const protectedRoutes = [
      E2E_ROUTES.authenticated.dashboard,
      E2E_ROUTES.authenticated.profile,
      E2E_ROUTES.authenticated.assets,
      E2E_ROUTES.authenticated.myAssets,
      E2E_ROUTES.assetRoutes.assignment,
      E2E_ROUTES.assetRoutes.transfer,
      E2E_ROUTES.assetRoutes.borrow,
      E2E_ROUTES.assetRoutes.maintenance,
      E2E_ROUTES.assetRoutes.gatePass,
      E2E_ROUTES.formRoutes.accountability,
      E2E_ROUTES.formRoutes.borrow,
      E2E_ROUTES.formRoutes.return,
      E2E_ROUTES.formRoutes.transfer,
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForURL('**/login', { timeout: 10_000 });
      await expect(page).toHaveURL(/login/);
    }
  });

  test('allows access to public routes without auth', async ({ page }) => {
    await page.goto(E2E_ROUTES.public.login);
    await expect(page.locator('input[type="email"]')).toBeVisible();

    await page.goto(E2E_ROUTES.public.register);
    await page.waitForLoadState('networkidle');

    await page.goto(E2E_ROUTES.public.forgotPassword);
    await page.waitForLoadState('networkidle');

    await page.goto(E2E_ROUTES.public.resetMethod);
    await page.waitForLoadState('networkidle');

    await page.goto(E2E_ROUTES.public.resetPassword);
    await page.waitForLoadState('networkidle');
  });
});

test.describe('Permission-based access control', () => {
  test('admin can access permission-gated routes', async ({ page }) => {
    test.use({ storageState: 'storage/admin.json' });
    const gatedRoutes = [
      E2E_ROUTES.permissionGated.users,
      E2E_ROUTES.permissionGated.reports,
      E2E_ROUTES.permissionGated.settings,
      E2E_ROUTES.permissionGated.audit,
    ];
    for (const route of gatedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/login');
    }
  });
});

test.describe('User without permission sees access denied', () => {
  test.use({ storageState: 'storage/user.json' });

  test('regular user cannot access Users page', async ({ page }) => {
    await page.goto(E2E_ROUTES.permissionGated.users);
    await page.waitForLoadState('networkidle');
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
    await expect(page.locator('text=Access Denied').or(page.locator('text=access denied'))).toBeVisible({ timeout: 10_000 });
  });

  test('regular user cannot access Settings page', async ({ page }) => {
    await page.goto(E2E_ROUTES.permissionGated.settings);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Access Denied').or(page.locator('text=access denied'))).toBeVisible({ timeout: 10_000 });
  });

  test('regular user cannot access Reports page', async ({ page }) => {
    await page.goto(E2E_ROUTES.permissionGated.reports);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Access Denied').or(page.locator('text=access denied'))).toBeVisible({ timeout: 10_000 });
  });

  test('regular user cannot access Audit Trail page', async ({ page }) => {
    await page.goto(E2E_ROUTES.permissionGated.audit);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Access Denied').or(page.locator('text=access denied'))).toBeVisible({ timeout: 10_000 });
  });
});
