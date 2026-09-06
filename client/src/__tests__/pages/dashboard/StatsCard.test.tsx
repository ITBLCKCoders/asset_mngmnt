import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatsCard } from '@/pages/dashboard/dashboard';
import { Package } from 'lucide-react';

describe('StatsCard', () => {
  it('should render title and formatted value', () => {
    render(
      <StatsCard
        title="Total Assets"
        value={12345}
        icon={Package}
        color="text-foreground"
      />
    );
    expect(screen.getByText('Total Assets')).toBeInTheDocument();
    expect(screen.getByText('12,345')).toBeInTheDocument();
  });

  it('should render a positive trend chip with pct vs prev week', () => {
    render(
      <StatsCard
        title="Available"
        value={10}
        icon={Package}
        color="text-green-600"
        trend={{ delta: 2, pct: 25 }}
      />
    );
    expect(screen.getByText('2 (25%)')).toBeInTheDocument();
    expect(screen.getByText('vs prev week')).toBeInTheDocument();
  });

  it('should render delta without pct when previous period was zero', () => {
    render(
      <StatsCard
        title="Returned"
        value={10}
        icon={Package}
        color="text-emerald-600"
        trend={{ delta: 3, pct: null }}
      />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('vs prev week')).toBeInTheDocument();
  });

  it('should render no trend row when trend is missing', () => {
    render(
      <StatsCard
        title="Total Assets"
        value={5}
        icon={Package}
        color="text-foreground"
      />
    );
    expect(screen.queryByText('vs prev week')).not.toBeInTheDocument();
  });
});