import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const mockHasPermission = vi.fn();
const mockUseUserPermissions = vi.fn();

vi.mock('@/hooks/useUserPermissions', () => ({
  useUserPermissions: () => mockUseUserPermissions(),
}));

vi.mock('@/components/common/pageSkeletons', () => ({
  RouteContentFallback: () => <div data-testid="route-fallback">Loading...</div>,
}));

const PermissionRoute = (await import('@/components/routes/permissionRoute')).default;

describe('PermissionRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render fallback when loading', () => {
    mockUseUserPermissions.mockReturnValue({ hasPermission: mockHasPermission, loading: true });
    render(
      <MemoryRouter>
        <PermissionRoute module="Assets">
          <div data-testid="protected-content">Content</div>
        </PermissionRoute>
      </MemoryRouter>
    );
    expect(screen.getByTestId('route-fallback')).toBeDefined();
  });

  it('should render children when user has permission', () => {
    mockHasPermission.mockReturnValue(true);
    mockUseUserPermissions.mockReturnValue({ hasPermission: mockHasPermission, loading: false });
    render(
      <MemoryRouter>
        <PermissionRoute module="Assets" permission="edit">
          <div data-testid="protected-content">Content</div>
        </PermissionRoute>
      </MemoryRouter>
    );
    expect(screen.getByTestId('protected-content')).toBeDefined();
  });

  it('should redirect to home when user lacks permission', () => {
    mockHasPermission.mockReturnValue(false);
    mockUseUserPermissions.mockReturnValue({ hasPermission: mockHasPermission, loading: false });
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/" element={<div data-testid="home-page">Home</div>} />
          <Route path="/admin" element={
            <PermissionRoute module="Admin">
              <div data-testid="admin-content">Admin</div>
            </PermissionRoute>
          } />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('home-page')).toBeDefined();
  });
});
