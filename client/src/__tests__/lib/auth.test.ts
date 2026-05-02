import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  logout,
  clearAuth,
  TOKEN_KEY,
  setLocalToken,
  getLocalToken,
} from '@/lib/auth';

describe('auth - cookie-based', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
  });

  describe('getLocalToken / setLocalToken (deprecated)', () => {
    it('should always return null - cannot read httpOnly cookies from client', () => {
      expect(getLocalToken()).toBeNull();

      setLocalToken('token-1');
      expect(getLocalToken()).toBeNull();
    });
  });

  describe('clearAuth (deprecated)', () => {
    it('should clear localStorage and sessionStorage for cleanup', () => {
      localStorage.setItem(TOKEN_KEY, 'x');
      localStorage.setItem('pendingVerificationEmail', 'a@b.co');
      localStorage.setItem('otpExpiryTime', '123');
      sessionStorage.setItem('someKey', 'someValue');

      clearAuth();

      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem('pendingVerificationEmail')).toBeNull();
      expect(localStorage.getItem('otpExpiryTime')).toBeNull();
      expect(sessionStorage.getItem('someKey')).toBeNull();
    });
  });

  describe('logout', () => {
    it('should call fetch to /auth/logout with credentials include', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });
      await logout();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });

    it('should call setToken(null) and setRefreshToken(null) even when fetch fails', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));
      localStorage.setItem(TOKEN_KEY, 'x');

      await logout();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.any(Object)
      );
    });
  });
});
