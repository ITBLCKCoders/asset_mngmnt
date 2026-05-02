import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import LoginPage from '@/pages/login';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  setToken: vi.fn(),
  setRefreshToken: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('LoginPage', () => {
  it('should render email and password fields and login button', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Log in|Login/i })
    ).toBeInTheDocument();
  });
});
