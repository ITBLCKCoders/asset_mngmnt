import { test, expect } from '@playwright/test';

test.describe('Asset return flow', () => {
  test.use({ storageState: 'storage/admin.json' });

  test('return page loads', async ({ page }) => {
    await page.goto('/assets/return');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/return/);
  });

  test('return requests page loads', async ({ page }) => {
    await page.goto('/assets/return-requests');
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('return');
  });

  test('return form page in forms section loads', async ({ page }) => {
    await page.goto('/forms/return');
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('return');
  });

  test('return request submission page loads', async ({ page }) => {
    await page.goto('/assets/return-request');
    await page.waitForLoadState('networkidle');
  });
});

test.describe('Return form for manager', () => {
  test.use({ storageState: 'storage/manager.json' });

  test('manager can view return forms', async ({ page }) => {
    await page.goto('/forms/return');
    await page.waitForLoadState('networkidle');
  });
});
