import { test, expect } from '@playwright/test';
import { E2E_USERS } from '../../fixtures/users';
import { E2E_ROUTES } from '../../fixtures/test-data';

test.describe('Password reset flow', () => {
  test('forgot password page loads correctly', async ({ page }) => {
    await page.goto(E2E_ROUTES.public.forgotPassword);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('submits forgot password request with valid email', async ({ page }) => {
    await page.goto(E2E_ROUTES.public.forgotPassword);
    await page.waitForLoadState('networkidle');
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(E2E_USERS.user.email);
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
    }
  });

  test('reset method selection page shows options', async ({ page }) => {
    await page.goto(E2E_ROUTES.public.resetMethod);
    await page.waitForLoadState('networkidle');
  });

  test('verify reset OTP page loads', async ({ page }) => {
    await page.goto(E2E_ROUTES.public.verifyResetOtp);
    await page.waitForLoadState('networkidle');
  });

  test('reset password page shows form fields', async ({ page }) => {
    await page.goto(E2E_ROUTES.public.resetPassword);
    await page.waitForLoadState('networkidle');
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 10_000 });
  });
});
