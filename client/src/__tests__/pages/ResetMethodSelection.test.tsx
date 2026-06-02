import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ResetMethodSelectionPage from '@/pages/resetMethodSelection';
import { api } from '@/lib/api';

const mockNavigate = vi.fn();
const { mockToast } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => 'toast-id') },
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
vi.mock('@/lib/api', () => ({ api: { post: vi.fn(), get: vi.fn() } }));
vi.mock('sonner', () => ({ toast: mockToast }));

describe('ResetMethodSelectionPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should redirect to forgot-password if no email in localStorage', () => {
    render(<ResetMethodSelectionPage />);
    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
  });

  it('should render method selection when email is present', () => {
    localStorage.setItem('resetEmail', 'test@test.com');
    render(<ResetMethodSelectionPage />);
    expect(screen.getByText('Choose Verification Method')).toBeInTheDocument();
    expect(screen.getByText(/test@test\.com/)).toBeInTheDocument();
    expect(screen.getByText('Email OTP')).toBeInTheDocument();
    expect(screen.getByText('SMS OTP')).toBeInTheDocument();
  });

  it('should call API and store channel on continue', async () => {
    localStorage.setItem('resetEmail', 'test@test.com');
    vi.mocked(api.post).mockResolvedValue({ message: 'OTP sent', effectiveChannel: 'email' });
    render(<ResetMethodSelectionPage />);
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Code/i }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { channel: 'email', email: 'test@test.com' });
    });
    expect(localStorage.getItem('resetChannel')).toBe('email');
  });

  it('should show error toast on API failure', async () => {
    localStorage.setItem('resetEmail', 'test@test.com');
    vi.mocked(api.post).mockRejectedValue({ message: 'User not found' });
    render(<ResetMethodSelectionPage />);
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Code/i }));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });
  });
});
