import { setRefreshToken, setToken } from './api';
import { clearCurrentUserCache } from '@/hooks/useCurrentUser';
import { getApiBase } from '@/lib/env';

export const TOKEN_KEY = 'accessToken';

// Deprecated helper kept for compatibility with older call sites.
export const setLocalToken = (_token: string) => {};
export const getLocalToken = () => null;
export const clearAuth = () => {
  localStorage.removeItem('mfaTempToken');
  sessionStorage.clear();
};

export const logout = async (isAutoLogout = false) => {
  try {
    await fetch(`${getApiBase()}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isAutoLogout }),
    });
  } catch (err) {
    console.error('Logout request failed:', err);
  } finally {
    clearCurrentUserCache();
    setToken(null);
    setRefreshToken(null);
  }
};
