import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { useAssetAssignmentNotifications } from '@/hooks/useAssetAssignmentNotifications';

const mockAddNotification = vi.fn();

vi.mock('@/context/NotificationContext', () => ({
  useNotifications: () => ({ addNotification: mockAddNotification }),
}));

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}));

describe('useAssetAssignmentNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger asset assignment notification', () => {
    const { result } = renderHook(() => useAssetAssignmentNotifications());
    result.current.triggerAssetAssignmentNotification({
      assetId: 'a1',
      assetName: 'Laptop',
      assignedBy: 'Admin',
    });
    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Asset Assigned',
        type: 'asset_assigned',
        assetId: 'a1',
      })
    );
  });

  it('should trigger maintenance notification', () => {
    const { result } = renderHook(() => useAssetAssignmentNotifications());
    result.current.triggerMaintenanceNotification({
      assetId: 'a2',
      assetName: 'Server',
      dueDate: '2026-07-01',
    });
    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Maintenance Due',
        type: 'maintenance_due',
      })
    );
  });

  it('should trigger warranty notification', () => {
    const { result } = renderHook(() => useAssetAssignmentNotifications());
    result.current.triggerWarrantyNotification({
      assetId: 'a3',
      assetName: 'Monitor',
      expiryDate: '2027-01-01',
    });
    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Warranty Expiring',
        type: 'warranty_expiring',
      })
    );
  });

  it('should handle asset request status change', () => {
    const { result } = renderHook(() => useAssetAssignmentNotifications());
    result.current.handleAssetRequestStatusChange({
      requestId: 'r1',
      status: 'approved',
      message: 'Your request was approved',
    });
    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Asset Request Approved',
        type: 'asset_request_status_change',
      })
    );
  });
});
