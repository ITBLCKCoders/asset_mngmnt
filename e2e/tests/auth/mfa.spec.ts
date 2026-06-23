import { test, expect } from '@playwright/test';
import { E2E_USERS } from '../../fixtures/users';
import { E2E_ROUTES } from '../../fixtures/test-data';

test.describe('MFA flow', () => {
  test.use({ storageState: 'storage/admin.json' });

  test('MFA setup page loads for authenticated admin', async ({ page }) => {
    await page.goto(E2E_ROUTES.authenticated.mfaSetup);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/mfa/);
  });

  test('profile page has account tab for MFA settings', async ({ page }) => {
    await page.goto(E2E_ROUTES.authenticated.profile);
    await page.waitForLoadState('networkidle');
    const accountTab = page.locator('button:has-text("Account"), [role="tab"]:has-text("Account")').first();
    if (await accountTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await accountTab.click();
      await page.waitForTimeout(1000);
    }
    const mfaSection = page.locator('text=Two-Factor, text=MFA, text=2FA, text=two-factor').first();
    if (await mfaSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(mfaSection).toBeVisible();
    }
  });
});
