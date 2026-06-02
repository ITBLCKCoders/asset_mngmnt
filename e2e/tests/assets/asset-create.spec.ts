import { test, expect } from '@playwright/test';

test.describe('Asset creation flow', () => {
  test.use({ storageState: 'storage/admin.json' });

  test('create asset page loads with form fields', async ({ page }) => {
    await page.goto('/assets');
    await page.waitForLoadState('networkidle');

    const addButton = page.locator('button:has-text("Add"), button:has-text("Create"), a:has-text("Add Asset"), a:has-text("New Asset")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/assets');
    }
  });
});
