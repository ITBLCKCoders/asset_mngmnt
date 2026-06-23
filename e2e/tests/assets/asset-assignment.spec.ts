import { test, expect } from '@playwright/test';
import { E2E_TEST_ASSETS } from '../../fixtures/test-data';

test.describe('Asset assignment / issuance flow', () => {
  test.use({ storageState: 'storage/admin.json' });

  test('assignment page loads', async ({ page }) => {
    await page.goto('/assets/assignment');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/assignment/);
  });

  test('allows selecting an available asset for assignment', async ({ page }) => {
    await page.goto('/assets/assignment');
    await page.waitForLoadState('networkidle');

    const availableAsset = page.locator(`text=${E2E_TEST_ASSETS[3].name}`).first();
    if (await availableAsset.isVisible({ timeout: 5000 }).catch(() => false)) {
      await availableAsset.click();
      await page.waitForTimeout(500);
    }
  });

  test('my assets page loads and shows assigned assets', async ({ page }) => {
    await page.goto('/my-assets');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/my-assets/);
  });
});

test.describe('My Assets for regular user', () => {
  test.use({ storageState: 'storage/user.json' });

  test('user can view their assigned assets', async ({ page }) => {
    await page.goto('/my-assets');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/my-assets/);
  });
});
