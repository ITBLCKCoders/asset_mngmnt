import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import RecentActivityTable from '@/pages/dashboard/components/recentActivityTable';

describe('RecentActivityTable', () => {
  it('should render audit log activities', () => {
    const activities = [
      {
        id: '1',
        timestamp: '2024-01-15T10:00:00Z',
        user: { id: 'u1', name: 'John Doe', email: 'john@test.com' },
        action: 'Created',
        resource: 'Asset',
        resourceType: 'asset',
        resourceId: 'ast-1',
        details: 'New asset added',
      },
    ];
    render(<RecentActivityTable activities={activities as any} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/Created/)).toBeInTheDocument();
    expect(screen.getByText(/Asset/)).toBeInTheDocument();
  });

  it('should render empty state', () => {
    render(<RecentActivityTable activities={[]} />);
    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });

  it('should show audit field-level old → new when old/new are present', () => {
    const activities = [
      {
        id: 'a1',
        timestamp: '2024-01-15T10:00:00Z',
        user: { id: 'u1', name: 'Jane', email: null },
        action: 'Updated Asset',
        resource: 'AST-001',
        resourceType: 'asset',
        resourceId: 'AST-001',
        details: 'Updated 2 field(s)',
        oldValues: { name: 'Old', status: 'Available' },
        newValues: { name: 'New', status: 'In Use' },
      },
    ];
    render(<RecentActivityTable activities={activities as any} />);
    expect(screen.getByText('Name:')).toBeInTheDocument();
    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText('Old')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('parses string-encoded JSON snapshots for field changes', () => {
    const activities = [
      {
        id: 'a2',
        timestamp: '2024-01-15T10:00:00Z',
        user: { id: 'u1', name: 'Jane', email: null },
        action: 'Updated Asset',
        resource: 'AST-002',
        resourceType: 'asset',
        resourceId: 'AST-002',
        details: 'Updated',
        oldValues: '{"name":"Prior"}',
        newValues: '{"name":"Next"}',
      },
    ] as any;
    render(<RecentActivityTable activities={activities} />);
    expect(screen.getByText('Prior')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });
});
