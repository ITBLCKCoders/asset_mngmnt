import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { api } from '@/lib/api';
import RegisterPage from '@/pages/registration';

const { mockNavigate, mockToast } = vi.hoisted(() => {
  const navigate = vi.fn();
  const toast = { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => 'toast-id') };
  return { mockNavigate: navigate, mockToast: toast };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: mockToast }));
vi.mock('react-phone-number-input/react-hook-form', () => ({
  default: function MockPhoneInput({ control, name, ...props }: any) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Controller } = require('react-hook-form');
    return (
      <Controller
        control={control}
        name={name}
        render={({ field }: any) => (
          <input
            {...field}
            type="tel"
            data-testid="phone-input"
            placeholder={props.placeholder}
            onChange={(e: any) => field.onChange(e.target.value)}
          />
        )}
      />
    );
  },
}));
vi.mock('@/pages/registration/registerHelpers', () => ({
  RequiredLabel: ({ children }: any) => <>{children}</>,
}));
vi.mock('@/assets/Blackcoders-Black.png', () => ({ default: 'logo.png' }));

function renderPage() {
  return render(
    <BrowserRouter>
      <RegisterPage />
    </BrowserRouter>
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (mockNavigate as any).mockReset();
    (mockToast.loading as any).mockReturnValue('toast-id');
  });

  it('should render the logo and title', () => {
    renderPage();
    expect(screen.getByAltText('Blackcoders')).toBeDefined();
  });

  it('should load companies, departments and positions on mount', async () => {
    (api.get as any).mockResolvedValue({
      companies: [{ id: 'c1', name: 'Company A', prefix: 'CA' }],
      departments: [{ departmentID: 'd1', name: 'Engineering' }],
      positions: [{ positionID: 'p1', name: 'Engineer', department_id: 'd1' }],
    });
    renderPage();
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/companies/public');
    });
    expect(api.get).toHaveBeenCalledWith('/departments');
    expect(api.get).toHaveBeenCalledWith('/positions');
  });

  it('should render form fields after loading', async () => {
    (api.get as any).mockResolvedValue({
      companies: [{ id: 'c1', name: 'Company A', prefix: 'CA' }],
      departments: [{ departmentID: 'd1', name: 'Engineering' }],
      positions: [],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('John')).toBeDefined();
    });
    expect(screen.getByPlaceholderText('Doe')).toBeDefined();
    expect(screen.getByPlaceholderText('johndoe123')).toBeDefined();
    expect(screen.getByPlaceholderText('you@example.com')).toBeDefined();
    expect(screen.getByText('Create Account')).toBeDefined();
  });

  it('should navigate to /login when clicking back link', async () => {
    (api.get as any).mockResolvedValue({ companies: [], departments: [], positions: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Already have an account?')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Already have an account?'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('should show validation errors on empty form submit', async () => {
    (api.get as any).mockResolvedValue({ companies: [], departments: [], positions: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Create Account')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Create Account'));
    await waitFor(() => {
      expect(screen.getAllByText(/first name/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
