import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import VerifyOTP from '@/pages/verifyOTP';
import { api } from '@/lib/api';

const mockNavigate = vi.fn();
const { mockToast } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => 'toast-id') },
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
vi.mock('@/lib/api', () => ({ api: { post: vi.fn(), get: vi.fn() } }));
vi.mock('sonner', () => ({ toast: mockToast }));

describe('VerifyOTP', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    localStorage.setItem('pendingVerificationEmail', 'test@test.com');
    localStorage.setItem('pendingVerificationChannel', 'email');
    localStorage.setItem('otpExpiryTime', '9999999999999');
  });

  it('should render OTP inputs and verify button', () => {
    render(<VerifyOTP />);
    expect(screen.getByText(/Verify Email/)).toBeInTheDocument();
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
    expect(screen.getByRole('button', { name: /Verify/i })).toBeInTheDocument();
  });

  it('should auto-verify when all 6 digits are entered', async () => {
    vi.mocked(api.post).mockResolvedValue({});
    render(<VerifyOTP />);
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input, i) => {
      fireEvent.change(input, { target: { value: String(i + 1) } });
    });
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/verify-otp', {
        email: 'test@test.com', otp: '123456',
      });
    });
  });
});
