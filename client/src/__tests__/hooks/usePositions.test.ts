import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { usePositions } from '@/hooks/usePositions';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api', () => ({
  api: { get: (...args: any[]) => mockGet(...args), post: (...args: any[]) => mockPost(...args), patch: (...args: any[]) => mockPatch(...args), delete: (...args: any[]) => mockDelete(...args) },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('usePositions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch positions when active', async () => {
    mockGet.mockResolvedValue({ positions: [{ positionID: 'p1', name: 'Engineer' }] });
    const { result } = renderHook(() => usePositions(true));
    await waitFor(() => { result.current.fetchPositions(); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.positions).toEqual([{ positionID: 'p1', name: 'Engineer' }]);
  });

  it('should fetch positions by department', async () => {
    mockGet.mockResolvedValue({ positions: [{ positionID: 'p2', name: 'Manager' }] });
    const { result } = renderHook(() => usePositions(true));
    await result.current.fetchPositionsByDepartment('dept1');
    expect(mockGet).toHaveBeenCalledWith('/positions/department/dept1');
    expect(result.current.positions).toEqual([{ positionID: 'p2', name: 'Manager' }]);
  });

  it('should handle save for new position', async () => {
    mockPost.mockResolvedValue({ message: 'Created', position: { positionID: 'p3', name: 'Analyst' } });
    const { result } = renderHook(() => usePositions(true));
    const saved = await result.current.handleSave({ name: 'Analyst', description: '', department_id: 'd1' }, null);
    expect(saved).toBe(true);
    expect(mockPost).toHaveBeenCalledWith('/positions', { name: 'Analyst', description: '', department_id: 'd1' });
  });

  it('should handle save for existing position', async () => {
    mockGet.mockResolvedValue({ positions: [{ positionID: 'p1', name: 'Engineer' }] });
    mockPatch.mockResolvedValue({ message: 'Updated', position: { positionID: 'p1', name: 'Senior Engineer' } });
    const { result } = renderHook(() => usePositions(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const saved = await result.current.handleSave({ name: 'Senior Engineer', description: '', department_id: 'd1' }, { positionID: 'p1', name: 'Engineer' } as any);
    expect(saved).toBe(true);
    expect(mockPatch).toHaveBeenCalledWith('/positions/p1', expect.any(Object));
  });

  it('should handle delete', async () => {
    mockDelete.mockResolvedValue({ message: 'Deleted' });
    const { result } = renderHook(() => usePositions(true));
    const deleted = await result.current.handleDelete({ positionID: 'p1', name: 'Engineer' } as any);
    expect(deleted).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith('/positions/p1');
  });
});
