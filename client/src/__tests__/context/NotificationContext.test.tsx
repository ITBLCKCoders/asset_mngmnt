import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NotificationProvider, useNotifications } from '@/context/NotificationContext';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  getToken: vi.fn(() => null),
}));
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    io: { reconnection: vi.fn() },
  })),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));
vi.mock('@/utils/assetErrorHandling', () => ({ handleApiError: vi.fn() }));
vi.mock('@/lib/env', () => ({ getApiBase: vi.fn(() => '/api') }));

function wrapper({ children }: { children: ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}

describe('NotificationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide initial state', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.isConnected).toBe(false);
  });

  it('should add notification for asset_assigned type', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.addNotification({
        title: 'Asset Assigned',
        description: 'Laptop assigned to you',
        time: 'Just now',
        read: false,
        type: 'asset_assigned',
        assetId: 'a1',
        assetName: 'Dell Laptop',
        assignedBy: 'Admin',
      });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });
    expect(result.current.notifications[0].title).toBe('Asset Assigned');
    expect(result.current.notifications[0].read).toBe(false);
    expect(result.current.unreadCount).toBe(1);
  });

  it('should add notification for accountability_form type', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.addNotification({
        title: 'Accountability Form Issued',
        description: 'Form #123 issued to you',
        time: 'Just now',
        read: false,
        type: 'accountability_form',
      });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });
    expect(result.current.notifications[0].title).toBe('Accountability Form Issued');
  });

  it('should add notification for other types', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.addNotification({
        title: 'System Update',
        description: 'Maintenance scheduled',
        time: 'Just now',
        read: false,
        type: 'asset_request_status_change',
        requestId: 'r1',
        status: 'approved',
      });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });
    expect(result.current.unreadCount).toBe(1);
  });

  it('should mark notification as read and call API', async () => {
    (api.patch as any).mockResolvedValue({});
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.addNotification({
        title: 'Test',
        description: 'Test notification',
        time: 'Just now',
        read: false,
        type: 'other',
      });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    const id = result.current.notifications[0].id;
    await act(async () => {
      await result.current.markAsRead(id);
    });

    await waitFor(() => {
      expect(result.current.notifications[0].read).toBe(true);
    });
    expect(result.current.unreadCount).toBe(0);
    expect(api.patch).toHaveBeenCalledWith(`/notifications/${id}/read`);
  });

  it('should mark all as read and call API', async () => {
    (api.patch as any).mockResolvedValue({});
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.addNotification({ title: 'N1', description: 'D1', time: 'Just now', read: false, type: 'other' });
      result.current.addNotification({ title: 'N2', description: 'D2', time: 'Just now', read: false, type: 'other' });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    await act(async () => {
      await result.current.markAllAsRead();
    });

    await waitFor(() => {
      expect(result.current.notifications.every((n: any) => n.read)).toBe(true);
    });
    expect(result.current.unreadCount).toBe(0);
    expect(api.patch).toHaveBeenCalledWith('/notifications/mark-all-read');
  });

  it('should remove notification and call API', async () => {
    (api.delete as any).mockResolvedValue({});
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.addNotification({ title: 'T', description: 'D', time: 'Just now', read: false, type: 'other' });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    const id = result.current.notifications[0].id;
    await act(async () => {
      await result.current.removeNotification(id);
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(0);
    });
    expect(api.delete).toHaveBeenCalledWith(`/notifications/${id}`);
  });

  it('should clear all notifications and call API', async () => {
    (api.delete as any).mockResolvedValue({});
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.addNotification({ title: 'T', description: 'D', time: 'Just now', read: false, type: 'other' });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    await act(async () => {
      await result.current.clearNotifications();
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(0);
    });
    expect(api.delete).toHaveBeenCalledWith('/notifications');
  });

  it('should throw when used outside provider', () => {
    expect(() => renderHook(() => useNotifications())).toThrow('useNotifications must be used within a NotificationProvider');
  });
});
