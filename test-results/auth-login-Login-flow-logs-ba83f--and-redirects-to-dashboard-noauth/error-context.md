# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth\login.spec.ts >> Login flow >> logs in with valid admin credentials and redirects to dashboard
- Location: e2e\tests\auth\login.spec.ts:13:7

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: page.fill: Test timeout of 45000ms exceeded.
Call log:
  - waiting for locator('input[type="email"]')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - img [ref=e4]
    - generic [ref=e9]:
      - img "Blackcoders" [ref=e11]
      - generic [ref=e12]:
        - generic [ref=e13]:
          - text: Email
          - textbox "Email" [ref=e14]:
            - /placeholder: Enter email
        - generic [ref=e15]:
          - text: Password
          - generic [ref=e16]:
            - textbox "Password" [ref=e17]:
              - /placeholder: "********"
            - button [ref=e18] [cursor=pointer]:
              - img [ref=e19]
          - button "Forgot password?" [ref=e23] [cursor=pointer]
        - generic [ref=e24]:
          - button "Log in" [ref=e25] [cursor=pointer]
          - button "Create an account" [ref=e26] [cursor=pointer]
  - region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { E2E_USERS } from '../../fixtures/users';
  3  | import { E2E_ROUTES } from '../../fixtures/test-data';
  4  | 
  5  | test.describe('Login flow', () => {
  6  |   test('shows login form at /login', async ({ page }) => {
  7  |     await page.goto(E2E_ROUTES.public.login);
  8  |     await expect(page.locator('input[type="email"]')).toBeVisible();
  9  |     await expect(page.locator('input[type="password"]')).toBeVisible();
  10 |     await expect(page.locator('button[type="submit"]')).toBeVisible();
  11 |   });
  12 | 
  13 |   test('logs in with valid admin credentials and redirects to dashboard', async ({ page }) => {
  14 |     await page.goto(E2E_ROUTES.public.login);
> 15 |     await page.fill('input[type="email"]', E2E_USERS.admin.email);
     |                ^ Error: page.fill: Test timeout of 45000ms exceeded.
  16 |     await page.fill('input[type="password"]', E2E_USERS.admin.password);
  17 |     await page.click('button[type="submit"]');
  18 |     await page.waitForURL('**/dashboard', { timeout: 15_000 });
  19 |     await expect(page).toHaveURL(/dashboard/);
  20 |   });
  21 | 
  22 |   test('shows error with invalid credentials', async ({ page }) => {
  23 |     await page.goto(E2E_ROUTES.public.login);
  24 |     await page.fill('input[type="email"]', 'wrong@test.com');
  25 |     await page.fill('input[type="password"]', 'wrongpassword');
  26 |     await page.click('button[type="submit"]');
  27 |     await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 10_000 });
  28 |   });
  29 | 
  30 |   test('redirects to login when accessing protected route without auth', async ({ page }) => {
  31 |     await page.goto(E2E_ROUTES.authenticated.dashboard);
  32 |     await page.waitForURL('**/login', { timeout: 10_000 });
  33 |     await expect(page).toHaveURL(/login/);
  34 |   });
  35 | });
  36 | 
  37 | test.describe('Authenticated user', () => {
  38 |   test.use({ storageState: 'storage/admin.json' });
  39 | 
  40 |   test('can access dashboard directly', async ({ page }) => {
  41 |     await page.goto(E2E_ROUTES.authenticated.dashboard);
  42 |     await expect(page).toHaveURL(/dashboard/);
  43 |   });
  44 | 
  45 |   test('profile page loads correctly', async ({ page }) => {
  46 |     await page.goto(E2E_ROUTES.authenticated.profile);
  47 |     await page.waitForLoadState('networkidle');
  48 |     await expect(page.locator('text=Profile').or(page.locator('text=profile'))).toBeVisible({ timeout: 10_000 });
  49 |   });
  50 | });
  51 | 
```