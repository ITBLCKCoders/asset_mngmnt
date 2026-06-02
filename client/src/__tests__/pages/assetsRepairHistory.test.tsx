import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AssetsRepairHistory from '@/pages/assets-history/assetsRepairHistory';

describe('AssetsRepairHistory', () => {
  it('renders header title', () => {
    render(<BrowserRouter><AssetsRepairHistory /></BrowserRouter>);
    expect(screen.getByText('Assets Repair History')).toBeInTheDocument();
  });
});
