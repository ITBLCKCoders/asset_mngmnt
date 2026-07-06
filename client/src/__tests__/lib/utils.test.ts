import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('should merge class names', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('should handle conditional classes', () => {
    const showHidden = false;
    expect(cn('base', showHidden && 'hidden', 'visible')).toBe('base visible');
  });

  it('should handle undefined and null', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b');
  });
});
