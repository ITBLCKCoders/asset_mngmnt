import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Package } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';

describe('PageHeader', () => {
  it('should render title and description', () => {
    render(<PageHeader icon={Package} title="Assets" description="Manage your assets" />);
    expect(screen.getByText('Assets')).toBeDefined();
    expect(screen.getByText('Manage your assets')).toBeDefined();
  });

  it('should render shimmer when loading', () => {
    const { container } = render(
      <PageHeader icon={Package} title="Assets" description="Loading..." loading />
    );
    const shimmers = container.querySelectorAll('.bg-white\\/20');
    expect(shimmers.length).toBeGreaterThan(0);
  });

  it('should render children when provided', () => {
    render(
      <PageHeader icon={Package} title="Assets" description="Manage">
        <button data-testid="action-btn">Action</button>
      </PageHeader>
    );
    expect(screen.getByTestId('action-btn')).toBeDefined();
  });
});
