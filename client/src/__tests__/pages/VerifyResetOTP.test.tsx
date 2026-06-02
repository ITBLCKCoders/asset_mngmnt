import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import VerifyResetOTP from '@/pages/verifyResetOTP';
import { api } from '@/lib/api';

const mockNavigate = vi.fn();
const { mockToast } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => 'toast-id') },
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
vi.mock('@/lib/api', () => ({ api: { post: vi.fn(), get: vi.fn() } }));
vi.mock('sonner', () => ({ toast: mockToast }));

describe('VerifyResetOTP', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    localStorage.setItem('resetEmail', 'test@test.com');
    localStorage.setItem('resetChannel', 'email');
    localStorage.setItem('resetOtpExpiryTime', '9999999999999');
  });

  it('should redirect if no email in localStorage', () => {
    localStorage.clear();
    render(<VerifyResetOTP />);
    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
  });

  it('should render OTP inputs and verify button', () => {
    render(<VerifyResetOTP />);
    expect(screen.getByText(/Verify Reset Code/)).toBeInTheDocument();
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
    expect(screen.getByText(/Resend OTP/)).toBeInTheDocument();
  });

  it('should auto-verify when all 6 digits are entered', async () => {
    vi.mocked(api.post).mockResolvedValue({ success: true, userId: 'user-1' });
    render(<VerifyResetOTP />);
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input, i) => {
      fireEvent.change(input, { target: { value: String(i + 1) } });
    });
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/verify-reset-otp', {
        channel: 'email', email: 'test@test.com', contactNumber: '', otp: '123456',
      });
    });
  });
});
