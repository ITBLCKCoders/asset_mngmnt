import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AssetsDisposalHistory from '@/pages/assets-history/assetsDisposalHistory';

describe('AssetsDisposalHistory', () => {
  it('renders header title', () => {
    render(<BrowserRouter><AssetsDisposalHistory /></BrowserRouter>);
    expect(screen.getByText('Assets Disposal History')).toBeInTheDocument();
  });
});
