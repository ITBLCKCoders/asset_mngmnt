import { describe, it, expect } from 'vitest';
import { getLandingPage } from '@/utils/navigation';

describe('navigation', () => {
  describe('getLandingPage', () => {
    it('should return /profile when no role', () => {
      const result = getLandingPage(() => false, false);
      expect(result).toBe('/profile');
    });

    it('should return /dashboard when has Dashboard permission', () => {
      const result = getLandingPage((mod: string) => mod === 'Dashboard', true);
      expect(result).toBe('/dashboard');
    });

    it('should return /my-assets when has My Assets permission', () => {
      const result = getLandingPage(
        (mod: string) => mod === 'My Assets',
        true
      );
      expect(result).toBe('/my-assets');
    });

    it('should return /forms/accountability when has Accountability Form permission', () => {
      const result = getLandingPage(
        (mod: string) => mod === 'Accountability Form',
        true
      );
      expect(result).toBe('/forms/accountability');
    });

    it('should return /assets when has Asset List permission', () => {
      const result = getLandingPage(
        (mod: string) => mod === 'Asset List',
        true
      );
      expect(result).toBe('/assets');
    });

    it('should return /user-manual as final fallback', () => {
      const result = getLandingPage(() => false, true);
      expect(result).toBe('/user-manual');
    });
  });
});
