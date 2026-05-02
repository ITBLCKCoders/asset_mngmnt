import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  getToken,
  setToken,
  getRefreshToken,
  setRefreshToken,
} from '@/lib/api';

describe('api - cookie-based auth', () => {
  beforeEach(() => {
    localStorage.clear();
    setToken(null);
    setRefreshToken(null);
  });

  describe('getToken / setToken', () => {
    it('should return null - tokens are in httpOnly cookies not accessible to JS', () => {
      expect(getToken()).toBeNull();
    });

    it('should dispatch tokenChanged event when setToken is called', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      setToken('abc123');

      expect(dispatchSpy).toHaveBeenCalled();
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('tokenChanged');
      expect(event.detail).toBe('abc123');
    });

    it('should return null after setToken(null)', () => {
      setToken('abc');
      setToken(null);
      expect(getToken()).toBeNull();
    });
  });

  describe('getRefreshToken / setRefreshToken', () => {
    it('should return null - refresh token is in httpOnly cookie not accessible to JS', () => {
      expect(getRefreshToken()).toBeNull();
    });

    it('setRefreshToken should be a no-op - cookies managed by server', () => {
      expect(() => setRefreshToken('refresh-xyz')).not.toThrow();
      expect(getRefreshToken()).toBeNull();
    });

    it('should return null after setRefreshToken(null)', () => {
      setRefreshToken('r');
      setRefreshToken(null);
      expect(getRefreshToken()).toBeNull();
    });
  });
});
