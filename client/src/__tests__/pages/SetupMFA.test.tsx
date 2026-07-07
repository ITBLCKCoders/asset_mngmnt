import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { api } from '@/lib/api';
import SetupMFA from '@/pages/mfa/SetupMFA';

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <SetupMFA />
    </MemoryRouter>
  );
}

describe('SetupMFA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.post as any).mockResolvedValue({});
  });

  it('should render init step with title', () => {
    renderPage();
    expect(screen.getByText('Enable Two-Factor Authentication')).toBeDefined();
  });

  it('should render Start Setup button', () => {
    renderPage();
    expect(screen.getByText('Start Setup')).toBeDefined();
  });

  it('should render Cancel button', () => {
    renderPage();
    expect(screen.getByText('Cancel')).toBeDefined();
  });

  it('should show scan step after clicking Start Setup', async () => {
    (api.post as any).mockResolvedValue({
      qrCode: 'data:image/png;base64,test',
      manualEntryKey: 'TEST1234',
    });
    renderPage();
    fireEvent.click(screen.getByText('Start Setup'));
    await waitFor(() => {
      expect(screen.getByText('Scan QR Code')).toBeDefined();
    });
    expect(screen.getByText('Verify & Enable')).toBeDefined();
  });

  it('should show success step after verifying TOTP', async () => {
    (api.post as any)
      .mockResolvedValueOnce({ qrCode: 'data:image/png;base64,test', manualEntryKey: 'TEST1234' })
      .mockResolvedValueOnce({ backupCodes: ['ABCD-1234', 'EFGH-5678'] });
    renderPage();
    fireEvent.click(screen.getByText('Start Setup'));
    await waitFor(() => {
      expect(screen.getByText('Scan QR Code')).toBeDefined();
    });
    const input = screen.getByPlaceholderText('000000');
    fireEvent.change(input, { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Verify & Enable'));
    await waitFor(() => {
      expect(screen.getByText('MFA Enabled!')).toBeDefined();
    });
    expect(screen.getByText('ABCD-1234')).toBeDefined();
    expect(screen.getByText('EFGH-5678')).toBeDefined();
  });
});
