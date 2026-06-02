import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { api } from '@/lib/api';
import AssetDetails from '@/pages/assets/assetDetails';

vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useParams: () => ({ assetId: 'a1' }),
}));

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn() },
}));

import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function renderPage() {
  return render(
    <BrowserRouter>
      <AssetDetails />
    </BrowserRouter>
  );
}

describe('AssetDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({});
  });

  it('should show loading skeleton initially', async () => {
    (api.get as any).mockImplementation(
      () => new Promise(() => {})
    );
    renderPage();
    await waitFor(() => {
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  it('should render the page header with title', async () => {
    (api.get as any).mockResolvedValue({
      assets: [{
        asset_code: 'A1',
        name: 'Test Asset',
        status: 'Available',
        category_name: 'Electronics',
        created_at: '2024-01-01T00:00:00.000Z',
      }],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Asset Details')).toBeDefined();
    });
  });

  it('should show asset details after load', async () => {
    (api.get as any).mockResolvedValue({
      assets: [{
        asset_code: 'A1',
        name: 'Test Asset',
        status: 'Available',
        category_name: 'Electronics',
        brand: 'Dell',
        serial: 'SN123',
        model: 'XPS',
        description: 'A test asset',
        created_at: '2024-01-01T00:00:00.000Z',
      }],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Test Asset')).toBeDefined();
    });
    expect(screen.getByText('A1')).toBeDefined();
  });

  it('should handle API error', async () => {
    (api.get as any).mockRejectedValue(new Error('API Error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Asset Not Found')).toBeInTheDocument();
    });
  });
});
