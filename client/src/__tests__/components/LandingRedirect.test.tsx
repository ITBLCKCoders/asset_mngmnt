import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const mockGetToken = vi.fn();
const mockHasPermission = vi.fn();
const mockGetLandingPage = vi.fn();
const mockUseUserPermissions = vi.fn();
const mockUseCurrentUser = vi.fn();

vi.mock('@/lib/api', () => ({
  getToken: () => mockGetToken(),
}));

vi.mock('@/hooks/useUserPermissions', () => ({
  useUserPermissions: () => mockUseUserPermissions(),
}));

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

vi.mock('@/utils/navigation', () => ({
  getLandingPage: (...args: any[]) => mockGetLandingPage(...args),
}));

const LandingRedirect = (await import('@/components/routes/LandingRedirect')).default;

describe('LandingRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUserPermissions.mockReturnValue({ hasPermission: mockHasPermission, loading: false });
    mockUseCurrentUser.mockReturnValue({ user: null, loading: false });
  });

  it('should redirect to /login when no token', async () => {
    mockGetToken.mockReturnValue(null);
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LandingRedirect />} />
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByTestId('login-page')).toBeDefined();
  });

  it('should redirect to /login when user is null after loading', async () => {
    mockGetToken.mockReturnValue('token');
    mockUseCurrentUser.mockReturnValue({ user: null, loading: false });
    mockUseUserPermissions.mockReturnValue({ hasPermission: mockHasPermission, loading: false });
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LandingRedirect />} />
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByTestId('login-page')).toBeDefined();
  });

  it('should show loading spinner while loading', () => {
    mockGetToken.mockReturnValue('token');
    mockUseCurrentUser.mockReturnValue({ user: null, loading: true });
    mockUseUserPermissions.mockReturnValue({ hasPermission: mockHasPermission, loading: true });
    render(
      <MemoryRouter>
        <LandingRedirect />
      </MemoryRouter>
    );
    expect(document.querySelector('.animate-spin')).toBeDefined();
  });

  it('should redirect to landing page when user is loaded and authenticated', async () => {
    mockGetToken.mockReturnValue('token');
    mockUseCurrentUser.mockReturnValue({ user: { userID: 'u1', role: 'Admin' }, loading: false });
    mockUseUserPermissions.mockReturnValue({ hasPermission: mockHasPermission, loading: false });
    mockGetLandingPage.mockReturnValue('/dashboard');
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LandingRedirect />} />
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByTestId('dashboard-page')).toBeDefined();
    expect(mockGetLandingPage).toHaveBeenCalledWith(mockHasPermission, true);
  });
});
