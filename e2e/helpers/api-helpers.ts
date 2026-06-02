import { APIRequestContext } from '@playwright/test';

const API_BASE = process.env.CI
  ? `http://localhost:${process.env.E2E_SERVER_PORT || '6996'}`
  : `http://localhost:${process.env.E2E_SERVER_PORT || '6996'}`;

export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string,
) {
  const res = await request.post(`${API_BASE}/api/auth/login`, {
    data: { email, password },
  });
  return res;
}

export async function apiGetMe(request: APIRequestContext) {
  const res = await request.get(`${API_BASE}/api/auth/me`);
  return res;
}

export async function apiHealthCheck(request: APIRequestContext) {
  const res = await request.get(`${API_BASE}/health`);
  return res;
}
