import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AssetsReturnHistory from '@/pages/assets-history/assetsReturnHistory';

describe('AssetsReturnHistory', () => {
  it('renders header title', () => {
    render(<BrowserRouter><AssetsReturnHistory /></BrowserRouter>);
    expect(screen.getByText('Assets Return History')).toBeInTheDocument();
  });
});
