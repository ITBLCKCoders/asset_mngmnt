import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountabilityFormCard } from '@/pages/assets/accountability/accountabilityForm';
import type { AccountabilityForm } from '@/pages/assets/accountability/accountabilityFormTypes';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url.includes('/checklists')) {
        return Promise.resolve({ checklists: [] });
      }
      if (url.includes('/intangible-assets')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/settings/security')) {
        return Promise.resolve({ settings: {} });
      }
      return Promise.resolve({});
    }),
  },
}));

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { id: 'u1' }, loading: false }),
}));

import { api } from '@/lib/api';

const baseForm = {
  id: 'f1',
  formNumber: 'AF-001',
  status: 'Pending',
  approvalStatus: 'pending_owner_signature',
  created_at: '2024-01-01T00:00:00Z',
  adminCopyCopyType: 'IT',
  adminCopySignerName: 'IT Signer',
  adminCopySignedAt: '2024-01-02T00:00:00Z',
  signed_at: null,
  approvedAt: null,
  deptHeadSignedAt: null,
  receivedCopy201FileSignedAt: null,
  user: { id: 'u1', first_name: 'John', last_name: 'Doe' },
  issuer: { id: 'admin', first_name: 'Admin', last_name: 'User' },
  assets: [],
  assignment: {
    id: 'asg1',
    expected_return_date: null,
  },
  acknowledgments: null,
} as unknown as AccountabilityForm;

function renderCard(props: Partial<Parameters<typeof AccountabilityFormCard>[0]> = {}) {
  return render(
    <AccountabilityFormCard
      form={baseForm}
      onView={vi.fn()}
      {...props}
    />
  );
}

describe('AccountabilityFormCard timeline tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Accountability and Timeline tabs (no checklist)', async () => {
    renderCard();
    expect(screen.getByText('Accountability')).toBeInTheDocument();
    expect(await screen.findByText('Timeline')).toBeInTheDocument();
    // No checklist data -> checklist fetch resolves empty, no Checklist tab
    await waitFor(() => {
      expect(screen.queryByText('Checklist')).not.toBeInTheDocument();
    });
  });

  it('renders the timeline steps when the Timeline tab is clicked', async () => {
    renderCard();
    const timelineTab = screen.getByRole('tab', { name: 'Timeline' });
    fireEvent.mouseDown(timelineTab);
    fireEvent.click(timelineTab);
    expect(await screen.findByText('Form created')).toBeInTheDocument();
    expect(screen.getByText('Signed by asset owner')).toBeInTheDocument();
    expect(screen.getByText('Approved by department head')).toBeInTheDocument();
    expect(screen.getByText('Received Copy for 201 File (HR)')).toBeInTheDocument();
  });

  it('hides the Sign button while the Timeline tab is active', async () => {
    renderCard({ showSignButton: true, onSign: vi.fn() });
    // Default tab (Accountability): sign button visible for assignee
    await waitFor(() => {
      expect(screen.getByText('Sign Form')).toBeInTheDocument();
    });
    const timelineTab = screen.getByRole('tab', { name: 'Timeline' });
    fireEvent.mouseDown(timelineTab);
    fireEvent.click(timelineTab);
    await waitFor(() => {
      expect(screen.queryByText('Sign Form')).not.toBeInTheDocument();
    });
  });
});
