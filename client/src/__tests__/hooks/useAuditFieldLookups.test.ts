import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAuditFieldLookups } from '@/hooks/useAuditFieldLookups';

const mockGet = vi.fn();

vi.mock('@/lib/api', () => ({
  api: { get: (...args: any[]) => mockGet(...args) },
}));

describe('useAuditFieldLookups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load lookups from API and set ready', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/departments') return Promise.resolve({ departments: [{ departmentID: 'd1', name: 'IT' }] });
      if (url === '/locations') return Promise.resolve({ locations: [{ locationID: 'l1', name: 'Building A', room_areas: [{ roomID: 'r1', room_name: 'Room 1' }] }] });
      if (url === '/categories') return Promise.resolve([{ categoryID: 'c1', name: 'Electronics' }]);
      if (url === '/types') return Promise.resolve([{ typeID: 't1', name: 'Laptop' }]);
      if (url === '/companies') return Promise.resolve({ companies: [{ companyID: 'co1', name: 'Corp' }] });
      if (url === '/users') return Promise.resolve({ users: [{ userID: 'u1', first_name: 'John', last_name: 'Doe', email: 'john@test.com' }] });
      if (url === '/brands') return Promise.resolve([{ brandID: 'b1', name: 'Dell' }]);
      if (url === '/suppliers') return Promise.resolve([{ supplierID: 's1', name: 'Supplier A' }]);
      if (url === '/asset-builders') return Promise.resolve({ builders: [{ builderID: 'bld1', name: 'Builder 1' }] });
      return Promise.reject(new Error('Unknown endpoint'));
    });

    const { result } = renderHook(() => useAuditFieldLookups());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.lookups.department_id).toEqual({ d1: 'IT' });
    expect(result.current.lookups.location_id).toEqual({ l1: 'Building A' });
    expect(result.current.lookups.location_room_id).toEqual({ r1: 'Room 1 (Building A)' });
    expect(result.current.lookups.category_id).toEqual({ c1: 'Electronics' });
    expect(result.current.lookups.type_id).toEqual({ t1: 'Laptop' });
    expect(result.current.lookups.company_id).toEqual({ co1: 'Corp' });
    expect(result.current.lookups.user_id).toEqual({ u1: 'John Doe' });
    expect(result.current.lookups.brand_id).toEqual({ b1: 'Dell' });
    expect(result.current.lookups.supplier_id).toEqual({ s1: 'Supplier A' });
    expect(result.current.lookups.builder_id).toEqual({ bld1: 'Builder 1' });
  });

  it('should handle API failures gracefully', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));
    const { result } = await waitFor(() => renderHook(() => useAuditFieldLookups()));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.lookups).toEqual({});
  });
});
