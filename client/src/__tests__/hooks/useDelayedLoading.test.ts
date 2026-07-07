import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';

describe('useDelayedLoading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true when loading is true', () => {
    const { result } = renderHook(() => useDelayedLoading(true, 2000));
    expect(result.current).toBe(true);
  });

  it('should stay true for minDelayMs after loading becomes false', () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useDelayedLoading(loading, 2000),
      { initialProps: { loading: true } }
    );
    expect(result.current).toBe(true);

    rerender({ loading: false });
    expect(result.current).toBe(true);

    act(() => { vi.advanceTimersByTime(1999); });
    expect(result.current).toBe(true);

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe(false);
  });

  it('should return false when loading is false after delay', () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useDelayedLoading(loading, 500),
      { initialProps: { loading: false } }
    );
    expect(result.current).toBe(false);

    rerender({ loading: true });
    expect(result.current).toBe(true);

    rerender({ loading: false });
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe(false);
  });
});
