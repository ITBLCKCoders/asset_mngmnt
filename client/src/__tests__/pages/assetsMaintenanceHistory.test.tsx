import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AssetsMaintenanceHistory from '@/pages/assets-history/assetsMaintenanceHistory';

describe('AssetsMaintenanceHistory', () => {
  it('renders header title', () => {
    render(<BrowserRouter><AssetsMaintenanceHistory /></BrowserRouter>);
    expect(screen.getByText('Assets Maintenance History')).toBeInTheDocument();
  });
});
