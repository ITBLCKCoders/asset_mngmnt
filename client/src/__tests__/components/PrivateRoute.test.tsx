import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const mockUseAuth = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthLoadingSpinner: () => <div data-testid="auth-loading">Loading...</div>,
}));

const PrivateRoute = (await import('@/components/routes/privateRoute')).default;

describe('PrivateRoute', () => {
  it('should render loading spinner when isLoading is true', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true });
    render(
      <MemoryRouter>
        <PrivateRoute />
      </MemoryRouter>
    );
    expect(screen.getByTestId('auth-loading')).toBeDefined();
  });

  it('should redirect to /login when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false });
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          <Route path="/dashboard" element={<PrivateRoute />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('login-page')).toBeDefined();
  });

  it('should render outlet when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<div data-testid="dashboard-content">Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('dashboard-content')).toBeDefined();
  });
});
