import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDepartments } from '@/hooks/useDepartments';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api', () => ({
  api: { get: (...args: any[]) => mockGet(...args), post: (...args: any[]) => mockPost(...args), patch: (...args: any[]) => mockPatch(...args), delete: (...args: any[]) => mockDelete(...args) },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('useDepartments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch departments on mount when active', async () => {
    mockGet.mockResolvedValue({ departments: [{ departmentID: 'd1', name: 'IT' }] });
    const { result } = renderHook(() => useDepartments(true), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGet).toHaveBeenCalledWith('/departments');
    expect(result.current.departments).toEqual([{ departmentID: 'd1', name: 'IT' }]);
  });

  it('should not fetch when not active', () => {
    renderHook(() => useDepartments(false), { wrapper });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('should handle save for new department', async () => {
    mockGet.mockResolvedValue({ departments: [] });
    mockPost.mockResolvedValue({ message: 'Created', department: { departmentID: 'd2', name: 'HR' } });
    const { result } = renderHook(() => useDepartments(true), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const saved = await result.current.handleSave({ name: 'HR', code: 'HR', prefix: 'HR', description: '' }, null);
    expect(saved).toBe(true);
    expect(mockPost).toHaveBeenCalledWith('/departments', { name: 'HR', code: 'HR', prefix: 'HR', description: '' });
  });

  it('should handle save for existing department', async () => {
    mockGet.mockResolvedValue({ departments: [{ departmentID: 'd1', name: 'IT' }] });
    mockPatch.mockResolvedValue({ message: 'Updated', department: { departmentID: 'd1', name: 'Engineering' } });
    const { result } = renderHook(() => useDepartments(true), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const saved = await result.current.handleSave({ name: 'Engineering', code: 'ENG', prefix: 'ENG', description: '' }, { departmentID: 'd1', name: 'IT' } as any);
    expect(saved).toBe(true);
    expect(mockPatch).toHaveBeenCalledWith('/departments/d1', expect.any(Object));
  });

  it('should handle delete', async () => {
    mockGet.mockResolvedValue({ departments: [{ departmentID: 'd1', name: 'IT' }] });
    mockDelete.mockResolvedValue({ message: 'Deleted' });
    const { result } = renderHook(() => useDepartments(true), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const deleted = await result.current.handleDelete({ departmentID: 'd1', name: 'IT' } as any);
    expect(deleted).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith('/departments/d1');
  });
});
