import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AssetStatusChart from '@/pages/dashboard/components/assetStatusChart';

describe('AssetStatusChart', () => {
  it('should render status items with values and percentages', () => {
    const data = [
      { name: 'Available', value: 50, color: 'bg-green-500' },
      { name: 'In Use', value: 30, color: 'bg-blue-500' },
      { name: 'Maintenance', value: 20, color: 'bg-amber-500' },
    ];
    render(<AssetStatusChart data={data} />);
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('In Use')).toBeInTheDocument();
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
    expect(screen.getByText(/50 \(50\.0%\)/)).toBeInTheDocument();
    expect(screen.getByText(/30 \(30\.0%\)/)).toBeInTheDocument();
    expect(screen.getByText(/20 \(20\.0%\)/)).toBeInTheDocument();
  });

  it('should render empty state without crashing', () => {
    render(<AssetStatusChart data={[]} />);
    expect(document.querySelector('.space-y-4')).toBeInTheDocument();
  });
});
