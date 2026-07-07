import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from '@/pages/profile/profilePage';

const mockUser = vi.hoisted(() => ({
  id: 'u1',
  company_id: 'c1',
  name: 'Test User',
  email: 'test@test.com',
  role_id: 'r2',
  role: { roleID: 'r2', name: 'User' },
  verified: true,
  firstName: 'Test',
  lastName: 'User',
  username: 'testuser',
  contactNumber: '+639123456789',
  position: 'Staff',
  department: 'IT',
  department_id: 'd1',
  employeeId: 'EMP001',
  createdAt: '2024-01-01',
  address: {
    unitNo: '', buildingNo: '', street: '', subdivision: '',
    barangay: '', city: '', province: '', region: '',
  },
}));

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: mockUser, loading: false, refetch: vi.fn() }),
}));

vi.mock('@/hooks/avatarPreview', () => ({
  useAvatarPreview: () => ({ clearPreview: vi.fn() }),
}));

vi.mock('@/pages/profile/profileComponents/profileHeader', () => ({
  default: vi.fn(() => <div data-testid="profile-header">ProfileHeader</div>),
}));

vi.mock('@/pages/profile/profileComponents/tabTriggers', () => ({
  default: vi.fn(() => <div data-testid="tab-triggers">TabTriggers</div>),
}));

vi.mock('@/pages/profile/profileComponents/tabs/basicInfoTab', () => ({
  default: vi.fn(() => <div data-testid="basic-info-tab">BasicInfoTab</div>),
  __esModule: true,
}));

vi.mock('@/pages/profile/profileComponents/tabs/accountTab', () => ({
  default: vi.fn(() => <div data-testid="account-tab">AccountTab</div>),
}));

vi.mock('@/pages/profile/profileComponents/tabs/documentsTab', () => ({
  default: vi.fn(() => <div data-testid="documents-tab">DocumentsTab</div>),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

function renderPage(initialEntries = ['/profile']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ProfilePage />
    </MemoryRouter>
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render ProfileHeader', () => {
    renderPage();
    expect(screen.getByTestId('profile-header')).toBeDefined();
  });

  it('should render TabTriggers', () => {
    renderPage();
    expect(screen.getByTestId('tab-triggers')).toBeDefined();
  });

  it('should show basic info tab by default', () => {
    renderPage();
    expect(screen.getByTestId('basic-info-tab')).toBeDefined();
  });

  it('should show account tab from URL param', () => {
    renderPage(['/profile?tab=account']);
    expect(screen.getByTestId('account-tab')).toBeDefined();
  });
});
