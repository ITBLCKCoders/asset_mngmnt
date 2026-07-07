import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ForgotPasswordPage from '@/pages/forgotPassword';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render heading, email input, continue and back buttons', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText('Forgot Password')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument();
    expect(screen.getByText('Back to Login')).toBeInTheDocument();
  });

  it('should disable continue button when email is empty', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByRole('button', { name: /Continue/i })).toBeDisabled();
  });

  it('should store email and navigate on submit', () => {
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@test.com' } });
    expect(screen.getByRole('button', { name: /Continue/i })).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    expect(localStorage.getItem('resetEmail')).toBe('test@test.com');
    act(() => { vi.advanceTimersByTime(350); });
    expect(mockNavigate).toHaveBeenCalledWith('/reset-method-selection');
  });

  it('should navigate to login on back button click', () => {
    render(<ForgotPasswordPage />);
    fireEvent.click(screen.getByText('Back to Login'));
    act(() => { vi.advanceTimersByTime(350); });
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
