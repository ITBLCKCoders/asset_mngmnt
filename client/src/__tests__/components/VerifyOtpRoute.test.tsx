import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

vi.mock('@/pages/verifyOTP', () => ({
  default: () => <div data-testid="verify-otp-page">Verify OTP</div>,
}));

const VerifyOtpRoute = (await import('@/components/routes/verifyOTPRoute')).default;

describe('VerifyOtpRoute', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should render VerifyOTP when email is pending', () => {
    localStorageMock.setItem('pendingVerificationChannel', 'email');
    localStorageMock.setItem('pendingVerificationEmail', 'test@example.com');
    render(
      <MemoryRouter>
        <VerifyOtpRoute />
      </MemoryRouter>
    );
    expect(screen.getByTestId('verify-otp-page')).toBeDefined();
  });

  it('should render VerifyOTP when sms and contact is pending', () => {
    localStorageMock.setItem('pendingVerificationChannel', 'sms');
    localStorageMock.setItem('pendingVerificationContact', '+639171234567');
    render(
      <MemoryRouter>
        <VerifyOtpRoute />
      </MemoryRouter>
    );
    expect(screen.getByTestId('verify-otp-page')).toBeDefined();
  });

  it('should redirect to /register when no identifier exists', () => {
    localStorageMock.clear();
    render(
      <MemoryRouter initialEntries={['/verify-otp']}>
        <Routes>
          <Route path="/register" element={<div data-testid="register-page">Register</div>} />
          <Route path="/verify-otp" element={<VerifyOtpRoute />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('register-page')).toBeDefined();
  });
});
