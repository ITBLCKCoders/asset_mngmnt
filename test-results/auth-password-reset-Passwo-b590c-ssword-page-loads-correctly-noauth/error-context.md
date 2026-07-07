# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth\password-reset.spec.ts >> Password reset flow >> forgot password page loads correctly
- Location: e2e\tests\auth\password-reset.spec.ts:6:7

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: page.waitForLoadState: Test timeout of 45000ms exceeded.
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
          - paragraph [ref=e14]: Forgot Password
          - paragraph [ref=e15]: Enter your email to continue
        - generic [ref=e16]:
          - text: Email
          - textbox "Email" [ref=e17]:
            - /placeholder: Enter your email
        - generic [ref=e18]:
          - button "Continue" [disabled]
          - button "Back to Login" [ref=e19] [cursor=pointer]:
            - img
            - text: Back to Login
  - region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { E2E_USERS } from '../../fixtures/users';
  3  | import { E2E_ROUTES } from '../../fixtures/test-data';
  4  | 
  5  | test.describe('Password reset flow', () => {
  6  |   test('forgot password page loads correctly', async ({ page }) => {
  7  |     await page.goto(E2E_ROUTES.public.forgotPassword);
> 8  |     await page.waitForLoadState('networkidle');
     |                ^ Error: page.waitForLoadState: Test timeout of 45000ms exceeded.
  9  |     await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10_000 });
  10 |   });
  11 | 
  12 |   test('submits forgot password request with valid email', async ({ page }) => {
  13 |     await page.goto(E2E_ROUTES.public.forgotPassword);
  14 |     await page.waitForLoadState('networkidle');
  15 |     const emailInput = page.locator('input[type="email"]').first();
  16 |     await emailInput.fill(E2E_USERS.user.email);
  17 |     const submitBtn = page.locator('button[type="submit"]').first();
  18 |     if (await submitBtn.isVisible()) {
  19 |       await submitBtn.click();
  20 |       await page.waitForTimeout(2000);
  21 |     }
  22 |   });
  23 | 
  24 |   test('reset method selection page shows options', async ({ page }) => {
  25 |     await page.goto(E2E_ROUTES.public.resetMethod);
  26 |     await page.waitForLoadState('networkidle');
  27 |   });
  28 | 
  29 |   test('verify reset OTP page loads', async ({ page }) => {
  30 |     await page.goto(E2E_ROUTES.public.verifyResetOtp);
  31 |     await page.waitForLoadState('networkidle');
  32 |   });
  33 | 
  34 |   test('reset password page shows form fields', async ({ page }) => {
  35 |     await page.goto(E2E_ROUTES.public.resetPassword);
  36 |     await page.waitForLoadState('networkidle');
  37 |     const passwordInput = page.locator('input[type="password"]').first();
  38 |     await expect(passwordInput).toBeVisible({ timeout: 10_000 });
  39 |   });
  40 | });
  41 | 
```