import { test, expect } from '@playwright/test';

test.describe('Asset borrowing flow', () => {
  test.use({ storageState: 'storage/admin.json' });

  test('borrow page loads', async ({ page }) => {
    await page.goto('/assets/borrow');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/borrow/);
  });

  test('borrow requests management page loads', async ({ page }) => {
    await page.goto('/assets/borrow-requests');
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('borrow');
  });

  test('borrow forms page loads', async ({ page }) => {
    await page.goto('/forms/borrow');
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('borrow');
  });
});

test.describe('Borrow flow for regular user', () => {
  test.use({ storageState: 'storage/user.json' });

  test('user can create borrow request', async ({ page }) => {
    await page.goto('/assets/borrow');
    await page.waitForLoadState('networkidle');
  });
});
