import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useIdleTimer } from '@/hooks/useIdleTimer';

const mockLogout = vi.fn();

vi.mock('@/lib/auth', () => ({ logout: (...args: any[]) => mockLogout(...args) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));

describe('useIdleTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with dialog hidden', () => {
    const { result } = renderHook(() => useIdleTimer());
    expect(result.current.showDialog).toBe(false);
  });

  it('should provide onStay handler that hides dialog', () => {
    const { result } = renderHook(() => useIdleTimer());
    act(() => { result.current.setShowDialog(true); });
    expect(result.current.showDialog).toBe(true);
    act(() => { result.current.onStay(); });
    expect(result.current.showDialog).toBe(false);
  });

  it('should provide onLogout handler that calls logout', () => {
    const { result } = renderHook(() => useIdleTimer());
    act(() => { result.current.onLogout(); });
    expect(mockLogout).toHaveBeenCalledWith(true);
  });

  it('should return warningTime as number', () => {
    const { result } = renderHook(() => useIdleTimer());
    expect(typeof result.current.warningTime).toBe('number');
    expect(result.current.warningTime).toBeGreaterThan(0);
  });
});
