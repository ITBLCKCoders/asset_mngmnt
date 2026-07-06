import { FullConfig } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const API_BASE = `http://localhost:${process.env.E2E_SERVER_PORT || '6996'}`;

async function globalSetup(_config: FullConfig) {
  // Wait for server to be ready
  const healthUrl = `${API_BASE}/health`;
  let serverReady = false;
  for (let i = 0; i < 20; i++) {
    try {
      const r = await fetch(healthUrl, { signal: AbortSignal.timeout(2000) });
      if (r.ok) {
        const text = await r.text();
        console.log(`[global-setup] Server ready on attempt ${i + 1} (status ${r.status}): ${text.substring(0, 200)}`);
        serverReady = true;
        break;
      }
    } catch (e: any) {
      console.log(`[global-setup] Waiting for server attempt ${i + 1}: ${e?.cause?.code || e?.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  if (!serverReady) {
    console.warn('[global-setup] Server not ready after 40s, proceeding anyway');
  }

  const { chromium } = await import('playwright');
  const browser = await chromium.launch();

  const users = [
    { email: 'e2e-admin@test.com', password: 'E2eAdmin123!', storageFile: 'storage/admin.json' },
    { email: 'e2e-manager@test.com', password: 'E2eManager123!', storageFile: 'storage/manager.json' },
    { email: 'e2e-user@test.com', password: 'E2eUser123!', storageFile: 'storage/user.json' },
  ];

  const storageDir = path.join(__dirname, 'storage');
  fs.mkdirSync(storageDir, { recursive: true });

  for (const user of users) {
    const context = await browser.newContext();

    // Login via API
    let res;
    try {
      res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: user.password }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (e: any) {
      console.error(`[global-setup] Login fetch error for ${user.email}: ${e.message} (cause: ${e?.cause?.code || e?.cause?.message || 'none'})`);
      await context.close();
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      console.warn(`[global-setup] API login failed for ${user.email}: ${res.status} ${body}`);
      await context.close();
      continue;
    }

    // Extract cookies from response
    const setCookieHeaders = res.headers.getSetCookie?.() || [];
    const cookies = setCookieHeaders.map((h: string) => {
      const parts = h.split(';').map((s: string) => s.trim());
      const [name, ...rest] = parts[0].split('=');
      return { name, value: rest.join('='), domain: 'localhost', path: '/' };
    });

    if (cookies.length > 0) {
      await context.addCookies(cookies);
    }

    // Also set auth tokens from localStorage if returned in body
    try {
      const data = await res.json();
      if (data.accessToken) {
        await context.addInitScript((token) => {
          localStorage.setItem('accessToken', token);
        }, data.accessToken);
      }
    } catch { /* ignore JSON parse errors */ }

    await context.storageState({ path: path.join(storageDir, path.basename(user.storageFile)) });
    console.log(`[global-setup] Login succeeded for ${user.email}`);
    await context.close();
  }

  await browser.close();
}

export default globalSetup;
