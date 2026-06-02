import { test, expect } from '@playwright/test';
import { E2E_USERS } from '../../fixtures/users';
import { E2E_ROUTES } from '../../fixtures/test-data';

test.describe('Login flow', () => {
  test('shows login form at /login', async ({ page }) => {
    await page.goto(E2E_ROUTES.public.login);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('logs in with valid admin credentials and redirects to dashboard', async ({ page }) => {
    await page.goto(E2E_ROUTES.public.login);
    await page.fill('input[type="email"]', E2E_USERS.admin.email);
    await page.fill('input[type="password"]', E2E_USERS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test('shows error with invalid credentials', async ({ page }) => {
    await page.goto(E2E_ROUTES.public.login);
    await page.fill('input[type="email"]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 10_000 });
  });

  test('redirects to login when accessing protected route without auth', async ({ page }) => {
    await page.goto(E2E_ROUTES.authenticated.dashboard);
    await page.waitForURL('**/login', { timeout: 10_000 });
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Authenticated user', () => {
  test.use({ storageState: 'storage/admin.json' });

  test('can access dashboard directly', async ({ page }) => {
    await page.goto(E2E_ROUTES.authenticated.dashboard);
    await expect(page).toHaveURL(/dashboard/);
  });

  test('profile page loads correctly', async ({ page }) => {
    await page.goto(E2E_ROUTES.authenticated.profile);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Profile').or(page.locator('text=profile'))).toBeVisible({ timeout: 10_000 });
  });
});
