import { Page, expect } from '@playwright/test';

export async function fillOtpDialog(
  page: Page,
  otpValue: string = '123456'
): Promise<void> {
  const otpInput = page.locator('input[autocomplete="one-time-code"], input[inputmode="numeric"]').first();
  if (await otpInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await otpInput.fill(otpValue);
  }
}

export async function submitOtpAndVerify(
  page: Page,
  otpValue: string = '123456'
): Promise<void> {
  const verifyButton = page.locator('button:has-text("Verify"), button:has-text("Submit")').first();
  if (await verifyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await verifyButton.click();
    await page.waitForTimeout(1000);
  }
}

export async function clickApproveButton(page: Page): Promise<void> {
  const approveBtn = page.locator('button:has-text("Approve"), button:has-text("approve")').first();
  if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await approveBtn.click();
    await page.waitForTimeout(500);
  }
}

export async function clickDeclineButton(page: Page): Promise<void> {
  const declineBtn = page.locator('button:has-text("Decline"), button:has-text("decline")').first();
  if (await declineBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await declineBtn.click();
    await page.waitForTimeout(500);
  }
}

export async function clickSignButton(page: Page): Promise<void> {
  const signBtn = page.locator('button:has-text("Sign"), button:has-text("sign")').first();
  if (await signBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await signBtn.click();
    await page.waitForTimeout(500);
  }
}

export async function fillDigitalSignature(page: Page): Promise<void> {
  const sigCanvas = page.locator('canvas, [class*="signature"]').first();
  if (await sigCanvas.isVisible({ timeout: 2000 }).catch(() => false)) {
    const box = await sigCanvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 10, box.y + 10);
      await page.mouse.down();
      await page.mouse.move(box.x + 100, box.y + 50, { steps: 10 });
      await page.mouse.up();
    }
  }
}

export async function clickSaveButton(page: Page): Promise<void> {
  const saveBtn = page.locator('button:has-text("Save"), button:has-text("save")').first();
  if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await saveBtn.click();
    await page.waitForTimeout(500);
  }
}

export async function clickSubmitButton(page: Page): Promise<void> {
  const submitBtn = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("submit")').first();
  if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await submitBtn.click();
    await page.waitForTimeout(500);
  }
}
