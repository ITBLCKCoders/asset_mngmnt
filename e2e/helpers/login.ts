import { Page } from '@playwright/test';

export async function loginAsUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
}

export async function logoutUser(page: Page): Promise<void> {
  const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout"]');
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  }
  await page.waitForURL('**/login', { timeout: 10_000 });
}
