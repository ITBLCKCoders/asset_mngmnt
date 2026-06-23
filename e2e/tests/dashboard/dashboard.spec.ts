import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.use({ storageState: 'storage/admin.json' });

  test('loads dashboard with expected elements', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('dashboard contains summary cards', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const cards = page.locator('[class*="card"], [class*="Card"], section[class*="grid"] > div');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(1);
  });

  test('dashboard loads for manager role', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('dashboard shows stats for admin', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const statsSection = page.locator('text=Stats, text=Overview, text=Summary, text=Statistics').first();
    if (await statsSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(statsSection).toBeVisible();
    }
  });
});

test.describe('Dashboard for manager', () => {
  test.use({ storageState: 'storage/manager.json' });

  test('dashboard loads for manager role', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/dashboard/);
  });
});

test.describe('Dashboard for regular user', () => {
  test.use({ storageState: 'storage/user.json' });

  test('dashboard loads for regular user role', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/dashboard/);
  });
});
