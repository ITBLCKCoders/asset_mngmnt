import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ResetPasswordPage from '@/pages/resetPassword';
import { api } from '@/lib/api';

const mockNavigate = vi.fn();
const { mockToast } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
vi.mock('@/lib/api', () => ({ api: { post: vi.fn(), get: vi.fn() } }));
vi.mock('sonner', () => ({ toast: mockToast }));
vi.mock('zxcvbn', () => ({ default: () => ({ score: 3 }) }));

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should redirect if no resetUserId in localStorage', () => {
    render(<ResetPasswordPage />);
    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
  });

  it('should render password fields and reset button', () => {
    localStorage.setItem('resetUserId', 'user-1');
    render(<ResetPasswordPage />);
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    expect(screen.getAllByText('Reset Password')).toHaveLength(2);
  });

  it('should show password strength meter when typing', () => {
    localStorage.setItem('resetUserId', 'user-1');
    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'StrongPass1!' } });
    expect(screen.getByText(/Strength:/)).toBeInTheDocument();
  });

  it('should call API and navigate on valid submit', async () => {
    localStorage.setItem('resetUserId', 'user-1');
    vi.mocked(api.post).mockResolvedValue({});
    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'StrongPass1!' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'StrongPass1!' } });
    fireEvent.click(screen.getAllByText('Reset Password')[1]);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', { userId: 'user-1', password: 'StrongPass1!' });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should show error on password mismatch', () => {
    localStorage.setItem('resetUserId', 'user-1');
    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'StrongPass1!' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'DifferentPass1!' } });
    fireEvent.click(screen.getAllByText('Reset Password')[1]);
    expect(mockToast.error).toHaveBeenCalledWith('Passwords do not match');
  });
});
