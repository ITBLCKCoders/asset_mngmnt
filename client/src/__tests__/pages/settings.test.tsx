import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettingsPage from '@/pages/settings/settings';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: null, loading: false }),
}));
vi.mock('@/hooks/useUserPermissions', () => ({
  useUserPermissions: () => ({ permissions: {}, roleCustodian: null, loading: false, hasPermission: vi.fn(() => true), refetch: vi.fn() }),
}));
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render the Settings title', () => {
    renderPage();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('Settings')).toBeDefined();
  });
});
