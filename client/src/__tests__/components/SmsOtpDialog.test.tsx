import { render, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SmsOtpDialog from '@/components/auth/SmsOtpDialog';
import { api } from '@/lib/api';

const mockUseCurrentUser = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const pendingActionRef: React.MutableRefObject<(() => Promise<void>) | null> = {
  current: null,
};

const baseProps = {
  isOpen: true,
  onOpenChange: vi.fn(),
  onVerified: vi.fn(),
  onCancel: vi.fn(),
  pendingActionRef,
};

describe('SmsOtpDialog digital signature guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue({});
    pendingActionRef.current = null;
  });

  it('blocks OTP verification and never sends OTP when the user has no digital signature', async () => {
    mockUseCurrentUser.mockReturnValue({
      user: { id: 'u1', digitalSignature: null },
      loading: false,
    });

    render(<SmsOtpDialog {...baseProps} />);

    await waitFor(() => {
      expect(baseProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    expect(baseProps.onCancel).toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('sends OTP normally when the user has a digital signature', async () => {
    mockUseCurrentUser.mockReturnValue({
      user: { id: 'u1', digitalSignature: 'data:image/png;base64,abc' },
      loading: false,
    });

    render(<SmsOtpDialog {...baseProps} />);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/initials/send-otp', {});
    });
    expect(baseProps.onOpenChange).not.toHaveBeenCalledWith(false);
    expect(baseProps.onCancel).not.toHaveBeenCalled();
  });

  it('does not send OTP while the user profile is still loading', async () => {
    mockUseCurrentUser.mockReturnValue({
      user: null,
      loading: true,
    });

    render(<SmsOtpDialog {...baseProps} />);

    // Give any unexpected effect a chance to fire
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(api.post).not.toHaveBeenCalled();
    expect(baseProps.onCancel).not.toHaveBeenCalled();
  });

  it('does nothing when the dialog is closed', async () => {
    mockUseCurrentUser.mockReturnValue({
      user: { id: 'u1', digitalSignature: null },
      loading: false,
    });

    render(<SmsOtpDialog {...baseProps} isOpen={false} />);

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(api.post).not.toHaveBeenCalled();
    expect(baseProps.onCancel).not.toHaveBeenCalled();
    expect(baseProps.onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
