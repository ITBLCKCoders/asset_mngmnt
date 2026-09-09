import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AccountabilityFormTimeline } from '@/pages/assets/accountability/AccountabilityFormTimeline';
import type { AccountabilityForm } from '@/pages/assets/accountability/accountabilityFormTypes';

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
} as unknown as AccountabilityForm;

describe('AccountabilityFormTimeline', () => {
  it('renders the five lifecycle steps', () => {
    render(<AccountabilityFormTimeline form={baseForm} />);
    expect(screen.getByText('Form created')).toBeInTheDocument();
    expect(screen.getByText('IT copy signed')).toBeInTheDocument();
    expect(screen.getByText('Signed by asset owner')).toBeInTheDocument();
    expect(screen.getByText('Approved by department head')).toBeInTheDocument();
    expect(screen.getByText('Received Copy for 201 File (HR)')).toBeInTheDocument();
  });

  it('marks the next step pending and later steps upcoming', () => {
    render(<AccountabilityFormTimeline form={baseForm} />);
    // Owner signed is the next actionable step; approved + HR received are upcoming
    expect(screen.getAllByText('Pending')).toHaveLength(1);
    expect(screen.getAllByText('Upcoming')).toHaveLength(2);
  });

  it('shows signer names for completed steps', () => {
    render(<AccountabilityFormTimeline form={baseForm} />);
    expect(screen.getByText(/— IT Signer/)).toBeInTheDocument();
    expect(screen.getByText(/— Admin User/)).toBeInTheDocument();
  });

  it('renders no pending step when the form is fully completed', () => {
    const completedForm = {
      ...baseForm,
      signed_at: '2024-01-03T00:00:00Z',
      approvedAt: '2024-01-04T00:00:00Z',
      receivedCopy201FileSignedAt: '2024-01-05T00:00:00Z',
    } as unknown as AccountabilityForm;
    render(<AccountabilityFormTimeline form={completedForm} />);
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    expect(screen.queryByText('Upcoming')).not.toBeInTheDocument();
  });

  it('renders the declined terminal state instead of the HR step', () => {
    const declinedForm = {
      ...baseForm,
      status: 'Declined',
      declineReason: 'Wrong assets',
    } as unknown as AccountabilityForm;
    render(<AccountabilityFormTimeline form={declinedForm} />);
    expect(screen.getByText('Declined by asset owner')).toBeInTheDocument();
    expect(screen.getByText('Reason: Wrong assets')).toBeInTheDocument();
    expect(
      screen.queryByText('Received Copy for 201 File (HR)')
    ).not.toBeInTheDocument();
  });

  it('shows no pending badge for a declined form (no next step)', () => {
    const declinedForm = {
      ...baseForm,
      status: 'Declined',
      declineReason: 'Wrong assets',
    } as unknown as AccountabilityForm;
    render(<AccountabilityFormTimeline form={declinedForm} />);
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    expect(screen.getAllByText('Cancelled')).toHaveLength(2);
  });
});
