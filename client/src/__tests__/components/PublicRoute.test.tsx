import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const mockGetToken = vi.fn();

vi.mock('@/lib/api', () => ({
  getToken: () => mockGetToken(),
}));

const PublicRoute = (await import('@/components/routes/publicRoute')).default;

describe('PublicRoute', () => {
  it('should render children when no token', () => {
    mockGetToken.mockReturnValue(null);
    render(
      <MemoryRouter>
        <PublicRoute>
          <div data-testid="public-content">Login Page</div>
        </PublicRoute>
      </MemoryRouter>
    );
    expect(screen.getByTestId('public-content')).toBeDefined();
  });

  it('should redirect to home when token exists', () => {
    mockGetToken.mockReturnValue('some-token');
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/" element={<div data-testid="home-page">Home</div>} />
          <Route path="/login" element={
            <PublicRoute>
              <div data-testid="login-form">Login</div>
            </PublicRoute>
          } />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('home-page')).toBeDefined();
  });
});
